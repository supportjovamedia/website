import Image from 'next/image';
import s from './story.module.css';
import cards from './BusinessTypes.module.css';
const businesses=[
 ['Hair & beauty','Hair salons, nail salons, barbers and beauty treatments.','/websites/photography/salon-website-design-hero-main.webp','Styling chairs and mirrors in a hair and beauty salon'],
 ['Healthcare','Dentists, chiropractors and therapy appointments.','/jovabook/industry-healthcare.webp','A dentist examining a patient in a dental clinic'],
 ['Education & tutors','Private tuition, tutoring sessions and education centres.','/jovabook/education-black-tutor.webp','A tutor helping a student with their studies'],
 ['Coaches & trainers','Personal trainers, fitness coaches and one-to-one sessions.','/home-agency/fitness.webp','A trainer in a fitness studio'],
 ['Consultation services','Consultants, advisers and professional appointments.','/home-agency/desk.webp','A professional workspace ready for a consultation'],
 ['Spa & wellness','Spa visits, facials and relaxation treatments.','/jovabook/industry-spa.webp','A relaxation treatment at a spa'],
];
export default function BusinessTypes(){return <section className={cards.section} aria-labelledby="business-types-title"><div className={cards.inner}><header className={s.sectionHeading}><h2 id="business-types-title">Scheduling software for service businesses.</h2><p>Your services, your prices and the hours you work. Set up JovaBook around the appointments your clients book.</p></header><div className={cards.grid} data-card-group>{businesses.map(([name,description,src,alt])=><article key={name} className={cards.card} data-story-card><div className={cards.photo}><Image src={src} alt={alt} fill sizes="(max-width:650px) 40vw, (max-width:1100px) 43vw, 320px"/></div><div className={cards.copy}><h3>{name}</h3><p>{description}</p></div></article>)}</div></div></section>}
