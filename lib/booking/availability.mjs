import {DateTime} from 'luxon';
export function slotsFor({business,service,staff,hours,bookings,timeOff,date,now=DateTime.utc()}){
 const day=DateTime.fromISO(date,{zone:business.timezone}); if(!day.isValid)return [];
 const earliest=now.plus({minutes:business.minimum_notice_minutes});const latest=now.plus({days:business.booking_window_days});
 const out=[];for(const person of staff){for(const h of hours.filter(h=>h.staff_id===person.id&&h.weekday===day.weekday%7)){
 const start=DateTime.fromISO(`${date}T${h.opens_at}`,{zone:business.timezone});const end=DateTime.fromISO(`${date}T${h.closes_at}`,{zone:business.timezone});
 for(let time=start;time.plus({minutes:service.duration_minutes+service.buffer_minutes})<=end;time=time.plus({minutes:15})){
  const finish=time.plus({minutes:service.duration_minutes+service.buffer_minutes});
  if(time<earliest||time>latest)continue;
  if(bookings.some(b=>b.staff_id===person.id&&b.status!=='cancelled'&&DateTime.fromISO(b.starts_at)<finish&&DateTime.fromISO(b.reserved_until)>time))continue;
  if(timeOff.some(b=>b.staff_id===person.id&&DateTime.fromISO(b.starts_at)<finish&&DateTime.fromISO(b.ends_at)>time))continue;
  out.push({starts_at:time.toUTC().toISO(),time:time.toFormat('HH:mm'),staff_id:person.id,staff_name:person.name});
 }
 }}return out.sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.staff_id-b.staff_id);
}
