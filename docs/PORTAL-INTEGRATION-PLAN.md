# WTS Portal Integration Plan

**Status:** production correction in progress

## Decision: one WTS Workspace

There is one authenticated destination: `/workspace`, presented as **WTS Workspace**. A user never chooses a Staff or Management workspace. After Central Registry verifies the real staff identity and active session, the workspace reads the current active grants and displays only the modules authorised for that person.

The old `/workspace/staff` and `/workspace/management` paths are compatibility routes that redirect to `/workspace`. They are not alternate experiences, access paths or permission boundaries.

The distinction is:

- **Workspace:** the single authenticated shell and navigation.
- **Module:** a connected school service shown only when its current grant or permission permits it.
- **Action and scope:** a second server-side decision for protected operations, including Results class/subject scope and identity administration.

The browser hiding a card is never the security boundary. The workspace read RPC, server API routes and specialist systems must verify the session and permission again.

## Current production applications

| Application | Repository | Production URL | Current responsibility |
| --- | --- | --- | --- |
| WTS School Platform | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | Public website, gateway and unified WTS Workspace |
| Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | People, staff identity, credentials and grants |
| Result Portal | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Existing scores, publication and report-card generation |

All three use the existing Supabase project `wuftzyeajmsxdrbwaawl`. No sample people, users, grants, classes, subjects, scores or placeholder dashboard records are part of this integration.

## Unified module directory

| Workspace module | Visibility decision | Current status |
| --- | --- | --- |
| Home / Overview | Authenticated workspace read | Operational shell; no invented figures or tasks |
| My Profile | Staff self-service grant plus profile permission | Operational identity link; profile editing remains in the protected Registry service |
| Central Registry | `central_registry` grant or Registry permission | Under continued development in the unified flow |
| Results | Active `results` grant | Operational existing Result Portal; protected WTS Staff Login is the current entry point |
| Attendance | Attendance grant or action permission | In development; no fake events or figures |
| Notifications | Notifications grant or action permission | In development; no fake messages or delivery data |
| Reports | Reporting permission | In development until an approved reporting service is connected |
| Public Website Management | Website-content permission | In development until a real protected publishing interface exists |
| System Administration | `access.manage` or an explicit system-administration permission | Protected identity/access controls only |

The workspace response filters grants by active status and validity dates. Result class and subject scopes are returned only when an active Results grant exists. Management authority is represented by grants such as `access.manage`; it is not a separate workspace.

## Current credential system

The real Central Registry credential path is:

`school_people` → `staff_attendance_profiles` → `school_identity_accounts` → `school_identity_credentials`

The platform signs in through the same-origin `/api/workspace-session` route. The server calls `school_identity_portal_login` and issues a short-lived HttpOnly cookie only after it verifies the active identity, employment, account, credential and WTS grant. The browser receives no client code, client secret, password hash or service-role key.

The Central Registry credential is the WTS credential used by the protected workspace and Result Portal entry points. First-time and reset credentials return a compulsory-password-change state; the user must choose a compliant password before continuing to `/workspace`.

The sign-in page uses generic incorrect-credential handling for unknown public emails. It also gives clear recovery guidance for inactive accounts, temporary locks, missing workspace grants, compulsory password change and expired sessions without publishing account-existence details.

## Password activation and management recovery

The Central Registry migration `20260801160000_secure_identity_recovery_and_unified_workspace` adds a guarded temporary-credential flow over the existing identity tables. It does not create a temporary identity table or recreate the confirmed account.

An authorised administrator with an active Central Registry session and `access.manage` permission uses the System Administration module. The platform server route, not the browser RPC, calls the privileged reset function with the server-only Supabase service key. The reset:

1. selects the existing active staff identity and credential;
2. issues a one-time temporary credential in memory;
3. sets `must_change_password`, clears failed attempts and clears an expired lock;
4. preserves the person ID, staff identity, grants and history;
5. invalidates existing opaque sessions for the target identity;
6. records actor, timestamp, reason, request ID and before/after status in `school_registry_audit`;
7. returns the temporary credential once to the authorised management browser without writing it to audit data, logs or repository files.

The former public execution path for the identity-admin write RPC is revoked. The reset RPC is callable only by the server-side service-role route, and the server route requires same-origin requests plus a live Central Registry session. No password hash is returned.

## One-time bootstrap recovery

The bootstrap function is hard-coded to the one confirmed existing super-admin identity and refuses every other target. It does not create another account or alter grants.

The authorised owner’s safe method is:

1. Set the server-only Supabase service key and a newly generated one-time `WTS_IDENTITY_BOOTSTRAP_SECRET` in the WTS School Platform production environment through the Vercel project settings. Never put either value in GitHub, source code, browser storage or documentation.
2. From the owner’s private device, send a same-origin request to `/api/identity/bootstrap-recovery` with the bootstrap secret in the request header and an operational reason in the JSON body. The endpoint accepts only the confirmed account and returns the temporary credential once.
3. Deliver or enter that credential through an approved private channel. Sign in with the existing WTS staff number or registered email, complete the compulsory password change, and verify workspace access.
4. Remove the bootstrap environment secret immediately after successful recovery. The account metadata records issuance and completion and the database refuses a second bootstrap issuance.

The temporary credential is never included in this repository, deployment documentation, GitHub commit, Vercel log statement or audit metadata.

## Result transition

The Results module is shown only for an active Results grant. The workspace opens the existing Result Portal separately; it does not embed the portal or pass credentials in a URL. The Result Portal uses WTS Staff Login and its own protected server session until the later PKCE phase.

PKCE SSO remains gated on real-account login, revocation, assignment, end-to-end workflow and production deployment verification.
