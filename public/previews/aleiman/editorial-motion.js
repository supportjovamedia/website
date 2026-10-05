/* Photo motion follows native scrolling. Reading surfaces never move. */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ normal: '(prefers-reduced-motion:no-preference)', desktop: '(min-width:768px)' }, context => {
    if (!context.conditions.normal) return;
    const photos = document.querySelectorAll('.hero-image,.umrah-hero-photo,.poi-hero-photo,.intro-photo,.landmark-resource');
    photos.forEach(frame => {
      const img = frame.querySelector(':scope > img');
      if (!img) return;
      const hero = frame.closest('main > section:first-child');
      gsap.fromTo(img, { yPercent: -4, scale: 1.1 }, {
        yPercent: 4, scale: 1.1, ease: 'none',
        scrollTrigger: {
          trigger: hero || frame, start: hero ? 'top top' : 'top bottom',
          end: 'bottom top', scrub: .35, invalidateOnRefresh: true
        }
      });
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
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });
  window.addEventListener('pageshow', event => { if (event.persisted) ScrollTrigger.refresh(); });
})();
