# SSO Production Verification

## Non-destructive checklist

Use the confirmed authorized administrator account and existing staff accounts only. Do not create identities, grants, sessions, classes, scores or report data for testing.

### Authorization and entry

- [ ] Central WTS login succeeds.
- [ ] WTS Workspace loads from the real session.
- [ ] Results appears only when the real Results grant is active.
- [ ] Clicking Results navigates through the PKCE authorization endpoint.
- [ ] Result Portal opens without a second login screen.
- [ ] Direct Result URL starts the same central redirect.
- [ ] A user without a Results grant is denied.
- [ ] A suspended/inactive identity is denied.

### Protocol rejection tests

- [ ] Expired authorization code is rejected.
- [ ] Reused authorization code is rejected.
- [ ] Wrong PKCE verifier is rejected.
- [ ] Wrong state or nonce is rejected.
- [ ] Invalid redirect URI is rejected.
- [ ] Wrong client/audience is rejected.
- [ ] No password or reusable central session secret appears in a URL or browser storage.

### Session and data

- [ ] Result logout clears the Result cookie and returns to Workspace.
- [ ] Central logout invalidates the linked Result session.
- [ ] Revoked Results grant blocks protected Result access.
- [ ] Classes, subjects, scores, traits, remarks, fees and report cards remain readable for authorized accounts.
- [ ] Report-card generation and printing remain functional.
- [ ] Mobile and desktop navigation complete the same flow.
- [ ] No academic rows or identity/grant records change during testing.

## Evidence to record

Record only deployment IDs, commit SHAs, HTTP status/response codes, safe error codes, timestamps and screenshots without private records. Never record passwords, session secrets, hashes, private keys or confidential student/staff data.

If browser automation is unavailable, report that limitation separately and do not replace it with an unsupported claim of visual verification.
