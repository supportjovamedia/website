import s from "./Industries.module.css";
const industries = [
  ["Bakeries & food", "Menus, orders and everyday favourites.", "M5 11a4 4 0 0 1 0-8 4 4 0 0 1 7-1 4 4 0 0 1 7 1 4 4 0 0 1 0 8v10H5Z M5 16h14"],
  ["Construction & trades", "Show your projects. Win the next enquiry.", "M3 21V9l9-6 9 6v12H3Z M9 21v-8h6v8 M3 9h18"],
  ["Beauty & salons", "Treatments, bookings and a brilliant first impression.", "M12 2c0 6-3 10-9 10 6 0 9 4 9 10 0-6 3-10 9-10-6 0-9-4-9-10Z"],
  ["Cafés & hospitality", "Give guests a reason to visit.", "M3 5h13v9a6.5 6.5 0 0 1-13 0V5Z M16 6h2a4 4 0 0 1 0 8h-2 M2 22h18"],
  ["Retail & e-commerce", "Products worth exploring. Shopping made simple.", "M4 8h16l1 14H3L4 8Z M8 8V6a4 4 0 0 1 8 0v2"],
  ["Professional services", "Make your expertise easy to understand.", "M3 7h18v14H3V7Z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3"],
  ["Health & fitness", "Build trust and bring your community together.", "M2 9v6 M6 6v12 M6 12h12 M18 6v12 M22 9v6 M2 12h4 M18 12h4"],
  ["Property & interiors", "Spaces that deserve to be seen.", "M2 11 12 2l10 9 M5 9v13h14V9 M9 22v-8h6v8"]
];
export default function Industries(){return <section id="industries" className={s.section} aria-labelledby="industries-title"><div className={s.inner}>
<header className={s.heading}><div><p className={s.kicker}>BUILT AROUND YOUR BUSINESS</p><h2 id="industries-title">Industries we build<br/>websites <em>for.</em></h2></div><p>Different industries. The same attention to detail.<br/>A website shaped around your business and the people you want to reach.</p></header>
<div className={s.grid}>{industries.map(([name,copy,path])=><article key={name} className={s.card}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg><h3>{name}</h3><p>{copy}</p></article>)}</div>
<div className={s.bottom}><p>Don’t see your industry? We would love to hear what you do.</p><a href="/contact">Tell us about your business <span aria-hidden="true">↗</span></a></div>
</div></section>}
