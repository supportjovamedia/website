// Display-only currency conversion for JovaBook plan prices. Billing stays in GBP.
// Rates are fixed, rounded approximations; review them when exchange rates move.
export const GBP_RATES={GBP:1,USD:1.27,CAD:1.75,AUD:1.95};
const COUNTRY_CURRENCY={US:'USD',CA:'CAD',AU:'AUD'};
const LABEL={GBP:'GBP',USD:'USD',CAD:'CAD',AUD:'AUD'};
export const currencyForCountry=country=>COUNTRY_CURRENCY[String(country||'').toUpperCase()]||'GBP';
export const isCurrency=value=>Object.prototype.hasOwnProperty.call(GBP_RATES,value);
const symbols={USD:'$',CAD:'C$',AUD:'A$',GBP:'£'};
// pounds: number of pounds. Returns e.g. "$25" (whole units), or "£20" / "£57.60" for GBP.
export function localPrice(pounds,currency='GBP'){
 const c=isCurrency(currency)?currency:'GBP';
 if(c==='GBP')return '£'+(Number.isInteger(pounds)?pounds:pounds.toFixed(2));
 return symbols[c]+Math.round(pounds*GBP_RATES[c]).toLocaleString('en-US');
}
export const currencyLabel=currency=>LABEL[currency]||'GBP';
