"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
const Analytics = dynamic(() => import("@vercel/analytics/react").then(m => m.Analytics), { ssr: false });
const KEY = "jovamedia-consent-v1";
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
function choice() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return value && Date.now() - value.time < MAX_AGE && ["accepted", "rejected"].includes(value.choice) ? value.choice : null;
  } catch { return null; }
}
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("jova-consent", callback);
  const timer = window.setInterval(callback, 60000);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("jova-consent", callback); window.clearInterval(timer); };
}
function beforeSend(event) {
  if (choice() !== "accepted") return null;
  const url = new URL(event.url);
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}
export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, choice, () => undefined);
  const [editing, setEditing] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
  function save(next) {
    const wasAccepted = choice() === "accepted";
    try { localStorage.setItem(KEY, JSON.stringify({ choice: next, time: Date.now() })); }
    catch { setStorageError(true); return; }
    window.dispatchEvent(new Event("jova-consent"));
    setEditing(false);
    setStorageError(false);
    // Reload after withdrawal to also remove the already-loaded analytics runtime.
    if (wasAccepted && next !== "accepted") window.location.reload();
  }
  return <>
    {enabled && consent === "accepted" && <Analytics beforeSend={beforeSend} />}
    <button type="button" className="cookie-settings" onClick={() => setEditing(true)}>Cookie settings</button>
    {consent !== undefined && (consent === null || editing) && <section className="cookie-panel" aria-labelledby="cookie-title" data-nosnippet>
      <h2 id="cookie-title">Your privacy choices</h2>
      <p>We store your choice so we can remember it. Optional website analytics only runs if you accept. Rejecting will not affect how the site works. You can change your choice using Cookie settings.</p>
      <Link href="/privacy-policy">Read our privacy policy</Link>
      <div className="cookie-actions">
        <button type="button" onClick={() => save("rejected")}>Reject analytics</button>
        <button type="button" onClick={() => save("accepted")}>Accept analytics</button>
        {editing && consent && <button type="button" onClick={() => setEditing(false)}>Close settings</button>}
      </div>
      {storageError && <p role="status">Your browser could not save this choice. Analytics remains off unless a valid acceptance is stored.</p>}
    </section>}
  </>;
}
