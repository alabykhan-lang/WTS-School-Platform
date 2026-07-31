# WTS School Platform: Portal and Systems Integration Plan

**Status:** preparation phase only. This document records the confirmed system landscape and a safe path to future integration. It does not authorise database consolidation, user migration, authentication replacement or cross-system writes.

## Principles for the portal gateway

- `/portal` is a public navigation layer, not an authentication service.
- It must not collect credentials, admission numbers or private records.
- A service is shown as **Available** only when its production destination has been confirmed. Access is still controlled by that specialist system.
- The gateway links to protected services in a new tab. It does not embed them in an iframe and does not pass credentials, sessions or personal data.
- Future integration is API-first and permission-led. Direct browser access to shared database tables is not an integration contract.

## Confirmed systems inventory

| System | Confirmed repository | Confirmed production deployment | Technology and authentication | Expected users and responsibilities | Integration readiness and next action |
| --- | --- | --- | --- | --- | --- |
| WTS School Platform | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | Next.js 15, React 19 and TypeScript. Public website; no portal authentication. | Public visitors; explains the school, routes enquiries and directs users to the portal gateway. | Ready as the public gateway only. Keep protected data and sign-in outside this application until shared identity and APIs are approved. |
| WTS Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | Static HTML/JavaScript on Vercel, Supabase REST/RPC APIs and the shared WTS database. Uses `school_identity_portal_login` plus role-aware access grants; sessions are used by the specialist application. | Registry administrators, admissions officers, authorised management and staff self-service users. Owns student, guardian, admissions, staff and portal-access workflows. | Most important foundation, but not yet safe to rely on as the sole authority across all systems. Its security migration explicitly notes that direct access to the shared student table remains while Results and Attendance dependencies are mapped. First action: complete an API/RLS dependency audit and publish a versioned read-only identity contract. |
| WTS Attendance System | `alabykhan-lang/WTS--ATTENDANCE-SYSTEM-` | `https://wts-attendance-system.vercel.app` | Static HTML/JavaScript on Vercel, Supabase REST/RPC APIs and a Supabase Edge scan function. Uses the same central identity login pattern for authorised access. | Attendance administrators, authorised staff and registered gate devices/scanners. Manages student and staff attendance, QR/NFC/RFID credentials, device monitoring and reports. | A confirmed protected service. It supports `/scanner` for school-owned scanners and has device-bound scan controls. Link from the gateway now; do not embed. Before data integration, map identity keys, class assignment reads and existing direct database dependencies. |
| WTS Notification System | `alabykhan-lang/WTS-Notification-System` | `https://wts-notification-system.vercel.app` | Static HTML/JavaScript on Vercel, protected Vercel API routes, Supabase RPC APIs and a Vault-backed Meta dispatch worker. Uses the same central identity login pattern for authorised management. | Authorised communication management users. Manages guardian/staff contacts, consent, templates, drafts, bulk messaging and delivery status. | A confirmed protected management console. Link from the gateway now; do not embed. Real WhatsApp activation remains conditional on Meta configuration, a successful test, an approved template and a verified opted-in pilot recipient. |
| Existing Result Portal | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Vercel production deployment and repository name are confirmed through linked deployment metadata. Its detailed code, authentication and database design were not inspected in this phase. | Expected to serve results/report cards and results administration. | Do not expose a parent result-access link from `/portal` yet. Confirm its current users, authentication, database contract, report-card privacy controls and roster/class ownership before linking or integrating. |

### Current specialist routes

| System | Publicly reachable entry points | Protected route or behaviour | Recommended relationship to the gateway |
| --- | --- | --- | --- |
| Central Registry | `/` and `/staff` | Management registry and staff self-service require identity/role verification. | Link only; no embedding. |
| Attendance System | `/` and `/scanner` | Management dashboards require authorisation; scanner requests are device-authenticated. | Link only. Keep scanner deployment separate from the public gateway. |
| Notification System | `/` and `/whatsapp` | Management workspace and delivery configuration require authorisation; dispatch/webhook routes are protected server paths. | Link only; never expose delivery setup publicly. |
| Result Portal | Root route is confirmed by its production deployment. | Detailed protected routes are not confirmed. | Hold until a focused Result Portal audit is complete. |

