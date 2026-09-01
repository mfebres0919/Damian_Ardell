/* ==========================================================================
   Creates a Square hosted checkout from the customer's cart.

   The browser sends only product ids, quantities and the fulfillment choice.
   Prices are looked up here, never trusted from the request — the cart lives
   in localStorage, so a customer could otherwise edit it and pay $0.01.
   ========================================================================== */

'use strict';

// Source of truth for pricing. Keep in sync with the data-price attributes
// on the product cards in index.html.
const CATALOG = {
  'lavender-clay':       { name: 'Lavender & Clay',    price: 1200 },
  'vanilla-oatmeal':     { name: 'Vanilla & Oatmeal',  price: 1200 },
  'rose-honey':          { name: 'Rose & Honey',       price: 1400 },
  'eucalyptus-mint-soap':{ name: 'Eucalyptus & Mint',  price: 1400 },
  'pomegranate-oil':     { name: 'Pomegranate',        price: 1800 },
  'lavender-oil':        { name: 'Lavender',           price: 1800 },
  'eucalyptus-mint-oil': { name: 'Eucalyptus & Mint',  price: 2000 },
  'vanilla-oil':         { name: 'Vanilla',            price: 2000 }
};

const SHIPPING_FLAT_CENTS = Number(process.env.SHIPPING_FLAT_CENTS || 600);
const FREE_SHIPPING_OVER  = Number(process.env.FREE_SHIPPING_OVER_CENTS || 5000);
const MAX_QTY = 50;

const SQUARE_HOST = process.env.SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const token      = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    return json(500, { error: 'Square is not configured yet.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'Malformed request.' }); }

  const cart = Array.isArray(body.cart) ? body.cart : [];
  const shipping = body.fulfillment === 'ship';

  const lineItems = [];
  for (const entry of cart) {
    const product = CATALOG[entry && entry.id];
    if (!product) continue;                       // unknown id — drop it
    const qty = Math.floor(Number(entry.qty));
    if (!(qty > 0) || qty > MAX_QTY) continue;
    lineItems.push({
      name: product.name,
      quantity: String(qty),
      base_price_money: { amount: product.price, currency: 'USD' }
    });
  }

  if (!lineItems.length) return json(400, { error: 'Your cart is empty.' });

  // Flat-rate shipping as its own line so it shows up on the receipt.
  if (shipping) {
    const subtotal = lineItems.reduce(function (sum, li) {
      return sum + li.base_price_money.amount * Number(li.quantity);
    }, 0);
    const fee = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT_CENTS;
    if (fee > 0) {
      lineItems.push({
        name: 'Shipping',
        quantity: '1',
        base_price_money: { amount: fee, currency: 'USD' }
      });
    }
  }

  const note = shipping
    ? 'Ship to customer'
    : 'LOCAL PICKUP — ' + (str(body.pickup) || 'no time given');

  const payload = {
    idempotency_key: cryptoRandom(),
    order: {
      location_id: locationId,
      line_items: lineItems,
      note: truncate(note, 500)
    },
    checkout_options: {
      ask_for_shipping_address: shipping,
      redirect_url: str(body.origin) + '/checkout.html?status=success',
      merchant_support_email: process.env.SUPPORT_EMAIL || undefined
    },
    pre_populated_data: {
      buyer_email: str(body.email) || undefined,
      buyer_phone_number: str(body.phone) || undefined
    }
  };

  try {
    const res = await fetch(SQUARE_HOST + '/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Square error', JSON.stringify(data));
      return json(502, { error: 'Could not start checkout. Please try again.' });
    }
    return json(200, { url: data.payment_link.url });
  } catch (err) {
    console.error(err);
    return json(502, { error: 'Could not reach the payment provider.' });
  }
};

/* --- helpers ------------------------------------------------------------ */
function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
function str(v) { return typeof v === 'string' ? v.trim() : ''; }
function truncate(s, n) { return s.length > n ? s.slice(0, n) : s; }
function cryptoRandom() {
  return require('crypto').randomUUID();
}
