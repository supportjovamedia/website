# Owner experience review

This revision follows the user's latest spoken feedback and the supplied scheduling walkthrough screens. It replaces the earlier three-step setup navigation with direct sections and keeps additional controls out of the main booking flow.

| Request | Result | Evidence |
| --- | --- | --- |
| Services after Clients, Staff visible, Personalise and Insights | Seven direct navigation links. Working hours is under the Settings dropdown. | Integrated browser checks |
| Different hours Monday to Sunday | Independent daily business hours and closed days. | Core, SQL and browser tests |
| Weekend or part-time specialists | Staff inherit business hours or use an individual daily schedule; availability intersects both. | Weekend-only service test |
| Staff limits 1 / 5 / 10 | Client guard and protected server plan with roster limits. Existing records preserved. | Core, SQL and browser tests |
| Several calendar staff at once | Checkbox selection across day/week/month, including a clear empty selection. | Integrated browser checks |
| Multiple sessions created by the owner | 2 to 12 dates, availability preview, explicit confirmation and one atomic server request. | Unit, SQL and browser tests |
| Customers still book one appointment | Existing guest booking, reschedule and cancellation retained. | Integrated browser checks |
| Insights/reporting | Real appointment metrics, filters, top services and a readable monthly activity chart. | Arithmetic and browser tests |
| More meaningful workspace colours | Accent header, sidebar tint, selected navigation and controls; public branding remains separate. | Desktop/mobile screenshots |
| Clear booking link controls | One header share action plus Personalise link/preview/copy controls. | Integrated browser checks |
| In-app notifications | Actual new-booking, cancellation and reschedule events, unread bell, activity page and per-owner read state. | Nine unit tests and browser scenarios |
| Notice new events while working | Read-only checks every 30 seconds activity polling, draft-safe bell updates, no demo backend polling. | Mocked connected browser proof |
| No phantom saved records | Database rejection restores authoritative records, preserves a local recovery draft, and never shows Saved. | Mocked 400 booking/staff refusals |
| Preserve concurrent backend updates | Current main merged; hosted catalog inspected; live null-phone guard retained. | Schema audit and hosted rehearsal |

## Validation and release boundary

The integrated browser suite passed 16 scenarios with the served account configuration enabled, explicit backend mocks and no unexpected external requests. Thirty-one Node tests cover account handling, scheduling, Insights, appointment series, rescheduling and notifications. Two local PostgreSQL-engine tests cover both the legacy migration foundation and the new combined setup. The actual Supabase migration rehearsal passed and rolled back, with application records unchanged.

Released with explicit approval through PR86 on 31 October 2026. The permanent migration committed, merge `9987551ab0dc3758ae918a3f594e0e57432a48d3` deployed to https://book.jovamedia.com/, and all 15 deployed asset hashes matched. Twelve real API checks and eight real browser scenarios passed, including hosted account isolation, atomic series rollback, simultaneous public-slot contention with exactly one winner, and customer booking/rescheduling/cancellation. The designated fictional QA user and salon were removed afterwards. The later design and subscription-request revision is separate, with its own migration and approval boundary documented in `DESIGN-SUBSCRIPTIONS.md`.

Payment processing, real email/SMS delivery, staff sign-ins/permissions and the Premium AI assistant remain separate planned work. No packages, coupons, invoices, marketplace or visual sci-fi effects were added.
