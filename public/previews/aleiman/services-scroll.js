(() => {
  const root = document.querySelector('.services-scroll');
  if (!root || !window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  const panels = [...root.querySelectorAll('.story-panel')];
  const markers = [...root.querySelectorAll('.service-marker')];
  const links = [...root.querySelectorAll('.services-steps a')];
  const media = gsap.matchMedia();
  const activate = index => links.forEach((link, i) => {
    if (i === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  media.add({desktop:'(min-width:901px)',normalMotion:'(prefers-reduced-motion:no-preference)',tall:'(min-height:600px)'}, context => {
    const {desktop, normalMotion, tall} = context.conditions;
    if (!normalMotion || !tall) return;
    root.classList.add('motion-ready');
    panels.forEach((panel, i) => {
      const image = panel.querySelector('.service-photo img');
      gsap.fromTo(image, {yPercent:-6,scale:1.14}, {
        yPercent:6,scale:1.14,ease:'none',
        scrollTrigger:{trigger:markers[i],start:'top bottom',end:'top top',scrub:.3,invalidateOnRefresh:true}
      });
      const next = panels[i+1];
      if (desktop && next) {
        gsap.to(panel, {scale:.96,ease:'none',
          scrollTrigger:{trigger:markers[i+1],start:'top 80%',end:'top 80px',scrub:.35,invalidateOnRefresh:true}
        });
      }
    });
    return () => {root.classList.remove('motion-ready');activate(0);};
  });
  // Derive state once from stable flow markers. Refresh callbacks must not race
  // each other when a disclosure changes the height of neighbouring cards.
  const updateCurrent = () => {
    const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 76;
    let current = 0;
    markers.forEach((marker, index) => {
      const readingPosition = Math.max(navHeight + 24, innerHeight * .65 - panels[index].querySelector('.service-photo').offsetHeight - 26);
      if (marker.getBoundingClientRect().top <= readingPosition) current = index;
    });
    activate(current);
  };
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateCurrent(); scheduled = false; });
  }, {passive:true});
  ScrollTrigger.addEventListener('refresh', updateCurrent);
  updateCurrent();
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 76;
    const top = markers[index].getBoundingClientRect().top + scrollY - navHeight - 24;
    history.replaceState(null, '', link.hash);
    window.scrollTo({top, behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  }));
  // Layout changes from disclosures, fonts and images must update trigger positions.
  root.querySelectorAll('details').forEach(details => details.addEventListener('toggle', () => ScrollTrigger.refresh()));
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  panels.forEach(panel => {
    const image=panel.querySelector('img');
    if (!image.complete) image.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
    // Keyboard focus brings a covered panel back into view without hiding its controls.
    panel.addEventListener('focusin', event => {
      const rect = event.target.getBoundingClientRect();
      const visible = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2)), Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2)));
      if (!visible || !panel.contains(visible)) {
        const marker = markers[panels.indexOf(panel)];
        const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 76;
        window.scrollTo({top:marker.getBoundingClientRect().top + scrollY - navHeight - 24,behavior:'instant'});
      }
    });
  });
  window.addEventListener('pageshow', event => { if (event.persisted) ScrollTrigger.refresh(); });
})();
