"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./CookieConsent.module.css";
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
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const dialog = useRef(null);
  const [storageError, setStorageError] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
  const visible = consent !== undefined && (consent === null || editing);
  useEffect(() => {
    if (visible && !dialog.current.open) dialog.current.showModal();
    else if (!visible && dialog.current.open) dialog.current.close();
  }, [visible]);
  function configure() {
    setAnalytics(consent === "accepted");
    setConfiguring(true);
  }
  function save(next) {
    const wasAccepted = choice() === "accepted";
    try { localStorage.setItem(KEY, JSON.stringify({ choice: next, time: Date.now() })); }
    catch { setStorageError(true); return; }
    window.dispatchEvent(new Event("jova-consent"));
    setEditing(false);
    setConfiguring(false);
    setStorageError(false);
    // Reload after withdrawal to also remove the already-loaded analytics runtime.
    if (wasAccepted && next !== "accepted") window.location.reload();
  }
  return <>
    {enabled && consent === "accepted" && <Analytics beforeSend={beforeSend} />}
    <button type="button" className="cookie-settings" onClick={() => { configure(); setEditing(true); }}>Cookie settings</button>
    <dialog ref={dialog} className={styles.panel} aria-labelledby="cookie-title" aria-describedby="cookie-description" data-nosnippet onCancel={event => { event.preventDefault(); setEditing(false); dialog.current.close(); }}>
      <h2 id="cookie-title">{configuring ? "Cookies configuration" : "Cookies Policy"}</h2>
      <p id="cookie-description">We store your privacy choice so we can remember it. Optional analytics helps us understand how people use our website, and only runs with your permission.</p>
      {configuring ? <div className={styles.options}>
        <div className={styles.row}><span>Necessary storage</span><span className={styles.active}>Always active</span></div>
        <div className={styles.row}>
          <label htmlFor="cookie-analytics">Analytics</label>
          <button id="cookie-analytics" className={styles.toggle} type="button" role="switch" aria-checked={analytics} aria-label="Analytics" onClick={() => setAnalytics(!analytics)}><span /></button>
        </div>
      </div> : <p>You can accept, reject or manage your preferences below, and change them any time through Cookie settings. Read more in our <Link href="/privacy-policy">Privacy Policy</Link>.</p>}
      <div className={styles.actions}>
        <button className={styles.accept} type="button" onClick={() => save("accepted")}>Accept all</button>
        <div className={styles.secondary}>
          <button type="button" onClick={() => save("rejected")}>Reject all</button>
          {configuring ? <button type="button" onClick={() => save(analytics ? "accepted" : "rejected")}>Save Settings</button> : <button type="button" onClick={configure}>Manage Settings</button>}
        </div>
      </div>
      {storageError && <p role="status">Your browser could not save this choice. Analytics remains off unless a valid acceptance is stored.</p>}
    </dialog>
  </>;
}
