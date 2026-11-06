/* Plain-text templates only. Token substitution never executes markup or code. */
(()=>{'use strict';const defaultMessage='Reminder: next appt at {time} on {day}, {date} ({timezone}). {business}, {address}.';
 const base='@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r',extended='^{}\\[~]|€\f';
 const normalize=value=>String(value||'').replace(/[\x00-\x1f]/g,' ').trim();
 function segments(value){if(!value)return 0;let gsm=true,units=0,unicode=0;for(const c of String(value||'')){unicode+=c.codePointAt(0)>65535?2:1;if(base.includes(c))units++;else if(extended.includes(c))units+=2;else gsm=false;}return gsm?(units<=160?1:Math.ceil(units/153)):(unicode<=70?1:Math.ceil(unicode/67));}
 function valid(value){const s=normalize(value);return s.length>0&&s.length<=320&&['{time}','{date}','{business}'].every(t=>s.includes(t))&&!/[{}]/.test(s.replace(/\{(time|day|date|business|address|timezone)\}/g,''));}
 function preview(value,business){const values={timezone:window.JovaBusinessLocale?.resolve(business).timezone||business.timezone||business.settings?.timezone||'Europe/London',time:'12:59pm',day:'Wednesday',date:'30 Sep 2026',business:String(business.name||'').slice(0,80),address:String(business.address||'').split(/[\n,]/)[0].trim().slice(0,100)};return normalize(value).replace(/\{(time|day|date|business|address|timezone)\}/g,(_,key)=>values[key]).replace(/,\s*\./g,'.');}
 window.JovaSmsMessage={defaultMessage,normalize,segments,valid,preview};})();
