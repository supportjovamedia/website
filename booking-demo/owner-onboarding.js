/* Submitted setup steps belong to the authenticated owner, never to a browser draft. */
(function(){
 'use strict';
 const stages=['profile','business','category','team','location','source','ready'];
 const categories=[['hair','Hair salon'],['barber','Barber'],['nails','Nails'],['lashes','Brows & lashes'],['beauty','Beauty'],['aesthetics','Aesthetics'],['massage','Massage'],['spa','Spa'],['waxing','Waxing'],['tattoo','Tattoo & piercing'],['tanning','Tanning'],['fitness','Fitness'],['physio','Physiotherapy'],['health','Health practice'],['pets','Pet grooming'],['tutoring','Tutoring'],['photography','Photography'],['driving','Driving lessons'],['professional','Professional services'],['other','Other']];
 const countries=[['GB','United Kingdom'],['US','United States'],['CA','Canada'],['AU','Australia']];
 window.JovaOwnerOnboarding={create(h){
  let identity=null,stage='email',email='',data={},steps={},loaded=false,loading=false,message='',businessId=null,pending=false;
  const esc=h.esc;
  const field=(label,name,value='',type='text',extra='')=>`<label class="ob-field">${label}<input name="${name}" type="${type}" value="${type==='password'?'':esc(value||'')}" ${extra}></label>`;
  const options=(name,list,value)=>`<div class="ob-options">${list.map(([key,label])=>`<label class="ob-option"><input type="radio" name="${name}" value="${key}" ${value===key?'checked':''} required><span>${label}</span></label>`).join('')}</div>`;
  function reset(){identity=null;stage='email';email='';data={};steps={};loaded=false;loading=false;message='';businessId=null;}
  function nextMissing(){return ['profile','business','category','team','location'].find(s=>!steps[s])||(!steps.source?'source':'ready');}
  async function load(){
   if(loading)return;loading=true;const expected=identity;
   let result;try{result=await h.directory.onboardingProgress();}catch{result={ok:false,message:'We could not load your progress. Please try again.'};}
   if(identity!==expected||h.directory.sessionIdentity()!==expected)return;
   loading=false;loaded=true;
   if(!result.ok){message=result.message;stage='load-error';h.render();return;}
   data=result.data.data||{};steps=result.data.steps||{};email=result.data.email;businessId=result.data.business_id;
   // Confirmed email owners already submitted this profile before verification.
   if(!h.directory.needsOwnerPassword?.()&&!steps.profile&&data.first_name&&data.last_name&&countries.some(([key])=>key===data.country)){
    const saved=await h.directory.onboardingProgress('profile',{first_name:data.first_name,last_name:data.last_name,country:data.country,mobile:data.mobile||''});
    if(identity!==expected||h.directory.sessionIdentity()!==expected)return;
    if(saved.ok){steps=saved.data.steps;data=saved.data.data;}
   }
   stage=h.directory.needsOwnerPassword?.()?'profile':result.data.completed_at?'ready':nextMissing();message='';h.render();
  }
  function page(){
   if(!loading)window.JovaOwnerDiagnostics?.onboarding?.(stage);
   const owner=h.directory.sessionIdentity();
   if(owner!==identity){reset();identity=owner;}
   if(owner&&!loaded&&!loading)void load();
   let title='',sub='',content='',button='Continue';
   if(loading){title='Opening your account';content='<p role="status">Loading your saved progress...</p>';}
   else if(stage==='load-error'){title='Let’s try that again';content='<button type="button" class="btn primary wide" data-onb="retry">Load my progress</button>';}
   else if(stage==='email'){title='Your next booking starts here.';sub='Create your free business account.';content=(window.JovaGoogleAuth?.button()||'')+field('Email','email',email,'email','required maxlength="254" autocomplete="email" placeholder="you@example.com"')+'<button class="btn primary wide">Continue with email</button><p class="ob-switch">Already have an account? <a href="#login">Sign in</a></p>';}
   else if(stage==='profile'){
    title=owner&&!h.directory.needsOwnerPassword?.()?'A little about you':'Create your account';sub=owner?'Your details, all in one place.':email;
    content='<div class="ob-pair">'+field('First name','first_name',data.first_name,'text','required maxlength="40" autocomplete="given-name"')+field('Last name','last_name',data.last_name,'text','required maxlength="40" autocomplete="family-name"')+'</div>'+field('Mobile number (optional)','mobile',data.mobile,'tel','maxlength="24" autocomplete="tel"')+'<label class="ob-field">Country<select name="country" required><option value="">Choose your country</option>'+countries.map(([key,label])=>`<option value="${key}" ${(data.country||'GB')===key?'selected':''}>${label}</option>`).join('')+'</select></label>';
    if(!owner||h.directory.needsOwnerPassword?.())content+=field('Password','password','','password','required minlength="8" maxlength="72" autocomplete="new-password" aria-describedby="ob-password-rules"')+'<ul class="ob-password-rules" id="ob-password-rules" aria-label="Password requirements" aria-live="polite"><li data-password-rule="length">At least 8 characters</li><li data-password-rule="capital">One capital letter</li><li data-password-rule="number">One number</li></ul>';
    button=owner&&!h.directory.needsOwnerPassword?.()?'Continue':'Create account';
   }
   else if(stage==='check-email'){title='Check your email';sub='Open the email and confirm your address to create your account. You can open it on any device.';content='<p class="ob-switch">Can’t find it? Check your spam folder.</p><button type="button" class="btn primary wide" data-onb="resend">Resend verification email</button><p class="ob-switch">Already have an account? <a href="#login">Sign in</a></p>';}
   else if(stage==='business'){title='Give your business a home';content=field('Business name','business_name',data.business_name,'text','required maxlength="60" autocomplete="organization"'+(businessId?' readonly':'' ))+'<label class="ob-field">Booking page name<div class="ob-address"><span>book.jovamedia.com/</span><input name="booking_slug" value="'+esc(data.booking_slug||'')+'" '+(businessId?'readonly':'')+' required minlength="3" maxlength="30" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="your-business"></div></label>'+field('Referral code (optional)','referral_code',data.referral_code,'text','maxlength="10" autocomplete="off" autocapitalize="characters"'+(businessId?' readonly':'' ));}
   else if(stage==='category'){title='What kind of business do you run?';sub='Choose your main service.';content='<label class="ob-field">Primary category<select name="primary_category" required><option value="">Choose a category</option>'+categories.map(([key,label])=>`<option value="${key}" ${data.primary_category===key?'selected':''}>${label}</option>`).join('')+'</select></label><fieldset class="ob-related"><legend>Related services (optional, up to 3)</legend><div>'+categories.map(([key,label])=>`<label><input type="checkbox" name="related_categories" value="${key}" ${(data.related_categories||[]).includes(key)?'checked':''}><span>${label}</span></label>`).join('')+'</div></fieldset>';}
   else if(stage==='team'){title='How big is your team?';content=options('team_size',[['independent','Just me'],['2-5','2 to 5 people'],['6-10','6 to 10 people'],['11-20','11 to 20 people'],['20+','More than 20 people']],data.team_size);}
   else if(stage==='location'){title='Where do you provide your services?';content=options('service_location',[['physical','Clients come to me'],['mobile','I visit my clients'],['online','I work with clients online']],data.service_location);}
   else if(stage==='source'){title='Last question';sub='How did you hear about JovaBook?';content=options('heard_about',[['friend','A friend or colleague'],['search','Google, Bing or another search engine'],['instagram','Instagram'],['facebook','Facebook'],['nextdoor','Nextdoor'],['social_other','Other social media'],['ai','ChatGPT, Claude or another AI assistant'],['directory','A directory or review website'],['other','Somewhere else']],data.heard_about);button='Finish setup';}
   else if(stage==='ready'){title='Your workspace is ready';sub='Add your services, address and opening hours from your dashboard.';content='<div class="ob-success" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></div><button type="button" class="btn primary wide" data-onb="dashboard">Open dashboard</button>';}
   const index=Math.max(0,stages.indexOf(stage)),progress=stage==='email'||stage==='check-email'?'':`<div class="ob-progress" role="progressbar" aria-label="Account setup" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${index}">${stages.slice(0,6).map((s,i)=>`<span class="${i<=index?'is-done':''}"></span>`).join('')}</div>`;
   const back=stage==='email'||stage==='check-email'||loading||stage==='ready'?'':`<button type="button" class="ob-back" data-onb="back" aria-label="Previous step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m14 6-6 6 6 6"/></svg></button>`;
   const form=!loading&&!['load-error','ready','check-email'].includes(stage);
   return `<div class="ob-shell"><header class="ob-header"><a href="https://www.jovamedia.com/jovabook" class="ob-logo" aria-label="JovaBook home">JovaBook<span aria-hidden="true">.</span></a>${owner?'<button type="button" class="ob-logout" data-onb="logout">Log out</button>':'<a href="#login">Sign in</a>'}</header>${progress}<main class="ob-main">${back}<section class="ob-panel ${stage==='ready'?'ob-ready':''}"><h1>${title}</h1>${sub?`<p class="ob-intro">${esc(sub)}</p>`:''}${form?`<form data-form="owner-onboarding" data-stage="${stage}">`:''}${content}<div class="ob-error" role="alert">${esc(message)}</div>${form&&stage!=='email'?`<button class="btn primary wide">${button}</button>`:''}${form?'</form>':''}${stage==='email'?'<p class="ob-legal">By creating an account, you agree to our <a href="https://www.jovamedia.com/terms">Terms</a> and <a href="https://www.jovamedia.com/privacy-policy">Privacy Policy</a>.</p>':''}</section></main></div>`;
  }
  async function finish(source){
   let result=await h.directory.onboardingProgress('source',{heard_about:source});if(!result.ok)throw Error(result.message);
   result=await h.directory.onboardingProgress('complete');if(!result.ok)throw Error(result.message);
   steps=result.data.steps;stage='ready';
  }
  async function submit(form){
   if(form.dataset.stage!==stage||pending)return;pending=true;const expected=identity,values=new FormData(form),submitted=stage;
   const button=form.querySelector('button.primary');button.disabled=true;const original=button.textContent;button.textContent='Saving...';message='';
   try{
    if(stage==='email'){email=String(values.get('email')||'').trim();const result=await h.directory.requestOwnerVerification(email);if(!result.ok)throw Error(result.message);data={};stage='check-email';}
    else if(stage==='profile'&&!identity){
     const result=await h.directory.registerOwnerProfile({email,firstName:values.get('first_name'),lastName:values.get('last_name'),mobile:values.get('mobile'),country:values.get('country'),password:values.get('password')});
     form.elements.password.value='';if(!result.ok)throw Error(result.message);stage='check-email';
    }
    else{
     let payload=Object.fromEntries(values);
     if(stage==='category'){payload.related_categories=values.getAll('related_categories').filter(x=>x!==payload.primary_category);if(payload.related_categories.length>3)throw Error('Choose up to three related services.');}
     if(stage==='business'){
      payload.booking_slug=payload.booking_slug.trim().toLowerCase();payload.referral_code=payload.referral_code.trim().toUpperCase();
      if(!businessId){const created=await h.directory.createBusinessForExistingUser({name:payload.business_name,slug:payload.booking_slug,referralCode:payload.referral_code});if(!created.ok)throw Error(created.message);businessId=created.account.salonId;}
     }
     if(stage==='profile'&&identity&&h.directory.needsOwnerPassword?.()){const result=await h.directory.completeOwnerProfile(payload);if(!result.ok)throw Error(result.message);form.elements.password.value='';data=result.data.data;steps=result.data.steps;stage='business';}
     else if(stage==='source')await finish(payload.heard_about);
     else{const result=await h.directory.onboardingProgress(stage,payload);if(!result.ok)throw Error(result.message);data=result.data.data;steps=result.data.steps;stage=stages[stages.indexOf(stage)+1];}
    }
    if(h.directory.sessionIdentity()!==expected)return;window.JovaOwnerDiagnostics?.onboarding?.(submitted,submitted==='email'?'verification_requested':'step_saved');message='';h.render();document.querySelector('.ob-panel h1')?.scrollIntoView({block:'start'});
   }catch(error){if(h.directory.sessionIdentity()!==expected)return;message=error.message||'Your details could not be saved. Please try again.';const alert=form.querySelector('.ob-error');if(alert)alert.textContent=message;button.disabled=false;button.textContent=original;stage=submitted;}
   finally{pending=false;}
  }
  document.addEventListener('submit',event=>{const form=event.target.closest('[data-form="owner-onboarding"]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();void submit(form);},true);
  document.addEventListener('input',event=>{if(event.target.name!=='business_name')return;const slug=event.target.form?.elements.booking_slug;if(slug&&!slug.dataset.edited)slug.value=event.target.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30).replace(/-$/,'');});
  document.addEventListener('input',event=>{if(event.target.name==='booking_slug')event.target.dataset.edited='true';});
  document.addEventListener('input',event=>{
   if(event.target.name!=='password'||event.target.form?.dataset.form!=='owner-onboarding')return;
   const value=event.target.value,met={length:value.length>=8,capital:/[A-Z]/.test(value),number:/[0-9]/.test(value)};
   event.target.form.querySelectorAll('[data-password-rule]').forEach(item=>{const matches=met[item.dataset.passwordRule];if(item.classList.contains('is-met')===matches)return;item.classList.toggle('is-met',matches);item.setAttribute('aria-label',(matches?'Met: ':'Not yet met: ')+item.textContent);});
  });
  document.addEventListener('click',async event=>{
   const button=event.target.closest('[data-onb]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();
   if(button.disabled||pending)return;
   if(button.dataset.onb==='back'){message='';stage=stage==='profile'&&!identity?'email':stages[Math.max(0,stages.indexOf(stage)-1)];h.render();}
   else if(button.dataset.onb==='resend'){button.disabled=true;const result=await h.directory.requestOwnerVerification(email);message=result.ok?'Verification email requested. Check your inbox.':result.message;h.render();}
   else if(button.dataset.onb==='retry'){loaded=false;message='';h.render();}
   else if(button.dataset.onb==='logout'){reset();await h.logout();}
   else if(button.dataset.onb==='dashboard'){button.disabled=true;const result=await h.openDashboard();if(!result.ok){button.disabled=false;message=result.message||'We could not open your dashboard. Please try again.';h.render();}}
  },true);
  return {page,reset};
 }};
})();
