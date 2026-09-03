import { siteConfig } from "@/lib/data";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of the Jova Media website and services.",
};

const lastUpdated = "3 September 2026";

export default function TermsOfServicePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Legal</span>
      <h1 className="mt-4 font-serif-brand text-4xl text-navy">Terms of Service</h1>
      <p className="mt-3 text-sm text-navy/50">Last updated: {lastUpdated}</p>

      <div className="prose-legal mt-10 space-y-8 text-navy/75">
        <p>
          This is a starting template and should be reviewed by a qualified professional before
          you rely on it. It should be read alongside any signed proposal, statement of work or
          services agreement between {siteConfig.name} and a client, which will take precedence
          over these general terms where there is a conflict.
        </p>

        <LegalSection title="1. About us">
          <p>
            These terms apply to your use of the {siteConfig.name} website and, unless a separate
            services agreement is in place, to the services we provide. {siteConfig.name} is
            based at {siteConfig.address} and can be contacted at{" "}
            <a href={`mailto:${siteConfig.email}`} className="text-navy underline underline-offset-2">
              {siteConfig.email}
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="2. Use of this website">
          <p>
            You may use this website for lawful purposes only. You must not misuse the site by
            knowingly introducing viruses or other malicious material, attempting unauthorised
            access to our systems, or using automated tools to scrape or copy content without our
            permission.
          </p>
        </LegalSection>

        <LegalSection title="3. Intellectual property">
          <p>
            Unless otherwise stated, all content on this website — including text, graphics,
            logos and the {siteConfig.name} brand — is owned by or licensed to {siteConfig.name}
            and is protected by copyright and other intellectual property laws. You may not
            reproduce, distribute or create derivative works from this content without our prior
            written consent.
          </p>
        </LegalSection>

        <LegalSection title="4. Services and proposals">
          <p>
            Any description of services on this website is for general information only and does
            not constitute a binding offer. Specific scope, deliverables, timelines and fees for
            client work are set out in a separate proposal, statement of work or services
            agreement, which forms the contract between us.
          </p>
        </LegalSection>

        <LegalSection title="5. Fees and payment">
          <p>
            Where we agree to provide services, fees, payment schedules and any applicable
            expenses will be set out in the relevant proposal or agreement. Unless stated
            otherwise, invoices are payable within 14 days of the invoice date. Late payments may
            incur interest in line with the Late Payment of Commercial Debts (Interest) Act 1998.
          </p>
        </LegalSection>

        <LegalSection title="6. Cancellation">
          <p>
            Notice periods for ongoing retainers and cancellation terms for project-based work
            will be set out in the relevant agreement. In the absence of a specific agreement,
            either party may terminate ongoing services with 30 days&rsquo; written notice.
          </p>
        </LegalSection>

        <LegalSection title="7. Limitation of liability">
          <p>
            To the fullest extent permitted by law, {siteConfig.name} shall not be liable for any
            indirect, incidental or consequential loss arising from your use of this website or
            our services. Nothing in these terms limits liability for death or personal injury
            caused by negligence, fraud, or any other liability that cannot be excluded by law.
          </p>
        </LegalSection>

        <LegalSection title="8. Third-party links">
          <p>
            This website may contain links to third-party websites. We are not responsible for
            the content, accuracy or practices of any linked third-party sites.
          </p>
        </LegalSection>

        <LegalSection title="9. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of this website after
            changes are posted constitutes acceptance of the revised terms.
          </p>
        </LegalSection>

        <LegalSection title="10. Governing law">
          <p>
            These terms are governed by the laws of England and Wales, and any disputes will be
            subject to the exclusive jurisdiction of the courts of England and Wales.
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
