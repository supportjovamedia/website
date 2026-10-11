import { FaqStory } from "./ScrollStories";

const questions = [
  ["Can we start with one service?", "Yes. Start with a focused website, brand or marketing brief. We agree the scope around what your business needs."],
  ["What should I include in an enquiry?", "Tell us about your business, what you want to achieve and any timing or budget considerations. A rough brief is enough."],
  ["How are costs and timings agreed?", "We agree the work, fees and timings in a written proposal before your project starts."],
  ["What happens after I send my enquiry?", "You will see a confirmation when your enquiry is sent. We reply within 1–3 working days. If sending fails, your details stay in the form so you can retry."],
  ["Do I have to accept analytics to contact you?", "No. You can reject optional analytics and still use the website and enquiry form."],
];

export default function ProjectFAQ() {
  return <FaqStory items={questions} contactHref="/get-a-quote" contactLabel="Get a Quote" />;
}
