/* Rescheduling uses the saved appointment length and preserves every other conflict. */
(() => {
  'use strict';
  function times(salon, booking, date, slotsFor) {
    if (!salon || !booking || typeof slotsFor !== 'function') return [];
    const member = (salon.staff || []).find(value => value.id === booking.staffId);
    const duration = Number(booking.duration);
    if (!member || member.active === false || !Number.isFinite(duration) || duration <= 0) return [];
    const hasOwnerRecord = (salon.bookings || []).some(value => value.id === booking.id);
    let removed = false;
    const bookings = (salon.bookings || []).filter(value => {
      const ownBusy = !hasOwnerRecord && !removed && String(value.id || '').startsWith('busy_') &&
        value.date === booking.date && value.time === booking.time &&
        value.staffId === booking.staffId && Number(value.duration) === duration;
      if (ownBusy) removed = true;
      return !ownBusy;
    });
    const copy = {...salon, bookings};
    const snapshot = {id: booking.serviceId, name: booking.serviceName, duration, price: booking.price};
    return [...new Set(slotsFor(copy, member, date, snapshot, booking.id) || [])].sort();
  }
  if (typeof window !== 'undefined') window.JovaReschedule = {times};
})();
