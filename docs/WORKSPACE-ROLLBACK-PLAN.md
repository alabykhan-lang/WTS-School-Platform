# WTS Workspace: Rollback Plan

## Scope

This change is confined to the School Platform public presentation, Workspace UI/API route, documentation and the Workspace read-only summary functions recorded in the School Platform migration history. Attendance, Notification, Result and Central Registry repositories are not changed.

## Application rollback

1. Stop promotion of the latest School Platform deployment.
2. Revert the School Platform commit that introduced the Workspace refinement, or promote the immediately preceding known-good School Platform deployment.
3. Confirm the public website still has one safe staff entry and that `/api/workspace` returns the prior identity-only response.
4. Check central login, Workspace sign-out and existing specialist launch redirects.

No specialist deployment should be rolled back as part of this change.

## Database rollback

The migration adds only the following Workspace-boundary functions:

- `wts_internal.school_workspace_class_summary(text,text,text)`;
- `wts_internal.school_staff_workspace_read_summary(uuid,text)`; and
- `public.school_staff_workspace_read_summary_api(uuid,text)`.

If the deployed application is rolled back and the functions are no longer needed, remove only these exact functions after confirming no newer School Platform release depends on them. Restore the same role grants as before the migration. Do not drop or rewrite operational tables, identities, grants, scores, attendance records, notifications or Registry records.

## Verification after rollback

- unauthenticated `/api/workspace` still returns the expected session-required response;
- no public page exposes specialist login choices or technical URLs;
- Result, Attendance, Notification and Central Registry standalone URLs remain reachable independently;
- production row counts and active grants are unchanged; and
- Vercel deployment is `READY`.

## Recovery principle

Rollback restores presentation and read-path behaviour only. It must never be used to conceal or reverse a specialist-module operational change, and no production data correction is part of this rollback plan.

