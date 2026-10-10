"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { browserConsent, measurementUrl, publicPage, replaySafeUrl, revokeTracking, trackEvent } from "@/lib/marketing-analytics.mjs";

function subscribe(callback) {
  window.addEventListener("jova-consent", callback);
  window.addEventListener("storage", callback);
  const timer = window.setInterval(callback, 60000);
  return () => { window.removeEventListener("jova-consent", callback); window.removeEventListener("storage", callback); window.clearInterval(timer); };
}
const snapshot = browserConsent;
const serverSnapshot = () => null;
function script(id, src) {
  if (document.getElementById(id)) return;
  const element = document.createElement("script");
  element.id = id; element.async = true; element.src = src;
  element.onerror = () => { element.remove(); };
  document.head.appendChild(element);
}

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-MDZ4RQQQ";
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MARKETING_ANALYTICS !== "false";
  useEffect(() => {
    const allowed = enabled && consent === "accepted" && publicPage(pathname);
    if (!allowed) {
      if (window.__jovaAnalytics) { revokeTracking(); window.location.reload(); }
      return;
    }
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-YGPGYJ9L9B";
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "yvnjaisape";
    if (!window.__jovaAnalytics) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.gtag("consent", "update", { analytics_storage: "granted" });
      window.__jovaAnalytics = { ga: /^G-[A-Z0-9]+$/.test(gaId), gaId, clarity: false };
      if (window.__jovaAnalytics.ga) {
        window.gtag("js", new Date());
        window.gtag("config", gaId, { send_page_view: false, page_location: measurementUrl(window.location.href), page_referrer: document.referrer ? new URL(document.referrer).origin + "/" : "", allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 60 * 60 * 24 * 180, ...(process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true" ? { debug_mode: true } : {}) });
        script("jova-ga4", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      }
      // GA4 and Clarity are owned by this integration. Do not duplicate them in GTM.
      if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
        window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
        script("jova-gtm", `https://www.googletagmanager.com/gtm.js?id=${gtmId}`);
      }
    }
    if (/^[a-z0-9]+$/.test(clarityId) && replaySafeUrl(window.location.href) && !window.__jovaAnalytics.clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      window.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
      window.__jovaAnalytics.clarity = true;
      script("jova-clarity", `https://www.clarity.ms/tag/${clarityId}`);
    } else if (window.__jovaAnalytics.clarity && !replaySafeUrl(window.location.href)) {
      revokeTracking(); window.location.reload(); return;
    }
    if (window.__jovaAnalytics.page !== pathname) {
      window.__jovaAnalytics.page = pathname;
      const referrer = document.referrer ? new URL(document.referrer).origin + "/" : "";
      // Referrer queries and fragments never enter analytics payloads.
      if (window.__jovaAnalytics.ga) window.gtag("set", { page_location: measurementUrl(window.location.href), page_referrer: referrer });
      trackEvent("page_view");
    }
    const started = new WeakSet();
    const depths = new Set();
    const focus = event => {
      const form = event.target.closest?.('form[data-analytics-form="contact_enquiry"],form[data-analytics-form="website_consultation"],form[data-analytics-form="quote_callback"]');
      if (form && !started.has(form)) { started.add(form); trackEvent("form_start", { form_id: form.dataset.analyticsForm }); }
    };
    const click = event => {
      const element = event.target.closest?.("a,button");
      if (!element || element.closest("dialog,form,[data-analytics-ignore]")) return;
      trackEvent("ui_click", { element_type: element.tagName === "A" ? "link" : "button" });
      if (element.tagName !== "A") return;
      const url = new URL(element.href, window.location.href);
      const channel = url.protocol === "mailto:" ? "email" : url.protocol === "tel:" ? "phone" : ["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname) ? "whatsapp" : url.origin === window.location.origin && url.pathname === "/contact" ? "contact_page" : url.origin === window.location.origin ? "navigation" : "outbound";
      trackEvent(["email", "phone", "whatsapp", "contact_page"].includes(channel) ? "contact_click" : "select_content", { channel, ...(url.origin === window.location.origin ? { destination: url.pathname } : {}) });
    };
    const scroll = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      if (distance <= 0) return;
      const depth = window.scrollY / distance * 100;
      for (const percent of [25, 50, 75, 90]) if (depth >= percent && !depths.has(percent)) { depths.add(percent); trackEvent("scroll_depth", { percent_scrolled: percent }); }
    };
    document.addEventListener("click", click);
    document.addEventListener("focusin", focus);
    window.addEventListener("scroll", scroll, { passive: true });
    window.dispatchEvent(new Event("jova-analytics-ready"));
    return () => { document.removeEventListener("click", click); document.removeEventListener("focusin", focus); window.removeEventListener("scroll", scroll); };
  }, [pathname, consent, enabled, gtmId]);
  // Insert the vendor's body snippet only after consent. With JavaScript disabled,
  // consent cannot be checked, so optional tracking deliberately remains absent.
  if (!enabled || consent !== "accepted" || !publicPage(pathname) || !/^GTM-[A-Z0-9]+$/.test(gtmId)) return null;
  return <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe>` }} />;
}
