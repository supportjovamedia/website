import JovaBookLanding from "./JovaBookLanding";
import {jovabookMetadata,jovabookStructuredData} from "./search-data.mjs";
import "./navigation-integration.css";

export const metadata=jovabookMetadata();
const faqs = [
  {
    "question": "What is included in Starter?",
    "answer": "Starter is £0 per month with one staff calendar, up to 20 bookings per calendar month and 50 emails per month. Your one-page website includes your business name, logo, description, hours, contact details and online booking. A Powered by JovaBook badge stays visible. No card is required to use Starter."
  },
  {
    "question": "Is the free plan a trial?",
    "answer": "Starter is a free plan with monthly limits. There is no automatic upgrade or subscription charge. Pro Solo and Pro Team are paid plans. A card is taken only when you subscribe and the subscription starts straight away. There is no free trial."
  },
  {
    "question": "What happens when I reach 20 bookings?",
    "answer": "Starter pauses new bookings for a calendar month once it has 20 appointments. Existing bookings stay in your diary. Cancelled appointments do not use the limit. Upgrade to Pro Solo or Team for unlimited bookings."
  },
  {
    "question": "How do email and SMS allowances work?",
    "answer": "Starter includes 50 emails per month. Pro Solo includes 100 emails and 50 SMS per month. Team includes 100 emails and 50 SMS for each staff seat, including the seat in the base plan. Booking confirmations, alerts and reminders use these allowances. They reset each calendar month and do not roll over. Messages pause when the allowance is used; extra messages are never charged automatically."
  },
  {
    "question": "Can I add bookings to my existing website?",
    "answer": "Pro Solo and Team include an embeddable booking calendar: a small piece of code you paste into your own website so clients can book there. You can also keep using your included one-page website link."
  },
  {
    "question": "How much does Team cost?",
    "answer": "Pro Team is £25 per month including one staff seat, plus £6 per month for each extra staff seat. Two seats cost £31 per month and three cost £37 per month. Each seat includes 100 emails and 50 SMS per month. Team removes JovaBook branding from customer-facing booking pages and includes advanced Insights, period comparisons and extra website customisation."
  },
  {
    "question": "How do annual billing and commission work?",
    "answer": "Every plan has 0% booking commission. Pro Solo is £192 per year, paid upfront, equivalent to £16 per month. Pro Team is £240 per year including one seat, plus £57.60 per year for each extra seat. That saves 20% against twelve monthly payments. Monthly message allowances still reset monthly. Stripe payment-processing fees are separate."
  },
  {
    "question": "Can clients book through Instagram, and can I take deposits?",
    "answer": "Share your one-page website link in Instagram, WhatsApp or messages. On Pro Solo and Pro Team, connect a payment-ready Stripe account and choose your deposit percentage. Starter is booking only. Deposits go to your connected Stripe account. Stripe processing fees still apply. There is no native Instagram Book Now integration."
  }
];

export default function JovaBookPage(){
  return <><JovaBookLanding faqs={faqs}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:{duration:"PT1M32S",uploadDate:"2026-11-01T00:00:00+00:00"}})).replace(/</g,"\\u003c")}}/></>;
}
