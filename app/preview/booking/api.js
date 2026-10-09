export async function bookingApi(path,body){
 const options={method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined};
 let response=await fetch('/preview/booking/api/'+path,options);
 if(response.status===401&&!path.startsWith('auth/')){
  const refresh=await fetch('/preview/booking/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(refresh.ok)response=await fetch('/preview/booking/api/'+path,options);
 }
 const value=await response.json();
 if(!response.ok)throw new Error(value.error||'Something went wrong. Please try again.');
 return value;
}
