import JovaHero from "@/components/JovaHero";
import HomeVisualSections from "@/components/HomeVisualSections";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";

import Link from "next/link";





import styles from "./home.module.css";

export const metadata = pageMetadata(
  "/",
  "JovaMedia | Your Digital Partner in London",
  "Websites, copywriting, social media, brand design, email automation and content production from JovaMedia, your creative digital agency in London.",
);

export default function Home() {
  return (
    <main className={styles.home}>
      <JovaHero />

      <section className={styles.partnership}>
        <div className={`shell ${styles.partnershipGrid}`}>
          <figure>
            <Image
              src="/campaign/studio.webp"
              alt="Creative workspace still life with a sketchbook, colour swatches, a laptop and a red coffee cup"
              width={1536}
              height={1024}
              sizes="(max-width:700px) 100vw, 48vw"
            />
          </figure>
          <div>
            <p className="kicker">01 / The JOVA Approach</p>
            <h2>
              Designed to stand out.<span>Built to perform.</span>
            </h2>
            <div className={styles.goldStroke} />
            <p>
              We blend creativity, strategy and technology to create work that
              looks good, works hard and helps your business move forward.
            </p>
            <Link href="/about" className="btn">
              Discover JOVA{" "}
            </Link>
          </div>
        </div>
      </section>

      <HomeVisualSections />

      <section id="lets-work-together" className={styles.cta}>
        <div className="shell">
          <p className="kicker">05 / LET’S WORK TOGETHER</p>
          <h2>
            Ready to grow<span>your brand?</span>
          </h2>
          <div className={styles.swoosh} />
          <p>
           Tell us what you’re working on and where you want to take it. We’ll get back to you within 1–3 working days.
          </p>
          <Link className="btn" href="/contact">
            Let’s get started{" "}
          </Link>
          <a className="text-link" href="mailto:support.jovamedia@gmail.com">
            support.jovamedia@gmail.com
          </a>
        </div>
      </section>
    </main>
  );
}
