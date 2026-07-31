# WTS School Platform: Portal Integration Plan

**Status:** Staff and Management Workspace design phase. This document sets the safe direction for the first portal rollout. It does not authorise authentication changes, database migration, user migration, cross-system writes, credential sharing or display of confidential records.

## First-rollout boundary

- `/portal` is a public gateway and explanation page, not a sign-in page.
- The initial protected-user groups are **Staff** and **School Management** only.
- Parent and student login, dashboards, result access and attendance access are deferred pending management approval and a separate privacy design.
- `/workspace`, `/workspace/staff` and `/workspace/management` are static demonstration shells. They contain no credentials, live records, real staff identities, statistics or operational results.
- The existing Result Portal is the only specialist system currently proven in normal school operations. It remains separately protected during this phase.
- Central Registry, Attendance and Notification are not advertised as routinely available for daily use. Their portal status is **In development**.

## Current systems inventory

| System | Repository | Production deployment | Current purpose | First-rollout status | Recommended relationship to the unified workspace |
| --- | --- | --- | --- | --- | --- |
| WTS School Platform | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | Public website, Portal Gateway and safe workspace previews. Built with Next.js, React and TypeScript. | Active public gateway only | Remains the public entry and future role-aware workspace shell. It must not proxy private data or credentials. |
| Result Portal | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Score entry, result processing, broadsheets and report-card generation. Static HTML/JavaScript application on Vercel using the shared WTS Supabase project. | **Available to authorised users**, subject to confirming the correct protected future entry route | First specialist integration target. Use a secure external link first; do not embed or pass sessions. |
| WTS Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | Intended student, guardian, admissions and staff identity authority. | In development | Keep outside routine gateway use until its versioned read-only identity contract, access controls and dependency migration are confirmed. |
| WTS Attendance System | `alabykhan-lang/WTS--ATTENDANCE-SYSTEM-` | `https://wts-attendance-system.vercel.app` | Student and staff attendance, device/scanner preparation and attendance reports. | In development | Keep separate. Do not show as a daily-work portal destination until access, identity references and device policy are confirmed. |
| WTS Notification System | `alabykhan-lang/WTS-Notification-System` | `https://wts-notification-system.vercel.app` | Guardian/staff contact preparation, templates, alerts and delivery tracking. | In development | Keep separate. Messaging, consent and provider configuration must be verified before routine operational use. |

## Workspace structure prepared now

### Staff Workspace

`/workspace/staff` prepares the intended first-login experience without connecting to a live service:

- a clearly marked preview welcome area, staff name placeholder and role placeholder;
- current session and term placeholders rather than invented values;
- safe empty states for assigned classes, subjects, announcements and pending responsibilities;
- a future score-entry and result-submission area, governed by approved class/subject grants;
- a staff-profile area;
- Attendance and Notifications labelled **In development**.

### Management Workspace

`/workspace/management` prepares the intended management modules with no records or operational statistics:

| Module | Prepared status | Boundary for this phase |
| --- | --- | --- |
| Central Registry | In development | No registry records or links presented as routine work. |
| Staff Management | Planned | Must use explicit role grants, not broad management access. |
| Results Administration | First integration target | Existing Result Portal remains separately protected. |
| Attendance Monitoring | In development | No attendance data, devices or reports connected. |
| Notification Management | In development | No contacts, templates or delivery data connected. |
| Reports | Planned | No cross-system metrics until data contracts and release rules exist. |
| Public Website Content | Planned | No management publishing dashboard is created in this phase. |
| System Settings | Planned | No setting is editable from the public platform. |

## Future role map

One future sign-in entrance must identify the verified staff member and return only the modules explicitly granted to the following roles. Role title alone is never sufficient access to every module.

| Role | Intended authorised scope |
| --- | --- |
| Teacher | Own approved classes/subjects, score entry, staff profile and school announcements. |
| Class Teacher | Teacher scope plus approved class-level responsibilities and results follow-up. |
| Principal | Delegated school oversight, results administration, reports, staff responsibilities and public-content approval. |
| Vice Principal | Delegated academic and operational oversight as explicitly granted. |
| Proprietor | Executive oversight modules approved by school governance, with audit history. |
| Registry Administrator | Central Registry, admissions, guardian and staff-identity workflows. |
| Results Administrator | Score workflow administration, report cards, broadsheets and result-release controls. |
| Attendance Administrator | Attendance devices, exceptions and reports only. |
| Communications Administrator | Approved templates, delivery follow-up, school notices and delegated public-content work. |
| Super Administrator | Tightly controlled role grants, integration settings and security review; sensitive actions must be logged. |

## Source-of-truth direction

