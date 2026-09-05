import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "/privacy-policy",
  "Privacy Policy",
  "Read how JovaMedia handles enquiry information, website analytics, data retention and privacy requests, and how to contact us about personal information.",
);
export default function Page() {
  return (
    <main>
      <section className="legal shell">
        <h1>Privacy Policy</h1>
        <p>Last updated: 3 September 2026</p>
        <h2>Who we are</h2>
        <p>
          JovaMedia operates jovamedia.com. For privacy enquiries, contact
          support@jovamedia.com.
        </p>
        <h2>Information we collect</h2>
        <p>
          When you submit an enquiry, we process the information you provide,
          such as your name, email, company, website and project details. We
          also use privacy-conscious website analytics to understand site usage.
        </p>
        <h2>Why we use it</h2>
        <p>
          We use enquiry information to respond to you, provide requested
          services, maintain business records and improve our website and
          services.
        </p>
        <h2>Sharing and retention</h2>
        <p>
          We only share data with service providers where needed to operate our
          website or deliver services. We retain information only for as long as
          needed for the relevant purpose or legal obligation.
        </p>
        <h2>Your rights</h2>
        <p>
          UK data protection law gives you rights over your personal data.
          Contact us to request access, correction, deletion or another
          applicable right.
        </p>
        <h2>Cookies and analytics</h2>
        <p>
          Our website may use essential technologies and Vercel Analytics. If we
          introduce non-essential cookies or advertising technologies, we will
          update our consent controls and this policy.
        </p>
      </section>
    </main>
  );
}
