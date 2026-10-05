(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  function scene(selector, id) {
    const element = document.querySelector(selector);
    const wrapper = document.createElement('div');
    wrapper.className = `${id}-scroll motion-scene`;
    wrapper.id = id;
    element.removeAttribute('id');
    element.before(wrapper);
    wrapper.append(element);
    return {element, wrapper};
  }
  // Anchor wrappers stay stable during normal page scrolling.
  const hero = scene('.hero','home');
  const academy = scene('.academy','academy');
  const about = document.createElement('span');
  about.id = 'about'; about.className = 'scene-anchor'; about.setAttribute('aria-hidden','true');
  document.querySelector('.hero-copy').removeAttribute('id');
  hero.wrapper.prepend(about);
  document.querySelectorAll('.hero-photo,.service-card .image-window,.academy-photo,.gallery-track>button,.contact-photo').forEach(frame => {
    const image = frame.querySelector(':scope > img');
    if (!image) return;
    const layer = document.createElement('div');
    layer.className = 'motion-photo';
    image.replaceWith(layer);
    layer.append(image);
  });
  const links = [...document.querySelectorAll('.desktop-nav a,.mobile-nav a')];
  function active(id) {
    links.forEach(link => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  const media = gsap.matchMedia();
  function start() {
    media.add({phone:'(max-width:767px)',tablet:'(min-width:768px) and (max-width:1080px)',desktop:'(min-width:1081px)',
      wide:'(min-width:1920px)',ultra:'(min-width:2560px)',tall:'(min-height:650px)',reduced:'(prefers-reduced-motion:reduce)'}, context => {
      const {phone, reduced} = context.conditions;
      root.classList.toggle('motion-active', !reduced);
      if (!reduced) {
        function photo(frame, trigger=frame, travel=12, id, scale=1.32, scrub=.35) {
          const layer = frame.querySelector('.motion-photo');
          if (!layer) return;
          gsap.fromTo(layer,{yPercent:-travel,scale},{yPercent:travel,scale,ease:'none',
            scrollTrigger:{id,trigger,start:'top bottom',end:'bottom top',scrub,invalidateOnRefresh:true,
              onToggle:self=>layer.style.willChange=self.isActive?'transform':'auto'}});
        }
        gsap.from('.benefit',{y:35,stagger:.08,duration:.65,ease:'power3.out',
          scrollTrigger:{trigger:'.benefit-strip',start:'top 93%',toggleActions:'play none none reverse'}});
        const cards = [...document.querySelectorAll('.service-card')];
        if (phone) cards.forEach((card,index) => {
          gsap.fromTo(card,{y:72+(index%2)*24},{y:0,ease:'none',scrollTrigger:{id:`sumera-card-${index}`,trigger:card,start:'top 96%',end:'top 60%',scrub:.25}});
        });
        else gsap.fromTo(cards,{y:index=>80+index*25},{y:0,stagger:.065,duration:1,ease:'none',
          scrollTrigger:{id:'sumera-treatment-sequence',trigger:'.service-grid',start:'top 96%',end:'top 43%',scrub:.3}});
        cards.forEach((card,index)=>photo(card.querySelector('.image-window'),card,12,`sumera-treatment-${index}`));
        // Stable frames let native scrolling carry the section without a pin release.
        photo(document.querySelector('.academy-photo'),academy.wrapper,7,'sumera-academy-frame',1.2,.65);
        gsap.fromTo('.gift-art-left',{xPercent:-30,scale:1.3},{xPercent:30,scale:1.3,ease:'none',
          scrollTrigger:{id:'sumera-marble-left',trigger:'.gift-banner',start:'top bottom',end:'bottom top',scrub:.4}});
        gsap.fromTo('.gift-art-right',{xPercent:30,scaleX:-1.3,scaleY:1.3},{xPercent:-30,scaleX:-1.3,scaleY:1.3,ease:'none',
          scrollTrigger:{id:'sumera-marble-right',trigger:'.gift-banner',start:'top bottom',end:'bottom top',scrub:.4}});
        document.querySelectorAll('.gallery-track>button').forEach((button,index) => {
          photo(button,'.gallery-wrap',5,`sumera-gallery-${index}`,1.15,.65);
        });
        photo(document.querySelector('.contact-photo'),'.contact',5,'sumera-booking-depth',1.15,.65);
        gsap.from('.contact-copy',{y:45,duration:.8,ease:'power3.out',
          scrollTrigger:{trigger:'.contact',start:'top 85%',toggleActions:'play none none reverse'}});
      }
      // Reading state follows the page's normal document flow.
      ScrollTrigger.create({id:'sumera-header',start:1,end:'max',onUpdate:self=>header.classList.toggle('is-scrolled',self.scroll()>1)});
      const sections = ['home','services','academy','gallery','contact'].map(id=>document.getElementById(id));
      ScrollTrigger.create({id:'sumera-navigation',start:0,end:'max',onUpdate:()=>{
        const threshold = header.offsetHeight + 150;
        let current = sections[0];
        for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current=section;
        active(current.id);
      }});
      return () => {root.classList.remove('motion-active');header.classList.remove('is-scrolled');};
    });
    ScrollTrigger.refresh();
  }
  if (document.fonts?.ready) document.fonts.ready.then(start); else start();
  window.SumeraMotion = {menu(open) {
    if (open&&!matchMedia('(prefers-reduced-motion:reduce)').matches)gsap.fromTo('.mobile-nav a,.mobile-nav .button',{y:14},{y:0,stagger:.035,duration:.4,ease:'power3.out',overwrite:'auto'});
  }};
  window.addEventListener('pagehide',event=>{if(!event.persisted)media.revert();},{once:true});
})();