## Current functional gaps and security concerns

1. **Central Registry is not yet the exclusive identity authority.** Its own migration notes that the shared student table still has direct dependencies in Results and Attendance. Integrating it as the sole source before resolving those dependencies could cause inconsistent records.
2. **Specialist systems share implementation-era authentication patterns.** They use central identity RPCs and specialist session handling, but a common browser session, common login page and consistent logout/revocation behaviour have not been proven across all systems.
3. **The Result Portal has not had a focused architecture audit in this phase.** Its deployment and repository are confirmed, but its record model, roles, routes and security boundaries remain to be confirmed.
4. **Notification delivery must remain safety-gated.** A management console is available, but live WhatsApp delivery must not be assumed active until the documented Meta and consent checks pass.
5. **The public website must not become a data proxy.** It should not call private RPCs, store specialist credentials, mirror private records or use iframes for protected systems.
6. **Public navigation cannot be an access grant.** A visible service link must continue to fail safely without the required role and authentication inside the destination system.

## Source-of-truth recommendation

| Major record | Recommended long-term owner | Read/write rule for other systems | Current transition position |
| --- | --- | --- | --- |
| Student identity | Central Registry | Attendance, Results and Notifications read an approved identifier/profile projection; they do not create competing student identities. | Intended target, but direct shared-table dependencies must be mapped before enforcing it. |
| Guardian information | Central Registry | Notification System receives only the approved contact, relationship and consent projection needed for communication. | Registry and Notification already share related records; consent and verification ownership must be clarified. |
| Staff identity | Central Registry | Attendance, Notifications and Results consume the staff ID, role/category and active status through a controlled contract. | Intended target. Public staff-directory visibility remains a separate explicit permission and is never inferred from employment status. |
| Class assignment | Central Registry | Attendance and Results consume the current approved class assignment and session context. | Must be reconciled with the Result Portal’s existing class/roster data before switching authority. |
| Attendance | Attendance System | Registry supplies identity references; Notifications consumes approved attendance events for alerts. | Attendance System remains the event and report authority. |
| Results | Result Portal | Central Registry supplies identity/class references; the Result Portal owns scores, calculations, report cards and result-release rules. | Keep as specialist authority until its audit defines data and access contracts. |
| Notifications | Notification System | Registry supplies approved identity/contact data; Attendance and Results supply approved events. Notification System owns templates, delivery attempts, provider state and delivery status. | Message-delivery capability exists, but live-provider readiness must be confirmed separately. |

## User and role map

| User group | Public website | Future protected services | Access condition |
| --- | --- | --- | --- |
| Public visitor | School information, admissions information, news, staff directory and contact channels | None | No account required. |
| Parent or guardian | Public information and approved notices | Child-specific results, attendance information, notifications and limited profile information | Verified relationship, explicit consent where relevant and approved family access. |
| Student | Public information | Personal results, attendance and academic records appropriate to the learner | Verified student identity and school policy approval. |
| Teacher | Public information | Assigned classes/subjects, attendance tasks, score entry and authorised student records | Active staff identity plus explicit role, class and subject grants. |
| Other staff | Public information | Staff self-service profile, assigned attendance or communication tasks | Active staff identity plus explicit system grant. |
| School management | Public information and gateway | Registry, admissions, staff management, attendance, results administration, notification management and reports | Least-privilege role grants, audit logging and elevated approval for sensitive actions. |
| Integration service | None | Server-to-server approved APIs only | Service identity, scoped permissions, audit trail and no browser-held secret. |

## Future authentication architecture

### Options compared

