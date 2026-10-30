// Adds data-label to table cells from their column headers so the
// phone layout can show each row as a labelled card. Pure presentation;
// it never changes what the app stores or renders logically.
(() => {
  'use strict';
  const label = () => {
    document.querySelectorAll('table').forEach(t => {
      const heads = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim());
      if (!heads.length) return;
      t.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.children].forEach((td, i) => {
          if (td.tagName !== 'TD' || !heads[i]) return;
          if (td.dataset.label !== heads[i]) td.dataset.label = heads[i];
          if (i > 0 && td.querySelector(':scope > .secondary') && !td.querySelector(':scope > .cell-val')) {
            const w = document.createElement('span');
            w.className = 'cell-val';
            while (td.firstChild) w.appendChild(td.firstChild);
            td.appendChild(w);
          }
        });
      });
    });
  };
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; label(); });
  };
  const start = () => {
    label();
    const mo = new MutationObserver(schedule);
    ['app', 'modal-root'].forEach(id => {
      const el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, subtree: true });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
