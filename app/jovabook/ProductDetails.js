import ProductScreen from "./ProductScreen";
import MotionRegion from "@/components/MotionRegion";
import s from "./jovabook.module.css";

const styles = ["Jova Blue", "Rose Studio", "Midnight Glass", "Forest", "Warm Studio", "Amethyst"];

const dimensions = {"calendar-desktop":[2880,1920], insights:[2880,1920], services:[2880,1920], clients:[2880,1920], website:[2880,3932], "website-editor":[2880,2000], themes:[2880,1920]};
const labels = {"calendar-desktop":"calendar",services:"services",clients:"client records",insights:"Insights",website:"business website","website-editor":"website editor",themes:"workspace themes"};
function Screen({name,alt,priority=false}) {
  const [width,height] = dimensions[name];
  return <ProductScreen name={name} label={labels[name]} alt={alt} width={width} height={height} priority={priority} />;
}

export default function ProductDetails() {
  return <>
    <section id="features" className={s.calendarSection} aria-labelledby="calendar-title">
      <div className={s.container}>
        <header className={s.sectionIntro}><h2 id="calendar-title">Clients choose a time.<br />You see the day ahead.</h2><p>A booking request should not mean another round of messages. Give clients your business booking link so they can choose a service, find an available time and confirm their details.</p></header>
        <MotionRegion className={s.calendarProof} enterOnly><div className={s.calendarProofScreen} data-motion-card><Screen name="calendar-desktop" alt="JovaBook's real appointment calendar with a timeline and colour-coded bookings" /></div></MotionRegion>
        <div className={s.calendarExplanation}><h3>Your appointments,<br />in context.</h3><div><p>Open your calendar to see who is coming in and what they have booked. Category colours help you tell services apart, and you can open a booking for its details.</p><p>Keep the diary and the booking page connected to the services and working hours you set. Your business stays in control of what clients can book.</p></div></div>
      </div>
    </section>
    <section className={s.productDetails} aria-label="Services and client management">
      <div className={s.container}>
        <MotionRegion className={s.detailRow} enterOnly>
          <div className={`${s.detailVisual} ${s.servicesVisual}`} data-motion-card><div className={s.detailScreenshot}><Screen name="services" alt="The JovaBook services workspace with service names, prices, durations and categories" /></div></div>
          <div className={s.detailCopy} data-motion-card><h2>Your services.<br />Your hours.<br />Your way of working.</h2><p>A haircut and a consultation do not need the same amount of time. Give each service its own price and duration, then organise the list into categories clients can understand.</p><p>Set different opening hours for each day, including days you are closed. Add time between bookings when you need to prepare for the next client. Your booking page uses those settings to show available times.</p><p>Essential keeps the diary focused on you. When you add a team on Standard or Premium, manage who offers each service and when each person works.</p></div>
        </MotionRegion>
        <MotionRegion className={`${s.detailRow} ${s.clientDetail}`} enterOnly>
          <div className={s.detailCopy} data-motion-card><h2>Know the client.<br />Before they arrive.</h2><p>When a client calls, you should not have to search through old messages for the basics. Find their record, check their contact details and look through their booking history in JovaBook.</p><p>Search for the person you need and update their details in the same workspace as your appointments. Their booking history gives you context when they get back in touch.</p></div>
          <div className={`${s.detailVisual} ${s.clientsVisual}`} data-motion-card><div className={s.detailScreenshot}><Screen name="clients" alt="The JovaBook Clients screen for searching contact records and reviewing booking history" /></div></div>
        </MotionRegion>
        <MotionRegion className={s.detailRow} enterOnly>
          <div className={s.detailVisual} data-motion-card><div className={s.detailScreenshot}><Screen name="insights" alt="JovaBook Insights showing returning clients, clients with no next booking and top services" /></div></div>
          <div className={s.detailCopy} data-motion-card><span className={s.tierLabel}>Standard and Premium</span><h2>See what brings<br />clients back.</h2><p>A busy diary tells you who is coming in. Insights helps you look beyond the next appointment, with returning clients, clients who have no next booking and the services people choose most.</p><p>Standard includes Insights and space for up to 5 staff. Premium adds period comparisons and space for up to 10. Essential includes your calendar and client records, without team management or Insights.</p></div>
        </MotionRegion>
      </div>
    </section>
    <section className={s.websiteSection} aria-labelledby="website-title">
      <div className={s.container}>
        <header className={s.sectionIntro}><h2 id="website-title">Your own website.<br />Your own words.</h2><p>A place to introduce your business, show what you do and give clients a clear way to book. A one-page business website is included with Essential and Standard.</p></header>
        <MotionRegion className={s.websiteScreens} enterOnly>
          <figure data-motion-card><div className={s.detailScreenshot}><Screen name="website" alt="A live JovaBook business website with the business introduction and booking link" /></div><figcaption>Your business website</figcaption></figure>
          <figure data-motion-card><div className={s.detailScreenshot}><Screen name="website-editor" alt="The real JovaBook Personalise controls for editing the business website" /></div><figcaption>The controls to make it yours</figcaption></figure>
        </MotionRegion>
        <div className={s.websiteExplanation}><p>Change the heading, hero image, About text and colours in Personalise. You can keep your introduction up to date without asking a designer to change each line.</p><p>Your opening hours, phone number and email come from Business details, so you do not have to edit the same information twice. Share your website when a client wants to know more, or your booking link when they are ready to choose a service.</p></div>
      </div>
    </section>
    <section className={s.themeSection} aria-labelledby="themes-title">
      <div className={s.container}><MotionRegion className={s.themeRow} enterOnly>
        <div className={s.detailCopy} data-motion-card><h2 id="themes-title">Your workspace.<br />A style that suits you.</h2><p>You spend time in your calendar. Choose a workspace you like looking at, with six styles that range from light colours to a dark interface.</p><ul className={s.themeNames}>{styles.map(name=><li key={name}>{name}</li>)}</ul><p>These styles change your owner workspace. Your customer-facing booking page and business website have their own presentation settings, so your working view and your business branding can be different.</p></div>
        <div className={s.themeVisual} data-motion-card><div className={s.detailScreenshot}><Screen name="themes" alt="JovaBook's six workspace style choices in the Personalise screen" /></div></div>
      </MotionRegion></div>
    </section>
  </>;
}
