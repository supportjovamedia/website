# JovaBook studio revision

This revision uses the user's latest warm cream and dark rounded-rail screenshots as the visual source. They supersede the earlier green Alignly treatment. Calendar bookings retain the stronger pink, lilac, aqua and peach palette requested separately.

## Requested changes

- [x] Populate the built-in browser demo with fictional clients, four staff, eight services, bookings across past/current/future dates and mixed booking activity.
- [x] Keep sample generation isolated from real accounts and Supabase; preserve local edits and seed once. Clearly identify the Standard sample workspace.
- [x] Replace curved notification hover rows and the centered popup with a warm, anchored notification dropdown. Read state, real event times, staff details, outside click and Escape work. No unsupported Offer this slot action is copied.
- [x] Use stronger service colours consistently in day, week and month views. Dark readable text and genuine dates/times stay intact.
- [x] Follow the latest calendar composition: three true period metrics, one diary, team multi-select, Day/Week/Month and existing owner multiple-session workflow.
- [x] Fix the demo booking URL in a fresh browser, including the previously shared legacy link. Other businesses retain their public lookup and tenant isolation.
- [x] Make staff three-dot actions float beside the trigger without stretching rows or clipping. Remove View calendar.
- [x] Add Details, Services and Working hours tabs to staff editing. Preserve drafts between tabs; validate and save a complete change together.
- [x] Show red Unsaved changes state in an aligned footer beside Save, consistently across staff and owner settings/editors. Staff close/Discard/Keep editing protects drafts.
- [x] Change visible appointment wording to booking wording and generalise business-facing copy. Keep old owner appointment URLs working as aliases.
- [x] Put category navigation with counts beside grouped services; keep all category/service actions wired to existing writes.
- [x] Apply the latest design to Bookings, Staff, Services, Settings, Personalise, Insights and subscription surfaces.
- [x] Show an actual daily booking chart and ranked service bars in Insights, using the selected dates and team filter. Do not confuse scheduled value with collected cash.
- [x] Use the supplied Settings composition with working business details, booking rules, booking link and schedule controls. Do not add nonfunctional controls from reference images.

## Existing product behaviour retained

Independent daily business/staff schedules, availability intersections, booking buffers, staff multi-select, owner-only multiple sessions, reporting, activity, public branding and Essential/Standard/Premium staff limits of 1/5/10. Subscription requests keep their existing billing boundaries. This UI revision adds no database migration, payment provider, SMS delivery or AI service.

## Validation

75 unit checks; integrated dashboard/calendar period and staff-selection checks; seven staff/settings save scenarios; fresh public-demo and real-namespace isolation checks; native notification, menu and category/service CRUD checks. Desktop/tablet/mobile visual checks and exact final counts are reported with the review screenshots. Development uses a feature branch and review PR. This revision has not been merged or deployed.
