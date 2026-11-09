import QuoteForm from "@/components/QuoteForm";
import BusinessContact from "@/components/BusinessContact";
import { quoteProducts, quoteWebsiteOptions } from "@/lib/quote-fields.mjs";
import { pageMetadata } from "@/lib/seo";
import s from "./quote.module.css";

export const metadata = pageMetadata("/get-a-quote", "Small Business Website & Digital Project Quotes | JovaMedia", "Tell us what your small business website or digital project needs to do. Get a scoped quote from JovaMedia with the work and costs explained.");
export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  const product = quoteProducts.some(option => option.value === params?.product) ? params.product : "";
  const website = quoteWebsiteOptions.some(option => option.value === `website-${params?.website}`) ? `website-${params.website}` : "";
  return <main>
    <section className={s.page}>
      <aside className={s.intro}><h2>A clear next step.</h2><p>Tell us what you have in mind. We’ll review your request and reply by email, or phone if you prefer.</p><BusinessContact placement="quote" /><ol><li>Share a few details</li><li>Talk through the options</li><li>Agree the scope together</li></ol><p className={s.reassurance}>No obligation. Just a conversation about what your business needs.</p></aside>
      <QuoteForm key={`${product}-${website}`} product={product} website={website} />
    </section>
  </main>;
}
