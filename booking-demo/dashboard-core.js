/* Calendar-period totals from appointment snapshots. These are service values, not cash receipts. */
(() => {
  'use strict';
  const key = date => date.toISOString().slice(0, 10);
  function parse(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && key(date) === value ? date : null;
  }
  const plus = (date, days) => {const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result;};
  const format = (date, options) => new Intl.DateTimeFormat('en-GB', {...options, timeZone:'UTC'}).format(date);
  function range(anchor, view = 'day') {
    const date = parse(anchor);
    const selected = String(view).toLowerCase();
    if (!date) throw new RangeError('Choose a valid calendar date.');
    if (!['day', 'week', 'month'].includes(selected)) throw new RangeError('Choose day, week or month.');
    let first = new Date(date), last = new Date(date);
    if (selected === 'week') {first = plus(date, -((date.getUTCDay() + 6) % 7)); last = plus(first, 6);}
    if (selected === 'month') {first.setUTCDate(1); last.setUTCMonth(last.getUTCMonth() + 1, 0);}
    const days = [];
    for (let current = new Date(first); current <= last; current = plus(current, 1)) days.push(key(current));
    let label, shortLabel;
    if (selected === 'day') {
      label = format(date, {weekday:'long',day:'numeric',month:'long',year:'numeric'});
      shortLabel = format(date, {day:'numeric',month:'short'});
    } else if (selected === 'month') {
      label = format(date, {month:'long',year:'numeric'});
      shortLabel = format(date, {month:'short',year:'numeric'});
    } else {
      label = format(first, {day:'numeric',month:'long',...(first.getUTCFullYear() !== last.getUTCFullYear() ? {year:'numeric'} : {})}) +
        ' to ' + format(last, {day:'numeric',month:'long',year:'numeric'});
      shortLabel = format(first, {day:'numeric',month:'short'}) + ' to ' + format(last, {day:'numeric',month:'short'});
    }
    return {start:key(first),end:key(last),days,label,shortLabel,view:selected};
  }
  const pence = value => {const number = Number(value); return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : 0;};
  function summary(salon, {date, view = 'day', staffIds = null} = {}) {
    const period = range(date, view);
    const roster = new Set((Array.isArray(salon?.staff) ? salon.staff : []).map(member => member.id));
    const selected = staffIds === null ? null : new Set((Array.isArray(staffIds) ? staffIds : []).filter(id => roster.has(id)));
    let booked = 0, confirmed = 0, completed = 0, cancelled = 0, noShow = 0, completedPence = 0, scheduledPence = 0;
    for (const booking of Array.isArray(salon?.bookings) ? salon.bookings : []) {
      if (!booking || !parse(booking.date) || booking.date < period.start || booking.date > period.end || (selected && !selected.has(booking.staffId))) continue;
      const status = String(booking.status || '').toLowerCase().replace(/[_ ]/g, '-');
      if (status === 'cancelled') {cancelled++; continue;}
      if (status === 'no-show') {noShow++; continue;}
      if (status !== 'confirmed' && status !== 'completed') continue;
      booked++;
      scheduledPence += pence(booking.price);
      if (status === 'completed') {completed++; completedPence += pence(booking.price);} else confirmed++;
    }
    return {range:period,booked,confirmed,completed,cancelled,noShow,completedValue:completedPence / 100,scheduledValue:scheduledPence / 100};
  }
  if (typeof window !== 'undefined') window.JovaDashboard = {range,summary};
})();
