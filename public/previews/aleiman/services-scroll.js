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
      ScrollTrigger.create({trigger:markers[i],start:'top 50%',endTrigger:markers[i+1] || root,end:i<panels.length-1?'top 50%':'bottom 50%',
        onEnter:()=>activate(i),onEnterBack:()=>activate(i),
        onLeave:()=>activate(Math.min(i+1,panels.length-1)),
        onLeaveBack:()=>activate(Math.max(0,i-1))
      });
    });
    return () => {root.classList.remove('motion-ready');activate(0);};
  });
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
      if (!visible || !panel.contains(visible)) markers[panels.indexOf(panel)].scrollIntoView({block:'start',behavior:'auto'});
    });
  });
  window.addEventListener('pagehide',()=>media.revert(),{once:true});
})();
