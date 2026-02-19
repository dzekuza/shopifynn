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

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        mobileNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---- Testimonials Carousel ---- */

  const testimonialSection = document.querySelector('[data-testimonials]');

  if (testimonialSection) {
    const slider = testimonialSection.querySelector('[data-testimonials-slider]');
    const prevBtn = document.querySelector('[data-testimonials-prev]');
    const nextBtn = document.querySelector('[data-testimonials-next]');

    if (slider && prevBtn && nextBtn) {
      const cards = slider.querySelectorAll('.testimonials__card');
      let currentIndex = 0;
      const visibleCards = window.innerWidth >= 768 ? 3 : 1;
      const maxIndex = Math.max(0, cards.length - visibleCards);

      function updateSlider() {
        const card = cards[0];
        if (!card) return;
        const gap = 24;
        const cardWidth = card.offsetWidth + gap;
        slider.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        slider.style.transition = 'transform 0.4s ease';
      }

      prevBtn.addEventListener('click', () => {
        currentIndex = Math.max(0, currentIndex - 1);
        updateSlider();
      });

      nextBtn.addEventListener('click', () => {
        currentIndex = Math.min(maxIndex, currentIndex + 1);
        updateSlider();
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

  /* ---- Product Thumbnails ---- */

  document.querySelectorAll('[data-thumbnail]').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const mainImage = document.getElementById('product-main-image');
      if (!mainImage) return;

      mainImage.src = thumb.dataset.imageUrl;
      if (thumb.dataset.srcset) mainImage.srcset = thumb.dataset.srcset;
      if (thumb.dataset.alt) mainImage.alt = thumb.dataset.alt;

      document.querySelectorAll('[data-thumbnail]').forEach((t) => t.classList.remove('product__thumbnail--active'));
      thumb.classList.add('product__thumbnail--active');
    });
  });

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

  const productJsonEl = document.querySelector('[data-product-json]');
  const variantSelects = document.querySelectorAll('[data-option-index]');
  let productVariants = [];

  if (productJsonEl) {
    try {
      productVariants = JSON.parse(productJsonEl.textContent);
    } catch (e) {
      // Silent fail — variants won't update dynamically
    }
  }

  function formatMoney(cents) {
    const amount = (cents / 100).toFixed(2);
    // Use the shop's money format from Shopify, fallback to EUR
    const currencySymbol = document.querySelector('[data-product-price]')?.textContent.replace(/[\d.,\s]/g, '').trim() || '€';
    return currencySymbol + amount;
  }

  function onVariantChange() {
    // Collect selected option values from all selects
    const selectedOptions = [];
    variantSelects.forEach((s) => selectedOptions.push(s.value));

    // Find matching variant
    const matchedVariant = productVariants.find((variant) => {
      return selectedOptions.every((val, i) => {
        const optionKey = 'option' + (i + 1);
        return variant[optionKey] === val;
      });
    });

    if (!matchedVariant) return;

    // Update hidden variant ID input
    const variantInput = document.querySelector('[data-variant-id]');
    if (variantInput) variantInput.value = matchedVariant.id;

    // Update price display
    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl) priceEl.textContent = formatMoney(matchedVariant.price);

    // Update compare-at price and save badge
    const compareEl = document.querySelector('[data-compare-price]');
    const saveBadge = document.querySelector('.product__save-badge');
    if (matchedVariant.compare_at_price && matchedVariant.compare_at_price > matchedVariant.price) {
      if (compareEl) {
        compareEl.textContent = formatMoney(matchedVariant.compare_at_price);
        compareEl.style.display = '';
      }
      if (saveBadge) {
        saveBadge.textContent = 'Save ' + formatMoney(matchedVariant.compare_at_price - matchedVariant.price);
        saveBadge.style.display = '';
      }
    } else {
      if (compareEl) compareEl.style.display = 'none';
      if (saveBadge) saveBadge.style.display = 'none';
    }

    // Update Add to Cart button
    const addToCartBtn = document.querySelector('.product__add-to-cart');
    if (addToCartBtn) {
      if (matchedVariant.available) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = addToCartBtn.dataset.addText || 'Add to Cart';
      } else {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Sold Out';
      }
    }

    // Update URL for shareability
    const url = new URL(window.location.href);
    url.searchParams.set('variant', matchedVariant.id);
    window.history.replaceState({}, '', url.toString());

    // Update main product image if variant has one
    if (matchedVariant.featured_image) {
      const mainImage = document.getElementById('product-main-image');
      if (mainImage) {
        mainImage.src = matchedVariant.featured_image.src;
        mainImage.alt = matchedVariant.featured_image.alt || '';
      }
    }
  }

  // Bind change events on selects
  if (variantSelects.length > 0) {
    variantSelects.forEach((select) => {
      select.addEventListener('change', onVariantChange);
    });
  }

  // Store original button text
  const addToCartBtn = document.querySelector('.product__add-to-cart');
  if (addToCartBtn && !addToCartBtn.dataset.addText) {
    addToCartBtn.dataset.addText = addToCartBtn.textContent.trim();
  }

  /* ---- Color Swatches ---- */

  document.querySelectorAll('.product__swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const optionIndex = swatch.dataset.swatchOption;
      const value = swatch.dataset.value;

      // Update active swatch
      const group = swatch.closest('.product__swatches');
      if (group) {
        group.querySelectorAll('.product__swatch').forEach((s) => s.classList.remove('product__swatch--active'));
      }
      swatch.classList.add('product__swatch--active');

      // Update the hidden select
      const hiddenSelect = swatch.closest('.product__option')?.querySelector('[data-option-index]');
      if (hiddenSelect) {
        hiddenSelect.value = value;
      }

      // Update the selected value label
      const valueLabel = swatch.closest('.product__option')?.querySelector('[data-swatch-value]');
      if (valueLabel) {
        valueLabel.textContent = value;
      }

      // Trigger variant change
      onVariantChange();
    });
  });

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

  /* ---- Scroll Animations ---- */

  if ('IntersectionObserver' in window) {
    const animatedElements = document.querySelectorAll(
      '.section__header, .features__card, .product-tiers__card, .testimonials__card, .featured-collections__card, .multicolumn__item, .blog-posts__card, .collection-list__card, .faq__item, .image-text__media, .image-text__content'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    animatedElements.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });

    // Add visible styles via class
    const style = document.createElement('style');
    style.textContent = '.is-visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
  }
})();
