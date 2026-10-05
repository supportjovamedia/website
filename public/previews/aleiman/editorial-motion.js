/* Photo motion follows native scrolling. Reading surfaces never move. */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  // A refresh writes the current scroll position and can interrupt native smooth
  // navigation. Wait for scrolling to settle before refreshing lazy-image layouts.
  let refreshTimer;
  const requestRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      ScrollTrigger.refresh();
    }, 180);
  };
  window.aleimanRefreshScroll = requestRefresh;
  window.addEventListener('scroll', () => { if (refreshTimer) requestRefresh(); }, { passive: true });
  const media = gsap.matchMedia();
  media.add({ normal: '(prefers-reduced-motion:no-preference)', desktop: '(min-width:768px)' }, context => {
    if (!context.conditions.normal) return;
    const photos = document.querySelectorAll('.hero-image,.umrah-hero-photo,.poi-hero-photo,.intro-photo,.landmark-resource');
    photos.forEach(frame => {
      const img = frame.querySelector(':scope > img');
      if (!img) return;
      const hero = frame.closest('main > section:first-child');
      const homeHero = frame.classList.contains('hero-image');
      gsap.fromTo(img, { yPercent: homeHero ? -9 : -4, scale: homeHero ? 1.23 : 1.1 }, {
        yPercent: homeHero ? 9 : 4, scale: homeHero ? 1.23 : 1.1, ease: 'none',
        scrollTrigger: {
          trigger: hero || frame, start: hero ? 'top top' : 'top bottom',
          end: 'bottom top', scrub: .35, invalidateOnRefresh: true
        }
      });
    });
    // A visible first impression, without hiding copy or delaying interaction.
    const introduction = document.querySelectorAll('.hero-copy h1,.hero-copy > p,.hero-actions');
    if (scrollY < 40 && introduction.length) gsap.from(introduction, {
      y: 30, duration: 1.05, stagger: .12, ease: 'power3.out', delay: .1,
      clearProps: 'transform'
    });
  });

  // Follow the current reading chapter without pinning or shifting the text.
  const steps = [...document.querySelectorAll('.ritual-step')];
  const links = [...document.querySelectorAll('.ritual-aside a')];
  if (steps.length) {
    const updateChapter = () => {
      const readingLine = Math.min(innerHeight * .4, 280);
      let current = steps[0];
      for (const step of steps) if (step.getBoundingClientRect().top <= readingLine) current = step;
      links.forEach(link => {
        if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    };
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { updateChapter(); queued = false; });
    }, { passive: true });
    updateChapter();
  }
  document.fonts.ready.then(requestRefresh);
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', requestRefresh, { once: true });
  });
  window.addEventListener('pageshow', event => { if (event.persisted) requestRefresh(); });
})();
