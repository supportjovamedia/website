import s from './story.module.css';

export default function BookingPartner(){
 return <section className={s.partnerSection} aria-labelledby="booking-partner-title">
  <header className={s.bookingOverview}>
   <h2 id="booking-partner-title">A booking system built around your business.</h2>
   <p>JovaBook gives your clients a place to book and gives you the tools to run each day. Your calendar, client records and business website work together.</p>
   <a className={s.primaryButton} href="#plans">Choose your plan</a>
  </header>
 </section>;
}
