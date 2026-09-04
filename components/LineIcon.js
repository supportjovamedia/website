export default function LineIcon({name}) {
 const paths={
 strategy:<><path d="M4 20h3v-5H4zm6 0h3V10h-3zm6 0h3V4h-3"/></>,
 creative:<><path d="m5 16-1 4 4-1L20 7l-3-3Z M14 7l3 3"/></>,
 social:<><circle cx="12" cy="7" r="3"/><path d="M7 20v-4a5 5 0 0 1 10 0v4ZM5 5a3 3 0 0 0 0 6M19 5a3 3 0 0 1 0 6M5 13a4 4 0 0 0-3 4v3h3M19 13a4 4 0 0 1 3 4v3h-3"/></>,
 web:<><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8m-4-4v4M6 8h12"/></>,
 growth:<><path d="m3 18 6-7 4 3 8-10m-5 0h5v5"/></>,
 tech:<><path d="m10 2-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-2v-3l3-2-1-4-3-1-2-3Z"/><circle cx="11" cy="11" r="3"/></>,
 star:<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>,
 bolt:<path d="m13 2-8 12h6l-1 8 9-13h-7Z"/>
 };
 return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.strategy}</svg>
}
