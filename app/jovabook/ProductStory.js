import { Check } from "lucide-react";
import ProductScreen from "./ProductScreen";
import WorkspaceThemes from "./WorkspaceThemes";
import BookingWalkthrough from "./BookingWalkthrough";
import s from "./story.module.css";

function Proof({ name, label, alt, phone = false, tall = false, children }) {
  const height = phone ? 1622 : name === "website" ? 3932 : name === "website-editor" ? 2000 : 1920;
  return <div className={`${s.proofStage} ${phone ? s.phoneStage : ""} ${tall ? s.websiteStage : ""}`} data-story-visual><div className={s.proofDrift} data-story-drift><div className={s.proofFrame}><ProductScreen name={name} label={label} alt={alt} width={phone ? 750 : 2880} height={height} caption={false} /></div>{children}</div></div>;
}
function Feature({ id, title, children, image, reverse = false, tone = "blue", points, tier }) {
  return <section id={id} className={`${s.feature} ${reverse ? s.reverse : ""} ${s[tone]} ${id === "included-website" ? s.includedWebsite : ""}`} aria-labelledby={`${id}-title`} data-story-row>
    <div className={s.featureCopy} data-story-copy>{tier && <span className={s.tierLabel}>{tier}</span>}<h2 id={`${id}-title`}>{title}</h2>{children}{points && <ul className={s.featurePoints}>{points.map(point => <li key={point}><Check size={15} aria-hidden="true" /><span>{point}</span></li>)}</ul>}</div>{image}
  </section>;
}
export default function ProductStory() {
  return <>
    <div className={s.productStory}><BookingWalkthrough/><div className={s.calendarBand}><div className={s.container}>
      <Feature id="booking-calendar" title="See every booking in one clear calendar." reverse points={["Day, week and month views", "Colour-coded service categories", "Open a booking for the details"]} image={<Proof name="calendar-desktop" label="calendar" alt="JovaBook week calendar with green and violet service-category bookings" />}>
        <p>See who is coming in, what they have booked and where the next appointment fits. Service-category colours help different bookings stand out.</p><p>Keep your working day in view, then open a booking when you need a closer look.</p>
      </Feature>
    </div></div><div className={s.container}>
      <Feature id="included-website" title="Your own website, connected to your booking page." tone="sage" image={<Proof name="website" label="business website" tall alt="A real JovaBook business website with a salon hero image and booking button" />}>
        <div className={s.websiteIntro}><p>Give clients somewhere to get to know your business before they choose a service. Essential and Standard include a one-page website, connected to your booking page.</p></div><div className={s.websiteCopyBlock}><h3>Introduce your business your way.</h3><p>Choose a hero image, write your introduction and tell visitors what makes your business worth a visit. Edit your words and colours from Personalise whenever something changes.</p></div><div className={s.websiteCopyBlock}><h3>Turn interest into a booking.</h3><p>Your Book now button takes visitors straight to your services and available times. Share your website in your Instagram bio, messages or business profile, so clients have one place to start.</p></div><div className={s.websiteCopyBlock}><h3>Keep the important details up to date.</h3><p>Opening hours, your phone number and email come from Business details. Change them once and your website uses the same information, without another page to maintain.</p></div>
      </Feature>
      <Feature id="website-personalisation" title="Update your website from your dashboard." reverse points={["Change your hero image and heading", "Write your own About section", "Choose simple colours without a website-builder project"]} image={<Proof name="website-editor" label="website editor" alt="Real JovaBook Personalise controls for editing the website headline, introduction and hero image" />}>
        <p>Keep your website introduction up to date from Personalise. Change the heading, hero image, About text and colours yourself.</p><p>Your opening hours and contact details stay connected to Business details. Update them once and your website uses the same information.</p>
      </Feature>
    </div><WorkspaceThemes /><div className={s.container}>      <Feature id="business-insights" tier="Standard and Premium" title="Understand your business with Insights." reverse points={["Top services and returning clients", "Clients who have no next booking", "Period comparisons with Premium"]} image={<Proof name="insights" label="Insights" alt="Actual JovaBook Insights with bookings by day and top services" />}>
        <p>Your diary tells you who is coming in. Insights helps you look beyond the next appointment, with popular services, returning clients and clients who have no next booking.</p><p>Use the period filters to review the business over time. Premium adds comparisons between periods.</p>
      </Feature>
</div></div>
  </>;
}
