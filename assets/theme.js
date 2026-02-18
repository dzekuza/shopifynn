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

  const variantSelects = document.querySelectorAll('[data-option-index]');
  if (variantSelects.length > 0) {
    variantSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const productData = document.querySelector('[data-product]');
        if (!productData) return;

        // Construct selected options
        const selectedOptions = [];
        variantSelects.forEach((s) => selectedOptions.push(s.value));

        // Find matching variant from product JSON (if available)
        // Basic URL-based approach for simplicity
        const params = new URLSearchParams(window.location.search);
        variantSelects.forEach((s, i) => {
          params.set(`option${i + 1}`, s.value);
        });
      });
    });
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
