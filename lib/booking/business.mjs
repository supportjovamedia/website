export function businessSlug(){return process.env.BOOKING_BUSINESS_SLUG||'north-and-co';}

export async function deploymentBusiness(client){
 const {data,error}=await client.from('businesses').select('id,slug').eq('slug',businessSlug()).eq('active',true).single();
 if(error||!data)throw Object.assign(new Error('This salon is unavailable.'),{status:503});
 return data;
}
