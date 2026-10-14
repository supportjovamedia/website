import s from "./RailPagination.module.css";

export default function RailPagination({ items, active, onSelect, label, className = "" }) {
  return <div className={`${s.pagination} ${className}`} role="group" aria-label={label}>{items.map(({ id, name }, index) => <button key={id} type="button" aria-label={name} aria-pressed={active === index} aria-controls={id} onClick={() => onSelect(index)}><span aria-hidden="true" /></button>)}</div>;
}
