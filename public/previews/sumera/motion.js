(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // The hero is deliberately absent from every animation target.
  window.SumeraMotion = { menu() {} };
  const links = [...document.querySelectorAll('.desktop-nav a, .mobile-nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  let queued = false;
  function markCurrentSection() {
    const line = Math.min(innerHeight * .33, 260);
    let current = 'home';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= line) current = section.id; });
    links.forEach(link => {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    queued = false;
  }
  addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(markCurrentSection); }
  }, { passive:true });
  addEventListener('resize', markCurrentSection);
  markCurrentSection();
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    ['.services .section-heading', '.story-copy', '.academy-copy', '.gallery .section-heading', '.contact-copy'].forEach(selector => {
      gsap.from(selector, {
        y:18, duration:.65, ease:'power2.out', clearProps:'transform',
        scrollTrigger:{ trigger:selector, start:'top 88%', once:true }
      });
    });
    ['.salon-photo>img', '.academy-photo>img'].forEach(selector => {
      const image = document.querySelector(selector);
      gsap.fromTo(image, { yPercent:-2, scale:1.05 }, {
        yPercent:2, scale:1.05, ease:'none',
        scrollTrigger:{ trigger:image.parentElement, start:'top bottom', end:'bottom top', scrub:.7 }
      });
    });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
  reduce.addEventListener('change', () => ScrollTrigger.refresh());
})();
