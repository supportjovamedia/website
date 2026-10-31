# JovaBook business website: fixed one-page template

## Scope and hierarchy

Add one editable public home page to the existing product. Owners manage it in Personalise. Both Book now buttons lead into the existing business booking flow, preserving the same business identity and booking behaviour. Do not add a second portal or rebuild booking.

Essential and Standard use this single fixed template. Two multi-page Premium templates are future work, not a current feature. Do not show selectable template thumbnails, disabled mock templates or a claim that those pages exist.

The public page contains, in order: a quiet business header, hero with image/headline/Book now, About section with body copy/Book now, and a small footer. No testimonials, fabricated credentials, service carousel, stock photos, generated imagery, announcement bar or decorative badges.

## Public desktop layout

| Part | Treatment |
|---|---|
| Canvas | Subtle warm neutral #F7F6F3; never inherit the owner's workspace theme. |
| Container | max-width 1120px, centred, 32px side gutters; 24px at intermediate widths. |
| Header | 88px minimum height. Existing business logo if available, otherwise business name in neutral dark ink. No duplicate header CTA. Optional simple About anchor only if needed; no empty navigation. |
| Hero | Two equal columns, gap 56px, align centre; 48px top and 72px bottom padding. Text first in DOM. |
| Hero headline | Existing public Plus Jakarta Sans or configured booking font. 56px, weight 500, line-height 1.08, letter-spacing -1.5px; maximum approximately 12 characters per line where text length permits. Use natural wrapping, never forced authored line breaks. |
| Hero action | Book now, 16px/600, min-height 48px, 24px horizontal padding, 12px corner radius. No arrow. 28px above. |
| Hero image | 5:4 aspect ratio, object-fit cover, width 100%, 24px radius. Preserve the owner image, no filters, AI extension or arbitrary tint. Image has no overlaid text. |
| About | White section, 1px subtle neutral top border (#E6E4DF), 64px vertical padding. Inner grid: title column 0.8fr and content column 1.2fr, gap 64px. |
| About heading | Fixed label 'About [business name]', 32px/1.2, weight 500, negative tracking no more than -.5px. |
| About body | #4B4B4B, 16px, line-height 1.75, max-width 640px, preserve plain paragraph breaks. Second Book now button below, 24px top margin. |
| Footer | Neutral text, 13px, 24px vertical padding. Existing business contact/location only when actually supplied. A small 'Powered by JovaBook' attribution is acceptable. Avoid a fabricated copyright owner or year-dependent promise. |

Use restrained warm neutrals on this public template while keeping the admin workspace's neutral gray and white theme unchanged. Brand colour belongs on the two booking actions and minor highlights. Heading colour applies to the hero and About headings, not all body text.

## Mobile and smaller screens

- Below 760px use a single column. Header height 72px; 20px side gutters (16px at 360px).
- Hero: 28px top and 40px bottom padding, 28px gap. Headline 38px/1.12 with -.8px tracking. Keep text and first CTA before the image.
- Book now spans the available width, min-height 48px. No sticky booking bar that duplicates the requested actions.
- Hero image stays 5:4, radius 18px. Do not crop differently merely because the viewport is mobile.
- About stacks its heading above copy with 20px gap and 40px vertical padding. Heading 28px; body 16px/1.7. Footer wraps without horizontal scrolling.
- At widths between 760px and 1100px use a 40px gap and a clamped 42px to 56px hero headline. Long business names and uploaded text must wrap without overflow.

## Personalise editor

Retain the existing workspace appearance control. Below it, add an accessible two-item tab row: Website and Booking page. Each panel owns its save action and preview. The existing booking editor belongs unchanged under Booking page; the website editor must not append an additional wall of controls beneath it.

Use a simple editor/preview split on desktop: approximately 380px controls and remaining preview space, 24px gap. At narrow widths show controls then preview. Preview must reproduce the real fixed template rather than a different marketing mockup. Website controls use the active neutral owner theme, while the preview uses the public website colours.

Website has three compact groups:

1. **Hero:** headline text input (required, max 100 characters) and one image uploader with thumbnail, Replace image and Remove image. Show permitted types and size limit beside the uploader from the actual storage implementation. Do not add URL-only editing or an extra mandatory intro field.
2. **About your business:** one plain textarea (max 1200 characters). Section heading is generated from the business name; do not duplicate business-name settings. Keep paragraph breaks, escape text, no arbitrary rich HTML.
3. **Colours:** Brand colour and Heading colour, side by side, with native colour control plus readable hex value. Avoid a large palette catalogue or unrelated typography/layout options.

Footer actions: Save website as the primary action, with Open website and Copy website link as quiet secondary actions. Keep unsaved/saved/uploading/error feedback close to this form. A content preview can update immediately, while the public route displays only saved settings. Restore the last saved content when discarding edits, if a discard action is present.

The template is initially configured by JovaMedia. Explain that in one short supporting sentence if useful, without inventing setup completion for an unconfigured account. Example for an already configured page: 'Update the words, image and colours on your website.' Do not expose Storage, tenant IDs or database terminology to the owner.

## Image and empty-content handling

Use only an owner-uploaded genuine image. The hero image is decorative alongside the business headline, so empty alt text is acceptable without adding another settings field. If the product offers an optional image description later, apply it exactly as supplied.

Without an image, preserve the hero proportions with a quiet #ECEAE5 panel and the business initial in #78756F, large but restrained. This is a neutral fallback, not a stock-photo substitute. Do not show an upload instruction or broken-image symbol on the public page. If a stored image fails to load, use the same fallback.

Initial headline comes from the actual business name; About comes from its actual saved description. Do not invent expertise, treatment results, location or operating history. A blank About description can use a neutral invitation to choose a service, or omit the paragraph while retaining the section/action. Never display editor placeholder text publicly.

## Colour, behaviour and acceptance checks

- Derive button text as white or dark neutral according to actual contrast with the owner brand colour; require at least 4.5:1. The heading colour must meet 3:1 for the large headings against both public section backgrounds. If invalid, show a specific field message and retain the last valid saved value rather than silently changing the owner's chosen colour.
- Keyboard tabs have visible focus, selected-state semantics and associated panels. Image controls and colour fields have labels. Keep focus visible in all six owner themes.
- Both Book now actions must identify the same business and enter the existing service-selection route. The shared website link must open the public home page, not the admin editor.
- Verify upload, replace, remove, reload persistence, no-image fallback, broken-image fallback, maximum-length content, both CTAs and cross-account isolation.
- Screenshot proof: public desktop 1440px and mobile 390px with an uploaded image; the same two widths without an image; Website editor in Jova Blue and Midnight; an invalid-colour state. Check actual images for crop, wrapping, button contrast, no overflow and no inherited dark admin palette on the public page.

No broad redesign and no additional template choices are required for this release.
