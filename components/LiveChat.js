"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadLiveChat } from "@/lib/live-chat.mjs";
import { browserConsent } from "@/lib/marketing-analytics.mjs";
export default function LiveChat() {
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => loadLiveChat(window, document, browserConsent());
    sync();
    window.addEventListener("jova-consent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jova-consent", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);
  return null;
}
