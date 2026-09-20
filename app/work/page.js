import Link from "next/link";
import SelectedConcepts from "@/components/SelectedConcepts";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/work", "Our Work", "Explore JovaMedia website design across beauty, hospitality, retail and more.");
export default function Page(){return <main><section className="page-hero"><div className="shell"><p className="kicker">OUR WORK</p><h1>Different businesses.<br/><em>Distinctive design.</em></h1><p className="lead">A closer look at the websites we create. Explore each preview, from the first impression to the final detail.</p></div></section><SelectedConcepts/><section className="band band-gold"><div className="shell"><p className="kicker">YOUR NEXT CHAPTER</p><h2>Your business.<br/><em>A fresh perspective.</em></h2><Link className="btn" href="/contact">Let’s talk about your website</Link></div></section></main>}
