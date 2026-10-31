# JovaBook workspace themes

## Current direction

The latest user correction replaces the earlier full-screen tinted palettes. Every light workspace uses a neutral light-gray canvas, pure white working panels, and neutral dark text. Theme colour is limited to navigation, primary actions, selections, small highlights, category header strips and data marks. Midnight Glass uses neutral charcoal and neutral white/gray text.

Preserve the approved layout, rail expansion/pin behaviour, spacing, rounded corners, typography and functionality. Public booking branding stays independent.

## Neutral working tokens

| Token | All five light themes | Midnight Glass |
|---|---|---|
| page | #F5F5F5 | #171717 |
| panel | #FFFFFF | #232323 |
| inset | #EEEEEE | #2C2C2C |
| heading | #202020 | #F5F5F5 |
| body | #373737 | #E0E0E0 |
| muted | #606060 | #B8B8B8 |
| line | #DDDDDD | #414141 |
| controlLine | #8A8A8A | #858585 |
| statStrong / statSoft | #FFFFFF | #232323 |
| overlay | #00000066 | #000000B3 |

Headings, table content, labels, helper text, dates, inactive controls and ordinary links use neutral text. Panel borders and stats stay neutral. Typography and small data marks provide hierarchy.

## Controlled accent sets

| ID and name | Primary / foreground | Rail | Rail hover | Rail selected | Soft highlight | Focus |
|---|---|---|---|---|---|---|
| jova-blue, Jova Blue (default) | #235789 / #FFFFFF | #18334F | #294966 | #D3E3F4 | #E8EFF6 | #1D5FA3 |
| rose-studio, Rose Studio | #954562 / #FFFFFF | #432B38 | #624153 | #F0CDD9 | #F5E9ED | #A12F5D |
| midnight-glass, Midnight Glass | #E3E3E3 / #202020 | #101010 | #303030 | #D4D4D4 | #343434 | #DADADA |
| forest, Forest | #286B55 / #FFFFFF | #203C31 | #355548 | #D1E4D3 | #E8F1EB | #186A4C |
| warm-studio, Warm Studio | #78523B / #FFFFFF | #352A23 | #514137 | #EAD5BD | #F2ECE6 | #805129 |
| amethyst, Amethyst | #6B528C / #FFFFFF | #332B46 | #4C3D65 | #DFD2EF | #EFEAF5 | #73529D |

Light rail text: neutral #E7E7E7. Midnight rail text: #D7D7D7. Selected rail foreground: neutral heading ink, or #202020 in Midnight. Category strips use soft highlight with neutral text. Primary-button hover darkens primary by 8%.

Charts use primary with secondary/third series: Jova Blue #4B7781/#8E6545, Rose #6F7970/#8B6744, Midnight #AEC9BB/#D2C3AF, Forest #698195/#947449, Warm Studio #6D806C/#587A94, Amethyst #52837C/#92724C. Retain labels or another cue besides hue.

## Component treatment

- Canvas, header and main workspace use page. Tables, diary, services, staff, settings, reports, notifications and all stat cards use panel.
- Nested controls, readonly inputs and hover rows use neutral inset. Fields use panel, neutral text and controlLine.
- Service category strip uses soft, with neutral title and count. Preserve category structure and padding.
- Only small stat icon chips and filled booking dots use primary/soft. Do not tint whole stat cards.
- Calendar grids, headers and toolbars stay neutral. Event identity fills remain readable with dark ink; do not make every event the workspace accent.
- Theme variables reach html/body for external modal, toast and popover roots. Clear them on public routes.
- Picker previews show neutral page/cards, accent rail, a small primary marker and a pale category strip.
- Sidebar layout is owned separately. Retain its semantic variables without dimension or positioning overrides.
- Override legacy literal colours by semantic component. Do not use a universal text override that destroys primary/status contrast.

## Midnight Glass

Neutral #171717 canvas and #232323 opaque panels. Floating chrome can use rgba(35,35,35,.94), restrained 12px blur and a subtle black shadow. Opaque fallback and reduced-transparency support are required. No navy cast, tinted body text, neon glow or glass over dense data.

Native select chevrons use #B8B8B8, no-repeat, right 16px centre and 12px sizing. Settings sidebar descriptions use muted so old warm CSS cannot leak through.

## Semantic statuses

Purposeful statuses remain independent of the decorative theme and include text or icons.

| Role | Light fill / text | Dark fill / text |
|---|---|---|
| Success / active | #E4F1E8 / #245B3C | #203F32 / #A9DFC0 |
| Warning / pending | #F7ECCD / #765214 | #47391E / #F0D593 |
| Error / cancelled | #F8E4E5 / #8F3441 | #482831 / #F0B3BE |
| Information | #E1EDF8 / #25547C | #253D55 / #B6D4F3 |
| Neutral / inactive | #ECECEC / #555555 | #353535 / #D2D2D2 |

## Verification and persistence

Unit checks enforce achromatic reading surfaces/text, pure white light panels, neutral stats, six distinct IDs, contrast, saved-theme priority, migration and public-route cleanup. Text needs 4.5:1, essential control boundaries/focus need 3:1.

Actual browser proofs cover all six dashboards/calendars, plus services, staff, settings, dialogs, notifications and mobile navigation in Blue/Rose/Midnight. Assert computed neutral page/panel/text colours and category strip/title. Check reload persistence, public-route cleanup, no mobile overflow and no browser errors. Preserve prior screenshots for comparison.

Migration is unchanged: #235789 to Jova Blue; #77504e to Rose Studio; #286b64/#8bcf97 to Forest; #6d4777 to Amethyst; #2b221e to Warm Studio. Only explicitly saved legacy accents migrate. New or invalid values use Jova Blue.
