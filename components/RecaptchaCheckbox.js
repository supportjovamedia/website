"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { contactEmail } from "@/lib/site";
import styles from "./RecaptchaCheckbox.module.css";

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const RecaptchaWidget = forwardRef(function RecaptchaWidget({ size, onChange }, ref) {
  const container = useRef(null);
  const widget = useRef(null);
  const mounted = useRef(false);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useImperativeHandle(ref, () => ({
    reset() {
      onChange("");
      if (widget.current !== null && window.grecaptcha?.reset) {
        window.grecaptcha.reset(widget.current);
        setMessage("");
      }
    },
  }), [onChange]);

  useLayoutEffect(() => {
    mounted.current = true;
    onChange("");
    const timeout = setTimeout(() => {
      if (widget.current === null) setStatus("error");
    }, 15000);
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      if (widget.current !== null && window.grecaptcha?.reset) {
        window.grecaptcha.reset(widget.current);
      }
    };
  }, [onChange]);

  function renderWidget() {
    if (!window.grecaptcha?.ready) {
      setStatus("error");
      return;
    }
    window.grecaptcha.ready(() => {
      if (!mounted.current || !container.current || widget.current !== null) return;
      try {
        widget.current = window.grecaptcha.render(container.current, {
          sitekey: siteKey,
          size,
          callback: (token) => {
            if (!mounted.current) return;
            onChange(token);
            setStatus("ready");
            setMessage("");
          },
          "expired-callback": () => {
            if (!mounted.current) return;
            onChange("");
            setMessage("Verification expired. Please tick the checkbox again.");
          },
          "error-callback": () => {
            if (!mounted.current) return;
            onChange("");
            setMessage("Verification could not connect. Check your connection and try the checkbox again, or email us directly.");
          },
        });
        setStatus("ready");
      } catch {
        onChange("");
        setStatus("error");
      }
    });
  }

  return <>
    <Script
      src="https://www.google.com/recaptcha/api.js?render=explicit&hl=en-GB"
      strategy="afterInteractive"
      onLoad={renderWidget}
      onReady={renderWidget}
      onError={() => { onChange(""); setStatus("error"); }}
    />
    <div ref={container} />
    <div aria-live="polite">
      {status === "loading" && <p className="form-note">Loading verification...</p>}
      {status === "error" && <p className="field-error">Verification could not load. Please refresh the page or <a href={`mailto:${contactEmail}`}>email us directly</a>.</p>}
      {message && <p className="field-error">{message}</p>}
    </div>
  </>;
});

const RecaptchaCheckbox = forwardRef(function RecaptchaCheckbox({ onChange }, ref) {
  const container = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width < 304 ? "compact" : "normal");
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className={styles.verification}>
    {siteKey ? size && <RecaptchaWidget key={size} ref={ref} size={size} onChange={onChange} />
      : <p className="field-error">Verification is temporarily unavailable. Please <a href={`mailto:${contactEmail}`}>email us directly</a>.</p>}
  </div>;
});

export default RecaptchaCheckbox;
