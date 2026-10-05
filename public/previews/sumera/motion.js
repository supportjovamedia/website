(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const frames = [...document.querySelectorAll('.hero-photo,.service-card .image-window,.academy-photo,.gallery-track>button,.contact-photo')];
  frames.forEach(frame => {
    const image = frame.querySelector(':scope > img');
    if (!image) return;
    const layer = document.createElement('div');
    layer.className = 'motion-photo';
    image.replaceWith(layer);
    layer.append(image);
  });
  const media = gsap.matchMedia();
  const navSections = ['home','services','academy','gallery','contact'];
  const navLinks = [...document.querySelectorAll('.desktop-nav a,.mobile-nav a')];
  function setActive(id) {
    navLinks.forEach(link => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }
  navLinks.forEach(link => link.addEventListener('click', () => setActive(link.hash.slice(1))));
  let loaded = false;
  function start() {
    if (loaded) return;
    loaded = true;
    media.add({
      desktop:'(min-width: 1081px)',
      tablet:'(min-width: 768px) and (max-width: 1080px)',
      phone:'(max-width: 767px)',
      reduced:'(prefers-reduced-motion: reduce)'
    }, context => {
      const {phone, reduced} = context.conditions;
      ScrollTrigger.create({id:'sumera-header',start:1,end:'max',onUpdate:self=>header.classList.toggle('is-scrolled',self.scroll()>1)});
      navSections.forEach(id => {
        ScrollTrigger.create({
          id:`sumera-nav-${id}`,
          trigger:document.getElementById(id),
          start:() => `top ${header.offsetHeight + 130}px`,
          end:() => `bottom ${header.offsetHeight + 130}px`,
          onEnter:()=>setActive(id),
          onEnterBack:()=>setActive(id)
        });
      });
      if (reduced) {
        root.classList.remove('motion-active');
        return () => header.classList.remove('is-scrolled');
      }
      root.classList.add('motion-active');
      const opening = gsap.timeline({defaults:{duration:.85,ease:'power3.out'}});
      opening.from('.hero h1',{y:18},0)
        .from('.hero-description',{y:14},.08)
        .from('.hero .button-group',{y:12},.16);

      function photo(frame, {trigger=frame,travel=6,scale=1.16,endScale=scale,start='top bottom',end='bottom top',id}={}) {
        const layer = frame.querySelector('.motion-photo');
        if (!layer) return;
        gsap.fromTo(layer,{yPercent:-travel,scale},{
          yPercent:travel,scale:endScale,ease:'none',
          scrollTrigger:{id,trigger,start,end,scrub:.65,invalidateOnRefresh:true,
            onToggle:self=>layer.style.willChange=self.isActive?'transform':'auto'}
        });
      }
      photo(document.querySelector('.hero-photo'),{
        trigger:document.querySelector('.hero'),travel:phone?5:6,scale:1.16,endScale:1.18,
        start:'top top',end:'bottom top',id:'sumera-hero-depth'
      });

      gsap.from('.benefit',{y:20,stagger:.075,duration:.7,ease:'power3.out',
        scrollTrigger:{trigger:'.benefit-strip',start:'top 92%',once:true}});
      const cards = [...document.querySelectorAll('.service-card')];
      cards.forEach((card,index) => {
        gsap.from(card,{y:phone?22:34,duration:.8,delay:phone?(index%2)*.065:index*.065,ease:'power3.out',
          scrollTrigger:{trigger:card,start:'top 93%',once:true}});
        photo(card.querySelector('.image-window'),{trigger:card,travel:5,scale:1.14,id:`sumera-treatment-${index}`});
      });
      const academy = document.querySelector('.academy');
      const academyFrame = document.querySelector('.academy-photo');
      const academyLayer = academyFrame.querySelector('.motion-photo');
      const academyTimeline = gsap.timeline({scrollTrigger:{
        id:'sumera-academy-frame',trigger:academy,start:'top 90%',end:'bottom 15%',scrub:.7,
        invalidateOnRefresh:true,onToggle:self=>academyLayer.style.willChange=self.isActive?'transform':'auto'
      }});
      academyTimeline.fromTo(academyLayer,{scale:1.18,yPercent:-6},{scale:1.14,yPercent:6,ease:'none'},0)
        .fromTo(academyFrame,{clipPath:phone?'inset(8% 5% 8% 5%)':'inset(12% 9% 12% 9%)'},
          {clipPath:'inset(0% 0% 0% 0%)',ease:'none',duration:.65},0);
      gsap.from('.academy-copy',{y:18,duration:.8,ease:'power3.out',
        scrollTrigger:{trigger:'.academy-copy',start:'top 92%',once:true}});
      gsap.from('.academy-benefits li',{x:8,stagger:.08,duration:.6,ease:'power3.out',
        scrollTrigger:{trigger:'.academy-benefits',start:'top 92%',once:true}});

      gsap.fromTo('.gift-art-left',{xPercent:-9,scale:1.15},{xPercent:9,scale:1.15,ease:'none',
        scrollTrigger:{id:'sumera-marble-left',trigger:'.gift-banner',start:'top bottom',end:'bottom top',scrub:.8}});
      gsap.fromTo('.gift-art-right',{xPercent:9,scaleX:-1.15,scaleY:1.15},{xPercent:-9,scaleX:-1.15,scaleY:1.15,ease:'none',
        scrollTrigger:{id:'sumera-marble-right',trigger:'.gift-banner',start:'top bottom',end:'bottom top',scrub:.8}});
      document.querySelectorAll('.gallery-track>button').forEach((button,index) => {
        photo(button,{trigger:'.gallery-wrap',travel:4.5,scale:1.14,id:`sumera-gallery-${index}`});
      });
      photo(document.querySelector('.contact-photo'),{trigger:'.contact',travel:6,scale:1.17,id:'sumera-booking-depth'});
      gsap.from('.contact-copy',{y:18,duration:.8,ease:'power3.out',
        scrollTrigger:{trigger:'.contact-copy',start:'top 92%',once:true}});
      return () => root.classList.remove('motion-active');
    });
    // Image frames reserve their size, so lazy-image loads never interrupt anchor scrolling.
    ScrollTrigger.refresh();
  }
  if (document.fonts?.ready) document.fonts.ready.then(start);
  else start();
  window.SumeraMotion = {
    menu(open) {
      if (!open || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo('.mobile-nav a,.mobile-nav .button',{y:7},{y:0,duration:.35,stagger:.025,ease:'power3.out',overwrite:'auto'});
    }
  };
  window.addEventListener('pagehide',event => { if (!event.persisted) media.revert(); },{once:true});
})();
