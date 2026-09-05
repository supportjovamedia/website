import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import WorkStudy from "@/components/WorkStudy";
import Arrow from "@/components/Arrow";
function Wireframe({ type, mobile }) {
  return (
    <figure>
      <div className="wireframe">
        <b>Perspective / {mobile ? "Mobile" : "Desktop"}</b>
        <i />
        <i style={{ width: "65%" }} />
        {type === "Home" ? (
          <>
            <div className="wire-image">Feature image + headline</div>
            <div className="wire-columns">
              <span />
              <span />
              <span />
            </div>
          </>
        ) : (
          <>
            <div className="wire-image">Article image</div>
            <i />
            <i />
            <i style={{ width: "75%" }} />
            <div className="wire-columns">
              <span />
              <span />
            </div>
          </>
        )}
      </div>
      <figcaption>
        {type} / {mobile ? "mobile" : "desktop"} wireframe
      </figcaption>
    </figure>
  );
}
export const metadata = pageMetadata(
  "/work/editorial-experience",
  "A more considered experience — Concept study",
  "Explore a self-initiated editorial website with wireframes, topic filters, three sample articles and a working responsive prototype.",
);
export default function EditorialStudy() {
  return (
    <main>
      <div className="concept-banner">
        Self-initiated concept for a fictional publication. Not a client project
        or a live commercial publication.
      </div>
      <div className="shell">
        <header className="concept-heading">
          <p className="kicker">Web & digital / Concept study 02</p>
          <h1>A more considered experience.</h1>
          <p className="lead">
            A digital experience should give people a clear way in. Perspective
            explores a fictional creative publication that balances expressive
            imagery, straightforward navigation and comfortable reading.
          </p>
          <div className="actions">
            <Link href="/work/editorial-experience/prototype" className="btn">
              Explore the working prototype <Arrow />
            </Link>
            <a href="#wireframes" className="text-link">
              See the design process
            </a>
          </div>
        </header>
        <div className="concept-feature">
          <WorkStudy kind="digital" />
        </div>
        <section className="concept-section">
          <p className="kicker">01 / Purpose and structure</p>
          <h2>Give the experience a clear purpose.</h2>
          <p>
            The design starts with three straightforward actions: discover a
            story, explore a topic and keep reading. The audience and reading
            needs are design assumptions, not findings from user research.
          </p>
          <div className="concept-facts">
            <div>
              <h3>Sitemap</h3>
              <p>
                Home → Stories → Topics → About → Article. Stories and Topics
                are anchored sections of the homepage; About and each article
                have their own route.
              </p>
            </div>
            <div>
              <h3>Reading flow</h3>
              <p>
                Homepage → topic filter → article → related story. The links and
                filters are implemented in the prototype.
              </p>
            </div>
            <div>
              <h3>Content system</h3>
              <p>
                Three sample articles, each with a topic, title, standfirst,
                image description, caption, body and related reading.
              </p>
            </div>
          </div>
        </section>
        <section className="concept-section" id="wireframes">
          <p className="kicker">02 / Wireframes</p>
          <h2>A rhythm before a visual style.</h2>
          <p>
            These low-fidelity layouts separate the feature, navigation and
            reading areas before adding the final art direction. Narrow screens
            use a single sequence; larger screens pair the feature image and
            headline.
          </p>
          <div className="wireframe-grid">
            <Wireframe type="Home" />
            <Wireframe type="Home" mobile />
            <Wireframe type="Article" />
            <Wireframe type="Article" mobile />
          </div>
        </section>
        <section className="concept-section">
          <p className="kicker">03 / Art direction</p>
          <div className="concept-columns">
            <div>
              <h2>Character and clarity.</h2>
              <p>
                A short headline and expressive portrait establish a point of
                view. Baltic blue, porcelain and confident typography keep the
                publication recognisable while the interface remains restrained.
              </p>
            </div>
            <div>
              <h2>Made for the smaller screen.</h2>
              <p>
                The headline, introduction and reading action form a simple
                sequence. Story cards stack, topic buttons wrap and article text
                stays at a comfortable reading width.
              </p>
            </div>
          </div>
          <Link href="/work/editorial-experience/prototype" className="btn">
            Try the reading flow <Arrow />
          </Link>
        </section>
        <section className="concept-section">
          <p className="kicker">04 / Implementation review</p>
          <h2>Check the work itself.</h2>
          <div className="review-log">
            <ul>
              <li>
                The prototype contains real navigation, working topic filters
                and three sample articles.
              </li>
              <li>
                All editorial content and people shown are fictional; generated
                portrait imagery is labelled in article captions.
              </li>
              <li>
                No newsletter collection, purchase flow or real-person byline is
                included.
              </li>
              <li>
                Keyboard, responsive and automated accessibility verification
                are recorded in the accompanying implementation report.
              </li>
            </ul>
            <p>
              No usability research has been conducted with readers. No
              commercial performance or user-validation claims are made.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
