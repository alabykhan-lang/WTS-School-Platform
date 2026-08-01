# Result Portal Integration Audit

**Audit type:** focused read-only architecture and database dependency audit
**Repository:** `alabykhan-lang/wts-result-system` at `6c5ee7f4451c719a265a81b0a6756d7726c1b289`
**Production:** `https://wts-result-system.vercel.app`
**Result Portal changes in this phase:** none

## Decision

The Result Portal remains the first operational specialist module, but it cannot yet safely consume the WTS Workspace session. The WTS School Platform therefore presents it only as a temporary protected external link after an active Central Registry staff identity has a current Results grant. It is never embedded and no credential is passed in a URL.

One-login Result access is **not complete**. Its safe migration depends on replacing the legacy browser authentication and direct table-access model.

## Actual implementation found

| Area | Confirmed finding |
| --- | --- |
| Framework | Static HTML, CSS and browser JavaScript on Vercel; no server application layer. |
| Login | Separate email/password form with invite-code registration. |
| Session | Browser local storage (`wts_session`) restores a browser-held session. |
| Password handling | Browser-local password state is used by the legacy flow. It must not be reused for shared access. |
| Roles | UI differentiates only `teacher` and `admin`. |
| Main workflows | Class selection, student roster, subject score entry, CA/exam data, publication, broadsheets, analytics and printable report cards. |
| Current result identifiers | Scores use student UUID, class key, subject index and term. |
| Current session/term | Browser and remote settings with session-aware class keys. |
| Logout | Clears local browser portal state only; it is not cross-system logout. |
| Shared database | Uses `wuftzyeajmsxdrbwaawl`. |

## Confirmed Central Registry linkage

Central Registry already holds the real staff mapping needed for a controlled future integration:

- active staff profile ↔ Central person ↔ Central identity account ↔ Central credential;
- legacy Result Portal profile linkage for every active registered staff identity;
- existing `results` grants retained without alteration;
- real `result_subject_catalog` with 216 configured subject entries across 19 real result classes.

This phase adds no sample staff, user, role, class, subject, score or assignment. It adds the following Central Registry contracts without touching Result data:

- explicit role assignments, module/action grants, effective/expiry dates and revocation information;
- class/subject scopes backed by `result_subject_catalog`;
- audit history;
- guarded staff workspace read API.

Roles remain descriptive. They do not automatically grant any Result action.

## Security blockers

1. Core legacy Result tables (`students`, `scores`, `traits`, `fees`, `remarks`, `settings` and `published_subjects`) currently have RLS disabled.
2. The Result browser application calls the Data API directly using the public key.
3. Browser-local role/session handling does not prove server-side class/subject authorisation.
4. Existing Result Portal routes are one browser application rather than independently protected server routes.
5. Current legacy logout cannot revoke a unified session.

RLS was deliberately not enabled in this release: enabling it before a protected Result API replacement would interrupt live score entry and report-card generation. This is a critical risk that must be resolved in the dedicated Results hardening release.

## Required data contract

| Contract | Required fields | Required checks |
| --- | --- | --- |
| Staff identity | central person ID, staff ID, active employment and account state | Server validates current session and revocation. |
| Result grant | module and action permissions | Server validates every write, review, approval, generation and publish operation. |
| Teaching scope | person ID, class key, subject index, effective/expiry dates | Server permits only an active matching scope. |
| Student reference | stable student UUID and current class identifier | Results consumes a minimum read-only Registry projection; it never creates a duplicate identity. |
| Result workflow | session, term, class, subject, components, submission/release state | Validate ranges, ownership, review and publication server-side. |

## Role mapping after hardening

| WTS responsibility | Result capability after server-side adoption |
| --- | --- |
| Teacher | Only explicitly assigned class/subject entry, edit and submission. |
| Class Teacher | Teacher scope plus approved class follow-up; no unrestricted score editing. |
| Results Administrator | Explicit review, approval, report-card and publishing actions. |
| Principal / Vice Principal | Delegated review/release actions only. |
| Proprietor | Explicit executive reports and approved oversight only. |
| Super Administrator | Integrations and role control; not routine score editing by default. |

## Migration sequence

1. Keep Central Registry access control as the identity/assignment authority; assign only confirmed real staff permissions and scopes.
2. Replace Result Portal browser-local login/session with a server-verified Central Registry session or a planned shared Supabase Auth session.
3. Replace direct browser CRUD with protected Result RPC/API operations that validate the exact action and scope.
4. Enable RLS on legacy result tables in the same release, only after the protected compatibility paths and rollback are tested.
5. Pilot one shared-session or one-time opaque handoff for an explicitly authorised Result role. Never pass credentials in URL parameters.
6. Verify denied direct access, inactive/suspended account denial, grant revocation, class/subject denial, logout, score save, publication and report-card generation without altering academic records merely to test.
7. Replace the temporary external link with authorised Result routes inside WTS Workspace.
