"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadLiveChat } from "@/lib/live-chat.mjs";
export default function LiveChat() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/preview/") || pathname.startsWith("/checkout/")) {
      window.Tawk_API?.hideWidget?.();
      return;
    }
    loadLiveChat(window, document);
  }, [pathname]);
  return null;
}
