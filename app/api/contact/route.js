import { NextResponse } from "next/server";

// Very small in-memory rate limiter, keyed by IP. Fine for a low-traffic
// contact form on a single server instance; swap for a real store (Upstash,
// Redis, etc.) if you deploy across multiple instances/regions.
const submissions = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = submissions.get(ip) || { count: 0, start: now };

  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count += 1;
  submissions.set(ip, entry);

  return entry.count > MAX_PER_WINDOW;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, company, budget, message, website } = body ?? {};

    // Honeypot field — real users never fill this in. If it comes back
    // non-empty, silently succeed without doing anything.
    if (website) {
      return NextResponse.json({ ok: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // TODO: wire this up to your email/CRM provider of choice, for example:
    //   - Resend (https://resend.com) or Postmark for transactional email
    //   - A CRM webhook (HubSpot, Pipedrive, etc.)
    //   - A Slack/Teams incoming webhook for instant notification
    // For now, submissions are logged server-side so nothing is lost while
    // you wire up a provider.
    console.log("New contact form submission:", {
      name,
      email,
      company: company || null,
      budget: budget || null,
      message,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again shortly." },
      { status: 500 }
    );
  }
}
