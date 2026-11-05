// The only top-up packs that can be bought. Prices are set here on the server and again,
// as a safety check, in the database function that records the credit.
export const MESSAGE_PACKS=Object.freeze({
 'sms-50':{channel:'sms',quantity:50,pence:500,label:'50 text messages'},
 'sms-100':{channel:'sms',quantity:100,pence:1000,label:'100 text messages'},
 'sms-200':{channel:'sms',quantity:200,pence:2000,label:'200 text messages'},
 'email-1000':{channel:'email',quantity:1000,pence:500,label:'1,000 emails'},
 'email-5000':{channel:'email',quantity:5000,pence:2000,label:'5,000 emails'}
});
