import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import LayeredStudio from "@/components/LayeredStudio";
import { ProcessStory } from "@/components/ScrollStories";
export const metadata = pageMetadata("/about", "About Our London Digital Agency", "Meet JovaMedia, a London agency connecting strategy, design, content and technology.");
export default function Page(){return <main>
 <section className="page-hero"><div className="shell"><p className="kicker">THE STUDIO</p><h1>A shared ambition.<br/><em>A stronger tomorrow.</em></h1><p className="lead">One partner for strategy, design, content and delivery. We bring the thinking and the making together, so your business can move forward.</p><div className="actions"><Link className="btn" href="/contact">Meet your digital partner</Link></div></div></section>
 <div className="studio-photo"><Image src="/home-agency/sketch.webp" alt="A creative team developing website plans together" fill sizes="100vw" /></div>
 <LayeredStudio/>
 <section className="band band-navy"><div className="shell editorial-split"><div><p className="kicker">OUR POINT OF VIEW</p><h2>Good work starts<br/><em>with understanding.</em></h2></div><div><p className="lead">The best agency relationship makes the work feel clearer.</p><p>We listen to your business, agree what matters and keep you close to the decisions. Strategy stays connected to the people designing, writing and building.</p><p>We use modern tools where they improve the work. Human judgement remains accountable for what goes live, with specialist support shaped around your brief.</p></div></div></section>
 <ProcessStory/>
 <section className="section"><div className="shell"><p className="kicker">WHAT YOU CAN EXPECT</p><div className="studio-values">{[["01","A clearer direction.","A shared understanding of the problem, the priorities and what success looks like."],["02","Work that feels like you.","Considered design and a consistent voice, built around your business."],["03","A partner who stays close.","Direct communication, practical delivery and support agreed around your next steps."]].map(([n,title,copy])=><article key={n}><span>{n}</span><h2>{title}</h2><p>{copy}</p></article>)}</div></div></section>
 <section className="band band-gold"><div className="shell"><p className="kicker">LET’S TALK</p><h2>Let’s build<br/><em>what’s next.</em></h2><Link href="/contact" className="btn">Start a conversation</Link></div></section>
 </main>}
