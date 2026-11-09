# Operator activity

The Overview's People & activity section groups authenticated reports by Auth account ID. The display name comes from the account's current owned business, then its profile name or email. A private operator RPC joins these labels from the database; clients cannot submit another account's name, email or account ID.

Before sign-in, reports carry a random tab-session UUID stored in sessionStorage. Refreshing the tab keeps that label. Signing out or changing accounts rotates it. This is not a fingerprint or a count of unique people. Earlier anonymous entries are not retrospectively assigned to an account, including when email verification happens on another device. Legacy reports without either ID remain explicitly unidentified.

The summary counts distinct authenticated account IDs, distinct browser-session UUIDs and error reports across the retained 30-day window. These counts overlap and must not be added together as people. The searchable timelines contain the latest 100 reports. A last activity timestamp is the latest recorded event, not a live-presence check.

Recorded events are fixed classifications for signup views, successful submitted setup stages, authenticated workspace page views and errors. Passwords, form content, raw exceptions, full URLs, IP addresses, user agents and keystrokes are not collected. The signup funnel continues to use server Auth/business records as its source of truth, rather than browser reports.

There is no polling, retry queue, external analytics script or Vercel logging endpoint. Reports and Operator reads use the existing Supabase API directly. Loading Operator or the booking application still uses the hosting CDN. Reports have per-page, per-session, per-account and shared database limits, with the existing 30-day retention and purge job.

## Release order

Apply `booking-demo/supabase/migrations/20261109132553_owner_activity_identities.sql` before deploying the browser files. It adds a new bounded writer and updates the existing operator reader, preserving the old writer for cached clients. Direct table privileges remain revoked and the reader retains the existing operator guard. No production data or account entitlement is changed by this feature.

## Validation

Run the focused diagnostic, identity, Operator signup, Google auth and verification tests. They cover operator-only reads, Auth-derived identity, anonymous separation, session rotation, fixed payloads, privacy, escaping, full-window counts and signup compatibility. Preview fixtures use fictional records with external requests blocked; they do not create real customer activity.
