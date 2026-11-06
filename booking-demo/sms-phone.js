(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JovaSmsPhone = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
// NANP mobile dial plans derived from Google's libphonenumber metadata
// (Apache-2.0), revision 5ea78f46ccc1a258012344801ce04eb6eb4c55da.
// https://github.com/google/libphonenumber/blob/5ea78f46ccc1a258012344801ce04eb6eb4c55da/resources/PhoneNumberMetadata.xml
// Pinning these local rules avoids runtime phone-lookup or CDN requests.
const SMS_PHONE_PATTERNS = Object.freeze({
  US: String.raw`983[2-57-9]\d{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[02589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9]\d{6}`,
});
const nanp = Object.fromEntries(Object.entries(SMS_PHONE_PATTERNS).map(([country, pattern]) => [country, new RegExp(`^(?:${pattern})$`)]));

function normaliseSmsPhone(value, defaultCountry = 'GB') {
  if (typeof value !== 'string' || value.length > 40 || !/^\+?[0-9\s().-]+$/.test(value.trim())) return null;
  let digits = value.trim().replace(/[\s().-]/g, '');
  const international = digits.startsWith('+') || digits.startsWith('00');
  digits = digits.replace(/^\+|^00/, '');
  if (!international) {
    if (defaultCountry === 'GB' && /^07\d{9}$/.test(digits)) digits = `44${digits.slice(1)}`;
    else if (defaultCountry === 'US' && /^[2-9]\d{9}$/.test(digits)) digits = `1${digits}`;
  }
  if (/^447(?:[1-5789]\d{8}|624\d{6})$/.test(digits)) return { destination: digits, country: 'GB' };
  if (/^1\d{10}$/.test(digits)) {
    const national = digits.slice(1);
    for (const country of ['US']) if (nanp[country].test(national)) return { destination: digits, country };
  }
  return null;
}

  return Object.freeze({ patterns: SMS_PHONE_PATTERNS, parse: normaliseSmsPhone, normalise: (value, country) => normaliseSmsPhone(value, country)?.destination || '' });
});


