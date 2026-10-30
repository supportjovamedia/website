import subprocess,time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['node','/home/claude/website/booking-demo/server.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1.5)
B='http://localhost:4317/#';res=[];errs=[]
def chk(n,ok,i=''):
    res.append(ok);print(('PASS ' if ok else 'FAIL ')+n+('' if ok else ' | '+str(i)[:200]))
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1200,'height':900});ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=''))  # LOCALMODE
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(B+'home');pg.evaluate("sessionStorage.setItem('jovabook-owner','1')")
    go=lambda r:(pg.goto(B+r),pg.wait_for_timeout(350))
    m=lambda:pg.locator('.modal')
    toast=lambda:pg.locator('#toast').inner_text()
    def newappt(name,email,svc_idx=1,time_idx=1,date=None):
        go('appointments');pg.get_by_role('button',name='+ New appointment').first.click();pg.wait_for_timeout(300)
        mm=m();mm.locator('[name=name]').fill(name);mm.locator('[name=email]').fill(email)
        mm.locator('[name=serviceId]').select_option(index=svc_idx)
        if date:mm.locator('[name=date]').fill(date);mm.locator('[name=date]').dispatch_event('change')
        pg.wait_for_timeout(300)
        opts=mm.locator('[name=time] option').all_inner_texts()
        return mm,opts
    # double booking: book the first free slot, same slot must disappear for same staff
    mm,opts=newappt('Edge One','edge1@example.com');print('slots',opts[:4])
    first=mm.locator('[name=time] option').nth(0).get_attribute('value')
    mm.locator('[name=staffId]').select_option(index=1);pg.wait_for_timeout(300)
    first=mm.locator('[name=time] option').nth(0).get_attribute('value');staff=mm.locator('[name=staffId]').input_value();d=mm.locator('[name=date]').input_value();svc=mm.locator('[name=serviceId]').input_value()
    mm.get_by_role('button',name='Create appointment').click();pg.wait_for_timeout(400)
    chk('manual appointment created','Edge One' in pg.inner_text('#app'))
    go('appointments');pg.get_by_role('button',name='+ New appointment').first.click();pg.wait_for_timeout(300)
    mm=m();mm.locator('[name=serviceId]').select_option(svc);mm.locator('[name=staffId]').select_option(staff);mm.locator('[name=date]').fill(d);mm.locator('[name=date]').dispatch_event('change');pg.wait_for_timeout(300)
    vals=mm.locator('[name=time] option').evaluate_all('e=>e.map(x=>x.value)')
    chk('booked slot no longer offered (no double booking)',first not in vals,vals[:5])
    pg.keyboard.press('Escape')
    # missing email
    mm,_=newappt('No Email','')
    mm.locator('[name=email]').evaluate('e=>e.removeAttribute("required")')
    mm.get_by_role('button',name='Create appointment').click();pg.wait_for_timeout(300)
    chk('appointment without email refused','email' in (m().inner_text()+toast()).lower() and 'No Email' not in pg.inner_text('#app'))
    pg.keyboard.press('Escape')
    # HTML in names is escaped
    mm,_=newappt('<img src=x onerror=window.__x=1>','xss@example.com')
    mm.get_by_role('button',name='Create appointment').click();pg.wait_for_timeout(400)
    chk('html in customer name is escaped',pg.evaluate('window.__x')is None and '<img src=x' in pg.inner_text('#app'))
    # service validation
    go('services');pg.get_by_role('button',name='+ Add service').click();pg.wait_for_timeout(300)
    mm=m();mm.locator('[name=name]').fill('Bad Price');mm.locator('[name=price]').evaluate('e=>{e.removeAttribute("min");e.value="-5"}');mm.locator('[name=duration]').evaluate('e=>{e.removeAttribute("min");e.value="0"}')
    mm.get_by_role('button',name='Save service').click();pg.wait_for_timeout(300)
    chk('negative price / zero duration refused','Bad Price' not in pg.inner_text('#app'),pg.inner_text('#app')[:0])
    pg.keyboard.press('Escape')
    # settings validation
    go('settings')
    pg.fill('[name=start]','18:00');pg.fill('[name=end]','09:00')
    pg.locator('form button.primary').first.click();pg.wait_for_timeout(300)
    chk('closing before opening refused','later' in (toast()+pg.inner_text('.error')).lower())
    pg.fill('[name=start]','09:00');pg.fill('[name=end]','17:00')
    pg.fill('[name=name]','Edge <b>Salon</b> & Co');pg.locator('form button.primary').first.click();pg.wait_for_timeout(400)
    chk('salon name with html shown as text','<b>Salon</b>' in pg.inner_text('.workspace-header'))
    # customer booking page uses the owner's colour & name, with empty states
    pg.goto('http://localhost:4317/?salon=jova-demo#book/service');pg.wait_for_timeout(400)
    chk('customer page shows salon name','Edge' in pg.inner_text('body'))
    # reload keeps data
    pg.reload();pg.wait_for_timeout(400);go('appointments')
    chk('data survives reload','Edge One' in pg.inner_text('#app'))
    chk('no page errors',not errs,errs[:2])
    b.close()
srv.terminate()

print('%d/%d'%(sum(res),len(res)))
