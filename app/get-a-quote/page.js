import QuoteForm from "@/components/QuoteForm";
import { quoteProducts } from "@/lib/quote-fields.mjs";
import { pageMetadata } from "@/lib/seo";
import s from "./quote.module.css";

export const metadata = pageMetadata("/get-a-quote", "Get a Quote | JovaMedia", "Request a callback about your website, branding or digital project. We’ll discuss your requirements and confirm the right scope before quoting.");
export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  const product = quoteProducts.some(option => option.value === params?.product) ? params.product : "";
  return <main>
    <section className={s.page}>
      <QuoteForm key={product} product={product} />
    </section>
  </main>;
}
