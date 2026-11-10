import { useId } from "react";

// Inline brand marks avoid remote icon requests or social embeds.
export default function SocialIcon({ name, colored = false }) {
  const gradientId = `social-instagram-${useId().replace(/:/g, "")}`;
  if (name === "instagram") {
    const ink = colored ? `url(#${gradientId})` : "currentColor";
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {colored && <defs><linearGradient id={gradientId} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#FFDC80"/><stop offset=".25" stopColor="#F77737"/><stop offset=".55" stopColor="#E1306C"/><stop offset=".8" stopColor="#C13584"/><stop offset="1" stopColor="#5851DB"/></linearGradient></defs>}
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={ink} strokeWidth={colored ? "1.9" : "1.7"}/>
      <circle cx="12" cy="12" r="4" stroke={ink} strokeWidth={colored ? "1.9" : "1.7"}/>
      <circle cx="17.4" cy="6.7" r="1" fill={ink}/>
    </svg>;
  }
  if (name === "facebook") return <svg viewBox="0 0 24 24" fill={colored ? "#0866FF" : "currentColor"} aria-hidden="true"><path d="M14.2 21v-8.2H17l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H8v3.2h2.8V21z"/></svg>;
  if (name === "tiktok") {
    const note = "M16.3 3c.3 2 1.4 3.2 3.7 3.4v3.2a8 8 0 0 1-3.7-1.2v6.8a6 6 0 1 1-5.2-5.9v3.3a2.7 2.7 0 1 0 1.9 2.6V3z";
    return <svg viewBox="0 0 24 24" fill={colored ? "#000" : "currentColor"} aria-hidden="true">
      {colored && <><path d={note} fill="#25F4EE" transform="translate(-.65 -.5)"/><path d={note} fill="#FE2C55" transform="translate(.65 .5)"/></>}
      <path d={note}/>
    </svg>;
  }
  if (name === "whatsapp") {
    const ink = colored ? "#25D366" : "currentColor";
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.4 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.6a8.5 8.5 0 1 1 16.1-4.3Z" stroke={ink} strokeWidth="1.6"/><path d="M8.1 7.4c.4-.3.8-.2 1 .2l.8 1.6c.2.4-.1.7-.6 1.1.8 1.5 1.7 2.4 3.2 3.1.4-.5.7-.9 1.1-.7l1.8.8c.4.2.5.5.2 1-.4.9-1.3 1.5-2.3 1.1-3.5-.9-6.1-3.5-6.7-6.4-.2-.8.6-1.5 1.5-1.8Z" fill={ink}/></svg>;
  }
  return null;
}
