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
        <h2>JovaBook booking commission</h2>
        <p>Billing policy version: 2026-11-02-online-origin-v3. These rules apply after acceptance and do not rewrite historical charges or settled invoices.</p>
        <p>Essential and Standard charge 1% commission on online customer bookings. Premium charges 0%. The fee uses the original service price confirmed online, including bookings paid entirely at the business with no deposit. Later staff discounts do not reduce that original fee.</p>
        <p>The fee is recorded when booked and becomes billable after the appointment, subject to applicable trial exemptions and cancellation review. Commission is invoiced monthly between billing dates, separately from payment-processing fees. Annual subscriptions are paid upfront; commission remains monthly. Unbilled amounts carry forward.</p>
        <p>Rescheduling or linking a replacement appointment preserves its online origin and produces one fee. Deleting a diary entry does not delete its financial history. Genuine cancellations and no-shows can receive a waiver or credit after review. Reports and possible replacements are reviewed using booking history; a matching record alone does not prove misuse or create an extra charge.</p>
        <p>Customers can dispute an incorrect cancellation or no-show report with the business or support.jovamedia@gmail.com, quoting their booking reference. Businesses can request a correction or credit through the same support address. The customer's cancellation window and deposit refund rules remain separate from commission review.</p>
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to support.jovamedia@gmail.com.</p>
      </section>
    </main>
  );
}
