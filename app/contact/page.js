import ProjectFAQ from "@/components/ProjectFAQ";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
export const metadata = pageMetadata(
  "/contact",
  "Contact JovaMedia",
  "Contact JovaMedia about a new project, ask a general question or get help with existing work.",
);
export default function Page() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="kicker">GET IN TOUCH</div>
          <h1>Let’s make<br /><em>it happen.</em></h1>
          <p className="lead">
            A new project, a quick question or support with existing work. Tell us what you need and we’ll help you find the next step.
          </p>
        </div>
      </section>
      <section id="enquiry" className="band band-soft">
        <div className="shell split contact-intro">
          <div>
            <div className="kicker">LET’S TALK</div>
            <h2>You don’t need a perfect brief to start.</h2>
            <p className="lead small-lead">
              Choose the type of enquiry that fits. For a quick question or existing-client support, just leave your name, email and message.
            </p>
            <p>
              <a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a>
              <br />
              London, United Kingdom
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    <section className="section contact-fit"><div className="shell"><p className="kicker">WHY START A CONVERSATION?</p><h2>We could be a good fit if…</h2><div className="contact-fit-grid">{[["You want clarity","You know something could work better and want practical advice on where to begin."],["You care about the details","You want your website, brand and content to feel consistent and considered."],["You welcome a fresh perspective","You are open to discussing the options and finding an approach that suits your business."],["You want a collaborative partner","You value straightforward communication and want to be involved in shaping the result."]].map(([title,copy])=><article key={title}><span aria-hidden="true">✓</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <ProjectFAQ />
    </main>
  );
}
