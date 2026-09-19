"use client";
import { usePathname } from "next/navigation";
// Keep the new identity on the homepage while other routes retain their own chrome.
export default function SiteChrome({children, header, footer}) {
  const isHome = usePathname() === "/";
  return <>{!isHome && header}{children}{!isHome && footer}</>;
}
