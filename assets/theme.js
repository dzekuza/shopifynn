/**
 * AUROWE — Theme JavaScript
 */

(function () {
  'use strict';

  /* ---- Sticky Header ---- */

  const header = document.querySelector('[data-header]');

  if (header) {
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      if (currentScroll > 100) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }

      lastScroll = currentScroll;
    }, { passive: true });
  }

  /* ---- Mobile Menu ---- */

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Mobile submenu toggles
    mobileNav.querySelectorAll('[data-mobile-dropdown-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const submenu = trigger.nextElementSibling;
        if (!submenu) return;
        const isOpen = submenu.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(isOpen));
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        mobileNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---- Desktop Dropdown Keyboard Accessibility ---- */

  document.querySelectorAll('[data-dropdown]').forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    const menu = dropdown.querySelector('[data-dropdown-menu]');
    if (!trigger || !menu) return;

    // Toggle on click (for touch devices at desktop size)
    trigger.addEventListener('click', () => {
      const isOpen = dropdown.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));

      // Close other open dropdowns
      if (isOpen) {
        document.querySelectorAll('[data-dropdown].is-open').forEach((other) => {
          if (other !== dropdown) {
            other.classList.remove('is-open');
            other.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
          }
        });
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Keyboard: close on Escape, navigate with arrows
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
  });

  /* ---- Testimonials Carousel ---- */

  const testimonialSection = document.querySelector('[data-testimonials]');

  if (testimonialSection) {
    const slider = testimonialSection.querySelector('[data-testimonials-slider]');
    const prevBtn = document.querySelector('[data-testimonials-prev]');
    const nextBtn = document.querySelector('[data-testimonials-next]');
    const cards = slider ? slider.querySelectorAll('.testimonials__card') : [];

    if (slider && cards.length > 0) {
      let currentIndex = 0;

      function getVisibleCards() {
        return window.innerWidth >= 768 ? 3 : 1;
      }

      function getMaxIndex() {
        return Math.max(0, cards.length - getVisibleCards());
      }

      function updateSlider(animate) {
        const card = cards[0];
        if (!card) return;
        const gap = 24;
        const cardWidth = card.offsetWidth + gap;
        slider.style.transition = animate !== false ? 'transform 0.4s ease' : 'none';
        slider.style.transform = 'translateX(-' + (currentIndex * cardWidth) + 'px)';
      }

      function goTo(index) {
        currentIndex = Math.max(0, Math.min(getMaxIndex(), index));
        updateSlider();
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', function () { goTo(currentIndex - 1); });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () { goTo(currentIndex + 1); });
      }

      // Touch swipe support
      let touchStartX = 0;
      let touchDeltaX = 0;

      slider.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchDeltaX = 0;
        slider.style.transition = 'none';
      }, { passive: true });

      slider.addEventListener('touchmove', function (e) {
        touchDeltaX = e.touches[0].clientX - touchStartX;
        const card = cards[0];
        if (!card) return;
        const gap = 24;
        const cardWidth = card.offsetWidth + gap;
        const offset = currentIndex * cardWidth - touchDeltaX;
        slider.style.transform = 'translateX(-' + offset + 'px)';
      }, { passive: true });

      slider.addEventListener('touchend', function () {
        if (touchDeltaX > 50) {
          goTo(currentIndex - 1);
        } else if (touchDeltaX < -50) {
          goTo(currentIndex + 1);
        } else {
          updateSlider();
        }
      });

      // Recalculate on resize
      window.addEventListener('resize', function () {
        currentIndex = Math.min(currentIndex, getMaxIndex());
        updateSlider(false);
      });
    }
  }

  /* ---- Collapsible / Accordion ---- */

  document.querySelectorAll('[data-collapsible-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const content = trigger.nextElementSibling;
      if (!content) return;

      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        content.style.display = 'none';
        content.classList.remove('faq__answer--open');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        content.style.display = 'block';
        content.classList.add('faq__answer--open');
      }
    });
  });

  /* ---- Product Gallery (vanilla) ---- */

  try {
    const gallery = document.querySelector('[data-product-gallery]');

    if (gallery) {
      const slides = gallery.querySelectorAll('.product__gallery-slide');
      const thumbs = gallery.querySelectorAll('.product__gallery-thumb');
      const prevBtn = gallery.querySelector('[data-gallery-prev]');
      const nextBtn = gallery.querySelector('[data-gallery-next]');
      let currentIndex = 0;

      function goToSlide(index) {
        if (!slides.length) return;
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        if (slides[currentIndex]) slides[currentIndex].classList.remove('is-active');
        if (thumbs[currentIndex]) thumbs[currentIndex].classList.remove('is-active');
        currentIndex = index;
        if (slides[currentIndex]) slides[currentIndex].classList.add('is-active');
        if (thumbs[currentIndex]) {
          thumbs[currentIndex].classList.add('is-active');
          thumbs[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }

      // Expose for variant image syncing
      window.__productGallery = { goToSlide: goToSlide, getCurrentIndex: function () { return currentIndex; } };

      if (prevBtn) prevBtn.addEventListener('click', function () { goToSlide(currentIndex - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { goToSlide(currentIndex + 1); });

      thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          goToSlide(parseInt(thumb.dataset.thumbIndex, 10));
        });
      });

      // Touch swipe support
      let touchStartX = 0;
      const track = gallery.querySelector('[data-gallery-track]');
      if (track) {
        track.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', function (e) {
          const diff = touchStartX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) {
            goToSlide(diff > 0 ? currentIndex + 1 : currentIndex - 1);
          }
        });
      }
    }
  } catch (e) {
    console.warn('AUROWE: Gallery init error', e);
  }

  /* ---- Quantity Selector ---- */

  document.querySelectorAll('[data-quantity-minus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('[data-quantity-input]');
      if (input && parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
        updateFormQuantity(input.value);
      }
    });
  });

  document.querySelectorAll('[data-quantity-plus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('[data-quantity-input]');
      if (input) {
        input.value = parseInt(input.value) + 1;
        updateFormQuantity(input.value);
      }
    });
  });

  function updateFormQuantity(value) {
    const formQuantity = document.querySelector('[data-form-quantity]');
    if (formQuantity) formQuantity.value = value;
  }

  /* ---- Variant Picker ---- */

  try {
    let productVariants = [];
    const productJsonEl = document.querySelector('[data-product-json]');

    if (productJsonEl) {
      try {
        productVariants = JSON.parse(productJsonEl.textContent);
      } catch (e) {
        console.warn('AUROWE: Could not parse product variants JSON');
      }
    }

    // Store original button text early
    const addToCartBtn = document.querySelector('.product__add-to-cart');
    if (addToCartBtn && !addToCartBtn.dataset.addText) {
      addToCartBtn.dataset.addText = addToCartBtn.textContent.trim();
    }

    function getSelectedOptions() {
      const options = [];
      document.querySelectorAll('[data-option-index]').forEach(function (s) {
        options.push(s.value);
      });
      return options;
    }

    function findVariant(selectedOptions) {
      return productVariants.find(function (variant) {
        return selectedOptions.every(function (val, i) {
          return variant['option' + (i + 1)] === val;
        });
      });
    }

    function onVariantChange() {
      const selectedOptions = getSelectedOptions();
      const matchedVariant = findVariant(selectedOptions);

      if (!matchedVariant) return;

      // Update hidden variant ID input
      const variantInput = document.querySelector('[data-variant-id]');
      if (variantInput) variantInput.value = matchedVariant.id;

      // Update price display
      const priceEl = document.querySelector('[data-product-price]');
      if (priceEl) {
        priceEl.textContent = (typeof Shopify !== 'undefined' && Shopify.formatMoney) ? Shopify.formatMoney(matchedVariant.price) : (matchedVariant.price / 100).toLocaleString(undefined, { style: 'currency', currency: window.__shopCurrency || 'EUR' });
      }

      // Update compare-at price and save badge
      const compareEl = document.querySelector('[data-compare-price]');
      const saveBadge = document.querySelector('.product__save-badge');
      if (matchedVariant.compare_at_price && matchedVariant.compare_at_price > matchedVariant.price) {
        if (compareEl) {
          compareEl.textContent = (matchedVariant.compare_at_price / 100).toLocaleString(undefined, { style: 'currency', currency: window.__shopCurrency || 'EUR' });
          compareEl.style.display = '';
        }
        if (saveBadge) {
          const saved = ((matchedVariant.compare_at_price - matchedVariant.price) / 100).toLocaleString(undefined, { style: 'currency', currency: window.__shopCurrency || 'EUR' });
          saveBadge.textContent = 'Save ' + saved;
          saveBadge.style.display = '';
        }
      } else {
        if (compareEl) compareEl.style.display = 'none';
        if (saveBadge) saveBadge.style.display = 'none';
      }

      // Update Add to Cart button
      const btn = document.querySelector('.product__add-to-cart');
      if (btn) {
        if (matchedVariant.available) {
          btn.disabled = false;
          btn.textContent = btn.dataset.addText || 'Add to Cart';
        } else {
          btn.disabled = true;
          btn.textContent = 'Sold Out';
        }
      }

      // Update URL for shareability
      const url = new URL(window.location.href);
      url.searchParams.set('variant', matchedVariant.id);
      window.history.replaceState({}, '', url.toString());

      // Update gallery image if variant has a featured image
      if (matchedVariant.featured_image && window.__productGallery) {
        const galleryImages = document.querySelectorAll('.product__gallery-slide img');
        const filename = matchedVariant.featured_image.src.split('?')[0].split('/').pop();
        for (let i = 0; i < galleryImages.length; i++) {
          if (galleryImages[i].src.indexOf(filename) !== -1) {
            window.__productGallery.goToSlide(i);
            break;
          }
        }
      }
    }

    // Bind change events on all option selects (including non-color dropdowns)
    document.querySelectorAll('[data-option-index]').forEach(function (select) {
      select.addEventListener('change', onVariantChange);
    });

    /* ---- Color Swatches ---- */

    document.querySelectorAll('.product__swatch').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        const value = swatch.dataset.value;

        // Update active swatch visually
        const group = swatch.closest('.product__swatches');
        if (group) {
          group.querySelectorAll('.product__swatch').forEach(function (s) { s.classList.remove('product__swatch--active'); });
        }
        swatch.classList.add('product__swatch--active');

        // Update the hidden select and dispatch change event
        let hiddenSelect = swatch.closest('.product__option');
        if (hiddenSelect) hiddenSelect = hiddenSelect.querySelector('[data-option-index]');
        if (hiddenSelect) {
          hiddenSelect.value = value;
          hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Update the selected value label
        const optionWrap = swatch.closest('.product__option');
        if (optionWrap) {
          const valueLabel = optionWrap.querySelector('[data-swatch-value]');
          if (valueLabel) valueLabel.textContent = value;
        }
      });
    });
  } catch (e) {
    console.warn('AUROWE: Variant/swatch init error', e);
  }

  /* ---- Collection Sort ---- */

  const sortSelect = document.querySelector('[data-sort-select]');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }

  /* ---- Slideshow ---- */

  const slideshow = document.querySelector('[data-slideshow]');
  if (slideshow) {
    const slides = slideshow.querySelectorAll('[data-slide]');
    const dots = slideshow.querySelectorAll('[data-slideshow-dot]');
    const prevBtn = slideshow.querySelector('[data-slideshow-prev]');
    const nextBtn = slideshow.querySelector('[data-slideshow-next]');
    let currentSlide = 0;
    let autoplayTimer = null;

    function goToSlide(index) {
      slides.forEach((s) => s.classList.remove('slideshow__slide--active'));
      dots.forEach((d) => d.classList.remove('slideshow__dot--active'));

      currentSlide = ((index % slides.length) + slides.length) % slides.length;
      slides[currentSlide].classList.add('slideshow__slide--active');
      if (dots[currentSlide]) dots[currentSlide].classList.add('slideshow__dot--active');
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { goToSlide(currentSlide - 1); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goToSlide(currentSlide + 1); resetAutoplay(); });

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.slideshowDot));
        resetAutoplay();
      });
    });

    // Autoplay
    function startAutoplay() {
      autoplayTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    function resetAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      startAutoplay();
    }

    if (slides.length > 1) startAutoplay();
  }

  /* ---- Video Cover Play ---- */

  document.querySelectorAll('[data-video-play]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cover = btn.closest('[data-video-cover]');
      const embed = cover?.parentElement?.querySelector('[data-video-embed]');
      if (cover && embed) {
        cover.style.display = 'none';
        embed.classList.remove('video-section__embed--hidden');
        embed.style.display = 'block';

        // Autoplay the video
        const iframe = embed.querySelector('iframe');
        if (iframe) {
          const src = iframe.src;
          if (src.includes('youtube')) {
            iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
          } else if (src.includes('vimeo')) {
            iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
          }
        }
      }
    });
  });

  /* ---- Scroll Animations (GSAP + ScrollTrigger) ---- */

  /* --- GSAP Animation Standards ---
   * Hero entry:      duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.3
   * Section headers: duration: 0.8, y: 32, ease: 'power3.out'
   * Card stagger:    duration: 0.7, y: 40, stagger: 0.10, ease: 'power3.out'
   * Side-slide:      duration: 0.8, x: +/-40, ease: 'power3.out'
   * --- */

  function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Section headers — fade up
    gsap.utils.toArray('.section__header').forEach(function (el) {
      gsap.from(el, {
        y: 32,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // Cards — stagger fade up within each section
    const cardGroups = [
      '.features__grid',
      '.product-tiers__grid',
      '.testimonials__slider',
      '.testimonials__expanding',
      '.featured-collections__grid',
      '.collection-list__grid'
    ];

    cardGroups.forEach(function (selector) {
      const parent = document.querySelector(selector);
      if (!parent) return;
      const children = parent.children;
      if (!children.length) return;

      gsap.from(children, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.10,
        ease: 'power3.out',
        scrollTrigger: { trigger: parent, start: 'top 80%', once: true }
      });
    });

    // FAQ items — stagger
    const faqItems = document.querySelectorAll('.faq__item');
    if (faqItems.length) {
      gsap.from(faqItems, {
        y: 32,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: faqItems[0], start: 'top 85%', once: true }
      });
    }

    // Image-text sections — slide from side
    gsap.utils.toArray('.image-text__media').forEach(function (el) {
      gsap.from(el, {
        x: -40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true }
      });
    });

    gsap.utils.toArray('.image-text__content').forEach(function (el) {
      gsap.from(el, {
        x: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true }
      });
    });

    // Stats bar — count up numbers
    gsap.utils.toArray('.stats-bar__number').forEach(function (el) {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    // Hero content — initial load animation (no scroll trigger)
    const heroContent = document.querySelector('.hero__content');
    if (heroContent) {
      gsap.from(heroContent.children, {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3
      });
    }

    // Product page — info slide in (skip gallery to avoid Swiper conflicts)
    const productInfo = document.querySelector('.product__info');
    if (productInfo) {
      gsap.from(productInfo, {
        x: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2
      });
    }
  }

  // Initialize once GSAP is loaded (deferred scripts)
  if (typeof gsap !== 'undefined') {
    initGSAPAnimations();
  } else {
    window.addEventListener('load', initGSAPAnimations);
  }

  /* ---- Cart Drawer ---- */

  var cartDrawer = document.querySelector('[data-cart-drawer]');
  var cartOverlay = document.querySelector('[data-cart-drawer-overlay]');

  function openCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    if (cartOverlay) cartOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    if (cartOverlay) cartOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Toggle buttons (header cart icon)
  document.querySelectorAll('[data-cart-drawer-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openCartDrawer();
    });
  });

  // Close button
  document.querySelectorAll('[data-cart-drawer-close]').forEach(function (btn) {
    btn.addEventListener('click', closeCartDrawer);
  });

  // Overlay click
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCartDrawer);
  }

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cartDrawer && cartDrawer.classList.contains('is-open')) {
      closeCartDrawer();
    }
  });

  /* ---- AJAX Cart Helpers ---- */

  function formatMoney(cents) {
    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: window.__shopCurrency || 'EUR'
    });
  }

  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
    });
  }

  function updateCartSubtotals(totalPrice) {
    var formatted = formatMoney(totalPrice);
    document.querySelectorAll('[data-cart-subtotal], [data-cart-drawer-subtotal]').forEach(function (el) {
      el.textContent = formatted;
    });
  }

  function cartChangeRequest(body) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function cartAddRequest(body) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function refreshCartDrawer() {
    return fetch('/?sections=cart-drawer-content')
      .catch(function () {})
      .then(function () {
        // Since section rendering may not be available, refetch cart data
        return fetch('/cart.js').then(function (r) { return r.json(); });
      })
      .then(function (cart) {
        if (!cart) return;
        updateCartCount(cart.item_count);
        updateCartSubtotals(cart.total_price);

        // Update drawer items HTML by rebuilding
        var drawerItems = document.querySelector('[data-cart-drawer-items]');
        var drawerEmpty = document.querySelector('[data-cart-drawer-empty]');
        var drawerFooter = document.querySelector('[data-cart-drawer-footer]');

        if (cart.item_count === 0) {
          if (drawerItems) drawerItems.innerHTML = '';
          if (drawerEmpty) drawerEmpty.style.display = '';
          if (drawerFooter) drawerFooter.style.display = 'none';
        } else {
          if (drawerEmpty) drawerEmpty.style.display = 'none';
          if (drawerFooter) drawerFooter.style.display = '';

          if (drawerItems) {
            var html = '';
            cart.items.forEach(function (item, index) {
              var line = index + 1;
              var imgSrc = item.image ? item.image.replace(/(\.[^.]+)$/, '_160x$1') : '';
              var variantTitle = item.variant_title || '';
              html += '<div class="cart-drawer-item" data-cart-drawer-item data-line="' + line + '" data-key="' + item.key + '">';
              html += '<a href="' + item.url + '" class="cart-drawer-item__image-wrap">';
              if (item.image) {
                html += '<img src="' + imgSrc + '" alt="' + item.title.replace(/"/g, '&quot;') + '" loading="lazy" class="cart-drawer-item__image">';
              } else {
                html += '<div class="cart-drawer-item__placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
              }
              html += '</a>';
              html += '<div class="cart-drawer-item__details">';
              html += '<div class="cart-drawer-item__top">';
              html += '<a href="' + item.url + '" class="cart-drawer-item__title">' + item.product_title + '</a>';
              html += '<button type="button" class="cart-drawer-item__remove" data-cart-drawer-remove data-line="' + line + '" aria-label="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
              html += '</div>';
              if (variantTitle) {
                html += '<p class="cart-drawer-item__variant">' + variantTitle + '</p>';
              }
              html += '<div class="cart-drawer-item__bottom">';
              html += '<div class="cart-drawer-item__quantity" data-quantity-selector>';
              html += '<button type="button" class="cart-drawer-item__qty-btn" data-cart-drawer-qty-minus data-line="' + line + '" aria-label="Decrease"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
              html += '<span class="cart-drawer-item__qty-value" data-cart-drawer-qty-value>' + item.quantity + '</span>';
              html += '<button type="button" class="cart-drawer-item__qty-btn" data-cart-drawer-qty-plus data-line="' + line + '" aria-label="Increase"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
              html += '</div>';
              html += '<span class="cart-drawer-item__price">' + formatMoney(item.final_line_price) + '</span>';
              html += '</div></div></div>';
            });
            drawerItems.innerHTML = html;
            bindDrawerItemEvents();
          }
        }
      });
  }

  /* ---- Cart Drawer Item Events (delegated) ---- */

  function bindDrawerItemEvents() {
    // Remove buttons
    document.querySelectorAll('[data-cart-drawer-remove]').forEach(function (btn) {
      btn.onclick = function () {
        var line = parseInt(btn.dataset.line);
        var item = btn.closest('[data-cart-drawer-item]');
        if (item) item.classList.add('is-loading');
        cartChangeRequest({ line: line, quantity: 0 }).then(function () {
          refreshCartDrawer();
        });
      };
    });

    // Quantity minus
    document.querySelectorAll('[data-cart-drawer-qty-minus]').forEach(function (btn) {
      btn.onclick = function () {
        var line = parseInt(btn.dataset.line);
        var item = btn.closest('[data-cart-drawer-item]');
        var qtyEl = item ? item.querySelector('[data-cart-drawer-qty-value]') : null;
        var qty = qtyEl ? parseInt(qtyEl.textContent) : 1;
        if (qty <= 1) return;
        if (item) item.classList.add('is-loading');
        cartChangeRequest({ line: line, quantity: qty - 1 }).then(function () {
          refreshCartDrawer();
        });
      };
    });

    // Quantity plus
    document.querySelectorAll('[data-cart-drawer-qty-plus]').forEach(function (btn) {
      btn.onclick = function () {
        var line = parseInt(btn.dataset.line);
        var item = btn.closest('[data-cart-drawer-item]');
        var qtyEl = item ? item.querySelector('[data-cart-drawer-qty-value]') : null;
        var qty = qtyEl ? parseInt(qtyEl.textContent) : 1;
        if (item) item.classList.add('is-loading');
        cartChangeRequest({ line: line, quantity: qty + 1 }).then(function () {
          refreshCartDrawer();
        });
      };
    });
  }

  // Initial bind
  bindDrawerItemEvents();

  /* ---- Cart Page Item Events ---- */

  // Cart page remove
  document.querySelectorAll('[data-cart-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var line = parseInt(btn.dataset.line);
      var item = btn.closest('[data-cart-item]');
      if (item) item.classList.add('is-loading');
      cartChangeRequest({ line: line, quantity: 0 }).then(function () {
        window.location.reload();
      });
    });
  });

  // Cart page quantity minus
  document.querySelectorAll('[data-cart-qty-minus]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var line = parseInt(btn.dataset.line);
      var item = btn.closest('[data-cart-item]');
      var input = item ? item.querySelector('[data-cart-qty-input]') : null;
      var qty = input ? parseInt(input.value) : 1;
      if (qty <= 1) return;
      if (item) item.classList.add('is-loading');
      cartChangeRequest({ line: line, quantity: qty - 1 }).then(function () {
        window.location.reload();
      });
    });
  });

  // Cart page quantity plus
  document.querySelectorAll('[data-cart-qty-plus]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var line = parseInt(btn.dataset.line);
      var item = btn.closest('[data-cart-item]');
      var input = item ? item.querySelector('[data-cart-qty-input]') : null;
      var qty = input ? parseInt(input.value) : 1;
      if (item) item.classList.add('is-loading');
      cartChangeRequest({ line: line, quantity: qty + 1 }).then(function () {
        window.location.reload();
      });
    });
  });

  // Cart page quantity input change
  document.querySelectorAll('[data-cart-qty-input]').forEach(function (input) {
    input.addEventListener('change', function () {
      var line = parseInt(input.dataset.line);
      var qty = parseInt(input.value);
      if (qty < 1) { input.value = 1; qty = 1; }
      var item = input.closest('[data-cart-item]');
      if (item) item.classList.add('is-loading');
      cartChangeRequest({ line: line, quantity: qty }).then(function () {
        window.location.reload();
      });
    });
  });

  // Upsell add buttons (cart page + drawer)
  document.querySelectorAll('[data-upsell-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var variantId = btn.dataset.variantId;
      btn.disabled = true;
      btn.textContent = 'Adding...';
      cartAddRequest({ items: [{ id: parseInt(variantId), quantity: 1 }] }).then(function () {
        // On cart page, reload; otherwise refresh drawer
        if (document.querySelector('[data-cart-page]')) {
          window.location.reload();
        } else {
          refreshCartDrawer().then(function () {
            btn.disabled = false;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add';
          });
        }
      });
    });
  });

  // Cart note auto-save
  var cartNoteEl = document.querySelector('[data-cart-note]');
  if (cartNoteEl) {
    var noteTimer = null;
    cartNoteEl.addEventListener('input', function () {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(function () {
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: cartNoteEl.value })
        });
      }, 500);
    });
  }

  /* ---- Cart Count Update ---- */

  window.addEventListener('cart:refresh', function () {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        updateCartCount(cart.item_count);
        refreshCartDrawer();
      })
      .catch(function () {});
  });

  /* ---- Open drawer on add-to-cart (product pages) ---- */

  var addToCartForms = document.querySelectorAll('form[action="/cart/add"]');
  addToCartForms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var formData = new FormData(form);
      var body = {};
      formData.forEach(function (value, key) { body[key] = value; });

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Adding...';
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: parseInt(body.id), quantity: parseInt(body.quantity) || 1 }] })
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          refreshCartDrawer().then(function () {
            openCartDrawer();
          });
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText;
          }
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText;
          }
        });
    });
  });

})();
