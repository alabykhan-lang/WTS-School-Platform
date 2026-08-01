# WTS School Platform Integration Plan

## Current production boundary

- `/portal` is the public Staff and Management gateway.
- `/portal/sign-in` is the one current WTS staff sign-in entrance. It verifies the existing Central Registry identity; it does not create a parallel account system.
- `/workspace`, `/workspace/staff` and `/workspace/management` require an active Central Registry staff session. They expose only the signed-in staff member’s own identity, grants and scope assignments.
- Parent and Student access is deferred. No parent/student sign-in, dashboard, result or attendance path is active.
- Central Registry is the authority for active staff identity, employment/account state, role/module/action grants and Result scopes.
- Attendance and Notification remain **In development** and are not routine daily tools.
- Result Portal is the only currently proven specialist workflow. It remains a temporary protected external link while hardening is completed.

## Systems inventory

| System | Repository | Production URL | Current responsibility | Integration status |
| --- | --- | --- | --- | --- |
| School Platform | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | Public website, gateway and role-aware staff workspace. Next.js/React/TypeScript. | Active gateway/workspace. |
| Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | Students, guardians, admissions, staff identity and staff access management. Static browser client with guarded Supabase RPCs. | Controlled identity/access authority. |
| Result Portal | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Score entry, results processing, broadsheets and report cards. Static browser application. | Operational legacy specialist; temporary external link only. |
| Attendance | `alabykhan-lang/WTS--ATTENDANCE-SYSTEM-` | `https://wts-attendance-system.vercel.app` | Attendance events, devices and reports. | In development; no workspace integration. |
| Notifications | `alabykhan-lang/WTS-Notification-System` | `https://wts-notification-system.vercel.app` | Contacts, templates, delivery and status. | In development; no workspace integration. |

## Source of truth

| Major record | Current/future owner | Consumer rule |
| --- | --- | --- |
| Student identity | Central Registry | Results, Attendance and Notifications use a minimum authorised projection only after their APIs are hardened. |
| Guardian information | Central Registry | Notifications receives only approved relationship/contact/consent fields. |
| Staff identity and employment | Central Registry | Workspace and specialist systems check active Central identity. |
| Classes and subjects | Central Registry scopes + existing `result_subject_catalog` | Results checks the exact authorised class and subject. |
| Attendance | Attendance System | Registry supplies identity; Notification consumes approved events later. |
| Results | Result Portal | Owns scores, calculations, report cards and release workflow. |
| Notifications | Notification System | Owns templates, delivery state and provider delivery. |

## Role model

The prepared responsibilities are Teacher, Class Teacher, Principal, Vice Principal, Proprietor, Registry Administrator, Results Administrator, Attendance Administrator, Communications Administrator and Super Administrator.

No responsibility automatically grants unrestricted access. The effective decision is active identity + active employment + active account + current module grant + exact action + scope where required. All changes are auditable.

## Authentication recommendation

### Current transition

Native Supabase Auth has no current user population. The existing Central Registry identity accounts and credentials are therefore the only real shared staff identity foundation. The Platform reuses that guarded sign-in, stores only its opaque short-lived session material in browser session storage, and calls a Central Registry API that validates employment, account and access grants again on each workspace read.

### Target state

Adopt one shared Supabase Auth tenant only after verified mapping from real Central staff IDs and verified official email identities. The Central Registry stays the role/grant authority. Every specialist system must validate the same server-side session and fresh grants. Passwords must not be migrated or reset without explicit management approval.

Separate specialist logins are temporary. Result Portal still has a second login because its legacy browser-local session cannot safely accept the unified session yet.

## URL direction

| Purpose | Proposed address |
| --- | --- |
| Public website | `www.<future-school-domain>` |
| Gateway | `www.<future-school-domain>/portal` |
| Staff workspace | `www.<future-school-domain>/workspace` or `workspace.<future-school-domain>` |
| Results | `results.<future-school-domain>` |
| Attendance | `attendance.<future-school-domain>` |
| Management specialist | `manage.<future-school-domain>` |

No domain was bought or connected in this phase.

## Security requirements and next sequence

1. Keep all sensitive table access behind RLS and guarded RPC/API checks; hiding a menu is never sufficient.
2. Complete Result Portal hardening before single-sign-on: server-side Result APIs, action/scope validation, RLS, revocation and report-card regression tests.
3. Map verified Central staff IDs to native Supabase Auth users in a separately approved password-safe migration.
4. Pilot one-login Result access with short-lived shared session or opaque handoff, then test revocation and logout.
5. Integrate Attendance and Notifications only after identity, device/consent/provider and release controls are production-ready.
6. Design any future parent/student release separately.

## Major current risks

- The legacy Result Portal uses browser-managed credentials and direct Data API access to core result tables with RLS currently disabled.
- Current Central Registry session material is a guarded transition implementation, not the final httpOnly/shared-auth design.
- Attendance and Notification readiness is incomplete for daily operations.
- Role, delegated authority, result-release approval, session/term source and final off-boarding policy still require management confirmation.
