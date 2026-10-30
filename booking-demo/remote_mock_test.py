# Checks the browser side of the live account service against a stand-in server.
import subprocess,time,json,re,base64
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['node','/home/claude/website/booking-demo/server.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1.5)
B='http://localhost:4317';SB='https://emyjuccsfnxqrsztpzly.supabase.co'
res=[];errs=[];log=[]
def chk(n,ok,i=''):
    res.append(ok);print(('PASS ' if ok else 'FAIL ')+n+('' if ok else ' | '+str(i)[:200]))
DB={'users':{},'salons':[],'recover':[]}
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
        DB['salons'].append(dict(id=sid,owner_id=uid,name=body['name'],slug=body['slug'],owner_name=body['owner'],email=body['email'],email_norm=norm(body['email']),address=None,phone=None,settings={},status='setup',trial_used=False,trial_ends_at=None,device_id=body['device_id']))
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
    q.goto(B+'/#login');q.fill('[name=email]','rae.remote@gmail.com');q.fill('[name=password]','Remote123');q.click('button.primary:has-text("Log in")');q.wait_for_url('**#dashboard',timeout=5000);q.wait_for_selector('h3:has-text("Your booking link")')
    chk('login on a new device works',q.locator('.workspace-header:has-text("Remote Salon")').count()==1)
    chk('new device shows real trial state','Trial' in q.inner_text('body') or 'trial' in q.inner_text('body'))
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
    q.fill('[name=email]','demo@jovamedia.com');q.fill('[name=password]','Salon2026');q.click('button.primary:has-text("Log in")');q.wait_for_url('**#dashboard',timeout=5000)
    chk('demo account still logs in',True)
    chk('no page errors',not errs,errs[:3])
    b.close()
srv.terminate()
print('%d/%d'%(sum(res),len(res)))
