# SSO Rollback Plan

Rollback is limited to the authentication integration. Academic data and existing identity records must not be rolled back.

## Immediate application rollback

1. Stop publishing new SSO links from the Workspace Results card.
2. Revert the Platform authorization route and Workspace link to the last known good commits.
3. Revert the Result callback/exchange files only after confirming that active Result sessions can be safely revoked or allowed to expire.
4. Keep the Result protected data boundary and RLS changes in place.
5. Verify direct Result access returns a safe authentication response.

## Database rollback posture

Do not drop `school_sso_authorization_codes` in an emergency. The table contains only short-lived authorization artifacts and can remain inert. Revoke the two SSO RPC executions if required:

SQL rollback is executed through Supabase; the function signatures are:
- `school_sso_authorization_code_issue(uuid,text,text,text,text,text,text,text,text,text)`
- `school_sso_authorization_code_exchange(text,text,text,text,text,text)`

The linked-session revocation enhancement may remain because it is fail-closed authentication behavior and does not alter academic data.

## Recovery checks

After rollback, verify:

- all three main branches and production aliases point to intended commits;
- no deployment contains a wildcard callback or public password form;
- no new student/result rows were written;
- current Result API/session validation remains protected;
- Central Registry and Workspace login still function.

Any re-enablement requires a new reviewed migration and production verification.
