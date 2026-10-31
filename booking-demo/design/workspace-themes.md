# JovaBook workspace themes

Six complete workspace palettes. Jova Blue is the default. Preserve the approved slim rail, rounded cards, type scale, spacing, navigation, and functionality. Theme changes alter the entire owner workspace immediately, including open dialogs. Public booking branding stays controlled separately.

## Direction

- **Jova Blue** (`jova-blue`): the native JovaMedia identity, anchored in the existing #235789. Cool paper, white working surfaces, an inky blue rail.
- **Rose Studio** (`rose-studio`): professional dusty rose, wine actions, soft pink paper. No bubblegum, saturated magenta, or decorative gradients.
- **Midnight Glass** (`midnight-glass`): slate and ink, pale blue controls, restrained translucent chrome inspired by iOS. Dense working surfaces remain solid.
- **Forest** (`forest`): moss paper, evergreen rail and actions, mineral secondary chart colours.
- **Warm Studio** (`warm-studio`): the approved paper and espresso atmosphere, with amber linen supporting surfaces.
- **Amethyst** (`amethyst`): quiet lilac paper, aubergine rail, muted violet controls. No neon purple.

## Semantic tokens

Use `--theme-<token>` or map these values into the implementation's equivalent semantic variables. These values are opaque sRGB except the overlay. `primary` and `onPrimary` are a pair. `line` is for decorative separators; use `controlLine` when a boundary must identify an input or control.

| Token | Jova Blue | Rose Studio | Midnight Glass | Forest | Warm Studio | Amethyst |
|---|---|---|---|---|---|---|
| page | #EEF3F8 | #F6EEF1 | #111923 | #EDF2ED | #F2ECE5 | #F0EEF6 |
| panel | #FFFFFF | #FFFCFD | #1C2836 | #FCFEFC | #FFFDFA | #FDFBFF |
| inset | #E5EDF5 | #EEDFE5 | #14202D | #E0EAE1 | #EAE0D4 | #E6E0EF |
| rail | #18334F | #432B38 | #0B121B | #203C31 | #352A23 | #332B46 |
| railText | #C9D8E7 | #E6CFD9 | #B9CCDE | #C8DCCD | #E0D1C2 | #D8CEE8 |
| railHover | #294966 | #624153 | #27394C | #355548 | #514137 | #4C3D65 |
| railSelected | #D3E3F4 | #F0CDD9 | #A8C7E8 | #D1E4D3 | #EAD5BD | #DFD2EF |
| heading | #172D43 | #402A35 | #F1F6FC | #233C2F | #3B2D23 | #342C45 |
| body | #344B60 | #604451 | #D6E1EE | #405A48 | #594738 | #514660 |
| muted | #526A80 | #795967 | #A7B9CC | #5B7262 | #76604D | #6E5E80 |
| line | #D3DFEA | #E5D1D9 | #34465B | #CDDDCF | #DFD1C0 | #DBD1E7 |
| controlLine | #7E93A8 | #A37D8D | #6E87A1 | #7B9480 | #A18B73 | #9683A9 |
| primary | #235789 | #954562 | #A8C7E8 | #286B55 | #78523B | #6B528C |
| onPrimary | #FFFFFF | #FFFFFF | #142A41 | #FFFFFF | #FFFFFF | #FFFFFF |
| soft | #D9E7F5 | #F1D5DF | #2A425B | #D4E6D8 | #EAD8C2 | #E3D8F0 |
| focus | #1D5FA3 | #A12F5D | #C3DEFF | #186A4C | #805129 | #73529D |
| statStrong | #1D4267 | #653449 | #294B70 | #234B3B | #503C2D | #49385F |
| statSoft | #CFDFEF | #ECC5D3 | #30475A | #CCDECB | #E5D0B5 | #D9CBE9 |
| chart2 | #4B7781 | #6F7970 | #83C7BE | #698195 | #6D806C | #52837C |
| chart3 | #8E6545 | #8B6744 | #DAB88C | #947449 | #587A94 | #92724C |
| overlay | #0C223A66 | #30131F66 | #030810B3 | #112A1D66 | #2A1D1266 | #20142F66 |

Additional deterministic mappings:

- Selected rail foreground: use the light theme's `heading`; Midnight Glass uses `onPrimary`.
- Strong stat foreground: #FFFFFF for every theme. Supporting labels use this at full opacity where small.
- Soft stat foreground: use `heading` for light themes; #F1F6FC for Midnight Glass.
- Neutral stat background/foreground: `panel` / `heading`.
- Main chart: `primary`; second and third series: `chart2`, `chart3`. Charts on the strong stat use `railSelected`, never the dark primary.
- Selected segment: `primary` / `onPrimary`; unselected segment: `inset` / `body`.
- Hover rows and secondary controls: `inset` / `body`.
- Focus on a light or solid panel: `focus`, 2px ring with 3px offset. Rail focus: #FFFFFF. Put a `panel` gap around focused primary buttons so the ring stays visible.
- Input background: `panel`; readonly input and empty calendar cells: `inset`. Placeholder text: `muted`, no opacity reduction.
- Primary hover: darken light-theme `primary` by 10% with black. Midnight Glass darkens its light primary by no more than 6%. Preserve foreground contrast.
- Toast and dialog surfaces: `panel`; dropdowns should have a 1px `line` edge and a restrained shadow. Dialog backdrop uses `overlay`.

