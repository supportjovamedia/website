import EditorialPrototype from "@/components/EditorialPrototype";
export const metadata = {
  title: "Perspective — Editorial concept",
  description:
    "A fictional publication prototype with topic filters and three sample articles.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/work/editorial-experience/prototype" },
};
export default function Page() {
  return <EditorialPrototype />;
}
