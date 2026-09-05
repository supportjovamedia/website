import LineIcon from '@/components/LineIcon';
import Image from 'next/image';
import Link from 'next/link';
import styles from './home.module.css';

const capabilities = [
  ['Strategy & Growth','/services/competitor-analysis','strategy'],
  ['Brand & Creative','/services/brand-strategy','creative'],
  ['Social & Media','/services/social-management','social'],
  ['Websites & Digital','/services/web-design','web'],
  ['Performance & Growth','/services/paid-media','growth'],
  ['Automation & Technology','/services/ai-automation','tech'],
];

const process = [
  ['01','Understand your goals'],
  ['02','Create a tailored strategy'],
  ['03','Execute with precision'],
  ['04','Measure and grow'],
];

export const metadata={alternates:{canonical:'/'}};
export default function Home(){
  return <main className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <h1>Brands<br/>grow with<br/><em>purpose.</em></h1>
          <p>Strategy, creative, media and technology to help ambitious businesses get noticed, win customers and grow.</p>
          <div className={styles.heroActions}>
            <Link href="/contact" className={styles.primaryBtn}>Start a project</Link>
            <Link href="/work" className={styles.secondaryLink}>Explore our work</Link>
          </div>
        </div>

        <div className={styles.heroVisual}><Image src="/original/jova-architecture.png" alt="An original architectural study of a contemporary glass facade" width={1122} height={1402} sizes="(max-width:600px) 40vw, 50vw" priority/></div>
      </div>
      <div className={styles.mobileDisciplineBar}>
        <span>Strategy</span> <span>Creative</span> <span>Media</span> <span>Technology</span>
      </div>
    </section>

    <section className={styles.dualBand}>
      <div className={styles.bluePanel}>
        <div className={styles.panelNumber}>01 <span/></div>
        <div className={styles.blueContent}>
          <div>
            <h2>More than<br/>marketing.<br/>A partner for<br/>what’s next.</h2>
            <p>We combine strategy, creativity and technology to help businesses grow in a way that’s focused, measurable and built for the long term.</p>
            <Link href="/about" className={styles.lightBtn}>Our approach</Link>
          </div>
          <div className={styles.blueMetrics}>
            <div><b><LineIcon name="star"/></b><span>Strategy<br/>led</span></div>
            <div><b><LineIcon name="strategy"/></b><span>Results<br/>focused</span></div>
            <div><b><LineIcon name="bolt"/></b><span>Built for<br/>growth</span></div>
          </div>
        </div>
      </div>


    </section>

    <section className={styles.servicesSection}>
      <div className={styles.servicesLead}>
        <div className={styles.panelNumber}>02 <span/></div>
        <h2>What we do</h2>
        <p>End-to-end digital solutions for ambitious businesses.</p>
      </div>
      <div className={styles.capabilityList}>
        {capabilities.map(([name,href,icon]) => <Link key={name} href={href} className={styles.capabilityItem}>
          <span className={styles.capIcon}><LineIcon name={icon}/></span><strong>{name}</strong>
        </Link>)}
      </div>
      <Link href="/services" className={styles.servicesBtn}>Explore all services</Link>
    </section>

<section className={styles.redPanel}>
        <div className={styles.panelNumber}>03 <span/></div>
        <div className={styles.redGrid}>
          <div>
            <h2>Ideas into impact.</h2>
            <p>A selection of recent concept projects showing how we turn strategy into real-world results.</p>
            <Link href="/work" className={styles.redLink}>View all work</Link>
          </div>
          <Link href="/work" className={styles.workCard} aria-label="Explore our concept projects">
            <small>CONCEPT</small>
            <strong>Modern brand<br/>for a bolder future</strong>
          </Link>
        </div>
        
      </section>

    <section className={styles.processSection}>
      <div className={styles.processCopy}>
        <div className={styles.panelNumber}>04 <span/></div>
        <h2>A clearer path<br/>to growth.</h2>
        <p>Our proven process keeps things simple, strategic and focused on results.</p>

      </div>
      <div className={styles.processSteps}>
        {process.map(([n,t],i)=><div key={n} className={styles.processStep}>
          <span className={i%2===0?styles.stepBlue:styles.stepSoft}>{n}</span><strong>{t}</strong>
        </div>)}
      </div>
      <Link href="/about" className={styles.processLink}>Our process</Link>
    </section>

    <section className={styles.whySection}>
      <div className={styles.panelNumber}>05 <span/></div>
      <h2>Why JovaMedia</h2>
      <p className={styles.whyIntro}>A modern digital media agency built for ambitious businesses.</p>
      <div className={styles.whyItems}>
        <div><span><LineIcon name="bolt"/></span><p><strong>Strategic Thinking</strong>Every project starts with commercial goals.</p></div>
        <div><span><LineIcon name="social"/></span><p><strong>Creative Execution</strong>Ideas that make an impact.</p></div>
        <div><span><LineIcon name="strategy"/></span><p><strong>Measurable Results</strong>Work that drives real growth.</p></div>
      </div>
      <div className={styles.whyBanner}>
        <div><b>“</b><h3>Small team.<br/>Big thinking.</h3><Link href="/about">About us</Link></div>
      </div>
    </section>

    <section className={styles.ctaSection}>
      <div>
        <div className={styles.panelNumber}>06 <span/></div>
        <h2>Ready to grow<br/>your brand?</h2>
        <p>Tell us about your project and we’ll get back to you within 1 business day.</p>
      </div>
      <div className={styles.ctaActions}><Link href="/contact" className={styles.lightBtn}>Start a project</Link><Link href="mailto:support@jovamedia.com">Or get in touch</Link></div>
    </section>
  </main>
}
