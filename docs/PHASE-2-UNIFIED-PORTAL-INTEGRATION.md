# Phase 2 — Unified Portal Module Integration

Status: production integration in progress on `main`.

The operational entry point for this phase is the current Vercel deployment:

- Portal: `https://wts-school-platform.vercel.app/portal/sign-in`
- Authenticated workspace: `https://wts-school-platform.vercel.app/workspace`

The final public and portal custom domains are not attached yet. No phase-2
work depends on `waytosuccessschools.com`, `portal.waytosuccessschools.com`,
custom DNS or custom SSL.

## Verified production map

| Module | Repository | Current production origin | Portal state |
| --- | --- | --- | --- |
| Unified Portal / Staff Workspace | `alabykhan-lang/WTS-School-Platform` | `https://wts-school-platform.vercel.app` | Operational shell and central login |
| Results | `alabykhan-lang/wts-result-system` | `https://wts-result-system.vercel.app` | Operational PKCE/SSO |
| Attendance | `alabykhan-lang/WTS--ATTENDANCE-SYSTEM-` | `https://wts-attendance-system.vercel.app` | Operational PKCE/SSO, portal-triggered launch |
| Administration / Central Registry | `alabykhan-lang/WTS-Central-Registry-` | `https://wts-central-registry.vercel.app` | Protected management module; existing Registry authority retained |
| Notifications | `alabykhan-lang/WTS-Notification-System` | `https://wts-notification-system.vercel.app` | Deployment exists; unified handoff is not yet operational |
| Resources | No connected repository or Vercel project was found | Not configured | Honest unavailable state; no fabricated launcher |

Generated Vercel aliases are not used in application configuration. The
canonical production origins above are centralized in `data/portal-config.ts`
and overridable through the `NEXT_PUBLIC_*_ORIGIN` values in `.env.example`.

## Registry contract

`portalModuleRegistry` is the source of truth for module code, display name,
description, icon, production origin, launch route, SSO method, required grant,
operational status, visibility rule, display order, read-only summary contract,
callback route and logout return route.

The ordinary staff-facing label is **Administration**. “Central Registry” is
retained as the authoritative service name in technical/configuration text and
in read-only academic-context explanations.

Only Results and Attendance have current PKCE clients in the shared identity
authority. The Notification card is status-only until its existing deployment
receives the same secure handoff contract. Resources is an extension point, not
a pretend operational service.

## SSO and logout values

Current shared-authority values are configuration-derived:

- Results client: `result_portal`, target `results`, callback
  `/portal_core.html`, PKCE method `S256`.
- Attendance client: `attendance`, target `attendance`, callback `/`, PKCE
  method `S256`.
- Both specialist post-logout returns resolve to the configured portal
  `/workspace` route.
- Specialist cookies remain host-only; the portal does not copy or become the
  authority for specialist session cookies.

The Results deployment already starts its existing PKCE flow from
`portal_core.html`. Attendance now treats the portal launch query as an
automatic request to start its existing PKCE flow, so a user does not need to
press a second sign-in button after selecting Attendance.

## Read-only dashboard boundary

The portal reads the existing `school_staff_workspace_read_session_api` and
`school_staff_workspace_read_summary_api` contracts. It displays identity,
current assignments, class/subject summaries, Results progress, Attendance
summaries, management summaries and honest unavailable states. It does not copy
specialist editing workflows or write academic records.

The official current context remains Central Registry-owned. The shared
production settings currently report session `2026/2027` and term `1st Term`.
The portal displays that context as read-only; it does not create a second
academic context.

## Future custom-domain migration checklist

When the school acquires the domains, update configuration and provider
allowlists in this order:

1. Attach `waytosuccessschools.com` and
   `portal.waytosuccessschools.com` to the appropriate Vercel project(s).
2. Add the required DNS records and wait for Vercel SSL issuance/verification.
3. Set the portal origin to `https://portal.waytosuccessschools.com` and set
   the portal host value in the portal deployment environment.
4. Set specialist origin variables if specialist applications receive future
   subdomains; otherwise keep their Vercel origins.
5. Update the shared identity authority’s approved SSO origins and exact
   redirect URIs for Results and Attendance. Keep exact path matching and
   `S256` PKCE.
6. Update callback URIs and post-logout return URIs in the specialist
   deployments and the shared SSO client records together.
7. Review cookie attributes: specialist cookies must remain host-only;
   `Secure` is required; `SameSite=Lax` must continue to support the top-level
   cross-origin callback navigation. Do not broaden cookies to `.vercel.app` or
   the school domain.
8. Update CORS/origin allowlists in each specialist API and the portal’s
   approved-origin controls. Do not use wildcard credentials.
9. Verify direct module access, login redirect preservation, callback exchange,
   logout return and unauthorized module blocking on the custom origins.

No custom-domain change is required for the current Vercel deployment.

## Database safety

The existing shared Supabase project remains the only identity/data authority.
No new project, alternate authentication store, duplicate identities or phase-2
academic records are created by this integration. No database migration is
required for the portal registry or Attendance launch trigger.