| Option | Benefits | Risks or limits | Recommendation |
| --- | --- | --- | --- |
| Separate login for each system | Lowest immediate change; specialist systems can remain independent. | Repeated credentials and sessions, inconsistent password/reset/logout flows, difficult revocation and confusing user experience. | Keep temporarily only while the integration foundation is being prepared. |
| One shared Supabase authentication system | One identity per person, consistent password/session controls and easier role-based access when paired with Central Registry grants. | Requires careful migration of existing accounts, RLS policies, session boundaries and legacy client-secret flows. | Recommended technical foundation, introduced progressively after a security and data-contract audit. |
| Single sign-on through the main School Platform | Best user journey: one portal gateway can send a verified user to an authorised service. | The public website must not itself become the identity authority or hold cross-system secrets. Requires the shared identity foundation first. | Recommended user-facing direction after shared identity is stable. The School Platform should be the relying-party gateway, while Central Registry governs role grants and the shared identity service handles authentication. |

### Recommended path

Adopt **shared identity and authentication backed by one Supabase Auth tenant, governed by Central Registry access grants, with the WTS School Platform acting as the portal gateway**. Specialist systems should validate server-issued sessions and ask Central Registry (or an approved authorisation API) for role grants. Do not migrate existing users until a tested transition plan, rollback plan and account-linking audit are approved.

## Proposed future URL structure

No domain is being bought or connected in this phase. When management chooses a permanent school domain, use a structure such as:

| Purpose | Recommended address |
| --- | --- |
| Public school website | `www.<school-domain>` |
| Public portal gateway | `www.<school-domain>/portal` initially; optionally `portal.<school-domain>` once shared sign-on is ready |
| Central Registry | `registry.<school-domain>` |
| Attendance | `attendance.<school-domain>` |
| Results | `results.<school-domain>` |
| Notifications | `notify.<school-domain>` |

Use HTTPS everywhere, retain the main public site as the canonical school website and redirect legacy Vercel addresses only after the new domain and certificate coverage are verified.

## Phased implementation sequence

1. **Current phase — complete:** public `/portal` gateway, specialist-system audit and this technical plan. No database, authentication or user changes.
2. **Identity and data-contract audit:** document canonical IDs, class/session keys, guardian relationships, access grants, existing direct database callers and result-release rules.
3. **Registry hardening:** complete RLS/API changes needed to make Central Registry the controlled identity source; expose a versioned, read-only integration API with audit logging.
4. **Authorisation alignment:** map every specialist role to Central Registry grants, define password/session migration and test account linking with a small management-only pilot.
5. **Attendance integration:** consume central student/staff/class references through the approved contract; retain Attendance as the attendance event authority.
6. **Result Portal audit and integration:** verify result privacy, roster alignment, result-release controls and parent/teacher/admin roles before exposing a results link in the parent pathway.
7. **Notification integration and pilot:** consume approved contact/event projections, verify consent rules and complete a limited Meta delivery pilot before enabling live bulk delivery.
8. **Unified sign-on rollout:** introduce shared sign-on by role and system, with monitoring, revocation, rollback and staff support procedures.

## Dependencies still requiring confirmation

- Management approval for the permanent school domain and final subdomain naming.
- Result Portal architecture: authentication method, Supabase/database use, user roles, public/protected routes, release rules and current data ownership.
- Exact role matrix for parents, students, teachers, non-teaching staff, admissions, results administration and communications.
- Canonical student, guardian, staff, class and academic-session identifiers across the current systems.
- Guardian contact-consent policy and the authority responsible for edits, withdrawals and verification.
- Whether the WhatsApp provider, approved templates and pilot recipient checks are complete. No live-delivery assumption should be made.
- A migration/rollback plan approved by management before any authentication, user or database change.

## Non-negotiable security requirements for implementation

- No service-role key, worker token, password, secret, private API credential or confidential student/staff record is stored in the School Platform repository or exposed to browsers.
- Private APIs require server-side authorisation, least-privilege scopes, rate limiting, input validation and auditable changes.
- Public visibility is explicit. Employment status, enrolment status or an active account alone must never publish a person or record.
- Family access verifies the guardian-to-student relationship and restricts data to the permitted learner(s).
- Results and attendance are not exposed until release/status rules are verified server-side.
- Cross-system changes use recorded, idempotent events or approved APIs; they do not depend on untracked direct table writes.
- Every sensitive route uses HTTPS, appropriate security headers, secure session handling, explicit logout/revocation and an incident/rollback procedure.
