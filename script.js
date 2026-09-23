(() => {
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  body.classList.add('js-ready');

  const navToggle = document.querySelector('.nav-toggle');
  const primaryNav = document.querySelector('.primary-nav');

  const closeNavigation = () => {
    if (!navToggle || !primaryNav) return;
    primaryNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.textContent = 'Menu';
  };

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.textContent = isOpen ? 'Close' : 'Menu';
    });

    primaryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNavigation);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNavigation();
    });
  }

  const faqDetails = document.querySelectorAll('.faq-list details');
  faqDetails.forEach((detail) => {
    const summary = detail.querySelector('summary');
    if (!summary) return;
    summary.addEventListener('click', () => {
      faqDetails.forEach((otherDetail) => {
        if (otherDetail !== detail) otherDetail.removeAttribute('open');
      });
    });
  });

  const progress = document.querySelector('.scroll-progress span');
  const updateProgress = () => {
    if (!progress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const revealItems = document.querySelectorAll('[data-reveal]');
  const reveal = (element, index = 0) => {
    if (hasGsap && !reducedMotion) {
      window.gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 0.72,
        delay: Math.min(index * 0.045, 0.25),
        ease: 'power3.out',
        overwrite: true
      });
    } else {
      element.style.opacity = '1';
      element.style.transform = 'none';
    }
  };

  if (hasGsap && !reducedMotion) {
    window.gsap.set(revealItems, { opacity: 0, y: 24 });
    window.gsap.from('.site-header', { y: -24, opacity: 0, duration: 0.7, ease: 'power3.out' });
    window.gsap.from('.hero-copy > *', { opacity: 0, y: 22, duration: 0.75, stagger: 0.07, delay: 0.12, ease: 'power3.out' });
    window.gsap.from('.hero-visual', { opacity: 0, scale: 0.96, duration: 0.9, delay: 0.22, ease: 'power3.out' });
    const visualCard = document.querySelector('.visual-card');
    if (visualCard) {
      window.gsap.to(visualCard, { y: -9, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }
  }

  if ('IntersectionObserver' in window && revealItems.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target, Number(entry.target.dataset.revealIndex || 0));
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item, index) => {
      item.dataset.revealIndex = String(index % 6);
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => reveal(item));
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
