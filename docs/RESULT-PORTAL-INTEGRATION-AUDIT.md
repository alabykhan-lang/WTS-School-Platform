# Result Portal Integration Audit

**Audit type:** focused read-only architecture and transition audit

**Repository:** `alabykhan-lang/wts-result-system`

**Production:** `https://wts-result-system.vercel.app`

**Result Portal source changes in this integration:** none

## Decision

The Result Portal remains the operational Results module. WTS Workspace checks the real Central Registry Results grant before showing its link, but the legacy application is not embedded and no credential is passed in a URL.

One-login Results access is **not complete**. The existing Result Portal must be hardened before it can safely consume a WTS Workspace session.

## Exact transitional behavior

| Area | Confirmed current behavior |
| --- | --- |
| Application | Static HTML, CSS and browser JavaScript on Vercel; no server application layer |
| Login | Separate email/password form backed by `user_profiles` and invite-code registration |
| Credential storage | Legacy browser-local key `wts_pw_<email>` stores a browser-encoded password value; this is not the Central Registry credential and must not be reused for WTS SSO |
| Session | Browser-local `wts_session`; logout clears local portal state only |
| Roles | Legacy UI distinguishes `teacher` and `admin` |
| Data access | Browser calls the Supabase Data API directly with a publishable key |
| Result workflows | Existing class selection, score entry, publication, broadsheets, analytics and printable report cards remain in place |
| Result data | No student scores, result records or report-card generation code was changed by this phase |

Current flow:

1. The staff member signs in at `/portal/sign-in` using the Central Registry credential.
2. WTS Workspace reads the current real grants and shows Results only to an authorised identity.
3. The existing Result Portal opens at its own production URL.
4. The Result Portal may request its separate legacy credential and creates its own browser-local session.

This is an explicit second-login limitation, not a silent credential assumption.

## Security blockers

The following findings remain unresolved and are intentionally not hidden by the new workspace card:

1. The core legacy Result tables (`students`, `scores`, `traits`, `fees`, `remarks`, `settings`, `published_subjects`, `user_profiles` and `invite_codes`) currently have RLS disabled.
2. The browser application performs direct Data API reads and writes.
3. Legacy browser-local role/session state does not prove Central Registry class, subject or action authorisation.
4. Legacy logout does not revoke a WTS Workspace session or a shared identity session.
5. Result routes are protected only by the legacy application’s own browser flow, not by the unified WTS session.

RLS was not enabled in this integration because enabling it before replacing the direct browser calls could interrupt live score entry and report-card generation. This is a critical risk for the dedicated Results hardening release.

## Required one-login migration

The safe sequence is:

1. Replace the legacy browser login/session with a server-verified Central Registry session or an approved shared Supabase Auth session.
2. Replace direct browser CRUD with protected Result API/RPC operations that validate the active grant, exact action and class/subject scope on every operation.
3. Enable RLS on the legacy tables in the same compatibility release, with non-destructive regression tests and rollback.
4. Pilot a secure opaque handoff or shared session for an explicitly authorised Results role. Never pass passwords or session secrets in query strings.
5. Verify inactive-account denial, grant revocation, class/subject denial, logout, score save, publication and report-card generation without modifying academic records for testing.
6. Replace the temporary external link with a protected Result route inside WTS Workspace.

Until this sequence is complete, the working Result Portal is preserved exactly as a separately protected specialist system.
