"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadLiveChat } from "@/lib/live-chat.mjs";
export default function LiveChat() {
  const pathname = usePathname();
  useEffect(() => {
    loadLiveChat(window, document);
  }, [pathname]);
  return null;
}
