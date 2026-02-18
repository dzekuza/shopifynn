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

  /* ---- Scroll Animations ---- */

  if ('IntersectionObserver' in window) {
    const animatedElements = document.querySelectorAll(
      '.section__header, .features__card, .product-tiers__card, .testimonials__card, .featured-collections__card'
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
