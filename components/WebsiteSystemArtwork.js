import { CalendarDays, Check, ChevronRight, Clock3, FileText, FolderOpen, LockKeyhole, Mail, MoreHorizontal } from "lucide-react";
import s from "./WebsiteSystemArtwork.module.css";

// A labelled interface illustration, not a screenshot of a client account.
// All controls are presentation-only and do not collect or transmit information.
export default function WebsiteSystemArtwork({ type, compact = false }) {
  return <div className={`${s.art} ${s[type] || ""} ${compact ? s.compact : ""}`} role="img" aria-label={`Illustrative ${type} interface. Features are agreed for each project.`}>
    <div className={s.surface} aria-hidden="true">
      {type === "booking" ? <>
        <div className={s.top}><CalendarDays /><strong>Appointments</strong><span><MoreHorizontal /></span></div>
        <div className={s.calendar}>{["M", "T", "W", "T", "F"].map((day, index) => <div key={index} data-selected={index === 2}><span>{day}</span><strong>{12 + index}</strong></div>)}</div>
        <div className={s.label}>Available times</div>
        <div className={s.times}>{["09:00", "10:30", "11:00", "13:30", "14:00", "15:30"].map(time => <span key={time} data-selected={time === "11:00"}>{time}</span>)}</div>
        <div className={s.confirm}><span className={s.tick}><Check /></span><div><strong>A time that works.</strong><span>Service, team and availability together.</span></div></div>
      </> : type === "crm" ? <>
        <div className={s.top}><FolderOpen /><strong>Client workspace</strong><span><MoreHorizontal /></span></div>
        <div className={s.search}><span>Find a client or enquiry</span><span>⌕</span></div>
        <div className={s.pipeline}>{[["New", "Enquiry received", "Review the brief"], ["In progress", "In conversation", "Agree the scope"], ["Next step", "Follow-up", "Keep things moving"]].map(([stage, title, task], index) => <div key={stage}><div className={s.stage}><i data-colour={index} />{stage}</div><div className={s.record}><span className={s.line} /><strong>{title}</strong><p>{task}</p><span className={s.recordFooter}><Clock3 />Next action</span></div></div>)}</div>
        <div className={s.workspaceNote}><Check />A record, an owner and a clear next action.</div>
      </> : type === "portal" ? <>
        <div className={s.top}><LockKeyhole /><strong>Your account</strong><span><MoreHorizontal /></span></div>
        <div className={s.progress}><span>Project progress</span><strong>Ready for your review</strong><div><i /><i /><i /><i /></div></div>
        {[[FileText, "Project documents", "Everything in one place"], [FolderOpen, "Design review", "The latest version"], [Mail, "Your requests", "A clear conversation"]].map(([Icon, title, subtitle]) => <div key={title} className={s.file}><Icon /><div><strong>{title}</strong><span>{subtitle}</span></div><ChevronRight /></div>)}
      </> : <>
        <div className={s.top}><LockKeyhole /><strong>Member library</strong><span><MoreHorizontal /></span></div>
        <div className={s.memberIntro}><strong>Make room<br />for the next idea.</strong><p>Resources, sessions and a reason to return.</p></div>
        <div className={s.resources}><div><FileText /><strong>Your resources</strong><span>Explore the library<ChevronRight /></span></div><div><CalendarDays /><strong>Upcoming sessions</strong><span>Find your next event<ChevronRight /></span></div></div>
        <div className={s.workspaceNote}><Check />Access designed around your membership.</div>
      </>}
    </div>
  </div>;
}
