# Result Portal SSO Integration

## Entry behavior

A direct visit to Result Portal first checks the host-only `wts_result_session` cookie through `/api/result-auth`.

- A valid session opens the portal.
- A missing, expired, revoked or no-longer-authorized session starts PKCE through the WTS authorization endpoint.
- The normal Result page does not display a password form, Legacy Login or Register.
- An account without an active Results grant is rejected at the central authorization boundary and again at the Result exchange/data boundaries.

The Results module in WTS Workspace is still permission-driven. A hidden or visible card is not the authorization boundary.

## Result endpoints

- `/api/result-sso-token`: POST-only code exchange. It accepts the authorization-code grant, exact client and callback, code verifier, state and nonce. It sets the Result cookie and returns only display identity, Result staff mapping, role and permissions.
- `/api/result-auth`: validates the current Result session and performs Result logout. Direct Result password login is rejected with `SSO_REQUIRED`; password changes belong to central WTS credential management.
- `/api/result-data`: remains the protected server API for Result reads and writes.

The exchange response does not return the Result session secret to browser JavaScript. The server writes it only to the HttpOnly cookie.

## Safe callback handling

The callback compares returned state and nonce with the transient values created before navigation. It clears those transient values after success or rejection, removes the authorization query from browser history after success, and never writes authentication authority to localStorage.

## Session behavior

The Result session contains a unique session ID and secret-backed cookie, created and expiry times, last-seen state, revocation state, central person and identity account, Result profile mapping and the necessary permission context. Existing protected Result functions continue to revalidate current identity, employment, account, grant and scope.

## Emergency access

No public emergency password route is exposed by this integration. Any future emergency mechanism must be a separate, non-public, audited, super-administrator-only control with a defined removal date.
