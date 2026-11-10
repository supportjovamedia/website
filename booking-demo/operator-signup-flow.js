/* Private Operator registration stages. No analytics scripts or contact actions. */
(() => {
  'use strict';
  const stages = [
    ['all', 'Signed up', 'signed_up', 'Account created'],
    ['verified', 'Email verified', 'email_verified', 'Verified login account'],
    ['business', 'Business created', 'business_created', 'Workspace created'],
    ['booking', 'First booking', 'first_booking', 'Has a recorded booking'],
  ];
  const labels = {email_pending:'Awaiting verification',setup_pending:'Business setup pending',business_created:'Business created',first_booking:'First booking recorded'};
  const next = {email_pending:'Verify email',setup_pending:'Finish business setup',business_created:'Take a first booking',first_booking:'Booking recorded'};

  const outreachNames={verify_email:'Verify your email',come_back:'Come back and log in',finish_setup:'Finish setting up your business'};
  const INACTIVE_MS=3*24*36e5;
  const distance=(a,b)=>{const m=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let prev=m[0];m[0]=i;for(let j=1;j<=b.length;j++){const keep=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=keep;}}return m[b.length];};
  // A signup that never verified, next to a near-identical verified address from the same day, is almost always a mistyped email.
  function typoMatches(list){
    const verified=list.filter(r=>r.verified_at),found=new Map();
    for(const row of list){
      if(row.verified_at||row.business_id)continue;
      const [local,domain]=String(row.email||'').toLowerCase().split('@');
      if(!domain||local.length<5)continue;
      const match=verified.find(v=>{const [vl,vd]=String(v.email||'').toLowerCase().split('@');return vd===domain&&vl!==local&&distance(vl,local)<=(Math.min(vl.length,local.length)>=8?2:1)&&Math.abs(Date.parse(v.created_at)-Date.parse(row.created_at))<=24*36e5;});
      if(match)found.set(row.id,match);
    }
    return found;
  }
  function eligibleTemplates(row,typo,now=Date.now()){
    if(typo)return [];
    const out=[];
    if(!row.verified_at)out.push('verify_email');
    if(row.verified_at&&!row.business_id)out.push('finish_setup');
    if(row.verified_at&&now-Date.parse(row.last_sign_in_at||row.created_at)>=INACTIVE_MS)out.push('come_back');
    return out;
  }
  function outreachControl(row,typo,esc,joined,now){
    const last=row.outreach?`<span class="op-outreach-last">Last emailed: ${esc(outreachNames[row.outreach.template]||'Email')}<br>${esc(joined(row.outreach.at))}</span>`:'';
    if(typo)return `<span class="op-flow-next">No email needed. Their verified account is ${esc(typo.email)}.</span>`;
    const options=eligibleTemplates(row,typo,now);
    if(!options.length)return last;
    const pick=!row.verified_at?'verify_email':!row.business_id?'finish_setup':'come_back';
    return `<div class="op-outreach"><form data-form="outreach" data-user="${esc(row.id)}" data-email="${esc(row.email)}"><label class="op-sr" for="outreach-${esc(row.id)}">Email template for ${esc(row.name||row.email)}</label><select id="outreach-${esc(row.id)}" name="template">${options.map(v=>`<option value="${v}"${v===pick?' selected':''}>${esc(outreachNames[v])}</option>`).join('')}</select><button type="submit">Send email</button></form><span class="op-outreach-note" role="status"></span>${last}</div>`;
  }
  function setupDetails(row,esc,joined){
    const o=row.onboarding;if(!o)return '';const profile=o.profile||{},details=o.details||{},steps=o.steps||{};
    const fields=[['First name',profile.first_name],['Last name',profile.last_name],['Mobile',profile.mobile],['Country',profile.country],['Primary service',details.primary_category==='other'?details.other_category||'Other':details.primary_category],['Team size',details.team_size],['Service location',(details.service_locations||[details.service_location]).filter(Boolean).map(v=>({physical:'At my location',mobile:'At client locations',online:'Online'}[v]||v)).join(', ')],['Current system',details.current_software==='other'?details.other_software:details.current_software==='none'?'None':details.current_software],['Existing website',details.existing_website],['Terms accepted',details.terms_accepted_at?joined(details.terms_accepted_at):''],['Heard about us',details.heard_about]];
    const names={profile:'Profile saved',business:'Business details saved',category:'Category saved',team:'Team size saved',location:'Service locations saved',software:'Current system saved',source:'Attribution saved',complete:'Dashboard setup finished'};
    if(!fields.some(([,value])=>value)&&!Object.keys(steps).length)return '';
    return `<details class="op-onboarding-details"><summary>Setup details</summary><dl>${fields.filter(([,v])=>v).map(([key,v])=>`<div><dt>${esc(key)}</dt><dd>${esc(v)}</dd></div>`).join('')}${Object.entries(steps).filter(([key])=>names[key]).map(([key,v])=>`<div><dt>${names[key]}</dt><dd>${esc(joined(v))}</dd></div>`).join('')}</dl></details>`;
  }
  function render(data, {esc, joined}, {stage='all',query=''}={}) {
    const valid = data?.ok === true && Array.isArray(data.recent) && stages.every(([, ,key])=>Number.isSafeInteger(data.counts?.[key]) && data.counts[key]>=0);
    if (!valid) return '<section class="op-panel op-detail op-signup-flow" data-signup-flow aria-labelledby="signup-flow-heading"><h2 id="signup-flow-heading">Signups & setup</h2><p role="status">Signup records are unavailable. Refresh to try again.</p><button data-action="overview">Refresh overview</button></section>';
    const term=String(query).trim().toLowerCase();
    const rows=data.recent.filter(row=>(stage==='all'||stage==='verified'&&Boolean(row.verified_at)||stage==='business'&&Boolean(row.business_id)||stage==='booking'&&Boolean(row.first_booking_at)||stage==='pending'&&row.stage==='setup_pending')&&(!term||[row.name,row.email,row.business_name].some(value=>String(value||'').toLowerCase().includes(term))));
    const typos=typoMatches(data.recent),now=Date.now(),pending=data.counts.setup_pending;
    return `<section class="op-panel op-signup-flow" data-signup-flow aria-labelledby="signup-flow-heading">
      <div class="op-flow-heading"><div><h2 id="signup-flow-heading">Signups & setup</h2><p>See who joined, verified their email and got their business running.</p></div><span>All time</span></div>
      <div class="op-flow-stages" role="group" aria-label="Filter registration stages">${stages.map(([value,label,key,sub],i)=>`<button type="button" data-action="signup-stage" data-stage="${value}" aria-pressed="${stage===value}"><span class="op-flow-step">${i+1}</span><span class="op-flow-label">${label}</span><strong>${esc(data.counts[key])}</strong><span class="op-flow-sub">${sub}</span></button>`).join('')}</div>
      <div class="op-flow-toolbar"><div><h3>Recent signups</h3><button class="op-flow-pending" type="button" data-action="signup-stage" data-stage="pending" aria-pressed="${stage==='pending'}">${esc(pending)} awaiting business setup</button></div><form data-form="signup-filter" role="search"><label class="op-sr" for="signup-search">Search signup names or emails</label><input id="signup-search" name="signup_search" type="search" maxlength="100" placeholder="Search name or email" value="${esc(query)}"><button type="submit">Search</button>${stage!=='all'||term?'<button type="button" data-action="signup-clear">Show all</button>':''}</form></div>
      <div class="op-flow-results" aria-live="polite"><div class="op-table-wrap"><table class="op-signup-table"><thead><tr><th scope="col">Account</th><th scope="col">Signed up</th><th scope="col">Email verified</th><th scope="col">Progress</th><th scope="col">Next step</th></tr></thead><tbody>${rows.map(row=>`<tr><td data-label="Account"><strong>${esc(row.name||'Name not provided')}</strong><span class="op-account-email">${esc(row.email)}</span>${row.business_name?`<span>${esc(row.business_name)}</span>`:row.requested_business_name?`<span>Business entered: ${esc(row.requested_business_name)}</span>`:''}${row.requested_booking_slug&&!row.business_id?`<span>Address entered: ${esc(row.requested_booking_slug)}</span>`:''}</td><td data-label="Signed up"><time datetime="${esc(row.created_at)}">${esc(joined(row.created_at))}</time>${row.last_sign_in_at?`<span class="op-flow-last-login">Last sign-in<br>${esc(joined(row.last_sign_in_at))}</span>`:''}</td><td data-label="Email verified">${row.verified_at?`<span class="op-flow-verified"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>Verified</span><time datetime="${esc(row.verified_at)}">${esc(joined(row.verified_at))}</time>`:typos.has(row.id)?`Awaiting verification<span class="op-flow-typo">Probably a mistyped email. ${esc(typos.get(row.id).email)} signed up and verified at ${esc(joined(typos.get(row.id).created_at))}.</span>`:'Awaiting verification'}</td><td data-label="Progress"><span class="op-badge" data-state="${typos.has(row.id)?'typo':esc(row.stage)}">${esc(typos.has(row.id)?'Likely mistyped email':labels[row.stage]||'Not recorded')}</span>${setupDetails(row,esc,joined)}</td><td data-label="Next step">${row.business_id?`<button type="button" data-action="business" data-id="${esc(row.business_id)}">View business</button>`:`<span class="op-flow-next">${esc(typos.has(row.id)?'Wait for the verified account':next[row.stage]||'Review account')}</span>`}${outreachControl(row,typos.get(row.id),esc,joined,now)}</td></tr>`).join('')}</tbody></table></div>${!rows.length?'<p class="op-flow-empty">No signups match this view.</p>':''}<div class="op-flow-footer"><span>${rows.length} of ${data.recent.length} recent accounts shown${data.counts.signed_up>data.recent.length?' (latest 100 registrations)':''}</span><span>Times shown in UK time.</span></div></div>
    </section>`;
  }
  function renderEvents(data,{esc,joined},{query=''}={}) {
    const valid=data?.ok===true&&Array.isArray(data.events);
    if(!valid)return '<section class="op-panel op-detail op-flow-events"><h2>Errors & activity</h2><p role="status">Activity logs are unavailable. Refresh to try again.</p></section>';
    const stepNames={signup:'Signup',login:'Login',verification:'Email verification',business_setup:'Business creation',account_access:'Account access',setup:'Business setup',runtime:'App',dashboard:'Dashboard',calendar:'Calendar',bookings:'Bookings',customers:'Customers',services:'Services',staff:'Staff',insights:'Insights',personalise:'Personalise',website:'Website',billing:'Subscription',settings:'Business details',availability:'Availability'};
    const stageNames={email:'Email entry','check-email':'Check your email',profile:'Create account',business:'Business details',category:'Business category',team:'Team size',location:'Service locations',software:'Current booking system',source:'How they heard about us',ready:'Setup complete'};
    const codeNames={page_opened:'Page opened',network_unavailable:'Server could not be reached',request_rejected:'Request rejected',server_error:'Server error',rate_limited:'Too many requests',email_not_confirmed:'Email not verified',verification_failed:'Email verification failed',region_unavailable:'Signup location check failed',setup_resumed:'Setup form reopened',runtime_error:'App error',session_identified:'Signed-in session identified',step_viewed:'Step opened',step_saved:'Step saved',verification_requested:'Verification email requested'};
    const groups=new Map();
    for(const e of data.events){
      const key=e.user_id?'account:'+e.user_id:e.browser_session?'visit:'+e.browser_session:'unidentified';
      if(!groups.has(key))groups.set(key,{key,identity:e,events:[],visits:new Set()});
      const g=groups.get(key);g.events.push(e);if(e.browser_session)g.visits.add(e.browser_session);
    }
    const term=String(query).trim().toLowerCase(),rows=[...groups.values()].filter(g=>!term||[g.identity.business_name,g.identity.name,g.identity.email,g.identity.user_id,...g.visits].some(v=>String(v||'').toLowerCase().includes(term)));
    const counts=data.summary,metric=(key)=>Number.isSafeInteger(counts?.[key])&&counts[key]>=0?esc(counts[key]):'Unavailable';
    const title=e=>e.user_id?(e.business_name||e.name||e.email||'Account'):e.browser_session?'Visitor '+String(e.browser_session).slice(0,8):'Earlier unidentified activity';
    return `<section class="op-panel op-detail op-flow-events" data-owner-activity aria-labelledby="owner-activity-heading">
      <div class="op-activity-heading"><div><h2 id="owner-activity-heading">People & activity</h2><p>Last 30 days · Latest ${data.events.length} browser reports</p></div><button type="button" data-action="overview">Refresh</button></div>
      <dl class="op-activity-metrics"><div><dt>Accounts with activity</dt><dd>${metric('accounts')}</dd></div><div><dt>Browser sessions</dt><dd>${metric('browser_sessions')}</dd></div><div><dt>Error reports</dt><dd>${metric('errors')}</dd></div></dl>
      <form data-form="activity-filter" class="op-activity-search" role="search"><label for="activity-search">Find an account or visitor</label><div><input id="activity-search" name="activity_search" type="search" maxlength="100" placeholder="Business, name, email or ID" value="${esc(query)}"><button type="submit">Search</button>${term?'<button type="button" data-action="activity-clear">Clear</button>':''}</div></form>
      <div class="op-activity-groups" aria-live="polite">${rows.map(g=>{const e=g.identity,errors=g.events.filter(x=>x.severity==='error').length;return `<details class="op-activity-person"><summary><span class="op-activity-avatar" aria-hidden="true">${esc(e.user_id?(title(e).trim().slice(0,2).toUpperCase()):'V')}</span><span class="op-activity-person-label"><strong>${esc(title(e))}</strong><span>${esc(e.user_id?[e.name!==e.business_name?e.name:'',e.email].filter(Boolean).join(' · '):e.browser_session?'Not signed in':'Identity was not recorded')}</span></span><span class="op-activity-last"><span>${esc(stageNames[e.stage]||stepNames[e.step]||'App')} · ${esc(codeNames[e.code]||'Report')}</span><time datetime="${esc(e.at)}">${esc(joined(e.at))}</time><span>${g.events.length} report${g.events.length===1?'':'s'}${errors?' · '+errors+' error'+(errors===1?'':'s'):''}</span></span></summary><div class="op-activity-body">
        <dl class="op-activity-ids">${e.user_id?`<div><dt>Account ID</dt><dd><code>${esc(e.user_id)}</code></dd></div>`:''}${g.visits.size?`<div><dt>Browser session${g.visits.size===1?'':'s'}</dt><dd>${[...g.visits].map(id=>`<code>${esc(id)}</code>`).join('')}</dd></div>`:''}</dl>
        ${e.business_id?`<button type="button" data-action="business" data-id="${esc(e.business_id)}">View business</button>`:''}
        <ol class="op-activity-timeline">${[...g.events].reverse().map(x=>`<li data-severity="${x.severity==='error'?'error':'info'}"><div><strong>${esc(stageNames[x.stage]||stepNames[x.step]||'App')}</strong><span>${esc(codeNames[x.code]||'Not recorded')}${x.status?' · HTTP '+esc(x.status):''}</span></div><time datetime="${esc(x.at)}">${esc(joined(x.at))}</time></li>`).join('')}</ol>
      </div></details>`;}).join('')}${!rows.length?'<p class="op-flow-empty">'+(term?'No activity matches this search.':'No activity has been recorded in this period.')+'</p>':''}</div>
      <p class="op-activity-note">Browser sessions are not unique people. Times show recorded activity, not live presence. Reports cover key pages, setup steps and errors.</p>
    </section>`;
  }
  window.JovaOperatorSignupFlow={render,renderEvents,typoMatches,eligibleTemplates,outreachNames};
})();
