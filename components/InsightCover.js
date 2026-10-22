import Image from "next/image";
import s from "./Editorial.module.css";

const photographs = {
  phpSecurity: { src: "/websites/photography/crm-systems-hero-context.webp", alt: "Close-up of an illuminated black computer keyboard" },
  aiSecurity: { src: "/websites/photography/bespoke-websites-hero-main.webp", alt: "A desktop monitor displaying website designs in a studio workspace" },
  bookingSecurity: { src: "/websites/photography/booking-systems-editorial-one.webp", alt: "A laptop and appointment planner on a desk" },
  salonInvestment: { src: "/insights/salon-booking-investment.webp", alt: "An empty hair salon with grey styling chairs, illuminated mirrors and a curved burgundy seat" },
  lashes: { src: "/insights/lash-treatment.webp", alt: "A lash technician working carefully with tweezers during an eyelash treatment" },
  salon: { src: "/insights/salon-interior.webp", alt: "A hair salon with styling chairs and illuminated mirrors" },
  business: { src: "/insights/qaiser-website.webp", alt: "The Qaiser Watches website, designed and built by JovaMedia" },
  launch: { src: "/service-editorial/copywriting.jpg", alt: "A notebook and pen on a desk, ready for planning a website launch" },
};

export default function InsightCover({ kind = "business", compact = false, preload = false }) {
  const photo = photographs[kind];
  const className = `${s.cover} ${s[kind]} ${compact ? s.compact : ""}`;
  if (photo) return <div className={className}><Image src={photo.src} alt={photo.alt} fill preload={preload} sizes={compact ? "(max-width:600px) 92vw, (max-width:950px) 46vw, 580px" : "(max-width:1000px) 92vw, 960px"}/></div>;
  if (kind === "cost") return <div className={className} role="img" aria-label="JovaMedia starting build prices: landing page £350, business website £550, website with booking system £2,000. Running costs are separate.">
    <div className={s.priceSheet} aria-hidden="true"><span className={s.priceSheetTitle}>What are you building?</span><div><span>Landing page</span><strong>£350</strong></div><div><span>Business website</span><strong>£550</strong></div><div><span>Website + booking</span><strong>£2,000</strong></div><small>JovaMedia starting prices. Running costs separate.</small></div>
  </div>;
  return <div className={className} role="img" aria-label="Illustration: a £60 appointment with 35% acquisition commission leaves £39 before VAT and other costs.">
    <div className={s.receipt} aria-hidden="true"><span>An appointment</span><strong className={s.receiptTotal}>£60</strong><div className={s.receiptBar}><i/><i/></div><div className={s.receiptLines}><div><span>35% commission</span><strong>£21</strong></div><div><span>Before other costs</span><strong>£39</strong></div></div><small>Illustration. VAT and other charges excluded.</small></div>
  </div>;
}
