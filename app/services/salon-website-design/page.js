import Link from "next/link";
import { pageMetadata, serviceSchema } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import ContactChoices from "@/components/ContactChoices";
import InsightCover from "@/components/InsightCover";
import s from "@/components/Editorial.module.css";
import { FaqStory } from "@/components/ScrollStories";

export const metadata = pageMetadata("/services/salon-website-design", "Salon Website Design UK | Lash & Beauty Websites", "Custom websites for UK salons and lash technicians. London-based studio, clear treatment prices, galleries and booking options. Business websites from £550.");
const service = { slug: "salon-website-design", name: "Salon website design", desc: "Website design for salons, beauty businesses and lash technicians across the UK, from a London studio. Treatment information and booking options are agreed around the business." };
const salonQuestions = [
  ["Do I need a custom booking system?", "Only when it solves a clear requirement. If your existing calendar works well, a website linked to that tool may be a simpler first step."],
  ["Can you work with a solo lash technician?", <>Yes. A smaller website can explain your services, show your work and make booking easier without adding unnecessary pages. Our <Link href="/insights/website-for-lash-technicians">lash-business website guide</Link> explains what to include.</>],
  ["Does a website replace Instagram?", <>It can work alongside it. Instagram shows current activity; your website gives customers a clear place for services, policies and booking information. See <Link href="/insights/salon-website-with-instagram-and-booking-app">how the channels can work together</Link>.</>],
  ["Will you guarantee more bookings or a Google position?", "No. We can improve the website and its search foundations, then measure what happens. Results also depend on demand, competition, your offer and the way the business responds to enquiries."],
  ["What do you need from me?", "Your treatment menu, logo or brand direction, photographs you can use, business details and current booking arrangements. Copywriting, migration and extra features can be included in an agreed quote."],
  ["Do you work with salons outside London?", "Yes. We are based in London and work with salon and beauty businesses across the UK. We can review your menu, design and booking journey remotely."],
];
export default function SalonWebsitePage() {
  return <main className={s.editorial}>
    <StructuredData data={{ ...serviceSchema(service), areaServed: [{ "@type": "Country", name: "United Kingdom" }, { "@type": "City", name: "London" }] }}/>
    <div className={s.shell}>
      <header className={s.articleHeader}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: "Salon website design", path: "/services/salon-website-design" }]}/><h1>Salon website design<br/>for beauty businesses.</h1><p className={s.articleDeck}>Show your treatments, prices and work in one considered place. We are a London-based studio designing websites for independent salons and lash technicians across the UK, with a booking route that fits the way you work.</p><div className="actions"><Link className="btn" href="/get-a-quote?product=business-website">Get a free homepage preview</Link><Link className="text-link" href="/pricing">See website prices</Link></div></header>
      <div className={s.feature}><InsightCover kind="salon" preload/></div>
      <div className={s.caseText}><div className={s.prose}>
        <h2>Help a new client choose with confidence.</h2><p>Your regular clients know what to book. A new visitor may need to compare treatments, see your work and ask a question first. We organise that information around the choices your customers actually make.</p>
        <ul><li>Treatment menus with clear prices, service details and appointment lengths.</li><li>A gallery of your own work, using photographs you have permission to publish.</li><li>Team, location and access information that helps a first-time visitor plan their visit.</li><li>Your booking and cancellation policies, with a simple route to ask a question.</li><li>Mobile layouts, clear contact options and a useful path from Instagram to your website.</li></ul>
        <h2>Keep your booking tool, or build around a different workflow.</h2><p>You can have your own website and still use Booksy, Treatwell, Fresha or another booking service. We can connect the agreed booking route while giving your business its own place for treatment information, examples and search discovery.</p><p>If you need a custom panel, we first agree the services, staff availability, customer journey and administration. Deposits, reminders, payments, migration and more complex scheduling are scoped explicitly. A custom system does not automatically include every feature of an established platform.</p>
        <div className={s.tableScroll} role="region" aria-label="Salon website options" tabIndex={0}><table><caption>Starting prices. Final scope, integration work and separate running costs are confirmed in writing.</caption><thead><tr><th scope="col">Option</th><th scope="col">Starting point</th><th scope="col">What it means</th></tr></thead><tbody><tr><th scope="row">Business website</th><td>From £550</td><td>Four core pages and an enquiry route. An existing booking link or integration is agreed around your tool and requirements.</td></tr><tr><th scope="row">Website with booking system</th><td>From £2,000</td><td>A business website with its own agreed booking journey and admin panel. Infrastructure, payment and messaging costs are separate where applicable.</td></tr></tbody></table></div>
        <p>Read the <Link href="/insights/salon-booking-platform-fees-vs-own-website">booking-platform fee comparison</Link> before deciding whether to switch. We explain where direct booking helps and when an existing platform remains useful.</p>
        <h2>A clear process, from menu to launch.</h2><ol><li><strong>Plan.</strong> Share your treatments, prices, photographs and current booking route. We agree the page plan and the customer action.</li><li><strong>Design.</strong> Review the visual direction and the way the treatment information is arranged.</li><li><strong>Build and check.</strong> We build the agreed pages and test mobile layouts, links and the enquiry journey.</li><li><strong>Hand over.</strong> We confirm account access, ongoing responsibilities and any agreed care.</li></ol>
        </div><nav aria-label="Explore related services" className={s.relatedServices}><Link href="/services/web-design">Small business website design</Link><Link href="/services/seo">Search and local visibility</Link></nav><ContactChoices compact/></div>
    </div>
    <FaqStory items={salonQuestions} contactHref="/get-a-quote" contactLabel="Get a Quote"/>
  </main>;
}
