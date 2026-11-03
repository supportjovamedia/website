"use client";
import {useEffect,useState} from 'react';
export default function LinkStatisticsChoice(){
 const [off,setOff]=useState(null),[signal,setSignal]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{const privateSignal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';setSignal(privateSignal);setOff(privateSignal||/(?:^|;\s*)jova-link-statistics=off(?:;|$)/.test(document.cookie));},[]);
 function change(){const next=!off;document.cookie='jova-link-statistics='+(next?'off':'on')+'; Max-Age=15552000; Path=/; SameSite=Lax; Secure; Domain=.jovamedia.com';if(!document.cookie.includes('jova-link-statistics='+(next?'off':'on'))){setError(true);return;}setError(false);setOff(next);}
 return <div><p role="status">{error?'Your browser could not save this preference.':signal?'Your browser privacy signal turns off short-link statistics.':off===null?'Checking your link statistics preference.':off?'Short-link statistics are turned off for this browser.':'Short-link statistics are enabled for this browser.'}</p><button type="button" onClick={change} disabled={off===null||signal} style={{minHeight:44,padding:'10px 18px',border:'1px solid currentColor',borderRadius:8,background:'white',color:'#153b5a',font:'inherit'}}>{off?'Allow short-link statistics':'Turn off short-link statistics'}</button></div>;
}
