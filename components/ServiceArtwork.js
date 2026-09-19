import Image from "next/image";
import s from "./ServiceArtwork.module.css";

function Photo({ name, className = "" }) {
  return <div className={`${s.photo} ${className}`}><Image src={`/home-agency/${name}.webp`} fill sizes="(max-width: 700px) 60vw, 25vw" alt="" /></div>;
}

function Website() {
  return <div className={s.laptop}>
    <div className={s.laptopScreen}>
      <Photo name="coast" />
      <div className={s.screenShade} />
      <div className={s.screenHeader}><span>COAST</span><span>EXPLORE</span></div>
      <div className={s.screenHeadline}>Build<br />what’s<br /><em>next.</em></div>
      <div className={s.screenFooter}>A wider world awaits.</div>
    </div>
    <div className={s.keyboard}><span /><i /></div>
  </div>;
}

function Copywriting() {
  return <div className={s.printBook}>
    <div className={s.printSpine} />
    <div className={s.printPage}>
      <span className={s.printEyebrow}>THE POWER OF WORDS</span>
      <div className={s.printHeadline}>Good<br />brands<br />say more.</div>
      <span className={s.printRule} />
      <p>A clear voice.<br />A lasting impression.</p>
      <div className={s.printLines}><i /><i /><i /><i /></div>
      <span className={s.printSignature}>JOVA MEDIA</span>
    </div>
  </div>;
}

function Social() {
  return <div className={s.phone}>
    <Photo name="fitness" />
    <div className={s.phoneShade} />
    <div className={s.phoneNotch} />
    <div className={s.phoneStatus}>9:41 <span>● ▰</span></div>
    <div className={s.phoneHeadline}>Create.<br />Engage.<br /><em>Grow.</em></div>
    <div className={s.phoneBar}><span>◉</span><span>♡</span><span>＋</span><span>▤</span></div>
    <div className={s.phoneHome} />
  </div>;
}

function Branding() {
  return <div className={s.brandBook}>
    <div className={s.brandTexture} />
    <span className={s.brandEyebrow}>IDENTITY WITH INTENTION</span>
    <Image src="/brand/jova-logo-white.png" width={361} height={128} alt="" className={s.brandLogo} />
    <p>Ideas. Brands. People.</p>
    <span className={s.brandFooter}>A BRIGHTER TOMORROW.</span>
  </div>;
}

function Email() {
  return <div className={s.newsletter}>
    <div className={s.mailToolbar}><span>● ● ●</span><span>Inbox</span><span>↗</span></div>
    <div className={s.mailPaper}>
      <span className={s.mailBrand}>THE WEEKLY EDIT</span>
      <div className={s.mailHeadline}>A warmer<br /><em>inbox.</em></div>
      <div className={s.mailLines}><i /><i /></div>
      <Photo name="plant" />
      <span className={s.mailButton}>A LITTLE INSPIRATION</span>
    </div>
  </div>;
}

export default function ServiceArtwork({ index }) {
  return <div className={s.artwork} data-artwork={index} aria-hidden="true">
    {index === 0 && <Website />}
    {index === 1 && <Copywriting />}
    {index === 2 && <Social />}
    {index === 3 && <Branding />}
    {index === 4 && <Email />}
    {index === 5 && <Photo name="camera" className={s.camera} />}
  </div>;
}
