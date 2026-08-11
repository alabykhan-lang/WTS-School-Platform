# WTS PKCE SSO Architecture

**Status:** Results integration is operational; Attendance uses the same central PKCE contract. Current origins and exact callback/logout values are generated from `data/portal-config.ts`.

## Scope

This integration connects the existing WTS Workspace to the existing Results and Attendance services. Central Registry remains the authority for person identity, employment, identity accounts, credentials, grants and permission scope. Notification remains status-only until its secure handoff is implemented.

The browser never receives a central password, client secret, service-role key, password hash or reusable central session secret.

## Trust boundaries

| Boundary | Responsibility |
| --- | --- |
| WTS Workspace | Holds the host-only WTS session and starts the Result authorization request. |
| Platform authorization endpoint | Validates the WTS session, active identity, active employment, active account, active Results grant, PKCE challenge and exact callback URI. |
| Supabase identity functions | Stores only a hash of the short-lived authorization code and binds it to the identity, audience, callback, source session and PKCE challenge. |
| Result Portal exchange endpoint | Sends the code, verifier, state and nonce to Supabase server-side and receives the minimum Result session material required to set its cookie. |
| Result Portal | Uses its own host-only Result session. Every protected data route revalidates server-side identity, employment, grant and Result scope. |

## Fixed protocol values

- Client ID: `result_portal`
- Target audience: `results`
- Code response type: `code`
- PKCE method: `S256`
- Current Results callback: `https://wts-result-system.vercel.app/portal_core.html`
- Current Attendance callback: `https://wts-attendance-system.vercel.app/`
- Current authorization endpoint: `https://wts-school-platform.vercel.app/api/sso/authorize`
- Authorization-code lifetime: five minutes
- Result session lifetime: eight hours, subject to server revalidation and revocation

Deployment URLs and wildcard callback URLs are not accepted.

## Flow

1. Results or Attendance is rendered only from the current active grant in the WTS Workspace.
2. Result Portal creates a random verifier, state and nonce using browser cryptography. Only transient flow values are held in `sessionStorage`; they are not authentication authority.
3. The browser navigates to the Platform authorization endpoint.
4. The endpoint validates the WTS Workspace session and active Results authorization, then stores only hashes of the code, state and nonce. It redirects with the short-lived single-use code.
5. Result Portal validates returned state and nonce locally, then posts the code and verifier to its own server endpoint.
6. The Result server exchanges the code through the Supabase RPC, which verifies exact audience, callback, expiry, unused status, state, nonce, PKCE and current identity/grant state.
7. The Result server sets `wts_result_session` as an HttpOnly, Secure, SameSite=Lax, host-only cookie.
8. Result protected APIs continue to validate that session and current authorization on every request.

Passwords and reusable session secrets never appear in the authorization URL.

## Data model

The additive `school_sso_authorization_codes` table stores the code hash, exact client and callback, person and identity account, source WTS session, PKCE challenge, state/nonce hashes, creation time, expiry and consumption marker. It has RLS enabled and no direct public table privileges.

Database functions:

- `school_sso_authorization_code_issue`
- `school_sso_authorization_code_exchange`
- `school_identity_session_revoke` with linked Result-session revocation

The migration is in the Central Registry repository because that repository owns the identity schema.
