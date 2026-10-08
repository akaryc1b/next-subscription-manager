# Mobile account editing and subscription delivery

## User flow

Global search -> selected account -> edit identity, expiry, configuration grants and quota in one form -> Save -> stay on the same account -> Copy subscription / Shadowrocket link. Closing the panel preserves the search query. The section shortcuts scroll within one form; they do not gate editing or create separate save operations.

The shared sticky drawer footer keeps subscription delivery available after saving. Creation supports a custom quota before its first submit and exposes delivery only after all requested writes finish. Copy uses the existing click-task clipboard helper and does not fetch subscription content.

## Save semantics

No API, authentication, authorization, database schema, subscription-token or access-count semantics are changed. A single user action orchestrates the existing user POST/PUT and subscription PATCH. This is not a server transaction across both endpoints.

Both date and quota are validated before the first write. Only changed account fields are sent. A successful first write checkpoints the returned account data and clears its password. A failed quota write preserves the draft and identifies the partial save; retry only writes the remaining quota. A successful create retains its ID before attempting quota, avoiding a duplicate POST on retry. Uncertain network responses still require server-side reconciliation; no new idempotency contract is claimed.

The existing unsaved-change guard remains active for all fields and while a request is pending. Destructive confirmations remain separate. Only deletion or an explicit close exits the account panel; saving and token rotation do not.

## Dates

Native date input, optional exact time, +1/+3/+6 months, +1 year and explicit unlimited validity. New dates use local 23:59:59; existing exact times are preserved. Renewal extends a future draft expiry, otherwise starts today. Month-end renewal clamps to the last day of the target month. API values remain ISO instants; rollover dates and nonexistent local DST times are rejected.

## Acceptance

`tests/account-expiry.test.ts` covers date/renewal and quota boundaries. `tests/browser/z-mobile-account-flow.e2e.mjs` covers one-save delivery, native clipboard acceptance, retained search, partial-save retry, duplicate-submit exclusion, validation and 320/390/430px layouts in Chromium and WebKit. Existing quota acceptance now asserts that the panel remains open.

Cloud CI and browser results must be checked for the exact PR head before release. Desktop WebKit is not a physical iPhone or native iOS picker acceptance test. No production rollout is implied by this change.