## Component hierarchy and coverage

1. **Page and rail:** page canvas, workspace header, mobile header and mobile expanded navigation must all follow the theme. Rail remains a distinct solid anchor. Active rail items and the brand disc share `railSelected`.
2. **Working panels:** diary, staff, service groups, customers, appointment list, settings, billing, reports, notifications, empty states and tables use `panel`. Nested headers and inset controls use `inset`. Headings use `heading`; ordinary data uses `body`; dates, help copy and column labels use `muted`.
3. **Three stat treatments:** first card uses `statStrong` with white text, middle card uses `panel`, final card uses `statSoft`. In the four-card dashboard, the additional card uses `inset`. Reuse this hierarchy in calendar and reporting summaries; do not assign unrelated hardcoded brown/orange fills.
4. **Calendar:** staff labels, time ruler, grids, closed-slot hatch, day/week/month toolbars, today marker, event popovers and appointment dialogs must be included. Hatching uses `panel` and `inset`. Preserve staff/category identity colours but pair their event fills with readable text; use dark text on pale event fills, including dark mode. Never force all calendar events to the theme accent.
5. **Transient UI:** modal root and toast root sit outside `.shell`. Put active theme variables on the body or shared owner root as well as the shell. Do not let public routes inherit a stale owner dark theme.
6. **Appearance picker:** present six miniature workspace previews with a canvas, narrow rail and three stat blocks, followed by names. Show a checked indicator and visible selected outline. A single colour dot cannot communicate the full workspace transformation.
7. **Existing CSS:** `studio-refresh.css`, `studio.css` and `alignly.css` contain literal white, green and warm brown declarations. Changing the handful of `--studio-*` aliases will leave mixed-theme surfaces. Cover their semantic components with a last-loaded theme layer or replace the literals. Preserve measurements and breakpoints. Avoid a universal colour override which erases hierarchy and semantic statuses.

## Midnight Glass treatment

Use a quiet static background: #111923. A very subtle broad navy lift behind the upper chrome is optional, with no animated blobs or neon glow. Header and floating dropdown surfaces can use rgba(28,40,54,.92), a 12px backdrop blur, a 1px rgba(168,199,232,.18) edge, and 0 12px 32px rgba(0,0,0,.18). Keep opaque #1C2836 fallback and reduce-transparency support. Tables, inputs, calendar and full-page cards remain opaque. This makes glass an elevation cue while preserving legibility. No simulated glossy highlights on every card.

## Semantic statuses

Statuses keep their meaning across palettes. Always pair the colour with the existing text/icon.

| Role | Light fill | Light text | Dark fill | Dark text |
|---|---|---|---|---|
| Success / active | #E4F1E8 | #245B3C | #203F32 | #A9DFC0 |
| Warning / pending | #F7ECCD | #765214 | #47391E | #F0D593 |
| Error / cancelled | #F8E4E5 | #8F3441 | #482831 | #F0B3BE |
| Information | #E1EDF8 | #25547C | #253D55 | #B6D4F3 |
| Neutral / inactive | #E8EDF1 | #4B5D6C | #303D4B | #C1CEDC |

Use status text as the border/icon colour when a status edge itself needs contrast. Cancellation is not a fourth decorative theme colour. Destructive buttons should use a semantic error treatment, never inherit the theme primary blindly.

## Contrast and verification

The supplied muted text against page/panel is at least 4.60:1 across light themes, and at least 7.43:1 in Midnight Glass. Primary-button pairs range from 6.32:1 to 8.35:1. Rail label pairs exceed 8.3:1. White labels on the strong stat exceed 8.9:1. These are calculated opaque sRGB pairs, not a claim that the rendered app has passed accessibility review.

Check actual computed pairs after overrides, including hover/focus, small labels, status chips and external modal roots. Normal text needs 4.5:1, large text 3:1, necessary control boundaries/icons/focus indicators 3:1. Decorative separator lines can remain softer. Chart categories require labels or another visible cue besides hue.

Final proof set: dashboard and calendar in all six themes; services, staff, settings, a dialog and mobile navigation in at least Jova Blue, Rose Studio and Midnight Glass. Confirm no residual brown text or white panels in Midnight Glass, and no residual cream canvas in Jova Blue. Verify saved theme survives route changes and reload, with fallback to Jova Blue for an absent or invalid theme.

Legacy accent migration can map #235789 to Jova Blue, #77504e to Rose Studio, #286b64 and #8bcf97 to Forest, #6d4777 to Amethyst, and #2b221e to Warm Studio. Only explicitly saved legacy accents should migrate; new or unset accounts get Jova Blue.
