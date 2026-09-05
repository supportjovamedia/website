# JovaMedia V4

This version is intentionally mobile-first and visually richer than V3.

## Core changes

- New image-led hero with layered campaign/mobile creative rather than text-only composition.
- Mobile hero is independently recomposed at <=768px and again <=430px; imagery remains visible.
- Added visual showcase, full-bleed editorial feature, capability index, process and conversion close.
- Final JovaMedia palette retained: #FDFFFC #235789 #C1292E #F1D302 #020100.
- Final supplied logo/favicon retained.
- Existing Next.js routes, header/footer, service data and contact infrastructure retained.
- Motion is subtle and respects reduced-motion preferences.

## Build note

The source progressed into Next.js compilation, but this isolated environment cannot download the Linux SWC binary from npmjs.org. Run `npm install` then `npm run dev` or `npm run build` locally.