| Major record | Long-term owner | Permitted consumer relationship | Current position |
| --- | --- | --- | --- |
| Student identity | Central Registry | Results, Attendance and Notifications consume a versioned, minimum-necessary identity projection. | Intended direction; do not enforce until Registry readiness and legacy dependencies are confirmed. |
| Guardian information | Central Registry | Notification System receives only approved contact, relationship and consent fields. | Consent ownership and API boundary still require confirmation. |
| Staff identity | Central Registry | Workspace, Attendance, Results and Notifications consume active status, approved role grants and staff identifier. | Intended direction; public directory visibility remains a separate explicit field. |
| Class and subject assignment | Central Registry | Results consumes approved teaching assignments for access checks. | Must be reconciled with the Result Portal’s current class/subject structure. |
| Attendance | Attendance System | Registry supplies identifiers; Notification System may consume approved attendance events. | Attendance System remains the event and report owner. |
| Results | Result Portal | Registry supplies approved identity/assignment references; Result Portal owns scores, calculations, report cards and release rules. | Retain as the specialist authority until its integration hardening is complete. |
| Notifications | Notification System | Registry supplies approved identity/contact fields; Results and Attendance supply approved events. | Notification System owns templates, provider state, delivery attempts and delivery status. |

## Authentication direction

### Options considered

| Option | Strength | Limitation | Decision |
| --- | --- | --- | --- |
| Separate login in every specialist system | Fastest to preserve existing systems unchanged. | Repeated sign-in, inconsistent role handling, fragmented logout and difficult revocation. | Temporary only. |
| Shared Supabase Auth used independently by each system | Can consolidate identity if every application validates the same protected claims. | Requires RLS, token, role-grant and logout/revocation work across all applications. | Recommended technical foundation after the Registry contract is ready. |
| Custom School Platform-only sign-in that proxies every system | A single visual entrance. | Would duplicate identity logic, create a sensitive data proxy and increase security risk. | Do not use. |

### Recommended path

Adopt **one shared Supabase Auth environment and a Central Registry-owned role-grant model**, then let the School Platform act as the one role-aware workspace entrance. Every specialist system must validate the same authenticated session and current server-side grants. The platform must not store passwords, impersonate users, hand browser-held service credentials to other systems or create its own parallel identity database.

Until that migration is approved and complete, specialist logins remain temporary. The first user-facing integration should be a secure external link to the Result Portal after its protected entry route, access checks and logout behaviour are verified.

## Proposed future URL structure

| Purpose | Proposed address | Notes |
| --- | --- | --- |
| Public website | `www.<future-school-domain>` | Public information only. |
| Portal Gateway | `www.<future-school-domain>/portal` | Explains access and routes authorised users after authentication is available. |
| Unified workspace | `workspace.<future-school-domain>` or `www.<future-school-domain>/workspace` | Role-aware entry after the shared-auth work is complete. |
| Result specialist system | `results.<future-school-domain>` | Retain a separate protected application boundary during staged integration. |
| Attendance specialist system | `attendance.<future-school-domain>` | Keep device/scanner paths separated from the public site. |
| Management specialist system | `manage.<future-school-domain>` | Optional future destination for high-privilege management modules. |

No domain is purchased, connected or changed by this phase.

## Security requirements before a live workspace

1. Replace browser-managed authentication and role decisions with a server-verified shared session and short-lived tokens.
2. Enforce row-level data access and server-side authorisation for every record operation; interface hiding is not an access control.
3. Define a minimum-necessary, versioned API contract for identity, assignment and event data.
4. Require explicit role grants and scope them by class, subject, session and permitted action where applicable.
5. Implement reliable logout, session revocation, password recovery and administrator off-boarding across all specialist systems.
6. Record audit events for result release, role changes, exports, high-privilege actions and communications dispatch.
7. Keep service-role credentials and provider secrets server-side only. Never include them in public website source, static pages or browser storage.
8. Protect result release by session, term, class, role and publication state; parent/student access remains outside this rollout.

## Phased implementation sequence

1. **This phase — complete:** Staff/Management gateway, workspace previews, role structure and Result Portal read-only audit.
2. **Result Portal hardening and contract:** confirm its protected entry route, rework authentication and authorisation, map staff/class/subject assignments, and define results integration APIs.
3. **Central Registry readiness:** complete identity ownership, RLS/API dependency mapping and versioned read-only projections for staff, students, guardians and assignments.
4. **Shared access foundation:** implement the shared Auth and role-grant model; test sign-in, revocation, role changes and logout against Results first.
5. **Staff Workspace live slice:** connect only profile, assigned classes/subjects and approved Result Portal entry. Do not connect Attendance or Notification yet.
6. **Management Workspace live slice:** add Results Administration and limited Registry views using least privilege and audit logging.
7. **Attendance and Notification integrations:** introduce only after their device, consent, provider, identity and release controls are verified.
8. **Deferred family access:** design and approve parent/student records, result release and attendance access separately before any public portal return.

## Dependencies and risks requiring confirmation

- The Result Portal has a real operations workflow, but its current two-role model, browser session pattern, credential handling, access scope and database rules must be hardened before shared sign-on.
- Central Registry must confirm that its data model, API versioning and RLS policy can act as the identity authority without breaking Results or Attendance.
- Attendance requires confirmed device ownership, scanner/NFC/RFID operating policy and trustworthy identity mapping.
- Notification requires consent rules, guardian-contact verification, provider configuration, approved templates and delivery-failure handling.
- The school must approve the exact role matrix, delegated authority, result-release approval process, session/term ownership and administrator off-boarding procedure.
- The definitive future school domain and subdomain policy remain to be chosen.
