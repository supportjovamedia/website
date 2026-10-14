/* eslint-disable @next/next/no-html-link-for-pages -- Editorial links remain usable without the client router. */
import BookingCostCalculator from "./BookingCostCalculator";
import { sources } from "@/lib/insights.mjs";
import s from "./Editorial.module.css";

function Inline({ text }) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    return <a key={index} href={match[2]}>{match[1]}</a>;
  });
}
function Citations({ ids }) {
  return <span className={s.citations}>{ids.map(id => <a key={id} href={sources[id].url} target="_blank" rel="noopener noreferrer">{sources[id].title}<span className={s.srOnly}> (opens in a new tab)</span></a>)}</span>;
}
export default function ArticleBody({ blocks }) {
  return <div className={s.prose}>{blocks.map((block, index) => {
    if (block.type === "heading") return <h2 key={block.id} id={block.id}>{block.title}</h2>;
    if (block.type === "paragraph") return <p key={index}><Inline text={block.text}/>{block.sources.length > 0 && <Citations ids={block.sources}/>}</p>;
    if (block.type === "list") return <ul key={index}>{block.items.map(item => <li key={item}><Inline text={item}/></li>)}</ul>;
    if (block.type === "sources") return <p className={s.sourceLine} key={index}>Provider sources: <Citations ids={block.ids}/></p>;
    if (block.type === "calculator") return <BookingCostCalculator key={index}/>;
    if (block.type === "table") return <div className={s.tableScroll} key={index} role="region" aria-label={block.caption} tabIndex={0}><table><caption>{block.caption}</caption><thead><tr>{block.headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th scope="row" key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
    return null;
  })}</div>;
}
