# Unified Staff Portal Shell

## Boundary

`WTS-School-Platform` remains the unified shell for Way to Success Standard Schools. Results, Attendance, Notifications and Central Registry remain independent specialist applications and repositories.

The portal uses the existing host-only `wts_school_workspace_session` cookie and the existing server-side Workspace identity and summary RPC contracts. No second identity table, password store, or browser session store is introduced.

## Host routing

When the project is reached at `portal.waytosuccessschools.com`:

- `/` rewrites to the protected Workspace when the session cookie exists;
- `/` rewrites to Staff Portal sign-in when the session cookie is absent; and
- the public website header, footer and public contact affordances are omitted from the staff application frame.

The existing `/workspace`, `/portal/sign-in`, and specialist deployment URLs remain available for compatibility and direct testing.

## Authorization

The browser only receives the server-derived identity, active access, assignments and read-only summaries returned by the existing API routes. Module visibility is not an authorization boundary: specialist applications and the existing SSO authorization endpoint must still validate access server-side.

The portal does not write Results, Attendance, Registry, Notifications or other operational records.

## Production dependency

The Vercel project currently has its `wts-school-platform.vercel.app` domains attached. The requested `portal.waytosuccessschools.com` hostname still requires attachment to this project and DNS/SSL verification. After that hostname is active, specialist applications that initiate SSO must use the same central authorization origin or an explicitly supported handoff so a host-only portal session can be validated across the flow.
