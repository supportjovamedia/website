# Minimal trial history

`operator_trial_history()` accepts an empty argument object. Only the currently authorised, email-verified JovaMedia operator may call it. Anonymous users, business owners, customers and revoked or unverified operators are denied.

The response is `{ok:true,history:[{reference,trial_used_at,deleted,deleted_at}],total,has_more}`. `reference` is an opaque `trial_` digest derived from the existing private trial fingerprint. The newest 200 markers are returned. No email search is supported. No email, original fingerprint, pepper, business identifier, name, settings, customer record or provider reference is returned.

The existing private `trial_ledger` remains the sole anti-repeat source. Its salted normalised-email fingerprint and first trial-use timestamp already survive business and Auth deletion. Existing normalisation treats plus aliases as the same address and folds Gmail dots and `googlemail.com` into `gmail.com`. This migration does not change that policy or the existing trial checks.

One nullable timestamp is added to that ledger. Before a business or its owning Auth account is deleted, a private trigger records the first observed business deletion for the matching current Auth email. It does not retain the deleted business. The marker survives later registration, which still cannot receive another trial for the same normalised address. A deletion that rolls back also rolls back the timestamp.

`deleted:false` means **Deletion not recorded**. It does not prove a business still exists. Older purge audits whose Auth email has already disappeared cannot safely be linked to the salted ledger. Changing an Auth email also prevents claiming that the original address's marker belongs to a later deletion. Neither case is guessed or backfilled with plaintext identity data.

This migration adds no deletion schedule, activation change or purge action. Existing lifecycle/provider checks and asset-cleanup audit records are unchanged. Validation uses the full isolated schema and fictional data only.
