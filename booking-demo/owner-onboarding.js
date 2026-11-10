/* Submitted setup steps belong to the authenticated owner, never to a browser draft. */
(function(){
 'use strict';
 const stages=['profile','business','category','team','location','software','source','ready'];
 const software=['Acuity','Booksy','Faces','Fresha','Goldie','Kitomba','Mindbody','Ovatu','Pabau','Phorest','Salon Iris','Setmore','Shortcuts','SimplyBook.me','Slick','Square','Timely','Treatwell','Vagaro','Zenoti'].map(name=>[name,name]).concat([['none','I’m not using any software'],['other','Other']]);
 const paths={hair:'M8 20V9a4 4 0 0 1 8 0v11M5 20V9a7 7 0 0 1 14 0v11M8 9c3 2 5 2 8 0',barber:'M5 3l14 18M19 3 5 21M8 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0',nails:'M8 10V6a4 4 0 0 1 8 0v4M6 10h12v11H6z',lashes:'M3 9c4 5 14 5 18 0M5 11l-2 4m6-2-1 4m7-4 1 4m3-6 2 4',beauty:'M9 8V4h6v4M7 8h10v13H7zM8 4h11',aesthetics:'m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3z',massage:'M3 12h18v5H3zM5 17v4m14-4v4M6 8h8m3 0h2',spa:'M6 5h12v16H6zM9 5V2h6v3M9 9h6',waxing:'M6 10h12v11H6zM9 10V5h6V3h4',tattoo:'m12 20-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6z',tanning:'M4 10h6v6H4zM14 10h6v6h-6zM10 12h4M4 10 6 5m14 5-2-5',fitness:'M2 9v6m4-9v12m12-12v12m4-9v6M6 12h12',physio:'M4 4v9l5 2 5 5h7v-4h-5l-4-5V4z',health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',pets:'M7 14c3-5 7-5 10 0 5 6-1 8-5 5-4 3-10 1-5-5M4 6v3m5-6v4m6-4v4m5-1v3',tutoring:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16',photography:'M3 7h4l2-3h6l2 3h4v14H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',driving:'M4 10l2-6h12l2 6v9H4zM4 11h16M7 15h2m6 0h2M6 19v3m12-3v3',professional:'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',other:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'};
 const icon=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.other}"/></svg>`;
 const categories=[['hair','Hair salon'],['barber','Barber'],['nails','Nails'],['lashes','Brows & lashes'],['beauty','Beauty'],['aesthetics','Aesthetics'],['massage','Massage'],['spa','Spa'],['waxing','Waxing'],['tattoo','Tattoo & piercing'],['tanning','Tanning'],['fitness','Fitness'],['physio','Physiotherapy'],['health','Health practice'],['pets','Pet grooming'],['tutoring','Tutoring'],['photography','Photography'],['driving','Driving lessons'],['professional','Professional services'],['other','Other']];
 const countries=[['GB','United Kingdom'],['US','United States'],['CA','Canada'],['AU','Australia']];
 window.JovaOwnerOnboarding={create(h){
  let identity=null,stage='email',email='',data={},steps={},loaded=false,loading=false,message='',businessId=null,payment=null,pending=false,lastCodeSentAt=0,codeLimit=false,codeTimer=null,importRows=null,operationVersion=0;
  const esc=h.esc;
  const field=(label,name,value='',type='text',extra='')=>`<label class="ob-field">${label}<input name="${name}" type="${type}" value="${type==='password'?'':esc(value||'')}" ${extra}></label>`;
  const options=(name,list,value)=>`<div class="ob-options">${list.map(([key,label])=>`<label class="ob-option"><input type="radio" name="${name}" value="${key}" ${value===key?'checked':''} required><span>${label}</span></label>`).join('')}</div>`;
  function reset(){operationVersion++;pending=false;identity=null;stage='email';email='';data={};steps={};loaded=false;loading=false;message='';businessId=null;payment=null;importRows=null;clearInterval(codeTimer);}
  const paidChoice=()=>{const choice=h.purchaseIntent?.();return choice&&['standard','premium'].includes(choice.plan)?{plan:choice.plan,cadence:choice.cadence==='annual'?'annual':'monthly',seats:choice.plan==='premium'?Math.max(1,Math.min(1000,Math.floor(Number(choice.seats)||1))):1}:null;};
  const paymentAmount=()=>Number.isSafeInteger(payment?.amount_pence)&&payment.amount_pence>0&&payment.currency==='GBP'?'£'+(payment.amount_pence/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  function checkoutRequest(){const key='jovabook-signup-checkout-v1:'+identity,scope=JSON.stringify([payment.business_id,payment.plan,payment.cadence,payment.seats]);let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}if(saved?.scope===scope&&typeof saved.id==='string')return saved.id;const id=window.crypto?.randomUUID?.()||'signup-'+Date.now()+'-'+Math.random().toString(36).slice(2);try{localStorage.setItem(key,JSON.stringify({scope,id}));}catch{}return id;}
  function clearCheckoutRequest(id){const key='jovabook-signup-checkout-v1:'+identity,scope=JSON.stringify([payment.business_id,payment.plan,payment.cadence,payment.seats]);try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.scope===scope&&saved.id===id)localStorage.removeItem(key);}catch{}}
  function nextMissing(){return ['profile','business','category','team','location'].find(s=>!steps[s])||(!steps.source?(!steps.software?'software':'source'):'ready');}
  function setupData(values,completed={}){const result={...(values||{})};if(payment?.managed_signup&&!completed?.business){delete result.business_name;delete result.booking_slug;}return result;}
  function countdown(){
   clearInterval(codeTimer);const update=()=>{const button=document.querySelector('[data-onb="resend"]');if(stage!=='check-email'||!button){clearInterval(codeTimer);return;}
    const wait=Math.max(0,Math.ceil((60000-(Date.now()-lastCodeSentAt))/1000));button.disabled=pending||codeLimit||wait>0;button.textContent=codeLimit?'Try again later':wait?'Resend in '+Math.floor(wait/60)+':'+String(wait%60).padStart(2,'0'):'Resend code';};
   update();codeTimer=setInterval(update,1000);
  }
  async function load(){
   if(loading)return;loading=true;const expected=identity,version=operationVersion;
   let result;try{result=await h.directory.onboardingProgress();}catch{result={ok:false,message:'We could not load your progress. Please try again.'};}
   if(version!==operationVersion||identity!==expected||h.directory.sessionIdentity()!==expected)return;
   if(result.ok){
    payment=result.data.signup_payment||null;
    const choice=paidChoice();
    if(choice&&payment?.existing_account!==true&&payment?.managed_signup!==true){
     let quote;try{quote=await h.directory.signupPayment('read',choice);}catch{quote={ok:false,message:'We could not check your selected subscription. Please try again.'};}
     if(version!==operationVersion||identity!==expected||h.directory.sessionIdentity()!==expected)return;
     if(!quote.ok)result=quote;else payment=quote.data;
    }
   }
   loading=false;loaded=true;
   if(!result.ok){message=result.message;stage='load-error';h.render();return;}
   data=setupData(result.data.data,result.data.steps);steps=result.data.steps||{};email=result.data.email;businessId=result.data.business_id;
   if(payment?.managed_signup)data.referral_code=payment.referral_code||'';
   const needsPayment=payment?.existing_account!==true&&payment?.onboarding_completed!==true&&!result.data.completed_at&&(payment?.managed_signup===true?payment.payment_required===true:!!paidChoice());
   stage=needsPayment&&payment?.paid_verified!==true?'payment':h.directory.needsOwnerPassword?.()?'profile':result.data.completed_at?'ready':nextMissing();message='';h.render();
  }
  function page(){
   if(!loading)window.JovaOwnerDiagnostics?.onboarding?.(stage);
   const owner=h.directory.sessionIdentity();
   if(owner!==identity){reset();identity=owner;}
   if(owner&&!loaded&&!loading)void load();
   let title='',sub='',content='',button='Continue';const businessLocked=businessId&&(!payment?.managed_signup||!!steps.business);
   if(loading){title='Opening your account';content='<p role="status">Loading your saved progress...</p>';}
   else if(stage==='load-error'){title='Let’s try that again';content='<button type="button" class="btn primary wide" data-onb="retry">Load my progress</button>';}
   else if(stage==='email'){title='Your next booking starts here.';sub=paidChoice()?'Create your business account.':'Create your free business account.';content=(window.JovaGoogleAuth?.button()||'')+field('Email','email',email,'email','required maxlength="254" autocomplete="email" placeholder="you@example.com"')+'<button class="btn primary wide">Continue with email</button><p class="ob-switch">Already have an account? <a href="#login">Sign in</a></p>';}
   else if(stage==='payment'){
    title='Your selected subscription';sub='Your email is verified. Pay securely with Stripe, then finish setting up your business.';button='Continue to secure payment';
    const amount=paymentAmount(),name=payment?.plan==='premium'?'Team':'Solo',seats=payment?.plan==='premium'?payment.seats:1;
    content='<section class="ob-payment-summary" aria-label="Selected subscription"><h2>'+name+'</h2><dl><div><dt>Billing</dt><dd>'+(payment?.cadence==='annual'?'Yearly, paid upfront':'Monthly')+'</dd></div><div><dt>Staff seats</dt><dd>'+esc(seats)+'</dd></div><div class="ob-payment-total"><dt>Due today</dt><dd>'+esc(amount||'Not available')+'</dd></div></dl><p>'+esc(amount?amount+(payment.cadence==='annual'?' per year':' per month')+', renewing automatically.':'Your subscription amount could not be verified. Refresh before continuing.')+'</p></section><label class="ob-consent"><input type="checkbox" name="payment_legal_accepted" value="accepted" required><span>I agree to the <a href="https://www.jovamedia.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>, <a href="https://www.jovamedia.com/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.jovamedia.com/terms#jovabook-terms" target="_blank" rel="noopener">Terms of Business</a>.</span></label><p class="ob-hint">Your subscription starts when payment is confirmed. You’ll be billed '+(payment?.cadence==='annual'?'yearly':'monthly')+' on that date.</p><button type="button" class="ob-skip" data-onb="refresh-payment">Check payment status</button>';
    const referral=payment?.managed_signup?payment.referral_code||'':data.payment_referral_code??h.purchaseIntent?.()?.referralCode??window.JovaReferrals?.incoming?.()??'';
    content=content.replace('</section>','</section>'+field('Referral code (optional)','payment_referral_code',referral,'text','minlength="10" maxlength="10" pattern="[A-Za-z0-9]{10}" autocomplete="off" autocapitalize="characters"'+(payment?.managed_signup?' readonly':'')));
   }
   else if(stage==='profile'){
    title=owner&&!h.directory.needsOwnerPassword?.()?'A little about you':'Create your account';sub=owner?'Your details, all in one place.':email;
    const phone=String(data.mobile||''),prefix=phone.startsWith('+44')?'+44':phone.startsWith('+61')?'+61':phone.startsWith('+1')?'+1':'+44';
    content='<div class="ob-pair">'+field('First name','first_name',data.first_name,'text','required maxlength="40" autocomplete="given-name"')+field('Last name','last_name',data.last_name,'text','required maxlength="40" autocomplete="family-name"')+'</div><div class="ob-field"><label for="ob-mobile">Mobile number <span class="ob-optional">(optional)</span></label><div class="ob-phone"><select name="calling_code" aria-label="Country calling code" autocomplete="tel-country-code">'+[['+44','UK +44'],['+1','US / CA +1'],['+61','AU +61']].map(([key,label])=>`<option value="${key}" ${prefix===key?'selected':''}>${label}</option>`).join('')+'</select><input id="ob-mobile" name="mobile" type="tel" inputmode="tel" maxlength="24" autocomplete="tel-national" value="'+esc(phone.startsWith(prefix)?phone.slice(prefix.length):phone)+'"></div></div>';
    if(!owner||h.directory.needsOwnerPassword?.())content+='<div class="ob-field"><label for="ob-password">Password</label><div class="ob-password"><input id="ob-password" name="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password" aria-describedby="ob-password-rules"><button type="button" data-onb="password" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div><ul class="ob-password-rules" id="ob-password-rules" aria-label="Password requirements" aria-live="polite"><li data-password-rule="length">8 characters</li><li data-password-rule="capital">One capital</li><li data-password-rule="number">One number</li></ul>';
    content+='<label class="ob-field">Country<select name="country" required>'+countries.map(([key,label])=>`<option value="${key}" ${(data.country||'GB')===key?'selected':''}>${label}</option>`).join('')+'</select></label><label class="ob-consent"><input type="checkbox" name="legal_accepted" value="accepted" required><span>I agree to the <a href="https://www.jovamedia.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>, <a href="https://www.jovamedia.com/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.jovamedia.com/terms#jovabook-terms" target="_blank" rel="noopener">Terms of Business</a>.</span></label>';
    button='Agree and continue';
   }
   else if(stage==='check-email'){title='Confirm your email';sub='We sent you a code to '+email;button='Continue';content='<fieldset class="ob-code-boxes"><legend class="ob-sr-only">Six-digit verification code</legend>'+Array.from({length:6},(_,i)=>`<input type="text" inputmode="numeric" ${i===0?'autocomplete="one-time-code"':'autocomplete="off"'} aria-label="Digit ${i+1} of 6" data-code-digit="${i}" maxlength="6" pattern="[0-9]*">`).join('')+'<input type="hidden" name="verification_code"></fieldset>';setTimeout(countdown,0);}
   else if(stage==='business'){title='What’s your business called?';content=field('Business name','business_name',data.business_name,'text','required maxlength="60" autocomplete="organization"'+(businessLocked?' readonly':'' ))+'<label class="ob-field">Your booking page<div class="ob-address"><span>book.jovamedia.com/</span><input name="booking_slug" value="'+esc(data.booking_slug||'')+'" '+(businessLocked?'readonly':'')+' required minlength="3" maxlength="30" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="your-business"></div></label>'+field('Existing website (optional)','existing_website',data.existing_website,'url','maxlength="2048" autocomplete="url" placeholder="https://"')+(payment?.managed_signup?(payment.referral_code?field('Referral code','referral_code',payment.referral_code,'text','readonly')+'<p class="ob-hint">Applied at payment.</p>':'<input type="hidden" name="referral_code" value="">'):field('Referral code (optional)','referral_code',data.referral_code,'text','maxlength="10" autocomplete="off" autocapitalize="characters"'+(businessLocked?' readonly':'')));}
   else if(stage==='category'){title='What’s your primary service?';content='<fieldset class="ob-services"><legend class="ob-sr-only">Choose one primary service</legend><div class="ob-options">'+categories.map(([key,label])=>`<label class="ob-option ob-service"><input type="radio" name="primary_category" value="${key}" ${data.primary_category===key?'checked':''} required>${icon(key)}<span>${label}</span><small>Primary</small></label>`).join('')+'</div></fieldset><div data-other-service '+(data.primary_category==='other'?'':'hidden')+'>'+field('Your primary service','other_category',data.other_category,'text','maxlength="80" autocomplete="off" '+(data.primary_category==='other'?'required':'disabled'))+'</div>';}
   else if(stage==='team'){title='How big is your team?';content=options('team_size',[['independent','Just me'],['2-5','2 to 5 people'],['6-10','6 to 10 people'],['11-20','11 to 20 people'],['20+','More than 20 people']],data.team_size);}
   else if(stage==='location'){title='Where do you provide your services?';sub='Choose all that apply.';content='<fieldset class="ob-location"><legend class="ob-sr-only">Service locations</legend><div class="ob-options">'+[['physical','Clients come to me','At a physical location'],['mobile','I visit my clients','At their home or workplace'],['online','I work with clients online','Virtual appointments']].map(([key,label,detail])=>`<label class="ob-option"><input type="checkbox" name="service_locations" value="${key}" ${(data.service_locations||[data.service_location]).includes(key)?'checked':''}><span><strong>${label}</strong><small>${detail}</small></span></label>`).join('')+'</div></fieldset>';}
   else if(stage==='software'){title='Already using a booking system?';content='<label class="ob-field">Your current system<select name="current_software" required><option value="">Choose an option</option>'+software.map(([key,label])=>`<option value="${key}" ${data.current_software===key?'selected':''}>${label}</option>`).join('')+'</select></label><div data-other-software '+(data.current_software==='other'?'':'hidden')+'>'+field('Which system?','other_software',data.other_software,'text','maxlength="80" '+(data.current_software==='other'?'required':'disabled'))+'</div><details class="ob-import"><summary>Bring your clients with you</summary><p>Import a CSV with name, email and phone columns. You can do this later.</p><a href="/client-import-template.csv" download>Download the CSV template</a><label class="ob-field">Client CSV (optional)<input type="file" accept=".csv,text/csv" data-import-file></label><p data-import-status role="status">'+(importRows?importRows.length+' clients ready to import.':'')+'</p><button type="button" data-onb="clear-import" '+(importRows?'':'hidden')+'>Remove file</button></details>';}
   else if(stage==='source'){title='Last question';sub='How did you hear about JovaBook?';content=options('heard_about',[['friend','A friend or colleague'],['search','Google, Bing or another search engine'],['instagram','Instagram'],['facebook','Facebook'],['nextdoor','Nextdoor'],['social_other','Other social media'],['ai','ChatGPT, Claude or another AI assistant'],['directory','A directory or review website'],['other','Somewhere else']],data.heard_about);button='Finish setup';}
   else if(stage==='ready'){title='You’re all set';sub='Your JovaBook workspace is ready.';content='<div class="ob-success" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></div><p class="ob-welcome-next">Add your services, address and opening hours in your dashboard.</p><button type="button" class="btn primary wide" data-onb="dashboard">Go to my dashboard</button>';}
   const index=Math.max(0,stages.indexOf(stage)),progress=['email','check-email','payment'].includes(stage)?'':`<nav class="ob-steps" aria-label="Registration progress"><div class="ob-progress" role="progressbar" aria-label="Account setup" aria-valuemin="0" aria-valuemax="7" aria-valuenow="${stage==='ready'?7:index}">${stages.slice(0,7).map((s,i)=>`<span class="${i<=index?'is-done':''}"></span>`).join('')}</div><p>${stage==='ready'?'Setup complete':stage==='source'?'Last question':'Account setup · '+(index+1)+' of 7'}</p></nav>`;
   const back=['email','check-email','payment'].includes(stage)||loading||stage==='ready'?'':`<button type="button" class="ob-back" data-onb="back" aria-label="Previous step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m14 6-6 6 6 6"/></svg></button>`;
   const form=!loading&&!['load-error','ready'].includes(stage);
   return `<div class="ob-shell"><header class="ob-header"><a href="https://www.jovamedia.com/jovabook" class="ob-logo" aria-label="JovaBook home">JovaBook<span aria-hidden="true">.</span></a>${owner?'<button type="button" class="ob-logout" data-onb="logout">Log out</button>':'<a href="#login">Sign in</a>'}</header>${progress}<main class="ob-main ${stage==='category'?'ob-main-categories':''}">${back}<section class="ob-panel ${stage==='ready'?'ob-ready':''}"><h1 tabindex="-1">${title}</h1>${sub?`<p class="ob-intro">${esc(sub)}</p>`:''}${form?`<form data-form="owner-onboarding" data-stage="${stage}">`:''}${content}<div class="ob-error" role="alert">${esc(message)}</div>${form&&stage!=='email'?`<button class="btn primary wide" ${stage==='check-email'||stage==='payment'&&!paymentAmount()?'disabled':''}>${button}</button>`:''}${stage==='check-email'?'<div class="ob-code-actions"><p>Didn’t receive a code? <button type="button" data-onb="resend" disabled>Resend in 1:00</button></p><p class="ob-code-help">Can’t find the code? Check your spam or junk folder.</p><button type="button" data-onb="change-email">Change email</button><a href="https://www.jovamedia.com/contact" target="_blank" rel="noopener">Contact us</a></div>':''}${form?'</form>':''}</section></main></div>`;
  }
  async function finish(source,guard){
   let result=await h.directory.onboardingProgress('source',{heard_about:source});guard();if(!result.ok)throw Error(result.message);
   result=await h.directory.onboardingProgress('complete');guard();if(!result.ok)throw Error(result.message);
   steps=result.data.steps;stage='ready';
  }
  async function submit(form){
   if(form.dataset.stage!==stage||pending)return;pending=true;const version=++operationVersion,submitted=stage;
   let expected=identity;const button=form.querySelector('button.primary'),original=button?.textContent;
   const guard=()=>{if(version===operationVersion&&identity===expected&&h.directory.sessionIdentity()===expected)return;if(version===operationVersion){reset();identity=h.directory.sessionIdentity();h.render();}throw Object.assign(Error('Your account changed. Continue with the current account.'),{stale:true});};
   try{
    guard();const values=new FormData(form);if(!button)throw Error('Your details could not be saved. Please try again.');button.disabled=true;button.textContent='Saving...';form.setAttribute('aria-busy','true');message='';
    if(stage==='email'){email=String(values.get('email')||'').trim();const result=await h.directory.requestOwnerVerification(email);guard();if(!result.ok)throw Error(result.message);lastCodeSentAt=Date.now();codeLimit=result.remaining===0;data={};stage='check-email';}
    else if(stage==='payment'){
     if(values.get('payment_legal_accepted')!=='accepted')throw Error('Agree to the terms before continuing to payment.');
     if(!paymentAmount()||!['standard','premium'].includes(payment?.plan)||!['monthly','annual'].includes(payment?.cadence)||!payment?.legal_version)throw Error('Your selected subscription could not be verified. Check payment status and try again.');
     const referral=String(values.get('payment_referral_code')||'').trim().toUpperCase();data.payment_referral_code=referral;if(referral&&!/^[A-Z0-9]{10}$/.test(referral))throw Error('Enter a valid 10-character referral code, or leave it blank.');
     const prepared=await h.directory.signupPayment('prepare',{plan:payment.plan,cadence:payment.cadence,seats:payment.seats,legal_accepted:true,legal_version:payment.legal_version,...(referral?{referral_code:referral}:{})});guard();if(!prepared.ok)throw Error(prepared.message);payment=prepared.data;businessId=payment.business_id||businessId;data.referral_code=payment.referral_code||'';
     if(payment.existing_account||payment.paid_verified){loaded=false;h.render();return;}
     if(!payment.managed_signup||!payment.payment_required||!businessId||!paymentAmount())throw Error('Your payment could not be prepared. Check payment status and try again.');
     const referralInput=form.elements.payment_referral_code;if(referralInput){referralInput.value=payment.referral_code||'';referralInput.readOnly=true;}
     const requestId=checkoutRequest(),result=await h.directory.offerBilling('checkout',{plan:payment.plan,cadence:payment.cadence,seats:payment.seats,request_id:requestId});guard();if(!result.ok){if(result.status===409)clearCheckoutRequest(requestId);throw Error(result.message);}
     if(result.data?.kind==='verified'){
      const checked=await h.directory.ownerAccess('signup_payment_verified');guard();if(!checked.ok)throw Error(checked.message||'We could not confirm your payment. Check payment status and try again.');
      const progress=await h.directory.onboardingProgress();guard();if(!progress.ok)throw Error(progress.message);payment=progress.data.signup_payment||payment;
      if(payment.paid_verified!==true)throw Error('Payment is not confirmed yet. Use Check payment status before trying again.');
      data=setupData(progress.data.data,progress.data.steps);steps=progress.data.steps||{};businessId=progress.data.business_id||businessId;stage=h.directory.needsOwnerPassword?.()?'profile':progress.data.completed_at?'ready':nextMissing();h.render();return;
     }
     let url;try{url=new URL(result.data?.url);}catch{throw Error('Your secure payment page could not be opened. Check payment status before trying again.');}
     if(url.origin!=='https://checkout.stripe.com'||url.username||url.password||url.port)throw Error('The payment page could not be verified. Please try again.');
     window.location.assign(url.href);return;
    }
    else if(stage==='check-email'){
     const result=await h.directory.verifyOwnerCode(email,values.get('verification_code'));if(version!==operationVersion)return;if(!result.ok){guard();throw Error(result.message);}
     form.elements.verification_code.value='';identity=h.directory.sessionIdentity();expected=identity;loaded=false;loading=false;data={};steps={};stage='profile';message='';h.render();return;
    }
    else if(stage==='profile'&&!identity){
     const result=await h.directory.registerOwnerProfile({email,firstName:values.get('first_name'),lastName:values.get('last_name'),mobile:values.get('mobile'),country:values.get('country'),password:values.get('password')});
     guard();form.elements.password.value='';if(!result.ok)throw Error(result.message);stage='check-email';
    }
    else{
     let payload=Object.fromEntries(values);
     if(stage==='profile'){payload={first_name:values.get('first_name'),last_name:values.get('last_name'),country:values.get('country'),mobile:String(values.get('mobile')||'').trim()?String(values.get('calling_code'))+String(values.get('mobile')).trim().replace(/^0/,''):'',legal_accepted:values.get('legal_accepted')};if(values.has('password'))payload.password=values.get('password');}
     if(stage==='location'){payload={service_locations:values.getAll('service_locations')};if(!payload.service_locations.length)throw Error('Choose at least one service location.');}
     if(stage==='software'){payload={current_software:values.get('current_software')};if(payload.current_software==='other')payload.other_software=String(values.get('other_software')||'').trim();if(importRows){const imported=await h.directory.importOwnerClients(importRows);guard();if(!imported.ok)throw Error(imported.message);importRows=null;}}
     if(stage==='category'){payload={primary_category:values.get('primary_category')};if(payload.primary_category==='other'){payload.other_category=String(values.get('other_category')||'').trim();if(!payload.other_category)throw Error('Tell us your primary service.');}}
     if(stage==='business'){
      payload.booking_slug=String(payload.booking_slug||'').trim().toLowerCase();payload.referral_code=String(payload.referral_code||'').trim().toUpperCase();
     }
     const {password,...draft}=payload;data={...data,...draft};
     if(stage==='business'&&!businessId){const created=await h.directory.createBusinessForExistingUser({name:payload.business_name,slug:payload.booking_slug,referralCode:payload.referral_code});guard();if(!created.ok)throw Error(created.message);businessId=created.account.salonId;}
     if(stage==='profile'&&identity&&h.directory.needsOwnerPassword?.()){const result=await h.directory.completeOwnerProfile(payload);guard();if(!result.ok)throw Error(result.message);form.elements.password.value='';data=setupData(result.data.data,result.data.steps);steps=result.data.steps;stage='business';}
     else if(stage==='source')await finish(payload.heard_about,guard);
     else{const result=await h.directory.onboardingProgress(stage,payload);guard();if(!result.ok)throw Error(result.message);data=setupData(result.data.data,result.data.steps);steps=result.data.steps;stage=stages[stages.indexOf(stage)+1];}
    }
    guard();window.JovaOwnerDiagnostics?.onboarding?.(submitted,submitted==='email'?'verification_requested':'step_saved');message='';h.render();const heading=document.querySelector('.ob-panel h1');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});
   }catch(error){if(error.stale||version!==operationVersion)return;if(h.directory.sessionIdentity()!==expected){reset();identity=h.directory.sessionIdentity();h.render();return;}message=error.message||'Your details could not be saved. Please try again.';const alert=form.querySelector('.ob-error');if(alert)alert.textContent=message;stage=submitted;}
   finally{if(version===operationVersion){pending=false;if(button&&form.isConnected){button.disabled=false;button.textContent=original;form.removeAttribute('aria-busy');}}}
  }
  document.addEventListener('submit',event=>{const form=event.target.closest('[data-form="owner-onboarding"]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();void submit(form);},true);
  document.addEventListener('input',event=>{if(event.target.name!=='business_name')return;const slug=event.target.form?.elements.booking_slug;if(slug&&!slug.dataset.edited)slug.value=event.target.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30).replace(/-$/,'');});
  document.addEventListener('input',event=>{if(event.target.name==='booking_slug')event.target.dataset.edited='true';});
  document.addEventListener('change',event=>{
   if(!['primary_category','current_software'].includes(event.target.name))return;
   const form=event.target.form,other=form?.querySelector(event.target.name==='primary_category'?'[data-other-service]':'[data-other-software]'),input=other?.querySelector('input');if(!input)return;
   const selected=event.target.value==='other';other.hidden=!selected;input.required=selected;input.disabled=!selected;if(selected)input.focus();
  });
  function syncCode(form){const inputs=[...form.querySelectorAll('[data-code-digit]')],code=inputs.map(input=>input.value).join('');form.elements.verification_code.value=code;form.querySelector('button.primary').disabled=pending||!/^\d{6}$/.test(code);}
  function fillCode(input,text){const form=input.form,inputs=[...form.querySelectorAll('[data-code-digit]')],start=Number(input.dataset.codeDigit),digits=String(text).replace(/\D/g,'').slice(0,6);
   if(digits.length===6){inputs.forEach((cell,i)=>{cell.value=digits[i]||'';});inputs[5].focus();}
   else{digits.split('').forEach((digit,i)=>{if(inputs[start+i])inputs[start+i].value=digit;});if(!digits)input.value='';inputs[Math.min(5,start+digits.length)].focus();}syncCode(form);
  }
  document.addEventListener('input',event=>{if(event.target.matches('[data-code-digit]'))fillCode(event.target,event.target.value);});
  document.addEventListener('paste',event=>{if(!event.target.matches('[data-code-digit]'))return;event.preventDefault();fillCode(event.target,event.clipboardData.getData('text'));});
  document.addEventListener('keydown',event=>{const input=event.target;if(!input.matches('[data-code-digit]'))return;const inputs=[...input.form.querySelectorAll('[data-code-digit]')],i=Number(input.dataset.codeDigit);
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();inputs[Math.max(0,Math.min(5,i+(event.key==='ArrowLeft'?-1:1)))].focus();}
   if(event.key==='Backspace'&&!input.value&&i>0){event.preventDefault();inputs[i-1].value='';inputs[i-1].focus();syncCode(input.form);}
  });
  document.addEventListener('focusin',event=>{if(event.target.matches('[data-code-digit]'))event.target.select();});
  document.addEventListener('change',async event=>{
   if(!event.target.matches('[data-import-file]'))return;const file=event.target.files?.[0],form=event.target.form,expected=identity;importRows=null;
   const status=form.querySelector('[data-import-status]'),remove=form.querySelector('[data-onb="clear-import"]');remove.hidden=true;
   if(!file){status.textContent='';return;}
   try{if(file.size>250000)throw Error('Choose a CSV smaller than 250 KB, with up to 500 clients.');const rows=window.JovaClientImport.parse(await file.text());if(identity!==expected||stage!=='software'||!form.isConnected)return;importRows=rows;status.textContent=rows.length+' clients ready to import.';remove.hidden=false;}
   catch(error){event.target.value='';status.textContent=error.message;}
  });
  document.addEventListener('input',event=>{
   if(event.target.name!=='password'||event.target.form?.dataset.form!=='owner-onboarding')return;
   const value=event.target.value,met={length:value.length>=8,capital:/[A-Z]/.test(value),number:/[0-9]/.test(value)};
   event.target.form.querySelectorAll('[data-password-rule]').forEach(item=>{const matches=met[item.dataset.passwordRule];if(item.classList.contains('is-met')===matches)return;item.classList.toggle('is-met',matches);item.setAttribute('aria-label',(matches?'Met: ':'Not yet met: ')+item.textContent);});
  });
  document.addEventListener('click',async event=>{
   const button=event.target.closest('[data-onb]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();
   if(button.disabled||pending)return;
   if(button.dataset.onb==='password'){const input=document.querySelector('#ob-password'),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-label',show?'Hide password':'Show password');button.setAttribute('aria-pressed',String(show));}
   else if(button.dataset.onb==='clear-import'){importRows=null;const form=button.closest('form');form.querySelector('[data-import-file]').value='';form.querySelector('[data-import-status]').textContent='';button.hidden=true;}
   else if(button.dataset.onb==='back'){message='';stage=stage==='profile'&&!identity?'email':stages[Math.max(0,stages.indexOf(stage)-1)];h.render();}
   else if(button.dataset.onb==='change-email'){stage='email';message='';h.render();}
   else if(button.dataset.onb==='resend'){
    const wait=Math.ceil((60000-(Date.now()-lastCodeSentAt))/1000);if(wait>0){message='Please wait '+wait+' seconds before requesting another code.';h.render();return;}
    pending=true;button.disabled=true;try{const result=await h.directory.resendOwnerVerification(email);if(result.ok)lastCodeSentAt=Date.now();codeLimit=result.remaining===0||result.limited===true;message=result.ok?'New code sent. Check your inbox.':result.message;}finally{pending=false;h.render();}
   }
   else if(button.dataset.onb==='refresh-payment'){
    const expected=identity,version=++operationVersion;pending=true;button.disabled=true;message='';
    try{const checked=await h.directory.ownerAccess?.('signup_payment_refresh');if(version!==operationVersion||identity!==expected||h.directory.sessionIdentity()!==expected)return;if(checked&&!checked.ok)throw Error(checked.message||'We could not check payment. Please try again.');loaded=false;h.render();}
    catch(error){if(version!==operationVersion||identity!==expected)return;message=error.message||'We could not check payment. Please try again.';h.render();}
    finally{if(version===operationVersion){pending=false;if(button.isConnected)button.disabled=false;}}
   }
   else if(button.dataset.onb==='retry'){loaded=false;message='';h.render();}
   else if(button.dataset.onb==='logout'){reset();await h.logout();}
   else if(button.dataset.onb==='dashboard'){button.disabled=true;const result=await h.openDashboard();if(!result.ok){button.disabled=false;message=result.message||'We could not open your dashboard. Please try again.';h.render();}}
  },true);
  return {page,reset};
 }};
})();
