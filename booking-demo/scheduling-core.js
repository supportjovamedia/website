/* Shared weekly-hours rules. No plan choice is read from editable workspace settings. */
(() => {
  'use strict';
  const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  function day(hours, weekday) {
    const h = hours && typeof hours === 'object' ? hours : {};
    const d = Number(weekday);
    const override = h.weekly && h.weekly[String(d)];
    const start = override?.start ?? h.start ?? '09:00';
    const end = override?.end ?? h.end ?? '17:00';
    const closed = !Number.isInteger(d) || d < 0 || d > 6 ||
      (override ? override.closed === true : !(Array.isArray(h.days) ? h.days : []).includes(d)) ||
      !validTime(start) || !validTime(end) || minutes(start) >= minutes(end);
    return {closed, start: validTime(start) ? start : '09:00', end: validTime(end) ? end : '17:00'};
  }
  function normalize(hours) {
    const h = hours && typeof hours === 'object' ? hours : {};
    const validRange = validTime(h.start) && validTime(h.end) && h.start < h.end;
    const start = validRange ? h.start : '09:00';
    const end = validRange ? h.end : '17:00';
    const weekly = Object.fromEntries(Array.from({length: 7}, (_, d) => [String(d), day(h, d)]));
    return {start, end, days: Object.keys(weekly).map(Number).filter(d => !weekly[d].closed), weekly};
  }
  function hoursFor(salon, member, date) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? new Date(date + 'T12:00:00Z') : null;
    const weekday = parsed && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed.getUTCDay() : NaN;
    const business = day(salon?.hours, weekday);
    const staff = member?.hours == null ? business : day(member.hours, weekday);
    const start = business.start > staff.start ? business.start : staff.start;
    const end = business.end < staff.end ? business.end : staff.end;
    return {closed: member?.active === false || business.closed || staff.closed || start >= end, start, end};
  }
  function plan(salon) {
    const raw = String(salon?.entitlements?.plan || salon?.plan || 'essential').toLowerCase();
    return raw === 'standard' ? {name: 'Standard', staffLimit: 5} : raw === 'premium' ?
      {name: 'Premium', staffLimit: 10} : {name: 'Essential', staffLimit: 1};
  }
  const api = {day, normalize, hoursFor, plan};
  if (typeof window !== 'undefined') window.JovaSchedule = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
