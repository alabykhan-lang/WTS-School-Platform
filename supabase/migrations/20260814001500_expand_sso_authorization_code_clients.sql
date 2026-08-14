-- Expand the one-time SSO authorization-code contract to every active
-- production client registered in school_sso_clients.
--
-- Attendance and Results were the original clients. Administration and
-- Notifications were registered later, but these table checks were not
-- expanded with them, so otherwise-valid code issuance failed with SQLSTATE
-- 23514 before the specialist callback.

alter table public.school_sso_authorization_codes
  drop constraint school_sso_authorization_codes_client_chk,
  drop constraint school_sso_authorization_codes_target_chk,
  drop constraint school_sso_authorization_codes_redirect_chk;

alter table public.school_sso_authorization_codes
  add constraint school_sso_authorization_codes_client_chk
    check (client_id = any (array[
      'result_portal'::text,
      'attendance'::text,
      'central_registry'::text,
      'notifications'::text
    ])),
  add constraint school_sso_authorization_codes_target_chk
    check (target_app_code = any (array[
      'results'::text,
      'attendance'::text,
      'central_registry'::text,
      'notifications'::text
    ])),
  add constraint school_sso_authorization_codes_redirect_chk
    check (redirect_uri = any (array[
      'https://wts-result-system.vercel.app/portal_core.html'::text,
      'https://wts-attendance-system.vercel.app/'::text,
      'https://wts-central-registry.vercel.app/'::text,
      'https://wts-notification-system.vercel.app/'::text
    ]));
