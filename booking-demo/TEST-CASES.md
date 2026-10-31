# Current JovaBook verification

Canonical automated checks are documented in README.md. Earlier prototype reports do not certify this revision or live provider delivery.

| Check | Command or evidence | Boundary |
| --- | --- | --- |
| JavaScript syntax | npm run check | All loaded application modules |
| Account, hours, rescheduling, owner tools and notifications | npm run test:owner |31 Node tests |
| Legacy and combined database foundations | npm run test:database |2 local PostgreSQL-engine tests, many assertion cases |
| Integrated desktop/mobile owner and customer journeys | npm run test:owner:browser |16 scenarios, real config loaded, all external calls mocked or blocked |
| Current hosted schema | Supabase SQL Editor catalog probe |8 tables,22 functions,52 constraints, policies/triggers/RLS compared |
| Hosted migration compatibility | Transaction rehearsal with explicit ROLLBACK |Signatures,grants,plan protection,schedule rules and unchanged record hashes checked |

The browser scenarios include stale demo repair, seven-link navigation, real editor saves, per-day weekend specialists, several selected calendar staff, 1/5/10 limits, Insights arithmetic, atomic multiple sessions, ordinary single booking/reschedule/cancel, workspace/public brand separation, connected settings persistence, capability guards, rejected writes, notifications/read state, incremental polling with a preserved form, and 390/768/1440 layouts.

Live payment processing, actual email/SMS delivery, staff-user permissions and AI are not certified or activated. After explicit release approval, apply the migration permanently and verify hosted owner isolation, authenticated parallel slot contention and the production customer journey using designated fictional records.
