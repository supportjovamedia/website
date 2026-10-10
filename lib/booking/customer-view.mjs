export function customerBookings(bookings,now=Date.now()){
 const upcoming=bookings.filter(b=>b.status==='confirmed'&&Date.parse(b.starts_at)>now).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
 const history=bookings.filter(b=>b.status!=='confirmed'||Date.parse(b.starts_at)<=now).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)).slice(0,5);
 return {upcoming,history};
}
