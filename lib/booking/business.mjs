export function businessSlug(){return process.env.BOOKING_BUSINESS_SLUG||'north-and-co';}

export function bookingPolicy(){return {deposit_percent:25,online_payments_enabled:false};}

export function websiteUrl(){
 try{const url=new URL(process.env.BOOKING_WEBSITE_URL||'https://www.jovamedia.com');if(url.protocol==='https:')return url.href;}catch{}
 return 'https://www.jovamedia.com';
}

export async function deploymentBusiness(client){
 const current=await client.from('salon_settings').select('id').single();
 if(!current.error&&current.data)return {...current.data,slug:businessSlug(),single:true};
 if(!['PGRST205','42P01'].includes(current.error?.code))throw Object.assign(new Error('This salon is unavailable.'),{status:503});
 const {data,error}=await client.from('businesses').select('id,slug').eq('slug',businessSlug()).eq('active',true).single();
 if(error||!data)throw Object.assign(new Error('This salon is unavailable.'),{status:503});
 return {...data,single:false};
}
