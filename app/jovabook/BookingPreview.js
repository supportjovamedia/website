import Image from "next/image";
import ProductScreen from "./ProductScreen";
import s from "./jovabook.module.css";

export default function BookingPreview() {
  return <div className={s.previewWrap}>
    <div className={s.bookingScene}>
      <div className={s.sceneDisc} aria-hidden="true" />
      <div className={s.laptop}>
        <Image className={s.laptopFrame} src="/device-frames/macbook-pro.webp" alt="" width={1208} height={700} sizes="(max-width:800px) 96vw, 62vw" priority />
        <div className={s.laptopScreen}><ProductScreen caption={false} name="dashboard" label="dashboard" className={s.realScreen} alt="The JovaBook dashboard with a weekly overview of bookings and appointment activity" width={2880} height={1920} sizes="(max-width:800px) 76vw, 46vw" priority /></div>
      </div>
      <div className={s.bookingPhone}><ProductScreen caption={false} name="booking-mobile" label="booking page" className={s.realPhone} alt="The JovaBook customer booking page on a phone, with available appointment dates and times" width={750} height={1622} sizes="(max-width:800px) 26vw, 17vw" priority /></div>
    </div>
  </div>;
}
