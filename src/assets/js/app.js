(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function enableInteractionsClass() {
    document.documentElement.classList.add('w-mod-ix');
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
    const inline = el.getAttribute('style');
    if (inline !== null) {
      el.removeAttribute('style');
    }
    const computed = window.getComputedStyle(el);
    const target = {};
    props.forEach((prop) => {
      target[prop] = computed[prop];
    });
    if (inline !== null) {
      el.setAttribute('style', inline);
    }
    return target;
  }

  function getBreakpoint() {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width <= 767) return 'mobile';
    if (width <= 991) return 'tablet';
    return 'desktop';
  }

  function getOverrideTarget(el, props) {
    const overrides = {};
    if (el.classList.contains('card-opacity') && props.includes('opacity')) {
      overrides.opacity = '0.0001824';
    }
    if (el.classList.contains('card-wipe-r') && props.includes('height')) {
      overrides.height = '0%';
    }
    if (el.classList.contains('cover-wipe') && props.includes('height')) {
      overrides.height = '0%';
    }
    if (el.classList.contains('hero-image') && props.includes('transform')) {
      const bp = getBreakpoint();
      const translate = bp === 'mobile' ? '0.0052%' : '0.0048%';
      overrides.transform = `translate3d(0px, ${translate}, 0px) scale3d(1, 1, 1)`;
    }
    if (el.classList.contains('wrapped-image') && el.classList.contains('portrait') && props.includes('transform')) {
      const bp = getBreakpoint();
      let translate = '34.1906px';
      if (bp === 'tablet') translate = '-19.9488px';
      if (bp === 'mobile') translate = '-42.7282px';
      overrides.transform = `translate3d(0px, ${translate}, 0px) scale3d(1.1, 1.1, 1)`;
    }
    return overrides;
  }

  function setupScrollAnimations() {
    const specialSelectors = [
      '.card-opacity',
      '.card-wipe-r',
      '.cover-wipe',
      '.hero-image',
      '.wrapped-image.portrait',
    ];
    const specialElements = specialSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));

    const candidates = Array.from(new Set([
      ...specialElements,
      ...Array.from(document.querySelectorAll('[style]'))
        .filter((el) => {
          if (el.classList.contains('page-load')) return false;
          if (el.getAttribute('data-animation-type') === 'lottie') return false;
          const style = el.getAttribute('style') || '';
          return /opacity|transform|width|height|translate3d|scale3d/.test(style);
        })
    ]));

    if (candidates.length === 0) return;

    const observedElements = new Set();
    const triggerMap = new Map();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const elements = triggerMap.get(entry.target) || [];
        elements.forEach((el) => {
          if (el.dataset.ixTriggered) return;
          el.dataset.ixTriggered = '1';
          const style = el.getAttribute('style') || '';
          const props = [];
          if (/opacity/.test(style)) props.push('opacity');
          if (/transform/.test(style)) props.push('transform');
          if (/width/.test(style)) props.push('width');
          if (/height/.test(style)) props.push('height');

          const overrideSeed = props.length ? props : ['opacity', 'transform', 'width', 'height'];
          const override = getOverrideTarget(el, overrideSeed);
          const effectiveProps = props.length ? props : Object.keys(override);
          if (effectiveProps.length === 0) return;
          const target = getTargetStyles(el, effectiveProps);
          Object.assign(target, override);

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
            // Only stagger within the direct children of the same container, and cap it.
            const siblings = Array.from(parent.children).filter((node) => {
              if (!node.hasAttribute('data-w-id')) return false;
              const s = node.getAttribute('style') || '';
              return /opacity|transform|width|height/.test(s);
            });
            const index = siblings.indexOf(el);
            if (index > 0) delay = Math.min(index, 4) * 80;
          }

          let duration = prefersReducedMotion ? 1 : 900;
          if (el.classList.contains('cover-wipe')) duration = prefersReducedMotion ? 1 : 600;
          const animation = el.animate(keyframes, {
            duration,
            delay,
            easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            fill: 'forwards',
          });
          animation.onfinish = () => {
            effectiveProps.forEach((prop) => {
              if (target[prop] !== undefined) {
                el.style[prop] = target[prop];
              }
            });
            if (target.transform) {
              el.style.transformStyle = 'preserve-3d';
              el.style.willChange = 'transform';
            }
          };
        });
      });
    }, { threshold: 0.05, rootMargin: '200px 0px 200px 0px' });

    const getTriggerElement = (el) => {
      const parent = el.parentElement;
      if (!parent) return el;
      const style = window.getComputedStyle(parent);
      const overflowHidden = ['hidden', 'clip'].includes(style.overflow)
        || ['hidden', 'clip'].includes(style.overflowX)
        || ['hidden', 'clip'].includes(style.overflowY);
      return overflowHidden ? parent : el;
    };

    candidates.forEach((el) => {
      const trigger = getTriggerElement(el);
      const list = triggerMap.get(trigger) || [];
      list.push(el);
      triggerMap.set(trigger, list);
      if (!observedElements.has(trigger)) {
        observer.observe(trigger);
        observedElements.add(trigger);
      }
    });
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
    enableInteractionsClass();
    fadePageLoad();
    setupNav();
    setupScrollAnimations();
    setupLottie();
  });
})();
