# Result Portal Integration Audit

**Audit type:** focused, read-only technical review  
**Audited source:** `alabykhan-lang/wts-result-system` at `6c5ee7f4451c719a265a81b0a6756d7726c1b289`  
**Confirmed production deployment:** `https://wts-result-system.vercel.app` (Vercel production deployment reported `READY`)  
**Scope:** architecture, route behaviour, authentication pattern, workflows, data references and integration readiness. No portal file, account, database record, credential or configuration was modified.

## Executive finding

The Result Portal is a genuine operational specialist system: it supports class selection, student rosters, score entry, drafts, subject publication, broadsheets, analytics and printable report cards. It is the correct **first specialist integration target** for the Staff and Management Workspace.

However, the reviewed source is a static browser application whose login/session and role handling are not yet sufficient for a shared single-sign-on experience. The first integration should therefore be a **secure external link** from the unified workspace after an explicit protected-route and access-control hardening plan—not a direct database/API integration or embedded frame.

## Confirmed implementation

| Area | Confirmed finding |
| --- | --- |
| Repository and framework | `alabykhan-lang/wts-result-system`; static HTML, CSS and browser JavaScript deployed through Vercel. It has no application framework package manifest. |
| Root entry | `/` redirects to `portal_core.html`. Vercel’s fallback routing also directs unknown paths to the root entry. |
| Database usage | The browser code makes direct REST/RPC calls to the shared WTS Supabase project. The audit does not publish keys, table contents or credentials. |
| Current user types | Source logic distinguishes `admin` and `teacher`. Actual authorised users, names and counts were intentionally not inspected or documented. |
| Logout | A Sign Out control clears the browser-held portal session and returns to the login screen. It is not a cross-system logout. |
| Session and term | The portal has configurable session/term settings, browser caching and remote settings refresh. Class keys are session-aware. |
| Result release | Per-subject publication state is used to control whether scores appear in broadsheets and report-card calculations. |

## Current workflow audit

### Teacher-facing workflow

The current interface allows a signed-in teacher to:

1. select a class;
2. view a student roster;
3. open a subject score sheet;
4. enter CA1, CA2, CA3 and examination scores;
5. save a draft; and
6. publish or unpublish a subject result.

The source review found role-based UI differences between `teacher` and `admin`, but did **not** find a verified server-side class/subject assignment contract limiting a teacher to only their assigned classes and subjects. This must be addressed before the Staff Workspace presents live score-entry access.

### Administrator workflow

The administrator-facing interface includes results administration features such as:

- student and class record management;
- school/session/term settings;
- user and invite-code management;
- class progress and analytics;
- broadsheet production;
- individual and bulk report-card generation; and
- subject publication controls.

The portal also contains an OCR-assisted score-entry feature. Any provider credentials and configuration related to it must be moved out of browser-accessible application state before a shared workspace depends on it.

### Result processing and report cards

- Scores are stored and loaded by student, class, term and subject index.
- The portal computes totals, grades, class averages and positions.
- Broadsheets, analytics and printable report cards use the stored class/term records and published-subject state.
- Report-card output can include affective traits, psychomotor ratings, remarks and fee-related fields.
- Result privacy is currently driven primarily by specialist portal access and subject publication; the separate parent/student release pathway is not ready for this rollout.

## Authentication and route observations

| Area | Observation | Integration implication |
| --- | --- | --- |
| Sign-in | The portal presents its own email/password form and an invite-code registration pathway. | Do not create another Result Portal login inside the School Platform. |
| Browser session | The reviewed source holds session data in browser storage and restores it on reload. | It cannot become the shared session without redesign and server verification. |
| Password handling | The source uses browser-local password handling for its current flow. | Critical hardening required before shared sign-on. Do not reuse this mechanism. |
| Role model | The visible source model is only `admin` and `teacher`. | Map it to richer workspace roles only after server-side grants are introduced. |
| Protected routes | The deployed root redirects to one browser application; meaningful page changes are client-side rather than separate protected URLs. | Confirm the approved post-login entry and redirect policy before publishing a deep link. |
| Logout | The current action clears only local portal state. | Shared logout/revocation design is required later. |

## Data-contract requirements

The Result Portal should not write directly to Central Registry-owned identity tables after integration. Instead, define versioned, server-authorised contracts.

| Contract | Minimum fields | Required safeguards |
| --- | --- | --- |
| Staff identity and role grant | stable staff identifier, active status, role, allowed result actions | Server-side verification; short-lived session; audit all elevated actions. |
| Teaching assignment | staff identifier, session, class identifier, subject identifier, permitted action | Authorise score view/edit/publish separately; never infer from a display name. |
| Student/class reference | stable student identifier, current class identifier, session status | Read-only projection from Central Registry; no duplicate identity creation in Results. |
| Result workflow | session, term, class, subject, score components, publication/release state | Validate ranges, ownership and submission/release workflow server-side. |
| Result release | session, term, class, approved release state and audience | Keep family release separate until its identity and privacy rules are approved. |

## Future role mapping

| Unified Workspace role | Result Portal scope after hardening |
| --- | --- |
| Teacher | Only assigned class/subject score entry and draft/submission actions. |
| Class Teacher | Teacher scope plus approved class follow-up summaries; no unrestricted score editing. |
| Results Administrator | Results configuration, assignment approval, publication, broadsheets and report-card generation. |
| Principal / Vice Principal | Delegated review and release-approval scopes defined by school policy. |
| Proprietor | Executive oversight/report access only where explicitly granted. |
| Super Administrator | Identity/role integration administration, not routine result editing by default. |

## Risks and dependencies

1. **Authentication is not ready for shared access.** Browser-managed credentials and sessions must be replaced by a server-verified shared-auth approach.
2. **Authorisation is too broad for a staff workspace.** The current two-role UI model does not prove least-privilege class/subject access.
3. **Direct browser database access is not an integration contract.** Review RLS, RPC permissions and all tables used by Results before linking it to shared identity.
4. **Result release requires a formal policy.** Distinguish score save, subject publish, report-card generation and family release as separate permissions.
5. **Sensitive data scope is wider than scores.** Traits, remarks, fee-related fields and student photos require explicit privacy and retention rules.
6. **OCR/provider configuration needs hardening.** Any AI provider key or configuration must be server-managed and scoped.
7. **Legacy identifiers must be mapped.** Current class keys, subject indexes and student identifiers need stable documented mappings before Central Registry becomes the identity source.

## Recommended migration sequence

1. Confirm the Result Portal’s approved protected entry route, existing user ownership, browser-session behaviour and logout expectations.
2. Design and test server-side staff/class/subject grants for Results without changing the public School Platform.
3. Publish a versioned Central Registry read-only identity and assignment contract.
4. Replace the Result Portal’s browser-managed authentication with the shared Supabase Auth/session model and server-side role checks.
5. Pilot a single secure external link from the Staff Workspace to the Result Portal for one authorised role group.
6. Verify sign-in, denied access, logout, revocation, session/term selection, score save, result publication and report-card generation.
7. Only then add deeper API integration for selected workspace cards; do not embed the portal or pass credentials through URL parameters.

## Decision for the first integration

**Use a secure external link to the existing Result Portal.** The link should be shown only after the user is authenticated in the future shared workspace and their role grant includes Results access. The current separate Result Portal login remains temporary until shared authentication, least-privilege assignment checks, privacy controls and logout/revocation behaviour have been verified.
