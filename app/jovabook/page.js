import JovaBookLanding from "./JovaBookLanding";
import {jovabookMetadata,jovabookStructuredData} from "./search-data.mjs";
import "./navigation-integration.css";

export const metadata=jovabookMetadata();
const faqs = [
  {
    "question": "What is JovaBook and who is it for?",
    "answer": "JovaBook is booking and scheduling software by JovaMedia for service businesses, including salons, healthcare practices, tutors, coaches, consultants and spas. Clients book appointments online while you manage your calendar, services and client records. Every plan includes a business website and email confirmations and reminders."
  },
  {
    "question": "How do clients book with my business?",
    "answer": "Share your business booking link. A client chooses a service and an available date and time, enters their details and reviews the booking before confirming. The booking appears in your business calendar."
  },
  {
    "question": "Can I set different hours for each day?",
    "answer": "Yes. Set opening hours for each day and mark closed days in Business details. You can also leave time between bookings. Standard and Premium support individual working hours for team members."
  },
  {
    "question": "Does a website come with Essential?",
    "answer": "Yes. Essential includes a one-page business website with your hero image, introduction, opening hours, contact details and booking link. Change your image and introduction in Personalise, and your opening hours and contact information in Business details."
  },
  {
    "question": "Which plan do I need for my team?",
    "answer": "Essential is for one owner. Standard supports up to 5 staff and includes Insights. Premium supports up to 10 staff and has 0% booking commission. Choose any plan to start a three-day free trial."
  },
  {
    "question": "How do annual billing and commission work?",
    "answer": "Annual subscriptions are paid upfront and cost 20% less than 12 monthly subscription payments. Essential and Standard charge 1% commission on online customer bookings when appointments take place. Commission is invoiced monthly, including on annual subscriptions. Premium has 0% booking commission. Payment-processing fees are separate."
  },
  {
    "question": "What happens after the 3-day trial?",
    "answer": "Choose your plan and enter your card securely with Stripe to start a three-day free trial. There is no subscription charge today. Your chosen monthly or annual subscription starts automatically after the trial unless you cancel beforehand. Essential is £20/month, Standard £50/month and Premium £100/month. Annual subscriptions are paid upfront at the displayed discounted yearly price."
  },
  {
    "question": "Can clients book through Instagram, and can I take deposits?",
    "answer": "Share your JovaBook booking link in your Instagram bio or messages so clients can book on your page. To take online deposits, connect your business's payment-ready Stripe account and choose a business-wide deposit percentage in Payments & deposits. Deposits go to your business's Stripe account. A native Instagram Book Now integration is not available."
  }
];

export default function JovaBookPage(){
  return <><JovaBookLanding faqs={faqs}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:{duration:"PT1M32S",uploadDate:"2026-11-01T00:00:00+00:00"}})).replace(/</g,"\\u003c")}}/></>;
}
