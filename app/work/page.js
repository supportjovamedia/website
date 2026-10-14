import Link from "next/link";
import Image from "next/image";
import SelectedConcepts from "@/components/SelectedConcepts";
import PhotoHero from "@/components/PhotoHero";
import { pageMetadata } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import s from "./work.module.css";
export const metadata = pageMetadata("/work", "Website Design Portfolio & Qaiser Watches Case Study | JovaMedia", "Explore JovaMedia website design projects and concepts. Read the live Qaiser Watches case study, including the delivered website and client feedback.");
export default function Page(){return <main>
  <PhotoHero image="services" className={s.hero}><div className="shell">
    <Breadcrumbs items={[{name:"Home",path:"/"},{name:"Our work",path:"/work"}]}/>
    <div className={s.heroGrid}>
      <div className={s.copy}><h1>Different businesses.<br/><span>Distinctive design.</span></h1><p>Explore the websites we create, from client projects to design concepts. Our Qaiser Watches case study shows a live website build and the work behind it.</p></div>
      <Link href="/work/qaiser-watches" className={s.feature}>
        <Image src="/insights/qaiser-website.webp" alt="Qaiser Watches website showing its watchmaking and repair services" width={1400} height={856} sizes="(max-width:800px) 90vw, 42vw" preload />
        <div className={s.featureCopy}><h2>Qaiser Watches.</h2><p>A custom website for a London watchmaker, followed by an ongoing social media partnership.</p><span>Read the project and client feedback</span></div>
      </Link>
    </div>
  </div></PhotoHero>
  <SelectedConcepts/><section className="band band-gold"><div className="shell"><h2>Your business.<br/><em>A fresh perspective.</em></h2><Link className="btn" href="/contact">Contact Us</Link></div></section>
</main>}
