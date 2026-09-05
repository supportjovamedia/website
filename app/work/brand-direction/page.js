import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import WorkStudy from "@/components/WorkStudy";
import Arrow from "@/components/Arrow";
export const metadata = pageMetadata(
  "/work/brand-direction",
  "A bolder brand direction — Concept study",
  "A self-initiated fictional drinks campaign: creative brief, art direction, poster and social adaptations, layout exploration and a responsive landing concept.",
);
export default function BrandStudy() {
  return (
    <main>
      <div className="concept-banner">
        Self-initiated concept for a fictional product. Not commissioned or
        commercially launched.
      </div>
      <div className="shell">
        <header className="concept-heading">
          <p className="kicker">Brand & creative / Concept study 01</p>
          <h1>A bolder brand direction.</h1>
          <p className="lead">
            How do you make an unfamiliar product feel immediately recognisable?
            A focused colour palette, oversized type and expressive product
            imagery give this fictional drinks launch a clear voice.
          </p>
          <div className="actions">
            <Link href="/work/brand-direction/landing" className="btn">
              Explore the landing concept <Arrow />
            </Link>
            <a href="#creative-brief" className="text-link">
              Read the brief
            </a>
          </div>
        </header>
        <div className="concept-feature" id="campaign-hero">
          <WorkStudy kind="brand" />
        </div>
        <section className="concept-section" id="creative-brief">
          <p className="kicker">01 / The creative brief</p>
          <h2>Starting with one idea.</h2>
          <p>
            Make a fictional sparkling drink easy to notice and easy to
            recognise across a campaign poster, social formats and a simple
            landing page. “Make some noise” is an invitation to show
            personality.
          </p>
          <div className="concept-facts">
            <div>
              <h3>Audience assumption</h3>
              <p>
                Adults interested in design, culture and discovering independent
                brands. This is a design assumption, not a research finding.
              </p>
            </div>
            <div>
              <h3>Communication goal</h3>
              <p>
                Create a memorable first impression through one message and a
                consistent focal point across different formats.
              </p>
            </div>
            <div>
              <h3>Constraints</h3>
              <p>
                An unbranded fictional can. No ingredient, health, sales or
                audience-response claims. No working purchase flow.
              </p>
            </div>
          </div>
        </section>
        <section className="concept-section">
          <p className="kicker">02 / Art direction</p>
          <h2>Building a visual language.</h2>
          <div className="concept-columns">
            <div>
              <h3>Colour that carries the idea.</h3>
              <p>
                Red creates the signature. Gold gives the headline contrast.
                Porcelain makes room for supporting information. The product
                crop stays close enough to show the tactile condensation.
              </p>
              <div className="palette">
                {[
                  ["Flag Red", "#C1292E"],
                  ["Bright Gold", "#F1D302"],
                  ["Porcelain", "#FDFFFC"],
                ].map(([name, colour]) => (
                  <div key={name}>
                    <i style={{ background: colour }} />
                    {name}
                    <br />
                    {colour}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>A short message, confidently set.</h3>
              <p>
                Large editorial serif lettering is used as campaign artwork,
                with Plus Jakarta Sans for supporting interface copy. The
                headline occupies the left side; the product gives the
                composition its weight on the right.
              </p>
              <p>
                The imagery is AI-generated for this fictional creative
                exercise. The layouts, adaptations and responsive prototype are
                implemented as part of this study.
              </p>
            </div>
          </div>
        </section>
        <section className="concept-section">
          <p className="kicker">03 / Format adaptations</p>
          <h2>One idea. Different spaces.</h2>
          <div className="asset-grid">
            <figure>
              <div className="poster-art" id="poster-art">
                <WorkStudy kind="brand" />
              </div>
              <figcaption>
                Portrait campaign poster / product and message in balance.
              </figcaption>
            </figure>
            <figure>
              <div id="social-statement" className="study-art statement-art">
                <small>FICTIONAL CAMPAIGN</small>Make some noise.
              </div>
              <figcaption>
                Social statement / a typographic expression of the same idea.
              </figcaption>
            </figure>
            <figure>
              <div id="social-detail" className="study-art detail-art">
                <Image
                  className="campaign-can"
                  src="/campaign/can.webp"
                  alt="Close detail crop of the fictional red can and condensation"
                  width={1448}
                  height={1086}
                  sizes="(max-width:700px) 100vw, 30vw"
                />
              </div>
              <figcaption>
                Social detail / a close crop that foregrounds texture.
              </figcaption>
            </figure>
          </div>
          <div className="asset-downloads">
            <a className="text-link" href="/campaign/can.webp" download>
              Download the source artwork
            </a>
            <a className="text-link" href="/campaign/brand-hero.png" download>
              Download 1600 × 1200 campaign
            </a>
            <a className="text-link" href="/campaign/brand-social.png" download>
              Download social introduction
            </a>
            <a className="text-link" href="/campaign/brand-poster.png" download>
              Download portrait poster
            </a>
            <a
              className="text-link"
              href="/campaign/brand-statement.png"
              download
            >
              Download social statement
            </a>
            <a className="text-link" href="/campaign/brand-detail.png" download>
              Download social detail
            </a>
          </div>
        </section>
        <section className="concept-section">
          <p className="kicker">04 / The layout exploration</p>
          <h2>Two routes, one decision.</h2>
          <div className="layout-options">
            <figure>
              <div className="study-art type-first">
                MAKE
                <br />
                SOME
                <br />
                NOISE.<span>TYPE FIRST / OPTION A</span>
              </div>
              <figcaption>
                <b>Option A — Type first.</b> The gold field and oversized sans
                serif make the message immediate, but leave the product outside
                the main story.
              </figcaption>
            </figure>
            <figure>
              <WorkStudy kind="brand" />
              <figcaption>
                <b>Option B — Product and message.</b> The selected route puts
                the can and campaign phrase together. It carries more product
                context into small formats.
              </figcaption>
            </figure>
          </div>
        </section>
        <section className="concept-section">
          <p className="kicker">05 / Responsive expression</p>
          <h2>From the poster to the screen.</h2>
          <p>
            The landing concept brings the same art direction into a responsive
            layout. Its discovery action opens a product-story section; it does
            not offer a checkout for a nonexistent product.
          </p>
          <Link href="/work/brand-direction/landing" className="btn">
            Open the working concept <Arrow />
          </Link>
        </section>
      </div>
    </main>
  );
}
