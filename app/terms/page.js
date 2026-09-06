import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "/terms",
  "Terms of Use",
  "Read the terms for using the JovaMedia website, including service engagements, intellectual property, accuracy and contacting the agency.",
);
export default function Page() {
  return (
    <main>
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
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to support.jovamedia@gmail.com.</p>
      </section>
    </main>
  );
}
