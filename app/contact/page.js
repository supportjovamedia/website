import ProjectFAQ from "@/components/ProjectFAQ";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
import MotionRegion from "@/components/MotionRegion";
import BusinessContact from "@/components/BusinessContact";
import PhotoHero from "@/components/PhotoHero";
export const metadata = pageMetadata(
  "/contact",
  "Contact JovaMedia",
  "Talk to JovaMedia about website design across the UK. Request a free homepage preview, call, use WhatsApp or leave a website chat message.",
);
export default function Page() {
  return (
    <main className="contact-page">
      <PhotoHero image="contact" className="page-hero">
        <div className="shell">

          <h1>Let’s make<br /><em>it happen.</em></h1>
          <p className="lead">
            A new project, a quick question or support with existing work. Tell us what you need and we’ll help you find the next step.
          </p>
        </div>
      </PhotoHero>
      <section id="enquiry" className="band band-soft">
        <MotionRegion className="shell split contact-intro">
          <div data-motion-card>

            <h2>We’re here to help.</h2>
            <p className="lead small-lead">
              Leave your name, email and a short message. You can add a phone number if you would like us to call.
            </p>
            <p>
              <a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a>
              <br />
              Based in London, working across the UK
            </p>
            <BusinessContact />
          </div>
          <div data-motion-card className="contact-form-panel" style={{ "--card-delay": "100ms" }}><ContactForm /></div>
        </MotionRegion>
      </section>
    <section className="section contact-fit"><div className="shell"><h2>We could be a good fit if…</h2><div className="contact-fit-grid">{[["You want clarity","You know something could work better and want practical advice on where to begin."],["You care about the details","You want your website, brand and content to feel consistent and considered."],["You welcome a fresh perspective","You are open to discussing the options and finding an approach that suits your business."],["You want a collaborative partner","You value straightforward communication and want to be involved in shaping the result."]].map(([title,copy])=><article key={title}><span aria-hidden="true">✓</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <ProjectFAQ />
    </main>
  );
}
