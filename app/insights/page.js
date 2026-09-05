import { pageMetadata } from "@/lib/seo";
export const metadata = {
  ...pageMetadata(
    "/insights",
    "Insights",
    "Explore the topics planned for practical JovaMedia guides to SEO, paid media, business websites and digital growth. New guides are in preparation.",
  ),
  robots: { index: false, follow: true },
};
const posts = [
  "SEO vs Google Ads for UK SMEs",
  "How much should a business spend on Google Ads?",
  "What should a business website cost in the UK?",
  "Next.js vs WordPress for a business website?",
];
export default function Page() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="kicker">Insights</div>
          <h1>Useful thinking for digital growth.</h1>
          <p className="lead">
            Practical guides are being prepared around search, paid media,
            websites and growth strategy.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="shell article-list">
          {posts.map((p, i) => (
            <div key={p}>
              <span>0{i + 1}</span>
              <h3>{p}</h3>
              <small>COMING SOON</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
