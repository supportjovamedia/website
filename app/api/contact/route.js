// No mail provider is configured. Never report delivery or log personal enquiry data.
export async function POST(){return Response.json({ok:false,error:'Online delivery is not configured. Please use the email draft on the contact page.'},{status:503,headers:{'Cache-Control':'no-store'}})}
