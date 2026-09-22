"use client";
import { useEffect } from "react";
import { loadLiveChat } from "@/lib/live-chat.mjs";

export default function JovaChat() {
  useEffect(() => { loadLiveChat(window, document); }, []);
  // Tawk owns the launcher, conversation and unread-message notifications.
  return null;
}
