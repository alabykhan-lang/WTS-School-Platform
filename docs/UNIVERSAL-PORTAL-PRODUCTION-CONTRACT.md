# Universal School Portal production contract

Status: **production verified and integration frozen**  
Institution: **Way to Success Standard Schools**  
Authoritative registry: `/PROJECT_REGISTRY.json`  
Runtime registry: `/data/portal-config.ts`  
Verified: 14 August 2026

## Final user journey

```text
Public School Website
→ Staff Portal
→ one central sign-in
→ /workspace
→ School Portal Dashboard
→ Results / Attendance / Notifications / Administration / Profile / My Work
```

The `/workspace` route is the authenticated School Portal dashboard. “Workspace” is an internal route name, not a separate user-facing product.

## Production ownership

The School Platform repository is the user-facing umbrella. Results, Attendance, Central Registry and Notifications remain independent specialist repositories and Vercel projects. Their independence is an engineering detail and must not create repeated logins for ordinary staff.

All non-secret project references, repository names, production origins, Vercel project IDs, client IDs, audiences, scopes, callbacks and exchange endpoints are defined in `PROJECT_REGISTRY.json`.

## Frozen authentication contract

1. Staff authenticate once through the School Platform.
2. The server validates the real Central Registry person, identity account, credential, active employment and institutional authority or module grant.
3. A specialist launch uses a short-lived, single-use authorization code with PKCE S256, state and nonce.
4. The code is bound to the exact client, target application and registered redirect URI.
5. The specialist exchanges the code and creates its own host session.
6. The School Platform session remains valid.
7. Direct specialist access without a specialist session routes through the central Staff Portal and returns to the requested module.
8. Browser-local role values are never authorization authority.
9. Protected institutional owner/proprietor authority remains server-derived and auditable.

Independent Vercel domains must not attempt to share one cookie. Reusable credentials, session secrets and privileged keys must never be placed in URLs or browser storage.

## Verified production evidence

The real protected owner flow completed successfully for all modules:

| Module | Code issued | Code consumed | Specialist session | Final interface |
|---|---:|---:|---:|---:|
| Attendance | Yes | Yes | Yes | Owner verified |
| Administration | Yes | Yes | Yes | Owner verified |
| Notifications | Yes | Yes | Yes | Owner verified |
| Results | Yes | Yes | Yes | Owner verified |

The active production SSO client records match `PROJECT_REGISTRY.json`. Results profile mapping, active identity, active credential, active employment and owner authority were separately validated server-side.

## Change-control boundary for future agents

Future agents may work on:

- UI/UX presentation;
- accessibility and responsive design;
- module-internal features and workflows;
- module data logic already owned by that specialist repository.

Future agents must not modify without a new, explicit owner instruction and coordinated cross-module review:

- central login, session establishment or logout;
- `/api/sso/authorize`;
- SSO client IDs, audiences, scopes, PKCE, state, nonce or redirect URIs;
- specialist callback/exchange routes or session-cookie contracts;
- Central Registry identity, employment, grant or proprietor authority rules;
- shared Supabase authorization-code/session functions or client registrations;
- Vercel project mappings or production origins;
- repository boundaries;
- the one-portal/one-login architecture.

Do not create another portal, login system, identity store, Supabase project or competing dashboard.

## Custom-domain rule

The custom domains do not yet exist and are not a blocker. Production continues on the registered Vercel origins. Future custom domains must be introduced through configuration and approved redirect registration, never by speculative hardcoding.

## Data safety

This integration contract does not authorize changes to pupils, staff identities, classes, assignments, scores, attendance records, report cards, academic sessions, terms or notification content.
