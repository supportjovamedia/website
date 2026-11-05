import { pageMetadata } from "@/lib/seo";
import styles from "@/components/LegalSurface.module.css";
export const metadata = pageMetadata(
  "/terms",
  "Terms of Use",
  "Read the terms for using the JovaMedia website, including service engagements, intellectual property, accuracy and contacting the agency.",
);
export default function Page() {
  return (
    <main className={styles.surface}>
      <section className="legal shell">
        <h1>Website Terms</h1>
        <p>Last updated: 3 September 2026</p>
        <h2>Using this website</h2>
        <p>
          This website provides general information about JovaMedia and its
          services. Nothing on the site forms a binding service agreement.
        </p>
        <h2>Service engagements</h2>
        <p>
          Client work is governed by a separate written proposal, statement of
          work or agreement covering scope, fees, responsibilities and
          applicable terms.
        </p>
        <h2>Intellectual property</h2>
        <p>
          Unless stated otherwise, website copy, design and original materials
          belong to JovaMedia and must not be reproduced without permission.
        </p>
        <h2>Accuracy</h2>
        <p>
          We aim to keep website information current, but service descriptions,
          availability and pricing guidance may change.
        </p>
        <h2>JovaBook plans and billing</h2>
        <p>Offer version: 2026-11-free-v1. The Free plan is free, requires no payment card, and includes one staff calendar, 20 bookings and 50 emails per calendar month.</p>
        <p>Solo costs £20 per month or £192 per year, paid upfront. Team costs £25 per month or £240 per year including one staff seat. Each additional Team seat costs £6 per month or £57.60 per year. Paid annual plans save 20% against twelve monthly payments.</p>
        <p>There is no free trial. The Free plan is free and requires no payment card. Solo and Team require a card, are charged when you subscribe, and renew at the selected frequency. Subscription controls are in the business dashboard.</p>
        <p>All current plans have 0% booking commission. Stripe payment-processing fees are separate. Historical charges and settled invoices under the retired billing policy (2026-11-02-online-origin-v3) remain unchanged.</p>
        <p>Solo includes 100 emails and 60 SMS messages per month. Team includes the same allowance per purchased staff seat. Allowances reset on UK calendar months, do not roll over, and pause delivery when exhausted. Extra messages are not charged automatically. Manual and online bookings count towards the Free monthly limit by appointment date; cancelled appointments are excluded.</p>
        <p>Every plan includes a one-page business website. Solo and Team include Stripe deposits and calendar embedding. Free is booking only and does not offer deposits. Free and Solo retain JovaMedia branding. Team removes customer-facing JovaMedia branding and includes advanced Insights and additional one-page customisation.</p>
        <p>A paid plan or trial that ends returns to Free. Existing records are retained. Businesses with more than one active staff calendar can choose which calendar to keep active on Free. Customer cancellation windows and deposit refund rules remain separate from software subscription billing.</p>
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to support.jovamedia@gmail.com.</p>
      </section>
    </main>
  );
}
