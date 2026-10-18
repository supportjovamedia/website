import Image from "next/image";
import s from "@/app/websites/websites.module.css";

function Browser({ children, name, className = "" }) {
  return <div className={`${s.browser} ${className}`}><div className={s.browserBar}><span className={s.dots} aria-hidden="true"><i /><i /><i /></span><span>{name}</span><span className={s.windowMark} aria-hidden="true" /></div>{children}</div>;
}

function WebScreen({ type, image, eager }) {
  const store = type === "ecommerce";
  const portfolio = type === "portfolio";
  const landing = type === "landing";
  return <Browser name={store ? "Form / objects" : portfolio ? "Atelier / selected work" : landing ? "Fern / a little more green" : "Still / spaces for living"}>
    <div className={`${s.webScreen} ${s[type] || ""}`}>
      <div className={s.sampleNav}><strong>{store ? "form." : portfolio ? "atelier" : landing ? "fern" : "still."}</strong><span>{store ? "Objects / Our story" : portfolio ? "Work / Studio / Contact" : "Our story / Explore"}</span></div>
      {landing ? <div className={s.landingCanvas}><div><span>Bring the outside in.</span><strong>A little<br />more green.</strong><span className={s.sampleButton}>Find your plant</span></div><Image src="/websites/plants.webp" alt="" fill sizes="(max-width:700px) 80vw, 600px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} /></div>
      : store ? <><div className={s.shopHeadline}><span>Considered pieces. Everyday living.</span><strong>Find your<br />favourite place.</strong></div><div className={s.shopPhoto}><Image src="/websites/furniture.webp" alt="" fill sizes="(max-width:700px) 80vw, 620px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} /><span>Explore the collection</span></div><div className={s.shopMeta}><span>The everyday sofa</span><span>Collection / Seating</span></div></>
      : <><div className={s.editorialHeadline}><span>{portfolio ? "Architecture & interiors" : "Homes with a different perspective"}</span><strong>{portfolio ? "Structure.\nLight. Life." : "Spaces for\nliving well."}</strong></div><div className={s.editorialPhoto}><Image src={`/websites/${image || "architecture"}.webp`} alt="" fill sizes="(max-width:700px) 80vw, 700px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} /></div><div className={s.editorialFoot}><span>{portfolio ? "Selected work / The garden house" : "A considered approach, from the first sketch."}</span><span>Explore</span></div></>}
    </div>
  </Browser>;
}

function SystemScreen({ type }) {
  const heading = { booking: "Appointments", crm: "Your next conversations", portal: "Your project, in one place", membership: "Good things to come back to" }[type];
  return <Browser name="Workspace / interface study">
    <div className={`${s.systemScreen} ${s[type]}`}>
      <div className={s.systemNav}><strong>{type === "membership" ? "the field notes" : "studio / workspace"}</strong><span>Overview</span></div>
      <div className={s.systemHeading}><span>{type === "portal" ? "Welcome to your account" : type === "membership" ? "Your membership" : "A clear view of the day"}</span><strong>{heading}</strong></div>
      {type === "booking" ? <><div className={s.calendarDays}>{["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => <span key={d} className={i === 1 ? s.selectedDay : ""}>{d}<b>{12 + i}</b></span>)}</div><div className={s.appointment}><span>09:30</span><div><b>Consultation</b><span>Studio room / 30 min</span></div><em>Confirmed</em></div><div className={`${s.appointment} ${s.softAppointment}`}><span>11:00</span><div><b>New appointment</b><span>Service and team availability</span></div><em>Available</em></div><div className={s.calendarNote}>One view for services, people and time.</div></>
      : type === "crm" ? <div className={s.pipeline}>{[["New enquiries", "Website project", "Review the brief"], ["In conversation", "Retail collection", "Discuss the scope"], ["Next step", "Studio website", "Prepare a proposal"]].map(([status, project, action]) => <div key={status}><span>{status}</span><article><i aria-hidden="true" /><b>{project}</b><p>{action}</p><small>Assigned to your team</small></article></div>)}</div>
      : type === "portal" ? <><div className={s.portalStatus}><span>Website project</span><strong>Design review</strong><span>Current stage / Your feedback</span><div><i /><i /><i /><i /></div></div><div className={s.document}><span>Homepage direction</span><b>Ready to review</b></div><div className={s.document}><span>Project documents</span><b>View files</b></div><div className={s.document}><span>Send a request</span><b>Contact the team</b></div></>
      : <><div className={s.memberFeature}><div><span>From the library</span><strong>Make a little<br />space for ideas.</strong><span>Read the latest field notes</span></div><Image src="/websites/plants.webp" alt="" fill sizes="(max-width:700px) 80vw, 600px" /></div><div className={s.memberLinks}><span>Your resources</span><span>Upcoming sessions</span><span>Manage membership</span></div></>}
    </div>
  </Browser>;
}

export default function WebsiteVisual({ type = "business", image, eager = false }) {
  if (type === "redesign") return <div className={s.redesignPair} aria-hidden="true"><div className={s.beforeStudy}><span>Layout study / Before</span><strong>Our business</strong><div /><p>Services and contact information</p><div /></div><WebScreen type="business" image={image} eager={eager} /></div>;
  return <div className={`${s.visual} ${s[`tone_${type}`] || ""}`} aria-hidden="true">{["booking", "crm", "portal", "membership"].includes(type) ? <SystemScreen type={type} /> : <WebScreen type={type} image={image} eager={eager} />}</div>;
}
