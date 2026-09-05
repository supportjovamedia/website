import { pageMetadata } from "@/lib/seo";
import Image from "next/image";

import Link from "next/link";

import LineIcon from "@/components/LineIcon";

import WorkStudy from "@/components/WorkStudy";

import styles from "./home.module.css";

export const metadata = pageMetadata(
  "/",
  "Digital Marketing Agency London",
  "JovaMedia connects strategy, branding, web design, SEO and paid media for ambitious businesses. Meet your London digital agency and discuss your next project.",
);

const capabilities = [
  [
    "Strategy & Growth",
    "competitor-analysis",
    "Find your advantage. Define what comes next.",
    "strategy",
  ],
  [
    "Brand & Creative",
    "brand-strategy",
    "A clear identity. A lasting impression.",
    "creative",
  ],
  [
    "Social & Media",
    "social-management",
    "Build a presence people want to be part of.",
    "social",
  ],
  [
    "Websites & Digital",
    "web-design",
    "Thoughtful experiences, built to perform.",
    "web",
  ],
  [
    "Performance & Growth",
    "paid-media",
    "Turn attention into meaningful action.",
    "growth",
  ],
  [
    "Automation & Technology",
    "ai-automation",
    "Make the everyday work more intelligently.",
    "tech",
  ],
];

const steps = [
  [
    "Understand your goals",
    "We get close to your business, your audience and the opportunity.",
  ],
  [
    "Create a tailored strategy",
    "A shared direction, clear priorities and a plan for measuring success.",
  ],
  [
    "Execute with precision",
    "Strategy becomes considered creative, connected channels and better experiences.",
  ],
  [
    "Measure and grow",
    "We learn from the work, refine what matters and build on what works.",
  ],
];

const values = [
  [
    "Strategic thinking",
    "Every project starts with commercial goals. A clear direction before a single deliverable.",
    "strategy",
  ],
  [
    "Creative execution",
    "Distinctive ideas, thoughtfully made. With the details and consistency your brand deserves.",
    "creative",
  ],
  [
    "Measurable progress",
    "Shared priorities and meaningful measures. So the next decision builds on what we learn.",
    "growth",
  ],
];

export default function Home() {
  return (
    <main className={styles.home}>
      <section className={`shell ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Independent digital agency</p>
          <p className={styles.location}>
            London, UK · Thinking beyond borders
          </p>
          <h1>
            Brands grow <span>with purpose.</span>
          </h1>
          <div className={styles.swoosh} />
          <p className={styles.heroLead}>
            Strategy, creative, media and technology to help ambitious
            businesses get noticed, win customers and grow.
          </p>
          <div className={styles.heroActions}>
            <Link href="/contact" className="btn">
              Start a project{" "}
            </Link>
          </div>
        </div>
        <figure className={styles.heroVisual}>
          <Image
            src="/campaign/hero.webp"
            alt="Conceptual campaign portrait: a model in red sunglasses and a blue windbreaker against a warm yellow background"
            width={1024}
            height={1280}
            sizes="(max-width:700px) 100vw, 48vw"
            preload
          />
        </figure>
      </section>

      <section className={styles.partnership}>
        <div className={`shell ${styles.partnershipGrid}`}>
          <div>
            <p className="kicker">01 / The partnership</p>
            <h2>
              More than marketing.<span>A partner for what’s next.</span>
            </h2>
            <div className={styles.goldStroke} />
            <p>
              We combine strategy, creativity and technology to help businesses
              grow in a way that’s focused, measurable and built for the long
              term.
            </p>
            <Link href="/about" className="btn">
              Meet JovaMedia{" "}
            </Link>
          </div>
          <figure>
            <Image
              src="/campaign/studio.webp"
              alt="Creative workspace still life with a sketchbook, colour swatches, a laptop and a red coffee cup"
              width={1536}
              height={1024}
              sizes="(max-width:700px) 100vw, 48vw"
            />
            <figcaption>
              Space for connected thinking. Conceptual studio imagery.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={`shell ${styles.services}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className="kicker">02 / Capabilities</p>
            <h2>
              Connected thinking.<span>End-to-end impact.</span>
            </h2>
            <div className={styles.goldStroke} />
          </div>
          <div>
            <p>
              Digital solutions for ambitious businesses. Built around your
              goals, from the first idea to the next stage of growth.
            </p>
            <Link href="/services" className="btn">
              Explore all services{" "}
            </Link>
          </div>
        </div>
        <div className={styles.serviceGrid}>
          {capabilities.map(([name, slug, description], i) => (
            <Link
              key={slug}
              href={`/services/${slug}`}
              className={styles.serviceCard}
            >
              <div className={styles.serviceTop}>
                <span aria-hidden="true">0{i + 1}</span>
              </div>
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.workBand}>
        <div className={`shell ${styles.work}`}>
          <div className={styles.workIntro}>
            <p className="kicker">03 / Ideas into impact</p>
            <h2>
              A sense of<span>what’s possible.</span>
            </h2>
            <p>
              Two design studies exploring how a clear idea becomes a
              distinctive digital experience.
            </p>
            <Link className="btn" href="/work">
              Explore the thinking{" "}
            </Link>
          </div>
          <div className={styles.workGrid}>
            <Link
              className={`${styles.project} ${styles.brandProject}`}
              href="/work/brand-direction"
            >
              <WorkStudy kind="brand" />
              <div className={styles.projectMeta}>
                <h3>A bolder brand direction</h3>
                <p>Brand & creative · Concept study</p>
              </div>
            </Link>
            <Link
              className={`${styles.project} ${styles.digitalProject}`}
              href="/work/editorial-experience"
            >
              <WorkStudy kind="digital" />
              <div className={styles.projectMeta}>
                <h3>A more considered experience</h3>
                <p>Web & digital · Concept study</p>
              </div>
            </Link>
          </div>
          <p className={styles.disclosure}>
            Self-initiated concepts. Client stories will be published with
            permission and verified outcomes.
          </p>
        </div>
      </section>

      <section className={`shell ${styles.approach}`}>
        <div>
          <p className="kicker">04 / Our approach</p>
          <h2>
            A clearer path<span>to growth.</span>
          </h2>
          <p>
            Simple, strategic and focused. You’ll know where we’re heading,
            what’s happening and why it matters.
          </p>
        </div>
        <ol className={styles.steps}>
          {steps.map(([title, body], i) => (
            <li key={title}>
              <span className={styles.stepNumber}>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <Link href="/about" className={`btn ${styles.approachAction}`}>
          How we work
        </Link>
      </section>

      <section className={styles.why}>
        <div className={`shell ${styles.whyGrid}`}>
          <div>
            <p className="kicker">05 / Why JovaMedia</p>
            <h2>
              Small team.<span>Big thinking.</span>
            </h2>
            <p>
              A modern digital media agency that stays close to your business
              and accountable to the work.
            </p>
          </div>
          <div className={styles.values}>
            {values.map(([title, body, icon]) => (
              <div key={title}>
                <LineIcon name={icon} />
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`shell ${styles.cta}`}>
        <div>
          <p className="kicker">06 / Your next chapter</p>
          <h2>
            Ready to grow<span>your brand?</span>
          </h2>
          <div className={styles.swoosh} />
          <p>
            Tell us about your project. We’ll get back to you within 1 business
            day.
          </p>
          <Link className="btn" href="/contact">
            Let’s start something{" "}
          </Link>
          <a className="text-link" href="mailto:support@jovamedia.com">
            support@jovamedia.com
          </a>
        </div>
      </section>
    </main>
  );
}
