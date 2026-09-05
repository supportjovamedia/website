import { pageMetadata, serviceSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { services } from "@/lib/data";
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  return s ? pageMetadata(`/services/${s.slug}`, s.name, s.summary) : {};
}
export default async function Page({ params }) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  const alternatives = services
    .filter((x) => x.slug !== s.slug)
    .sort(
      (a, b) =>
        Number(b.eyebrow === s.eyebrow) - Number(a.eyebrow === s.eyebrow),
    )
    .slice(0, 3);
  return (
    <main>
      <StructuredData data={serviceSchema(s)} />
      <section className="page-hero">
        <div className="shell">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: s.name, path: `/services/${s.slug}` },
            ]}
          />
          <div className="kicker">{s.eyebrow}</div>
          <h1>{s.name}</h1>
          <p className="lead">{s.desc}</p>
          <div className="actions">
            <Link href="/contact" className="btn">
              Discuss your project
            </Link>
            <span className="price">{s.from}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="shell split">
          <div>
            <div className="kicker">What’s included</div>
            <h2>Built around the work that moves the outcome.</h2>
          </div>
          <div className="deliverables">
            {s.deliverables.map((x, i) => (
              <div key={x}>
                <b>{x}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="soft section">
        <div className="shell">
          <div className="kicker">Our process</div>
          <h2>How we deliver your project</h2>
          <div className="process">
            <div>
              <h3>Discover</h3>
              <p>Understand the business, customer, baseline and target.</p>
            </div>
            <div>
              <h3>Prioritise</h3>
              <p>Choose the highest-value work and define success measures.</p>
            </div>
            <div>
              <h3>Deliver</h3>
              <p>
                Execute in short cycles with clear ownership and communication.
              </p>
            </div>
            <div>
              <h3>Improve</h3>
              <p>Measure performance, learn and reinvest in what works.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <h2>Explore related services</h2>
          <div className="seo-related">
            {alternatives.map((item) => (
              <Link key={item.slug} href={`/services/${item.slug}`}>
                <h3>{item.name}</h3>
                <p>{item.summary}</p>
              </Link>
            ))}
          </div>
          <div className="actions">
            <Link className="text-link" href="/services">
              View all services
            </Link>
            <Link className="btn" href="/contact">
              Discuss your project
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
