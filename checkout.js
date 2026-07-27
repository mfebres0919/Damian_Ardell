/* ==========================================================================
   ABERCROMBIE & SCENTS — checkout.js
   Reads the same localStorage cart written on the home page.
   Mockup only: "Place Order" shows a confirmation and clears the cart.
   ========================================================================== */

(function () {
  'use strict';

  const CART_KEY = 'as_cart';

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function clearCart() { localStorage.removeItem(CART_KEY); }
  function money(n) { return '$' + n.toFixed(2); }

  const itemsEl = document.getElementById('co-items');
  const emptyEl = document.getElementById('co-empty');
  const totalsEl = document.getElementById('co-totals');
  const subtotalEl = document.getElementById('co-subtotal');
  const totalEl = document.getElementById('co-total');
  const form = document.getElementById('checkout-form');

  function render() {
    const cart = readCart();

    if (!cart.length) {
      itemsEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (totalsEl) totalsEl.hidden = true;
      if (form) form.hidden = true;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (totalsEl) totalsEl.hidden = false;
    if (form) form.hidden = false;

    itemsEl.innerHTML = cart.map(function (i) {
      return (
        '<div class="co-item">' +
          '<div class="co-item__media">' +
            '<img src="' + i.image + '" alt="" />' +
            '<span class="co-item__qty">' + i.qty + '</span>' +
          '</div>' +
          '<div class="co-item__info">' +
            '<p class="co-item__name">' + i.name + '</p>' +
            '<p class="co-item__meta">' + i.meta + '</p>' +
          '</div>' +
          '<span class="co-item__price">' + money(i.price * i.qty) + '</span>' +
        '</div>'
      );
    }).join('');

    const subtotal = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal); // free shipping in the mockup
  }

  // Place order (visual only)
  if (form) {
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

  render();
})();
