(() => {
  const root = document.querySelector('.services-scroll');
  if (!root || !window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  const panels = [...root.querySelectorAll('.story-panel')];
  const markers = [...root.querySelectorAll('.service-marker')];
  const links = [...root.querySelectorAll('.services-steps a')];
  const count = root.querySelector('.service-progress-count b');
  const topOffset = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 76) + (innerWidth < 768 ? 12 : 22);
  const media = gsap.matchMedia();
  const requestRefresh = () => {
    if (window.aleimanRefreshScroll) window.aleimanRefreshScroll();
    else ScrollTrigger.refresh();
  };

  const updateCurrent = () => {
    let current = 0;
    const readingLine = topOffset() + 60;
    markers.forEach((marker, index) => {
      if (marker.getBoundingClientRect().top <= readingLine) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (count) count.textContent = String(current + 1).padStart(2, '0');
    const first = markers[0].getBoundingClientRect().top;
    const distance = markers[markers.length - 1].getBoundingClientRect().top - first;
    const progress = Math.min(1, Math.max(0, (readingLine - first) / Math.max(distance, 1)));
    root.style.setProperty('--journey-progress', .25 + progress * .75);
  };

  media.add({wide: '(min-width:768px)', normal: '(prefers-reduced-motion:no-preference)', tall: '(min-height:600px)'}, context => {
    const {wide, normal, tall} = context.conditions;
    if (!normal || !tall) return;
    root.classList.add('motion-ready');
    panels.forEach((panel, index) => {
      const image = panel.querySelector('.service-photo img');
      const mask = panel.querySelector('.service-image-mask');
      if (mask) gsap.fromTo(mask, {scale: .82}, {
        scale: 1, ease: 'none',
        scrollTrigger: {trigger: markers[index], start: 'top bottom', end: () => `top ${topOffset()}`, scrub: .25, invalidateOnRefresh: true}
      });
      gsap.fromTo(image, {yPercent: 10, scale: 1.36}, {
        yPercent: -8, scale: 1.25, ease: 'none',
        scrollTrigger: {trigger: markers[index], start: 'top bottom', end: 'top top', scrub: .35, invalidateOnRefresh: true}
      });
      if (wide && panels[index + 1]) gsap.to(panel, {
        scale: .91, y: -18, ease: 'none',
        scrollTrigger: {trigger: markers[index + 1], start: 'top 85%', end: () => `top ${topOffset()}`, scrub: .3, invalidateOnRefresh: true}
      });
    });
    return () => root.classList.remove('motion-ready');
  });

  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateCurrent(); scheduled = false; });
  }, {passive: true});
  ScrollTrigger.addEventListener('refresh', updateCurrent);
  updateCurrent();
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.replaceState(null, '', link.hash);
    window.scrollTo({top: markers[index].getBoundingClientRect().top + scrollY - topOffset(), behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'});
  }));
  root.querySelectorAll('details').forEach(details => details.addEventListener('toggle', requestRefresh));
  document.fonts.ready.then(requestRefresh);
  panels.forEach(panel => {
    const image = panel.querySelector('img');
    if (!image.complete) image.addEventListener('load', requestRefresh, {once: true});
    panel.addEventListener('focusin', event => {
      const rect = event.target.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
      const visible = document.elementFromPoint(x, y);
      if (!visible || !panel.contains(visible)) {
        const marker = markers[panels.indexOf(panel)];
        window.scrollTo({top: marker.getBoundingClientRect().top + scrollY - topOffset(), behavior: 'instant'});
      }
    });
  });
  window.addEventListener('pageshow', event => { if (event.persisted) requestRefresh(); });
})();
