# Owner workspace reference redesign

Local preview: http://127.0.0.1:4432/?preview=team#dashboard
Start with: node scripts/preview-jovabook-reference.mjs
Use preview=free, solo or team. Login and signup use #login and #signup. The preview binds localhost only, removes remote configuration, blocks remote API/frame/image connections and uses fictional records. Payment saving and subscription context are mocked locally. It cannot verify a real payment, sign-in or provider connection.

This branch builds on draft PR162. Keep it separate from production until owner review. No merge is authorised for this new design.

The reference styling is applied to the existing owner shell, calendar, bookings, customers, services, Staff, Insights, settings, integrations, subscription, deposits and Personalise pages. Login, signup, verification and business setup share the split auth layout. Existing actions, validation, persistence and backend checks are retained.

Staff management is Team only for the current offer. Free and Solo can open an anonymous, faded Staff layout with an inert background and an upgrade card. Free Insights and deposits use the same treatment. Solo and Team include all Insights, including comparisons. Historical legacy entitlements are retained.

Apply supabase/migrations/20261105230019_solo_insights_access.sql with the reviewed UI release. It patches only the two current-offer Insights flags and preserves existing staff limits, credit balances, SMS allowances and payment checks. It has not been applied to production in this design review.

Dashboard figures derive from actual saved booking statuses and service prices, with no invented growth percentages, deposits held, payout dates or no-shows prevented. Customer visit value is labelled as saved service prices, not cash received. Team includes one seat at GBP25/month, extra seats GBP6/month. Existing Stripe price IDs are unchanged.

The reference examples for Google/Apple two-way sync, Zoom, no-show charging, arbitrary cancellation rules, section reordering and fabricated invoice history are not implemented as working features. Existing supported integrations and website controls remain available. Customer portal and Operator UI are outside this redesign.

No new JavaScript, CSS, image or font requests were added. Presentation code is bundled into existing workspace.js and workspace-themes.css assets. No production regression, performance, load or crawl tests run. Browser verification uses the isolated local preview only.

Sidebar review: the existing pin preference and controller are preserved. Desktop hover/focus expands as an overlay; pinning reserves a 274px workspace margin. Collapsed icons are centred and labels stay hidden, expanded labels stay within the rail, and Settings uses its existing native popover and viewport positioning. Pin persistence, unpin collapse, keyboard expansion, ArrowDown opening and Escape focus restoration were exercised in the actual local browser. Preview viewport overrides are reset before handoff.

Final local review: desktop and phone layouts checked at 320, 390, 768, 1024 and 1440px. Restored pointer and keyboard pinning with reload persistence. Explicit rail height prevents the pin moving away on hover; expanded nav margins keep active rows inside the sidebar. The phone drawer now shows labels, dims the page and closes with Escape, its toggle or an outside click. No page overflow or console errors at final handoff. Viewport overrides reset. Existing customer history, local deposit save and paid comparison interactions were exercised; real authentication, checkout and provider delivery were not exercised in this isolated preview.
