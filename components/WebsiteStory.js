"use client";

import { Children, useEffect, useRef, useState, useSyncExternalStore } from "react";
import useCardRail from "./useCardRail";
import RailPagination from "./RailPagination";
import s from "@/app/websites/websites.module.css";

const query = "(min-width: 901px) and (min-height: 740px) and (prefers-reduced-motion: no-preference)";
function subscribe(callback) { const media = matchMedia(query); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
function snapshot() { return matchMedia(query).matches; }

// Same interaction model as the homepage: desktop scroll chapters, native phone
// swipe cards, and a complete static reading order before enhancement.
export default function WebsiteStory({ title, introduction, names, children, id = "scope" }) {
  const root = useRef(null);
  const { rail, registerCard, active, select } = useCardRail();
  const [chapter, setChapter] = useState(0);
  const pinned = useSyncExternalStore(subscribe, snapshot, () => false);
  const selected = pinned ? chapter : active;
  useEffect(() => {
    if (!pinned) return;
    const node = root.current;
    let frame = 0, offset = 86, last = -1;
    const paint = () => {
      frame = 0;
      const bounds = node.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (offset - bounds.top) / Math.max(1, bounds.height - (innerHeight - offset))));
      const next = Math.min(names.length - 1, Math.floor(progress * names.length));
      if (next !== last) { last = next; setChapter(next); }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const measure = () => {
      offset = document.querySelector(".header")?.offsetHeight || 86;
      node.style.setProperty("--story-top", `${offset}px`);
      request();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", measure);
    measure();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); removeEventListener("scroll", request); removeEventListener("resize", measure); };
  }, [pinned, names.length]);
  function choose(index) {
    if (pinned) {
      const node = root.current;
      const offset = parseFloat(getComputedStyle(node).getPropertyValue("--story-top")) || 86;
      scrollTo({ top: node.getBoundingClientRect().top + scrollY - offset + (node.offsetHeight - (innerHeight - offset)) * (index + .12) / names.length, behavior: "instant" });
    } else if (matchMedia("(min-width:901px)").matches) {
      document.getElementById(`${id}-chapter-${index}`)?.scrollIntoView({ behavior: "instant", block: "center" });
    } else select(index);
  }
  return <section id={id} ref={root} className={s.story} data-pinned={pinned} aria-labelledby={`${id}-title`}>
    <div className={s.storySticky}>
      <div className={s.storyHeading}><h2 id={`${id}-title`}>{title}</h2><p>{introduction}</p></div>
      <div className={s.chapterButtons} role="group" aria-label="Explore the website scope">
        {names.map((name, index) => <button key={name} type="button" aria-pressed={selected === index} aria-controls={`${id}-chapter-${index}`} onClick={() => choose(index)}>{name}</button>)}
      </div>
      <div ref={rail} className={s.storyRail} role="region" aria-label="Website scope details" tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault(); choose(Math.max(0, Math.min(names.length - 1, selected + (event.key === "ArrowRight" ? 1 : -1))));
      }}>
        {Children.map(children, (child, index) => <div ref={node => registerCard(index, node)} id={`${id}-chapter-${index}`} className={s.storyCard} data-active={selected === index} inert={pinned && selected !== index ? true : undefined}>{child}</div>)}
      </div>
      <RailPagination className={s.storyDots} items={names.map((name, index) => ({ id: `${id}-chapter-${index}`, name }))} active={selected} onSelect={choose} label="Choose a website scope detail" />
    </div>
  </section>;
}
