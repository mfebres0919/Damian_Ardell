/* ==========================================================================
   ABERCROMBIE & SCENTS — main.js
   ========================================================================== */

(function () {
  'use strict';

  /* --- Mobile nav ------------------------------------------------------- */
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const isOpen = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close after tapping a link or the cart
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link, .nav__cart')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    // Click outside the drawer closes it
    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });

    // Clear drawer state when the viewport grows into the desktop row layout
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) closeMenu();
    });
  }

  /* --- Product category tabs -------------------------------------------- */
  const tabs = document.querySelectorAll('.tabs__btn');
  const cards = document.querySelectorAll('#product-grid .card');

  function activateTab(filter) {
    tabs.forEach(function (t) {
      const active = t.dataset.filter === filter;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    cards.forEach(function (card) {
      card.hidden = card.dataset.category !== filter;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { activateTab(tab.dataset.filter); });
  });

  // Footer (or any) links that deep-link to a specific tab; the href="#collection"
  // handles the scroll, this just flips to the right category.
  document.querySelectorAll('[data-shop-tab]').forEach(function (link) {
    link.addEventListener('click', function () { activateTab(link.dataset.shopTab); });
  });

  /* =======================================================================
     CART  (mockup only — persisted to localStorage, no real orders)
     Shared with checkout.html via the same storage key + helpers.
     ======================================================================= */
  const CART_KEY = 'as_cart';

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    syncCart();
  }
  function money(n) { return '$' + n.toFixed(2); }
  function cartTotal(cart) {
    return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  }
  function cartUnits(cart) {
    return cart.reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function addItem(product, qty) {
    const cart = readCart();
    const existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) existing.qty += qty;
    else cart.push({
      id: product.id, name: product.name, price: product.price,
      meta: product.meta, image: product.image, qty: qty
    });
    writeCart(cart);
  }
  function setQty(id, qty) {
    let cart = readCart();
    if (qty <= 0) cart = cart.filter(function (i) { return i.id !== id; });
    else { const it = cart.find(function (i) { return i.id === id; }); if (it) it.qty = qty; }
    writeCart(cart);
  }

  // Build a product object from a card's data-* attributes
  function productFromCard(card) {
    return {
      id: card.dataset.id,
      name: card.dataset.name,
      price: parseFloat(card.dataset.price),
      meta: card.dataset.meta,
      image: card.dataset.image,
      desc: card.dataset.desc
    };
  }

  /* --- Cart count badge -------------------------------------------------- */
  const cartCountEls = document.querySelectorAll('[data-cart-count]');
  function updateCount() {
    const units = cartUnits(readCart());
    cartCountEls.forEach(function (el) { el.textContent = String(units); });
  }

  /* --- Cart drawer ------------------------------------------------------- */
  const drawer = document.getElementById('cart-drawer');
  const scrim = document.getElementById('cart-scrim');
  const cartBody = document.getElementById('cart-body');
  const cartEmpty = document.getElementById('cart-empty');
  const cartFoot = document.getElementById('cart-foot');
  const cartSubtotal = document.getElementById('cart-subtotal');

  function renderDrawer() {
    if (!cartBody) return;
    const cart = readCart();

    if (!cart.length) {
      cartBody.innerHTML = '';
      if (cartEmpty) cartEmpty.hidden = false;
      if (cartFoot) cartFoot.hidden = true;
      return;
    }
    if (cartEmpty) cartEmpty.hidden = true;
    if (cartFoot) cartFoot.hidden = false;

    cartBody.innerHTML = cart.map(function (i) {
      return (
        '<div class="line" data-line="' + i.id + '">' +
          '<div class="line__media"><img src="' + i.image + '" alt="" /></div>' +
          '<div class="line__info">' +
            '<p class="line__name">' + i.name + '</p>' +
            '<p class="line__meta">' + i.meta + '</p>' +
            '<div class="line__qty">' +
              '<button type="button" data-dec aria-label="Decrease">&minus;</button>' +
              '<span>' + i.qty + '</span>' +
              '<button type="button" data-inc aria-label="Increase">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="line__end">' +
            '<span class="line__price">' + money(i.price * i.qty) + '</span>' +
            '<button class="line__remove" type="button" data-remove>Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    if (cartSubtotal) cartSubtotal.textContent = money(cartTotal(cart));
  }

  function openDrawer() {
    if (!drawer) return;
    renderDrawer();
    drawer.classList.add('is-open');
    if (scrim) scrim.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (scrim) scrim.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Drawer line controls (event delegation)
  if (cartBody) {
    cartBody.addEventListener('click', function (e) {
      const line = e.target.closest('[data-line]');
      if (!line) return;
      const id = line.dataset.line;
      const item = readCart().find(function (i) { return i.id === id; });
      if (!item) return;

      if (e.target.closest('[data-inc]')) setQty(id, item.qty + 1);
      else if (e.target.closest('[data-dec]')) setQty(id, item.qty - 1);
      else if (e.target.closest('[data-remove]')) setQty(id, 0);
      renderDrawer();
    });
  }

  document.querySelectorAll('[data-cart-open]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
  });
  document.querySelectorAll('[data-cart-close]').forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });
  if (scrim) scrim.addEventListener('click', closeDrawer);

  /* --- Quick / Buy-Now modal --------------------------------------------- */
  const modal = document.getElementById('quick-modal');
  const qmImg = document.getElementById('qm-img');
  const qmMeta = document.getElementById('qm-meta');
  const qmName = document.getElementById('qm-name');
  const qmPrice = document.getElementById('qm-price');
  const qmDesc = document.getElementById('qm-desc');
  const qmQty = document.getElementById('qm-qty');
  let modalProduct = null;
  let modalQty = 1;

  function openModal(product) {
    if (!modal) return;
    modalProduct = product;
    modalQty = 1;
    qmImg.src = product.image;
    qmImg.alt = product.name;
    qmMeta.textContent = product.meta;
    qmName.textContent = product.name;
    qmPrice.textContent = money(product.price);
    qmDesc.textContent = product.desc || '';
    qmQty.textContent = '1';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (modal) {
    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    modal.querySelector('[data-qty-inc]').addEventListener('click', function () {
      modalQty += 1; qmQty.textContent = String(modalQty);
    });
    modal.querySelector('[data-qty-dec]').addEventListener('click', function () {
      if (modalQty > 1) { modalQty -= 1; qmQty.textContent = String(modalQty); }
    });
    document.getElementById('qm-add').addEventListener('click', function () {
      if (modalProduct) { addItem(modalProduct, modalQty); closeModal(); openDrawer(); }
    });
    document.getElementById('qm-checkout').addEventListener('click', function () {
      if (modalProduct) { addItem(modalProduct, modalQty); window.location.href = 'checkout.html'; }
    });
  }

  /* --- Card buttons ------------------------------------------------------ */
  document.querySelectorAll('#product-grid .card').forEach(function (card) {
    const product = productFromCard(card);

    const addBtn = card.querySelector('[data-add]');
    if (addBtn) addBtn.addEventListener('click', function () {
      addItem(product, 1);
      openDrawer();
    });

    const buyBtn = card.querySelector('[data-buy]');
    if (buyBtn) buyBtn.addEventListener('click', function () {
      openModal(product);
    });
  });

  // Escape closes whichever overlay is open
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && modal.classList.contains('is-open')) closeModal();
    else if (drawer && drawer.classList.contains('is-open')) closeDrawer();
  });

  /* --- Keep count in sync (this tab + other tabs) ------------------------ */
  function syncCart() { updateCount(); }
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) { updateCount(); if (drawer && drawer.classList.contains('is-open')) renderDrawer(); }
  });
  updateCount();

  /* --- Newsletter signup (mockup — no real submission) ------------------- */
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

  /* --- Contact form (mockup — no real submission) ------------------------ */
  const contactForm = document.getElementById('contact-form');
  const contactNote = document.getElementById('contact-note');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }

      if (contactNote) {
        contactNote.textContent = 'Message sent — we’ll be in touch within two business days.';
        contactNote.classList.add('is-success');
      }
      contactForm.reset();
    });
  }

  /* --- Nav background on scroll ----------------------------------------- */
  const nav = document.getElementById('nav');

  if (nav) {
    let ticking = false;

    function updateNav() {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateNav);
        ticking = true;
      }
    }, { passive: true });

    updateNav();
  }
})();
