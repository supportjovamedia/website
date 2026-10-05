(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.querySelector('.mobile-nav');
  const detail = document.querySelector('#detail-dialog');
  const lightbox = document.querySelector('#gallery-dialog');
  let lastTrigger = null;
  let galleryIndex = 0;
  const services = {
    Hair: [['Wash & cut','From £20'],['Wash, cut & blow dry','From £28'],['Cutting & finishing','From £30'],['Hair extensions','Ask the team']],
    Beauty: [['Eyebrow threading','£5'],['HD brows','£25'],['Classic lashes','£50'],['Make-up','Ask the team']],
    Aesthetics: [['Laser hair removal','Ask the team'],['Microblading','£150'],['Treatment consultation','Ask the team']],
    Nails: [['Express manicure','£15'],['Express pedicure','£30'],['Shellac','£18']],
    Skincare: [['Facials','Ask the team'],['Skin peels','Ask the team'],['Skincare packages','Ask the team']]
  };
  const gallery = [...document.querySelectorAll('[data-gallery]')].map(button => ({
    source: button.querySelector('img').getAttribute('src'),
    alt: button.querySelector('img').alt
  }));
  const setMenu = open => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
    window.SumeraMotion?.menu(open);
  };
  menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  function openDialog(dialog, trigger) {
    setMenu(false);
    lastTrigger = trigger || document.activeElement;
    dialog.classList.remove('is-closing');
    dialog.showModal();
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    dialog.querySelector('.dialog-close').focus({ preventScroll: true });
  }
  function closeDialog(dialog) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    setTimeout(() => {
      dialog.close();
      dialog.classList.remove('is-closing');
      document.body.classList.remove('modal-open');
      lastTrigger?.focus({ preventScroll: true });
    }, reduceMotion.matches ? 0 : 150);
  }
  [detail, lightbox].forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog);
    });
  });
  function showDetail(title, description, content, trigger, eyebrow = "Sumera's Hair & Beauty Salon") {
    document.querySelector('#detail-title').textContent = title;
    document.querySelector('#detail-eyebrow').textContent = eyebrow;
    document.querySelector('#detail-description').textContent = description;
    document.querySelector('#detail-content').replaceChildren();
    if (content) document.querySelector('#detail-content').append(content);
    openDialog(detail, trigger);
  }
  function note(text) { const paragraph = document.createElement('p'); paragraph.className = 'dialog-note'; paragraph.textContent = text; return paragraph; }
  const bookingNote = 'Contact the salon to check availability and confirm your appointment.';
  function book(trigger, selected = '') {
    const block = document.createElement('div');
    const label = document.createElement('label'); label.htmlFor = 'booking-service'; label.textContent = 'Which service are you interested in?';
    const select = document.createElement('select'); select.id = 'booking-service';
    select.add(new Option('Choose a service', ''));
    Object.keys(services).forEach(service => select.add(new Option(service, service)));
    select.value = selected;
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    const whatsapp = document.createElement('a'); whatsapp.className = 'button'; whatsapp.textContent = 'Enquire on WhatsApp'; whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
    const call = document.createElement('a'); call.className = 'button button-outline'; call.textContent = 'Call the Salon'; call.href = 'tel:+442086160390';
    const update = () => { whatsapp.href = 'https://wa.me/447950891055?text=' + encodeURIComponent(`Hello Sumera, I'd like to enquire about ${select.value || 'an appointment'}. Could you let me know your availability?`); };
    select.addEventListener('change', update); update();
    actions.append(whatsapp, call);
    block.append(label, select, actions, note(bookingNote));
    showDetail('Book Your Visit', 'Choose your treatment, then speak to the team.', block, trigger, 'Your Next Appointment');
  }
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => book(button)));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    const service = button.dataset.service;
    const block = document.createElement('div');
    const list = document.createElement('ul'); list.className = 'service-list';
    services[service].forEach(([name,price]) => { const li = document.createElement('li'); const title = document.createElement('span'); title.textContent = name; const amount = document.createElement('span'); amount.textContent = price; li.append(title,amount); list.append(li); });
    const action = document.createElement('button'); action.className = 'button'; action.textContent = 'Book Appointment';
    action.addEventListener('click', () => {
      detail.close(); detail.classList.remove('is-open'); book(button, service);
    });
    block.append(list, action, note('Prices are from the salon menu. The team will confirm the treatment and final price with you.'));
    showDetail(service, 'Explore the treatments available at Sumera’s.', block, button, 'Our Services');
  }));
  document.querySelector('[data-services]').addEventListener('click', event => {
    const list = document.createElement('div');
    Object.keys(services).forEach(item => { const button=document.createElement('button');button.className='course-link';button.textContent=item;button.addEventListener('click',()=>{detail.close();document.querySelector(`[data-service="${item}"]`).click();});list.append(button); });
    showDetail('Our Treatments', 'Choose a treatment area to see the salon menu.', list, event.currentTarget, 'Our Services');
  });
  document.querySelectorAll('[data-courses], [data-course-dates]').forEach(button => button.addEventListener('click', () => {
    const block = document.createElement('div');
    [['Hair Cutting','hair-cutting-course'],['Facial & Skincare','facial-and-skincare-course'],['Dermaplaning','dermaplaning-training-course']].forEach(([name,slug])=>{const link=document.createElement('a');link.className='course-link';link.href=`https://sumerasalon.co.uk/product/${slug}/`;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`${name} →`;block.append(link);});
    const enquire=document.createElement('a');enquire.className='button';enquire.href='https://wa.me/447950891055?text='+encodeURIComponent("Hello Sumera, I'd like to enquire about your academy courses and upcoming dates.");enquire.target='_blank';enquire.rel='noopener noreferrer';enquire.textContent='Ask About Course Dates';
    block.append(enquire);
    showDetail(button.hasAttribute('data-course-dates') ? 'Find Your Course Date' : 'Learn at Sumera Academy', 'Explore a course or ask the team about the next available dates.', block, button, 'Sumera Academy');
  }));
  function renderGallery() {
    const entry = gallery[galleryIndex];
    const image = document.querySelector('#lightbox-image'); image.src = entry.source; image.alt = entry.alt;
    document.querySelector('#lightbox-caption').textContent = entry.alt;
  }
  function showGallery(index, trigger) { galleryIndex = index; renderGallery(); openDialog(lightbox, trigger); }
  document.querySelectorAll('[data-gallery]').forEach(button => button.addEventListener('click', () => showGallery(Number(button.dataset.gallery), button)));
  document.querySelector('[data-open-gallery]').addEventListener('click', event => showGallery(0, event.currentTarget));
  const moveGallery = delta => { galleryIndex = (galleryIndex + delta + gallery.length) % gallery.length; renderGallery(); };
  document.querySelector('[data-lightbox-prev]').addEventListener('click', () => moveGallery(-1));
  document.querySelector('[data-lightbox-next]').addEventListener('click', () => moveGallery(1));
  lightbox.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') moveGallery(-1); if (event.key === 'ArrowRight') moveGallery(1); });
  const track = document.querySelector('.gallery-track');
  const scrollGallery = (direction, trigger) => {
    if (track.scrollWidth <= track.clientWidth + 1) { showGallery(direction > 0 ? 1 : gallery.length - 1, trigger); return; }
    track.scrollBy({ left: direction * (track.clientWidth * .8), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  };
  document.querySelector('.gallery-prev').addEventListener('click', event => scrollGallery(-1, event.currentTarget));
  document.querySelector('.gallery-next').addEventListener('click', event => scrollGallery(1, event.currentTarget));
  document.querySelectorAll('[data-social]').forEach(button => button.addEventListener('click', () => showDetail(button.dataset.social, 'Sumera’s social profile link will be added when confirmed.', null, button)));
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => showDetail(button.dataset.info, 'This local design preview does not collect personal information, use tracking or save cookies. Salon policy text will be supplied before the website goes live.', null, button)));
})();
