# Workspace surfaces and themes

Use the shared tokens from workspace-themes.js on every owner-only page. Classic uses black controls, a white top bar, a grey canvas and yellow navigation selection. Keep customer website branding separate.

- New panels use the jg-surface class or an existing shared panel class. They inherit the surface edge, shadow and corner radius from workspace-polish.css.
- Use theme-heading, theme-body and theme-muted for text, theme-panel and theme-inset for surfaces, theme-primary and theme-on-primary together for primary actions. Do not hardcode light or dark text on themed surfaces.
- Use semantic success, warning, error and info tokens for statuses. Colours must have a text label too. Calendar staff colours represent identity, not workspace theme.
- Page headings do not need repeated breadcrumbs or generic descriptions. Keep explanations only for choices, errors and non-obvious calculations.
- Desktop navigation stays flush left below the fixed top bar. Its rows retain their coordinates when labels expand. Phones and tablets up to 1024px use five fixed bottom tabs: Dashboard, Bookings, Calendar, Customers and More. More opens a right drawer with the six secondary pages. Desktop retains the left sidebar.
- Add and edit forms use the shared right-side panel. Destructive confirmation dialogs remain compact and separate.
- Personalise has both forms in the DOM. Section navigation only scrolls and updates its active marker. Never re-render or discard a form because the user scrolled.
- Check contrast with tests/workspace-themes.mjs and inspect the actual component at phone, tablet and desktop widths before release. Avoid production crawls and load tests.
