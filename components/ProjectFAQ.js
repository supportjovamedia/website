import Link from "next/link";
export default function ProjectFAQ(){return <section className="shell site-faq" aria-labelledby="project-faq-title">
<h2 id="project-faq-title">Before we start.</h2>
<details><summary>Can we start with one service?</summary><p>Yes. A focused website, brand or marketing brief can be a starting point. We agree the scope around what your business needs rather than requiring a full programme.</p></details>
<details><summary>What should I include in an enquiry?</summary><p>Tell us about your business, the problem you want to solve and any timing or budget considerations. A rough brief is enough to begin a conversation.</p></details>
<details><summary>How are costs and timings agreed?</summary><p>They depend on the scope, deliverables and available resources. A written proposal sets out the work, fees and responsibilities before a project starts.</p></details>
<details><summary>Does the form send my enquiry automatically?</summary><p>No. It prepares an email draft for you to review. Open your email app and send it, or copy the brief into your preferred email service. The website does not send it for you.</p></details>
<details><summary>Do I have to accept analytics to contact you?</summary><p>No. You can reject optional analytics and still use the website and enquiry form.</p></details>
<p><Link className="text-link" href="/contact">Discuss your project</Link></p>
</section>}
