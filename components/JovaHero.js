import JovaScene from './JovaScene';
import Link from 'next/link';
import styles from './JovaHero.module.css';
import HomepageMotion from './HomepageMotion';

export default function JovaHero() {
  return (
    <section className={styles.hero} aria-labelledby="jova-hero-title">
      <HomepageMotion />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Independent digital agency</p>
          <h1 id="jova-hero-title" className={styles.title}>
            Brands grow<br />with <span>purpose<span className={styles.dot}>.</span></span>
          </h1>
          <p className={styles.description}>Strategy, creative, media and technology.</p>
          <Link href="/contact" className={styles.button}>
            Start a project
          </Link>
        </div>
        <div className={styles.artwork}>
          <JovaScene />
        </div>
      </div>
    </section>
  );
}
