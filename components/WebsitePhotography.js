import Image from "next/image";
import { websitePhotos } from "@/lib/website-editorial.mjs";
import s from "@/app/websites/websites.module.css";

export function WebsitePhoto({ name, eager = false, className = "", sizes = "(max-width: 900px) 90vw, 50vw" }) {
  const photo = websitePhotos[name];
  if (!photo) throw new Error(`Unknown website photograph: ${name}`);
  return <div className={`${s.photo} ${className}`} data-photo-kind={photo.kind || "photograph"}>
    <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} />
  </div>;
}

export function WebsitePhotoComposition({ photos }) {
  return <div className={s.composition} aria-label="Website design and service photography">
    {photos.map((name, index) => <figure key={name} className={s.compositionPhoto} data-motion-card><WebsitePhoto name={name} eager={index === 0} sizes={index === 0 ? "(max-width: 900px) 62vw, 34vw" : "(max-width: 900px) 29vw, 17vw"} /></figure>)}
  </div>;
}
