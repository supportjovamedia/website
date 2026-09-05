import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
export const metadata = pageMetadata(
  "/contact",
  "Contact JovaMedia",
  "Discuss your website, branding, SEO or digital marketing project with JovaMedia in London. Share your goals and prepare an enquiry for our team.",
);
export default function Page() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="kicker">Start a project</div>
          <h1>What are you trying to make happen?</h1>
          <p className="lead">
            Tell us where the business is today, where you want it to go and
            what is getting in the way. We’ll come back with a sensible next
            step.
          </p>
        </div>
      </section>
      <section className="band band-soft">
        <div className="shell split contact-intro">
          <div>
            <div className="kicker">New business</div>
            <h2>Bring us the goal, not a perfectly written brief.</h2>
            <p className="lead small-lead">
              Social, content, paid media, search, web, brand or a joined-up
              programme. If there is a better route than the one you have in
              mind, we’ll say so.
            </p>
            <p>
              <b>support@jovamedia.com</b>
              <br />
              London, United Kingdom
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
