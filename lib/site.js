export const socialProfiles = [
  { label: "LinkedIn", icon: "linkedin", url: "https://www.linkedin.com/company/jovamedia" },
  { label: "Instagram", icon: "instagram", url: "https://www.instagram.com/jovamediaofficial/" },
  { label: "Facebook", icon: "facebook", url: "https://www.facebook.com/jovamediaofficial/" },
  { label: "X", icon: "x", url: "https://x.com/jova_media" },
  { label: "TikTok", icon: "tiktok", url: "https://www.tiktok.com/@jovamediaofficial" },
];
export const footerSocialProfiles = socialProfiles.filter(profile => ["Instagram", "Facebook", "TikTok"].includes(profile.label));
export const contactEmail = "support.jovamedia@gmail.com";
