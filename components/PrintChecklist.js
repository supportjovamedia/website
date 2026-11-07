'use client';
import s from './Guides.module.css';
export default function PrintChecklist() { return <button type="button" className={s.printButton} onClick={() => window.print()}>Save as PDF or print</button>; }
