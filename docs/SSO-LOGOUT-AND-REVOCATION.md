# SSO Logout and Revocation

## Result logout

Result logout calls the existing server revocation function with the Result session, records the revocation, clears `wts_result_session`, and sends the user to the WTS Workspace. A stale cookie cannot authorize a protected route.

## WTS Workspace logout

Workspace logout revokes the current `staff_self_service` session. The session revocation function finds Result sessions issued from that source session and revokes them with `LINKED_WTS_SESSION_REVOKED`. The Result cookie is not treated as independent authorization after central logout.

## Central Registry logout

Central Registry uses the same identity-session revocation boundary. A central-registry session revocation also invalidates Result sessions linked to that central session when present.

## Grant, employment and account changes

Every protected Result request calls the existing server-side session validation and Result authorization path. It rechecks:

- active person;
- active staff registration and employment;
- active identity account and credential;
- current Results grant and validity dates;
- Result profile mapping; and
- Result permission and class/subject scope for the requested operation.

A grant revocation, staff suspension or employment termination therefore blocks access at the server boundary even if a module card or browser tab remains open.

## Expiry

Authorization codes expire after five minutes. Result sessions expire after eight hours and are checked against the database on every protected request. Revoked or expired sessions are cleared by the Result API response.

No logout or revocation path touches academic records.
