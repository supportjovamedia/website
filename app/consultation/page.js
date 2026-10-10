import { redirect } from "next/navigation";
export const metadata = { title: "Get a Quote | JovaMedia", robots: { index: false, follow: false } };
export default function ConsultationPage() { redirect("/get-a-quote"); }
