import { siteConfig } from "@/lib/data";

export const metadata = {
  title: "Privacy Policy",
  description: "How Jova Media collects, uses and protects your personal data.",
};

const lastUpdated = "3 September 2026";

export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Legal</span>
      <h1 className="mt-4 font-serif-brand text-4xl text-navy">Privacy Policy</h1>
      <p className="mt-3 text-sm text-navy/50">Last updated: {lastUpdated}</p>

      <div className="prose-legal mt-10 space-y-8 text-navy/75">
        <p>
          This policy is a starting template and should be reviewed by a qualified professional
          before you rely on it, so it accurately reflects how {siteConfig.name} collects and
          processes personal data under UK GDPR and the Data Protection Act 2018.
        </p>

        <LegalSection title="1. Who we are">
          <p>
            {siteConfig.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a digital
            media agency based at {siteConfig.address}. We are the data controller for the
            personal information described in this policy. You can contact us at{" "}
            <a href={`mailto:${siteConfig.email}`} className="text-navy underline underline-offset-2">
              {siteConfig.email}
            </a>{" "}
            with any questions about how we handle your data.
          </p>
        </LegalSection>

        <LegalSection title="2. What information we collect">
          <p>We collect information in the following ways:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Information you give us directly</strong> — for example your name, email
              address, phone number, company and any details you include when you submit our
              contact form, request a proposal, or otherwise correspond with us.
            </li>
            <li>
              <strong>Information collected automatically</strong> — such as IP address, browser
              type, device information and pages visited, gathered through cookies and similar
              technologies when you use our website.
            </li>
            <li>
              <strong>Information from third parties</strong> — for example, if you&rsquo;re
              introduced to us by a partner or existing client.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. How we use your information">
          <p>We use personal data to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Respond to enquiries and provide quotes or proposals;</li>
            <li>Deliver, manage and improve the services we provide to clients;</li>
            <li>Send marketing communications where you&rsquo;ve consented to receive them;</li>
            <li>Analyse and improve the performance of our website;</li>
            <li>Meet our legal, regulatory and contractual obligations.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Legal basis for processing">
          <p>
            Depending on the purpose, we rely on one or more of the following legal bases:
            performance of a contract, our legitimate interests in operating and promoting our
            business, your consent (for example, for marketing emails), and compliance with a
            legal obligation.
          </p>
        </LegalSection>

        <LegalSection title="5. Sharing your information">
          <p>
            We do not sell personal data. We may share information with trusted service providers
            who help us run our business (for example, hosting, email delivery, analytics and CRM
            providers), each bound by appropriate data protection terms, and where required by
            law or to protect our legal rights.
          </p>
        </LegalSection>

        <LegalSection title="6. Cookies">
          <p>
            Our website may use cookies and similar technologies to remember preferences and
            understand how visitors use the site. You can control cookies through your browser
            settings; disabling them may affect how parts of the site function.
          </p>
        </LegalSection>

        <LegalSection title="7. Data retention">
          <p>
            We keep personal data only as long as necessary for the purposes it was collected,
            including to satisfy legal, accounting or reporting requirements, after which it is
            securely deleted or anonymised.
          </p>
        </LegalSection>

        <LegalSection title="8. Your rights">
          <p>Under UK data protection law, you have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Request access to the personal data we hold about you;</li>
            <li>Request correction of inaccurate data;</li>
            <li>Request erasure of your data in certain circumstances;</li>
            <li>Object to or restrict certain processing;</li>
            <li>Request that your data be transferred to another organisation;</li>
            <li>Withdraw consent at any time, where processing is based on consent.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${siteConfig.email}`} className="text-navy underline underline-offset-2">
              {siteConfig.email}
            </a>
            . You also have the right to lodge a complaint with the Information Commissioner&rsquo;s
            Office (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy underline underline-offset-2"
            >
              ico.org.uk
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="9. Data security">
          <p>
            We use appropriate technical and organisational measures to protect personal data
            against unauthorised access, alteration, disclosure or destruction.
          </p>
        </LegalSection>

        <LegalSection title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. Changes will be posted on this page with
            an updated &ldquo;last updated&rdquo; date.
          </p>
        </LegalSection>
      </div>
    </section>
  );
}

function LegalSection({ title, children }) {
  return (
    <div>
      <h2 className="font-serif-brand text-2xl text-navy">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}
