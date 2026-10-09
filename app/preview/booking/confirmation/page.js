'use client';
import {useEffect,useState} from 'react';
import {DateTime} from 'luxon';
import {Check,UserRound} from 'lucide-react';
import {bookingApi} from '../api';

export default function Confirmation(){
 const [receipt,setReceipt]=useState(null),[error,setError]=useState('');
 useEffect(()=>{bookingApi('public/confirmation').then(setReceipt).catch(e=>setError(e.message));},[]);
 if(!receipt)return <main className="booking-confirmation-page"><section className="confirmation"><h1>{error?'Confirmation unavailable':'Opening your confirmation...'}</h1>{error?<><p role="alert">{error}</p><a className="primary" href="/">Back to website</a></>:null}</section></main>;
 const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:receipt.business.currency}).format(v/100);
 const cancelled=receipt.booking.status==='cancelled';
 const start=DateTime.fromISO(receipt.booking.starts_at).setZone(receipt.business.timezone);
 return <main className="booking-confirmation-page"><nav aria-label="Confirmation navigation"><span className="studio-wordmark">{receipt.business.name}</span>{receipt.account_booking?<a className="outline confirmation-profile" href="/preview/booking/account"><UserRound size={17}/>My profile</a>:null}</nav><section className="confirmation" aria-labelledby="confirmation-title"><span className="success-circle"><Check size={34}/></span><h1 id="confirmation-title">{cancelled?'Appointment cancelled.':"You're booked."}</h1><p>{cancelled?'This appointment is no longer scheduled.':'We look forward to seeing you.'}</p><div className="confirmation-details"><p className="confirmation-reference">Booking reference <strong>#{receipt.booking.id}</strong></p><h2>{receipt.service_name}</h2><p>{start.toFormat('cccc, d LLLL yyyy')}<br/><strong>{start.toFormat('HH:mm')}</strong> with {receipt.staff_name}</p><p>{receipt.business.name}<br/>{receipt.business.address}</p><div className="booking-review-row"><span>Paid online</span><strong>{money(0)}</strong></div><div className="booking-review-row booking-review-total"><span>Pay at venue</span><strong>{money(cancelled?0:receipt.booking.price_pence)}</strong></div></div><p className="small muted">Save your booking reference. No online payment has been taken.</p><a className="primary" href={receipt.website_url}>Back to website</a></section></main>;
}
