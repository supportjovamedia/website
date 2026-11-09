// The preview and the delivery worker use this same fixed-slot invitation.
export function recoveryEmail({slot, business}) {
 const date = new Date(slot.date + 'T12:00:00Z').toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 const when = date + ' at ' + slot.time;
 const zone = business.timezone ? ' (' + business.timezone + ')' : '';
 return {
  subject: slot.service + ' available on ' + date + ' at ' + slot.time,
  message: 'Hi there,\n\nA ' + slot.service + ' appointment has become available at ' + business.name + ' on ' + when + zone + '.\n\nCan you make this appointment? Call ' + business.phone + ' to request this exact slot. This invitation is for the date and time above only, and the appointment is subject to availability until we confirm your booking.\n\n' + business.name
 };
}
