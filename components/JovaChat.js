"use client";
import { useEffect } from "react";
import { loadLiveChat } from "@/lib/live-chat.mjs";

export default function JovaChat() {
  useEffect(() => { if (!window.location.pathname.startsWith("/preview/booking")) loadLiveChat(window, document); }, []);
  // Tawk owns the launcher, conversation and unread-message notifications.
  return null;
}
