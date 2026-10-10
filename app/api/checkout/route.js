export const runtime = "nodejs";
// Online ordering is retired. Environment flags cannot reactivate this route.
export async function POST() {
  return Response.json({ error: "Please request a quote so we can confirm the right scope for your project.", destination: "/get-a-quote" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
