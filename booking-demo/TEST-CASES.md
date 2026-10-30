# JovaBook Essential: test cases

Automated: `journey_test.py` (sign-up to log in), `crud_test_repo.py` (owner pages), `audit.py` (access, rendering, every button, customer booking). Status: ✅ automated and passing, 👁 checked by eye, ⏳ cannot be tested yet.

## 1. Landing
- ✅ First page of the product is the landing page: features, £20/month, "Start your 3-day free trial".
- ✅ No commission wording anywhere. No owner links before sign-in.

## 2. Create your salon
- ✅ Booking address fills from the salon name and shows a spinner, then "available".
- ✅ Taken address shows a suggestion. Reserved words (admin, www…) and bad characters are refused.
- ✅ Email already used is flagged live. Same inbox in another form (`+tag`, Gmail dots) counts as the same email.
- ✅ Password needs 8 characters, a capital and a number; rules tick off as you type; Show/Hide works.
- ✅ Submitting re-checks everything, so duplicates can't slip through.
- ✅ Setup and trial pages can't be opened without creating a salon. Owner area stays locked.

## 3. Salon setup
- ✅ Address, phone, opening/closing time, open days, brand colour. "Save and continue" only, no skip.
- ✅ Closing before opening, no open days, missing address or short phone are refused.

## 4. Start free trial
- ✅ Shows Due today £0.00, the real trial end date and the first £20 date, no "after 3 days".
- ✅ Must tick the agreement. "Start free trial" opens the owner overview.
- ✅ Repeat trial (same device, phone or address as an earlier trial) is told it starts today at £20.00.
- ⏳ Real card check (Stripe card fingerprint) needs Stripe.

## 5. Log in, forgot and reset password
- ✅ Email and password. Wrong email or password gives the same message. 5 wrong tries pauses login for a minute.
- ✅ Forgot password: same answer whether or not the email exists; link works once and for 30 minutes.
- ✅ New password follows the same rules; old password stops working.
- ✅ Logging in lands on the overview; log out returns to the landing page.

## 6. Owner area (with a trial started)
- ✅ Overview: one booking link card (view and copy). No "View booking page" in the header, no sitemap link.
- ✅ Calendar day/week/month, appointments add/edit/cancel/delete, no double booking, customers, services, staff, salon settings.
- ✅ Stripe connect prompt, payments page, subscription page.
- ⏳ Email and SMS sending, real deposits and payouts.

## 7. Customer booking
- ✅ Service, time, details, review, confirmation, manage (reschedule, cancel). Customers never see owner links.

## 8. Not built yet
- Team preview, Salon website, AI booking chat (shown as "Not connected" on the sitemap).
