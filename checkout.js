/* ==========================================================================
   ABERCROMBIE & SCENTS — checkout.js
   Reads the same localStorage cart written on the home page.
   - Order summary items stay editable here (qty +/- and remove).
   - Details are collected across three stages: Shipping → Payment → Review.
   Mockup only: "Place Order" shows a confirmation and clears the cart.
   ========================================================================== */

(function () {
  'use strict';

  const CART_KEY = 'as_cart';

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function clearCart() { localStorage.removeItem(CART_KEY); }
  function money(n) { return '$' + n.toFixed(2); }

  // Change a line's quantity; 0 or less removes it entirely.
  function setQty(id, qty) {
    let cart = readCart();
    if (qty <= 0) cart = cart.filter(function (i) { return i.id !== id; });
    else { const it = cart.find(function (i) { return i.id === id; }); if (it) it.qty = qty; }
    writeCart(cart);
  }

  /* --- Elements ---------------------------------------------------------- */
  const itemsEl    = document.getElementById('co-items');
  const emptyEl    = document.getElementById('co-empty');
  const totalsEl   = document.getElementById('co-totals');
  const subtotalEl = document.getElementById('co-subtotal');
  const totalEl    = document.getElementById('co-total');
  const trustEl    = document.getElementById('co-trust');
  const form       = document.getElementById('checkout-form');
  const stepsNav   = document.getElementById('co-steps');

  /* =======================================================================
     ORDER SUMMARY — editable line items
     ======================================================================= */
  function renderSummary() {
    const cart = readCart();

    if (!cart.length) {
      itemsEl.innerHTML = '';
      if (emptyEl)  emptyEl.hidden  = false;
      if (totalsEl) totalsEl.hidden = true;
      if (trustEl)  trustEl.hidden  = true;
      if (form)     form.hidden     = true;
      if (stepsNav) stepsNav.hidden = true;
      return;
    }

    if (emptyEl)  emptyEl.hidden  = true;
    if (totalsEl) totalsEl.hidden = false;
    if (trustEl)  trustEl.hidden  = false;
    if (form)     form.hidden     = false;
    if (stepsNav) stepsNav.hidden = false;

    itemsEl.innerHTML = cart.map(function (i) {
      return (
        '<div class="co-item" data-line="' + i.id + '">' +
          '<div class="co-item__media"><img src="' + i.image + '" alt="" /></div>' +
          '<div class="co-item__info">' +
            '<p class="co-item__name">' + i.name + '</p>' +
            '<p class="co-item__meta">' + i.meta + '</p>' +
            '<div class="co-item__qty">' +
              '<button type="button" data-dec aria-label="Decrease quantity">&minus;</button>' +
              '<span>' + i.qty + '</span>' +
              '<button type="button" data-inc aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="co-item__end">' +
            '<span class="co-item__price">' + money(i.price * i.qty) + '</span>' +
            '<button class="co-item__remove" type="button" data-remove>Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    const subtotal = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl)    totalEl.textContent    = money(subtotal); // free shipping in the mockup
  }

  // Line controls (event delegation)
  if (itemsEl) {
    itemsEl.addEventListener('click', function (e) {
      const line = e.target.closest('[data-line]');
      if (!line) return;
      const id = line.dataset.line;
      const item = readCart().find(function (i) { return i.id === id; });
      if (!item) return;

      if (e.target.closest('[data-inc]'))         setQty(id, item.qty + 1);
      else if (e.target.closest('[data-dec]'))    setQty(id, item.qty - 1);
      else if (e.target.closest('[data-remove]')) setQty(id, 0);
      else return;

      renderSummary();
    });
  }

  /* =======================================================================
     STAGED FORM — Shipping → Payment → Review
     ======================================================================= */
  const steps   = Array.prototype.slice.call(document.querySelectorAll('.co-step'));
  const markers = Array.prototype.slice.call(document.querySelectorAll('[data-step-marker]'));
  let current = 1;

  function showStep(n) {
    current = n;
    steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
    markers.forEach(function (m) {
      const num = Number(m.dataset.stepMarker);
      m.classList.toggle('is-active', num === n);
      m.classList.toggle('is-done', num < n);
    });
    if (n === 3) fillReview();
    // Bring the form back into view when moving between stages.
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Validate only the required fields inside the current step.
  function validateStep(n) {
    const step = steps.find(function (s) { return Number(s.dataset.step) === n; });
    if (!step) return true;
    const fields = step.querySelectorAll('input, select, textarea');
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].checkValidity()) { fields[i].reportValidity(); return false; }
    }
    return true;
  }

  function val(name) {
    const el = form.elements[name];
    return el ? el.value.trim() : '';
  }

  function fillReview() {
    const contact = document.getElementById('rv-contact');
    const address = document.getElementById('rv-address');
    const payment = document.getElementById('rv-payment');

    if (contact) contact.textContent = val('email') || '—';

    if (address) {
      const parts = [
        val('fname'),
        val('address1') + (val('address2') ? ', ' + val('address2') : ''),
        [val('city'), val('state'), val('zip')].filter(Boolean).join(', '),
        val('country')
      ].filter(Boolean);
      address.innerHTML = parts.join('<br />') || '—';
    }

    if (payment) {
      const card = val('card').replace(/\s+/g, '');
      const last4 = card.slice(-4);
      payment.textContent = last4 ? 'Card ending in ' + last4 : 'Card details entered';
    }
  }

  // Next / Back / Edit buttons
  if (form) {
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) {
        if (validateStep(current)) showStep(Math.min(current + 1, 3));
      } else if (e.target.closest('[data-prev]')) {
        showStep(Math.max(current - 1, 1));
      } else {
        const edit = e.target.closest('[data-goto]');
        if (edit) showStep(Number(edit.dataset.goto));
      }
    });

    // Place order (visual only) — final submit from the Review step
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      clearCart();
      const done = document.getElementById('co-done');
      if (done) {
        done.classList.add('is-open');
        done.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  // Keep the summary in sync if the cart changes in another tab.
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) renderSummary();
  });

  /* --- Footer newsletter (mockup — no real submission) ------------------- */
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterNote = document.getElementById('newsletter-note');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!newsletterForm.checkValidity()) { newsletterForm.reportValidity(); return; }
      if (newsletterNote) {
        newsletterNote.textContent = 'Thanks — you’re on the list.';
        newsletterNote.classList.add('is-success');
      }
      newsletterForm.reset();
    });
  }

  renderSummary();
  showStep(1);
})();
