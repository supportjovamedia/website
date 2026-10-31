# Checks the browser side of the live account service against a stand-in server.
import subprocess,time,json,re,base64
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['node','/home/claude/website/booking-demo/server.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1.5)
B='http://localhost:4317';SB='https://rffsulstatmwzvrdgvec.supabase.co'
res=[];errs=[];log=[]
def chk(n,ok,i=''):
    res.append(ok);print(('PASS ' if ok else 'FAIL ')+n+('' if ok else ' | '+str(i)[:200]))
DB={'users':{},'salons':[],'recover':[],'t':{k:[] for k in ['categories','staff','services','customers','bookings','email_log','payments']},'denied':0}
def norm(e):
    l,d=e.lower().strip().split('@');l=l.split('+')[0]
    if d in('gmail.com','googlemail.com'):l=l.replace('.','');d='gmail.com'
    return l+'@'+d
def tok(uid):
    return 'tok_'+uid+'_'+'x'*30
def user_of(req):
    a=req.headers.get('authorization','')
    m=re.match(r'Bearer tok_(\w+?)_x+$',a)
    return m.group(1) if m else None
def handler(route,req):
    u=req.url[len(SB):];h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'}
    if req.method=='OPTIONS':return route.fulfill(status=204,headers=h)
    body=json.loads(req.post_data) if req.post_data else {}
    log.append((req.method,u.split('?')[0]))
    def out(data,status=200):route.fulfill(status=status,headers=h,body=json.dumps(data))
    if u.startswith('/rest/v1/rpc/slug_status'):
        s=body['p_slug'].lower()
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*',s) or not 3<=len(s)<=30:return out('format')
        if s in('admin','www','jova-demo'):return out('reserved')
        return out('taken' if any(x['slug']==s for x in DB['salons']) else 'ok')
    if u.startswith('/rest/v1/rpc/email_available'):
        return out(not any(x['email_norm']==norm(body['p_email']) for x in DB['salons']))
    if u.startswith('/functions/v1/signup'):
        if any(x['slug']==body['slug'] for x in DB['salons']):return out({'ok':False,'field':'slug','message':'That address is taken. Choose another.'})
        if any(x['email_norm']==norm(body['email']) for x in DB['salons']):return out({'ok':False,'field':'email','message':'An account with this email already exists. Log in instead.'})
        uid='u%d'%(len(DB['users'])+1);sid='11111111-0000-0000-0000-%012d'%(len(DB['salons'])+1)
        DB['users'][body['email'].lower()]={'id':uid,'pw':body['password']}
        DB['salons'].append(dict(id=sid,owner_id=uid,name=body['name'],slug=body['slug'],owner_name=body['owner'],email=body['email'],email_norm=norm(body['email']),address=None,phone=None,settings={},payments={},usage={},status='setup',trial_used=False,trial_ends_at=None,device_id=body['device_id']))
        return out({'ok':True,'salon_id':sid})
    if u.startswith('/auth/v1/token?grant_type=password'):
        us=DB['users'].get(body['email'].lower())
        if not us or us['pw']!=body['password']:return out({'error':'invalid_grant'},400)
        return out({'access_token':tok(us['id']),'refresh_token':'r','expires_at':int(time.time())+3600})
    if u.startswith('/rest/v1/salons'):
        uid=user_of(req);return out([x for x in DB['salons'] if x['owner_id']==uid] if uid else [])
    if u.startswith('/rest/v1/rpc/save_setup'):
        uid=user_of(req);s=next(x for x in DB['salons'] if x['owner_id']==uid);s.update(address=body['p_address'],phone=body['p_phone'],settings=body['p_settings']);return out(None,204)
    def elig(s):
        for o in DB['salons']:
            if o is not s and o['trial_used'] and (o['phone']==s['phone'] or o['address']==s['address'] or o['device_id']==s['device_id']):return False
        return True
    if u.startswith('/rest/v1/rpc/trial_check'):
        uid=user_of(req);s=next(x for x in DB['salons'] if x['owner_id']==uid);e=elig(s);return out({'eligible':e,'reasons':[] if e else ['same_phone']})
    if u.startswith('/rest/v1/rpc/start_trial'):
        uid=user_of(req);s=next(x for x in DB['salons'] if x['owner_id']==uid);e=elig(s);s['trial_used']=True;s['status']='trialing' if e else 'active';s['trial_ends_at']='2026-11-02T10:00:00Z'
        return out({'eligible':e,'status':s['status'],'trial_ends_at':s['trial_ends_at']})
    if u.startswith('/auth/v1/recover'):
        DB['recover'].append(body['email']);return out({})
    if u.startswith('/auth/v1/user'):
        uid=user_of(req)
        if not uid:return out({'msg':'expired'},401)
        nxt=next(v for v in DB['users'].values() if v['id']==uid);nxt['pw']=body['password'];return out({})
    if u.startswith('/auth/v1/logout'):return out({})
    m=re.match(r'/rest/v1/(categories|staff|services|customers|bookings|email_log|payments)(\?.*)?$',u)
    if m:
        t=m.group(1);uid=user_of(req);mine=next((x for x in DB['salons'] if x['owner_id']==uid),None)
        if not mine:return out([],401)
        if req.method=='GET':return out([r for r in DB['t'][t] if r['salon_id']==mine['id']])
        if req.method=='POST':
            rows=body if isinstance(body,list) else [body]
            if any(r['salon_id']!=mine['id'] for r in rows):DB['denied']+=1;return out({'message':'row-level security'},403)
            for r in rows:
                old=next((x for x in DB['t'][t] if x['salon_id']==r['salon_id'] and x['id']==r['id']),None)
                if old:old.update(r)
                else:DB['t'][t].append(dict(r))
            return out(None,201)
        if req.method=='DELETE':
            ids=re.findall(r'"([^"]+)"',__import__('urllib.parse').parse.unquote(u));DB['t'][t]=[r for r in DB['t'][t] if not(r['salon_id']==mine['id'] and r['id'] in ids)];return out(None,204)
    if u.startswith('/rest/v1/rpc/save_salon'):
        uid=user_of(req);s=next(x for x in DB['salons'] if x['owner_id']==uid)
        s.update(name=body['p_name'],email=body['p_email'],phone=body['p_phone'],address=body['p_address'],payments=body['p_payments'],usage=body['p_usage']);s['settings']={**s['settings'],**body['p_settings']};return out(None,204)
    if u.startswith('/rest/v1/rpc/public_salon'):
        s=next((x for x in DB['salons'] if x['slug']==body['p_slug'] and x['status'] in('trialing','active')),None)
        if not s:return out(None)
        g=lambda t:[r for r in DB['t'][t] if r['salon_id']==s['id']]
        return out({'id':s['id'],'name':s['name'],'slug':s['slug'],'email':s['email'],'phone':s['phone'],'address':s['address'],'settings':s['settings'],'payments':{'enabled':False,'deposit':0},
          'categories':[{'id':c['id'],'name':c['name']} for c in g('categories')],
          'services':[{'id':v['id'],'name':v['name'],'price':v['price'],'duration':v['duration'],'categoryId':v['category_id'],'staffIds':v['staff_ids']} for v in g('services')],
          'staff':[{'id':m['id'],'name':m['name'],'role':m['role'],'active':m['active'],'color':m['color'],'hours':m['hours']} for m in g('staff') if m['active']],
          'busy':[{'id':'busy_'+b['id'][-6:],'date':b['date'],'time':b['time'],'duration':b['duration'],'staffId':b['staff_id'],'status':b['status']} for b in g('bookings') if b['status']!='cancelled']})
    if u.startswith('/rest/v1/rpc/create_booking'):
        s=next(x for x in DB['salons'] if x['slug']==body['p_slug']);bid='bk_'+'%032d'%(len(DB['t']['bookings'])+1)
        v=next(r for r in DB['t']['services'] if r['salon_id']==s['id'] and r['id']==body['p_service'])
        r=dict(salon_id=s['id'],id=bid,service_id=v['id'],service_name=v['name'],price=v['price'],duration=v['duration'],date=body['p_date'],time=body['p_time'],staff_id=v['staff_ids'][0],customer_id='',name=body['p_name'],email=body['p_email'],phone=body['p_phone'],notes='',source='Online',status='confirmed',deposit=0)
        DB['t']['bookings'].append(r)
        return out({'ok':True,'booking':{'id':bid,'serviceId':v['id'],'serviceName':v['name'],'price':v['price'],'duration':v['duration'],'date':body['p_date'],'time':body['p_time'],'staffId':r['staff_id'],'name':body['p_name'],'email':body['p_email'],'status':'confirmed','deposit':0}})
    if u.startswith('/rest/v1/rpc/get_booking'):
        b=next((r for r in DB['t']['bookings'] if r['id']==body['p_id']),None)
        return out(None if not b else {'id':b['id'],'serviceId':b['service_id'],'serviceName':b['service_name'],'price':b['price'],'duration':b['duration'],'date':b['date'],'time':b['time'],'staffId':b['staff_id'],'name':b['name'],'email':b['email'],'status':b['status'],'deposit':0})
    if u.startswith('/rest/v1/rpc/cancel_booking'):
        b=next(r for r in DB['t']['bookings'] if r['id']==body['p_id']);b['status']='cancelled'
        return out({'ok':True,'booking':{'id':b['id'],'serviceId':b['service_id'],'serviceName':b['service_name'],'price':b['price'],'duration':b['duration'],'date':b['date'],'time':b['time'],'staffId':b['staff_id'],'name':b['name'],'email':b['email'],'status':'cancelled','deposit':0}})
    out({'error':'unmocked '+u},500)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1200,'height':900})
    ctx.route(SB+'/**',handler)
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:m.type=='error' and 'favicon' not in m.text and errs.append(m.text))
    pg.goto(B+'/#signup');pg.wait_for_timeout(300)
    pg.fill('[name=name]','Remote Salon');pg.wait_for_selector('#slug-status.ok',timeout=4000)
    chk('slug availability from server',any(l[1].endswith('slug_status') for l in log))
    pg.fill('[name=slug]','admin');pg.wait_for_selector('#slug-status.bad',timeout=4000);chk('reserved from server','reserved' in pg.inner_text('#slug-status'))
    pg.fill('[name=slug]','remote-salon');pg.wait_for_selector('#slug-status.ok',timeout=4000)
    pg.fill('[name=owner]','Rae Remote');pg.fill('[name=email]','Rae.Remote@gmail.com');pg.fill('[name=password]','Remote123')
    pg.wait_for_selector('#email-status.ok',timeout=4000)
    pg.click('button.primary:has-text("Create salon")');pg.wait_for_url('**#setup',timeout=5000);pg.wait_for_selector('text=Set up your salon')
    chk('server holds the salon',len(DB['salons'])==1 and DB['salons'][0]['slug']=='remote-salon')
    chk('signed in after signup',any('grant_type=password' in l[1] or l[1].startswith('/auth/v1/token') for l in log))
    pg.fill('[name=address]','9 Remote Road, London');pg.fill('[name=phone]','020 7946 0777');pg.click('button.primary:has-text("Save and continue")')
    pg.wait_for_selector('text=Due today',timeout=5000)
    chk('setup saved on server',DB['salons'][0]['address']=='9 Remote Road, London')
    chk('checkout shows £0.00',pg.locator('text=£0.00').count()>=1)
    pg.check('form[data-form=checkout] input[type=checkbox]');pg.click('button:has-text("Start free trial")');pg.wait_for_url('**#dashboard',timeout=5000)
    chk('trial started on server',DB['salons'][0]['status']=='trialing')
    pg.click('button:has-text("Log out")');pg.wait_for_timeout(400)
    # second browser (new device): log in, local state empty
    pg2=ctx.browser.new_context(viewport={'width':1200,'height':900});pg2.route(SB+'/**',handler);q=pg2.new_page();q.on('pageerror',lambda e:errs.append(str(e)))
    q.goto(B+'/#login');q.fill('[name=email]','rae.remote@gmail.com');q.fill('[name=password]','Remote123');q.click('button.primary:has-text("Log in")');q.wait_for_url('**#calendar',timeout=5000);q.wait_for_selector('.workspace-header')
    chk('login on a new device works',q.locator('.workspace-header:has-text("Remote Salon")').count()==1)
    q.goto(B+'/#billing');q.wait_for_timeout(600);chk('new device shows real trial state','rial' in q.inner_text('body'))
    q.click('button:has-text("Log out")')
    q.goto(B+'/#login');q.fill('[name=email]','rae.remote@gmail.com');q.fill('[name=password]','Wrong123');q.click('button.primary:has-text("Log in")');q.wait_for_selector('.error:not(:empty)',timeout=4000)
    chk('wrong password rejected','do not match' in q.inner_text('.error'))
    # duplicate via alias on a fresh form
    q.goto(B+'/#signup');q.fill('[name=email]','r.a.e.remote+2@gmail.com');q.wait_for_selector('#email-status.bad',timeout=4000);chk('alias email flagged by server','already exists' in q.inner_text('#email-status'))
    # forgot + recovery link
    q.goto(B+'/#forgot');q.fill('[name=email]','rae.remote@gmail.com');q.click('button.primary');q.wait_for_selector('text=Check your email',timeout=4000)
    chk('reset email requested',DB['recover']==['rae.remote@gmail.com'] and q.locator('text=Open reset link').count()==0)
    q.goto('about:blank');q.goto(B+'/#access_token='+tok('u1')+'&type=recovery&expires_in=3600');q.wait_for_selector('text=Choose a new password',timeout=4000)
    q.fill('[name=password]','Brandnew9');q.fill('[name=confirm]','Brandnew9');q.click('button.primary');q.wait_for_url('**#login',timeout=5000)
    chk('password changed on server',DB['users']['rae.remote@gmail.com']['pw']=='Brandnew9')
    # demo account still works offline
    q.fill('[name=email]','demo@jovamedia.com');q.fill('[name=password]','Salon2026');q.click('button.primary:has-text("Log in")');q.wait_for_url('**#calendar',timeout=5000)
    chk('demo account still logs in',True)
    # ---- diary tables ----
    chk('seeded set-up reached the tables with the salon id',len([r for r in DB['t']['services'] if r['salon_id']==DB['salons'][0]['id']])==3 and len(DB['t']['staff'])==1 and all(r['salon_id']==DB['salons'][0]['id'] for t in DB['t'].values() for r in t))
    chk('salon settings saved (seeded flag + hours)',DB['salons'][0]['settings'].get('seeded') is True and 'hours' in DB['salons'][0]['settings'])
    q.goto(B+'/#login');q.fill('[name=email]','rae.remote@gmail.com');q.fill('[name=password]','Brandnew9');q.click('button.primary:has-text("Log in")');q.wait_for_url('**#calendar',timeout=5000)
    q.goto(B+'/#services');q.wait_for_selector('text=Lash lift',timeout=4000)
    chk('services page loads from the database',q.locator('text=Brow shape').count()>=1)
    q.click('[data-action=add-service]');q.fill('.modal [name=name]','Gel removal');q.fill('.modal [name=price]','12');q.fill('.modal [name=duration]','30');q.check('.modal [name=staffIds]');q.click('.modal button.primary');q.wait_for_timeout(1500)
    row=[r for r in DB['t']['services'] if r['name']=='Gel removal']
    chk('new service saved to the database with salon_id',len(row)==1 and row[0]['salon_id']==DB['salons'][0]['id'] and row[0]['price']==12)
    # second salon: its rows must never reach the first
    c2=ctx.browser.new_context();c2.route(SB+'/**',handler);w=c2.new_page();w.on('pageerror',lambda e:errs.append(str(e)))
    w.goto(B+'/#signup');w.fill('[name=name]','Other Salon');w.wait_for_selector('#slug-status.ok',timeout=4000);w.fill('[name=owner]','Olly');w.fill('[name=email]','olly@example.com');w.fill('[name=password]','Other1234');w.wait_for_selector('#email-status.ok',timeout=4000)
    w.click('button.primary:has-text("Create salon")');w.wait_for_url('**#setup',timeout=5000);w.wait_for_timeout(1500)
    sids={r['salon_id'] for r in DB['t']['services']}
    chk('two salons keep separate rows',len(sids)==2 and all(r['salon_id'] in sids for r in DB['t']['staff']))
    w.goto(B+'/#login');w.fill('[name=email]','olly@example.com');w.fill('[name=password]','Other1234');w.click('button.primary:has-text("Log in")');w.wait_for_timeout(800)
    chk('other salon cannot see the first salon\'s service','Gel removal' not in w.inner_text('body'))
    # change on device 1 shows on a fresh load
    q.goto(B+'/#services');q.reload();q.wait_for_selector('text=Gel removal',timeout=5000);chk('data comes back after reload',True)
    # public booking page
    c3=ctx.browser.new_context();c3.route(SB+'/**',handler);cu=c3.new_page();cu.on('pageerror',lambda e:errs.append(str(e)))
    cu.goto(B+'/?salon=remote-salon#book/service');cu.wait_for_selector('.select-card',timeout=5000)
    chk('public page shows the salon services from the database',cu.locator('text=Gel removal').count()>=1 and 'Other Salon' not in cu.inner_text('body'))
    cu.goto(B+'/?salon=does-not-exist#book/service');cu.wait_for_selector('text=isn’t taking bookings',timeout=5000);chk('unknown salon link shows a clear message',True)
    cu.goto(B+'/?salon=remote-salon#book/service');cu.wait_for_selector('.select-card',timeout=5000);cu.locator('.select-card').first.click();cu.wait_for_timeout(300)
    cu.locator('.slots button').first.click();cu.click('a.btn.primary:has-text("Continue")');cu.wait_for_timeout(300)
    cu.fill('input[name=name]','Cara Customer');cu.fill('input[name=email]','cara@example.com');cu.locator('form input[type=checkbox]').first.check();cu.click('form button.btn.primary');cu.wait_for_timeout(300)
    cu.click('[data-action=confirm-booking]');cu.wait_for_url('**#book/confirmation',timeout=5000)
    bk=[r for r in DB['t']['bookings'] if r['name']=='Cara Customer']
    chk('customer booking written through the database function',len(bk)==1 and bk[0]['salon_id']==DB['salons'][0]['id'])
    cu.click('text=Manage appointment');cu.wait_for_selector('text=Your appointment',timeout=4000);cu.click('[data-action=cancel-booking]');cu.click('[data-action=cancel-confirm]');cu.wait_for_timeout(600)
    chk('customer cancellation reaches the database',bk[0]['status']=='cancelled')
    chk('customer page never exposes owner links',cu.locator('a[href^="#dashboard"],a[href^="#calendar"]').count()==0)
    q.goto(B+'/#appointments');q.reload();q.wait_for_selector('text=Cara Customer',timeout=5000);chk('owner sees the customer booking after reload',True)
    chk('no row was refused by the salon check',DB['denied']==0,DB['denied'])
    chk('no page errors',not errs,errs[:3])
    b.close()
srv.terminate()
print('%d/%d'%(sum(res),len(res)))
