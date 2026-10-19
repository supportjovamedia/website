"use client";

import { Children } from "react";
import useCardRail from "./useCardRail";
import RailPagination from "./RailPagination";
import s from "@/app/websites/websites.module.css";

export default function WebsiteRail({ children, items, label, id, compact = false }) {
  const { rail, registerCard, active, select } = useCardRail();
  return <div className={compact ? s.compactRail : s.railWrap}>
    <div ref={rail} className={s.cardRail} tabIndex={0} role="region" aria-label={label} onKeyDown={event => {
      if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, active + (event.key === "ArrowRight" ? 1 : -1)));
      select(next);
    }}>
      {Children.map(children, (child, index) => <div id={`${id}-${index}`} ref={node => registerCard(index, node)} className={s.railItem} data-active={index === active}>{child}</div>)}
    </div>
    <RailPagination className={s.railDots} items={items.map((name, index) => ({ id: `${id}-${index}`, name }))} active={active} onSelect={select} label={`Choose ${label.toLowerCase()}`} />
  </div>;
}
