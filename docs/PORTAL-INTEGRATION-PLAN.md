# WTS Portal Integration Plan

**Status:** Result Portal PKCE SSO implemented; Attendance and Notification remain outside this phase.

## Decision: one WTS Workspace

There is one authenticated destination: `/workspace`, presented as WTS Workspace. A user never chooses a Staff or Management workspace. The Workspace reads current active grants and displays only modules authorized for that person.

A module card is navigation only. Each specialist API and database authorization boundary revalidates the session, identity, grant and operation scope.

## Production applications

| Application | Repository | Production URL | Responsibility |
| --- | --- | --- | --- |
| WTS School Platform | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | WTS Workspace and central entry |
| Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | Identity, credentials, employment, grants and scopes |
| Result Portal | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Classes, scores, publication and report cards |

All three use Supabase project `wuftzyeajmsxdrbwaawl`. No sample people, users, grants, sessions, academic records or placeholder metrics are part of this integration.

## Module status

| Module | Visibility | Status |
| --- | --- | --- |
| My Profile | Staff self-service/profile permission | Operational identity link |
| Central Registry | Central Registry grant or Registry permission | Protected external service |
| Results | Active `results` grant | PKCE SSO operational integration |
| Attendance | Attendance grant/action permission | Untouched; outside this phase |
| Notifications | Notification grant/action permission | Untouched; outside this phase |
| Reports / Website / System Administration | Current real permissions | Existing protected or development surfaces |

## Result PKCE handoff

The Workspace Results link enters Result Portal at `portal_core.html?sso=1`. Result Portal creates a verifier, state and nonce and navigates to:

`https://wts-school-platform.vercel.app/api/sso/authorize`

The Platform endpoint accepts only:

- client `result_portal`;
- target scope `results`;
- response type `code`;
- PKCE method `S256`; and
- callback `https://wts-result-system.vercel.app/portal_core.html`.

It requires a live `staff_self_service` Workspace session and revalidates person status, staff registration, employment, identity account, active credential, Result profile mapping and the current Results grant.

The endpoint stores only hashes of the short-lived code, state and nonce. The code expires after five minutes and is consumed once. It never places passwords, central session secrets, hashes or service keys in the URL.

Result Portal posts the code and verifier to its own `/api/result-sso-token` server endpoint. The exchange revalidates the central session linkage and the current person, employment, identity, credential, Result grant and Result mapping before creating the Result session.

## Session and logout contract

- WTS Workspace uses its existing host-only `wts_school_workspace_session` cookie.
- Result Portal uses its own host-only HttpOnly `wts_result_session` cookie.
- The Result cookie is not accepted as proof of central authorization by itself.
- Each protected Result request continues through server-side Result authorization and scope validation.
- Result logout revokes its Result session and returns to Workspace.
- Workspace or Central Registry logout revokes linked Result sessions issued from that central session.
- Employment, account or grant changes fail closed at the Result server boundary.

## Exclusions

This phase does not alter Attendance or Notification source, sessions, devices, provider configuration or records. It does not alter students, scores, traits, remarks, fees, publishing records or report-card data.

Detailed controls and verification are in:

- `docs/WTS-PKCE-SSO-ARCHITECTURE.md`
- `docs/RESULT-SSO-INTEGRATION.md`
- `docs/SSO-SECURITY-CONTROLS.md`
- `docs/SSO-LOGOUT-AND-REVOCATION.md`
- `docs/SSO-ROLLBACK-PLAN.md`
- `docs/SSO-PRODUCTION-VERIFICATION.md`
