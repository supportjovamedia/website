"use client";

import Link from "next/link";
import Image from "next/image";
import s from "./WhyJovaPreview.module.css";
import MotionRegion from "./MotionRegion";
import useCardRail from "./useCardRail";
import RailPagination from "./RailPagination";

const values = [
  { photo: "compass", image: "/why-jova/approved/strategy-planning.webp", alt: "Creative planning with reference books, photographs, pencils and material swatches", title: ["A plan", "for your website."], copy: "Agree the pages, message and enquiry route that fit your small business." },
  { photo: "pen", image: "/why-jova/approved/design-gelato.webp", alt: "Pistachio gelato with a coordinated lilac and coral visual identity across packaging and photography", title: ["Design", "people remember."], copy: "Custom website and brand design built around your business and its customers." },
  { photo: "laptop", image: "/why-jova/approved/together-green-brandkit.webp", alt: "A complete botanical brand identity across logo, business cards, stationery, packaging and campaign materials", title: ["A consistent", "business identity."], copy: "Bring your website, branding and social media content together." },
  { photo: "headphones", image: "/why-jova/approved/launch-campaign.webp", alt: "Coordinated coffee packaging and photographic campaign assets prepared for launch", title: ["Support", "after launch."], copy: "Add website care, content updates or social media management as your business needs them." },
];

export default function WhyJovaPreview() {
  const { rail, registerCard, active, select } = useCardRail();
  return <section className={s.section} id="why-jova" aria-labelledby="why-jova-heading">
    <div className={s.inner}>
      <MotionRegion className={s.intro} enterOnly><div data-motion-card>
        <h2 id="why-jova-heading">A digital partner.<br />Not just a deliverable.</h2>
        <p className={s.introCopy}>Website design, branding, social content and ongoing care in one place. Choose the support your business needs.</p>
        <Link className={s.cta} data-enquiry-cta href="/get-a-quote">Get a Quote</Link>
      </div></MotionRegion>
      <div className={s.values} ref={rail} tabIndex={0} role="region" aria-label="How JovaMedia supports your business">
        {values.map(({ photo, image, alt, title, copy }, index) => <article className={s.value} id={`partner-${photo}`} ref={node => registerCard(index, node)} key={photo}>
          <div className={s.art}><Image src={image} alt={alt} fill sizes="(max-width: 900px) 85vw, (max-width: 1100px) 45vw, 24vw" /></div>
          <h3>{title.join(" ")}</h3>
          <p>{copy}</p>
        </article>)}
      </div>
      <RailPagination className={s.pagination} label="Choose a business support preview" items={values.map(({ photo, title }) => ({ id: `partner-${photo}`, name: title.join(" ") }))} active={active} onSelect={select}/>
    </div>
  </section>;
}
