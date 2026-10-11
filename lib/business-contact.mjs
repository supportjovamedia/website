export const businessPhone = {
  display: "+44 7356 266655",
  tel: "tel:+447356266655",
  whatsapp: "https://wa.me/447356266655",
};

export function whatsappLink(placement = "content") {
  const messages = {
    hero: "Hi JovaMedia, I'd like to talk about my business.",
    contact: "Hi JovaMedia, I have a quick question.",
    quote: "Hi JovaMedia, I'd like to discuss a project and get a quote.",
  };
  return `${businessPhone.whatsapp}?text=${encodeURIComponent(messages[placement] || messages.contact)}`;
}
