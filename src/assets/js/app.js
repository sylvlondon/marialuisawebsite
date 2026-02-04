(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function fadePageLoad() {
    const loader = document.querySelector('.page-load');
    if (!loader) return;
    const duration = prefersReducedMotion ? 1 : 600;
    loader.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], { duration, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => {
      loader.style.display = 'none';
    }, duration + 50);
  }

  function setupNav() {
    const nav = document.querySelector('.navbar.w-nav');
    if (!nav) return;
    const button = nav.querySelector('.w-nav-button');
    const menu = nav.querySelector('.w-nav-menu');
    if (!button || !menu) return;

    const toggle = () => {
      const isOpen = nav.classList.toggle('w--open');
      button.classList.toggle('w--open', isOpen);
      menu.classList.toggle('w--open', isOpen);
      button.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('no-scroll', isOpen);
    };

    button.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (nav.classList.contains('w--open')) toggle();
      });
    });
  }

  function getTargetStyles(el, props) {
    const prev = {};
    props.forEach((prop) => {
      prev[prop] = el.style[prop];
      el.style[prop] = '';
    });
    const computed = window.getComputedStyle(el);
    const target = {};
    props.forEach((prop) => {
      target[prop] = computed[prop];
    });
    props.forEach((prop) => {
      el.style[prop] = prev[prop];
    });
    return target;
  }

  function setupScrollAnimations() {
    const candidates = Array.from(document.querySelectorAll('[data-w-id]'))
      .filter((el) => el.getAttribute('style') && /opacity|transform|width|height/.test(el.getAttribute('style')));

    if (candidates.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const props = [];
        if (el.style.opacity) props.push('opacity');
        if (el.style.transform) props.push('transform');
        if (el.style.width) props.push('width');
        if (el.style.height) props.push('height');

        if (props.length === 0) return;
        const target = getTargetStyles(el, props);

        const keyframes = [
          {
            opacity: el.style.opacity || undefined,
            transform: el.style.transform || undefined,
            width: el.style.width || undefined,
            height: el.style.height || undefined,
          },
          {
            opacity: target.opacity || undefined,
            transform: target.transform || undefined,
            width: target.width || undefined,
            height: target.height || undefined,
          }
        ];

        const parent = el.parentElement;
        let delay = 0;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll('[data-w-id]'))
            .filter((node) => node.getAttribute('style') && /opacity|transform|width|height/.test(node.getAttribute('style')));
          const index = siblings.indexOf(el);
          if (index > 0) delay = index * 80;
        }

        const duration = prefersReducedMotion ? 1 : 900;
        el.animate(keyframes, {
          duration,
          delay,
          easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          fill: 'forwards',
        });
      });
    }, { threshold: 0.2 });

    candidates.forEach((el) => observer.observe(el));
  }

  function setupLottie() {
    if (!window.lottie) return;
    document.querySelectorAll('[data-animation-type="lottie"]').forEach((el) => {
      const src = el.getAttribute('data-src');
      if (!src) return;
      const loop = el.getAttribute('data-loop') === '1';
      const autoplay = el.getAttribute('data-autoplay') !== '0';
      const renderer = el.getAttribute('data-renderer') || 'svg';
      window.lottie.loadAnimation({
        container: el,
        renderer,
        loop,
        autoplay,
        path: src,
      });
    });
  }

  onReady(() => {
    fadePageLoad();
    setupNav();
    setupScrollAnimations();
    setupLottie();
  });
})();
