(() => {
 'use strict';

 const maxServiceMinutes = 23 * 60 + 59;

 function format(value) {
  const total = wholeMinutes(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return [hours && (hours + (hours === 1 ? ' hour' : ' hours')),
   (minutes || !hours) && (minutes + (minutes === 1 ? ' minute' : ' minutes'))].filter(Boolean).join(' ');
 }

 function wholeMinutes(value) {
  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
 }

 function options(max, step, selected, unit) {
  const values = Array.from({length: Math.floor(max / step) + 1}, (_, index) => index * step);
  if (!values.includes(selected)) values.push(selected);
  return values.sort((a, b) => a - b).map(value =>
   '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' +
   value + ' ' + unit + (value === 1 ? '' : 's') + '</option>'
  ).join('');
 }

 function fields(label, name, value, {max, step = 1} = {}) {
  const total = wholeMinutes(value);
  return '<fieldset class="field jb-duration-field"><legend>' + label + '</legend><div class="jb-duration-pair">' +
   '<select required name="' + name + 'Hours" aria-label="' + label + ' hours">' +
   options(Math.floor(max / 60), 1, Math.floor(total / 60), 'hour') + '</select>' +
   '<select required name="' + name + 'Minutes" aria-label="' + label + ' minutes">' +
   options(59, step, total % 60, 'minute') + '</select></div></fieldset>';
 }

 function read(data, name, fallback) {
  if (data[name + 'Hours'] === undefined && data[name + 'Minutes'] === undefined) return Number(fallback);
  const hours = Number(data[name + 'Hours']);
  const minutes = Number(data[name + 'Minutes']);
  if (!Number.isInteger(hours) || hours < 0 || !Number.isInteger(minutes) || minutes < 0 || minutes >= 60) return NaN;
  return hours * 60 + minutes;
 }

 window.JovaDuration = {format, fields, read, maxServiceMinutes};
})();
