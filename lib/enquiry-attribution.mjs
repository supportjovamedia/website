const campaignFields = ["source", "medium", "campaign", "content", "term"];

// Optional, visitor-reported labels. Never accept arbitrary URLs or form values.
export function sanitiseEnquiryAttribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.consent !== "accepted") return {};
  return Object.fromEntries(campaignFields.flatMap(key => {
    const label = value[key];
    return typeof label === "string" && label.length > 0 && label.length <= 100 && !/[^a-zA-Z0-9_.-]/.test(label) ? [[key, label]] : [];
  }));
}

export function enquiryAttributionText(value) {
  const labels = sanitiseEnquiryAttribution(value);
  if (!Object.keys(labels).length) return "";
  return "\n\nMarketing source (optional, visitor-reported):\n" +
    Object.entries(labels).map(([key, label]) => `${key}: ${label}`).join("\n");
}
