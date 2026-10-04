const productionHostnames = ["jovamedia.com", "www.jovamedia.com"];
const googleTestSecret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
const unavailable = {
  ok: false,
  status: 503,
  error: "The security check is temporarily unavailable. Please try again or email us directly.",
};
const rejected = {
  ok: false,
  status: 400,
  error: "Please complete the reCAPTCHA security check again, then send your enquiry.",
};

export function isRecaptchaConfigured(env) {
  const secret = env.RECAPTCHA_SECRET_KEY?.trim();
  return Boolean(secret && !(env.VERCEL_ENV === "production" && secret === googleTestSecret));
}

export async function verifyRecaptcha(token, { env = process.env, verifyFetch = fetch } = {}) {
  if (!isRecaptchaConfigured(env)) return unavailable;
  if (typeof token !== "string" || !token.trim() || token.length > 4096) return rejected;

  const hostnames = env.VERCEL_ENV !== "production" && env.RECAPTCHA_ALLOWED_HOSTNAMES?.trim()
    ? env.RECAPTCHA_ALLOWED_HOSTNAMES.split(",").map(hostname => hostname.trim().toLowerCase()).filter(Boolean)
    : productionHostnames;

  try {
    const response = await verifyFetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY.trim(), response: token.trim() }).toString(),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return unavailable;
    const result = await response.json();
    if (result?.success !== true || typeof result.hostname !== "string" || !hostnames.includes(result.hostname.toLowerCase())) {
      return rejected;
    }
    return { ok: true };
  } catch {
    return unavailable;
  }
}
