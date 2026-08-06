-- Keep the existing Results/Registry/Notifications workspace contract intact
-- while layering the protected Attendance summary and institutional authority
-- contracts over it.

alter function public.school_staff_workspace_read_session_api(uuid, text)
  rename to school_staff_workspace_read_session_api_legacy;

create or replace function public.school_staff_workspace_read_session_api(
  p_session_id uuid,
  p_session_secret text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'public'
as $function$
declare
  v_session jsonb;
  v_legacy jsonb;
  v_authority jsonb;
begin
  v_session := public.school_identity_session_validate(p_session_id, p_session_secret, 'staff_self_service');
  if coalesce((v_session ->> 'ok')::boolean, false) is not true then
    return v_session;
  end if;

  v_legacy := public.school_staff_workspace_read_session_api_legacy(p_session_id, p_session_secret);
  if coalesce((v_legacy ->> 'ok')::boolean, false) is not true then
    return v_legacy;
  end if;

  v_authority := coalesce(v_session -> 'institutional_authority', '{}'::jsonb);
  return v_legacy || jsonb_build_object(
    'institutional_authority', v_authority,
    'institutional_modules', case when coalesce((v_authority ->> 'active')::boolean, false) then jsonb_build_object(
      'workspace', true,
      'central_registry', true,
      'results', true,
      'attendance', true,
      'notifications', true,
      'reports', true,
      'website_management', true,
      'system_administration', true
    ) else '{}'::jsonb end,
    'management_access', coalesce((v_legacy ->> 'management_access')::boolean, false)
      or coalesce((v_authority ->> 'active')::boolean, false)
  );
end;
$function$;

revoke all on function public.school_staff_workspace_read_session_api(uuid, text)
  from public, authenticated;
grant execute on function public.school_staff_workspace_read_session_api(uuid, text)
  to anon;

alter function wts_internal.school_staff_workspace_read_summary(uuid, text)
  rename to school_staff_workspace_read_summary_legacy;

create or replace function wts_internal.school_staff_workspace_read_summary(
  p_session_id uuid,
  p_session_secret text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'public', 'wts_internal'
as $function$
declare
  v_session jsonb;
  v_legacy jsonb;
  v_attendance jsonb;
  v_summary jsonb;
  v_personal jsonb;
  v_management jsonb;
  v_authority jsonb;
  v_modules jsonb;
  v_admin jsonb;
begin
  v_session := public.school_identity_session_validate(p_session_id, p_session_secret, 'staff_self_service');
  if coalesce((v_session ->> 'ok')::boolean, false) is not true then
    return v_session;
  end if;

  v_legacy := wts_internal.school_staff_workspace_read_summary_legacy(p_session_id, p_session_secret);
  if coalesce((v_legacy ->> 'ok')::boolean, false) is not true then
    return v_legacy;
  end if;

  v_summary := coalesce(v_legacy -> 'summary', '{}'::jsonb);
  v_authority := coalesce(v_session -> 'institutional_authority', '{}'::jsonb);
  v_attendance := public.attendance_workspace_read_workspace_api(p_session_id, p_session_secret);

  if coalesce((v_attendance ->> 'ok')::boolean, false) is true then
    v_personal := coalesce(v_attendance -> 'personal', '{}'::jsonb);
    v_management := coalesce(v_attendance -> 'management', '{}'::jsonb);
    v_modules := coalesce(v_summary -> 'module_summaries', '{}'::jsonb) || jsonb_build_object(
      'attendance', jsonb_build_object(
        'status', 'operational',
        'available', true,
        'summary', case
          when coalesce((v_personal -> 'records' ->> 'available')::boolean, false)
            then 'Attendance summaries are available for the current official context.'
          else 'No attendance records have been recorded yet; Workspace is showing an honest empty state.'
        end
      )
    );

    v_admin := coalesce(v_summary -> 'administrator_dashboard', '{}'::jsonb);
    if coalesce((v_management ->> 'available')::boolean, false) then
      v_admin := v_admin || jsonb_build_object(
        'available', true,
        'active_pupils', coalesce((v_admin ->> 'active_pupils')::integer, (select count(*)::integer from public.students where not coalesce(archived, false))),
        'active_staff', coalesce((v_admin ->> 'active_staff')::integer, (select count(*)::integer from public.staff_attendance_profiles where registration_status='active' and employment_status='active')),
        'attendance_overview', jsonb_build_object(
          'available', (v_management ->> 'message') is distinct from 'No attendance records have been recorded for the current date.',
          'records', null,
          'absent_pupils_today', v_management -> 'pupils_absent_today',
          'absent_staff_today', v_management -> 'staff_absent_today',
          'message', v_management ->> 'message'
        ),
        'attendance_management', v_management,
        'device_import_health', v_management -> 'device_import_health'
      );
    end if;

    v_summary := v_summary
      || jsonb_build_object(
        'institutional_authority', v_authority,
        'academic_context', v_attendance -> 'academic_context',
        'class_teacher', v_attendance -> 'class_teacher',
        'staff_attendance', jsonb_build_object(
          'available', coalesce((v_personal -> 'records' ->> 'available')::boolean, false),
          'days_recorded', v_personal -> 'records' -> 'days_recorded',
          'present_days', v_personal -> 'records' -> 'present_days',
          'absent_days', case when coalesce((v_personal ->> 'attendance_required')::boolean, true) then v_personal -> 'records' -> 'absent_days' else null end,
          'attendance_required', v_personal -> 'attendance_required',
          'today', v_personal -> 'today',
          'weekly', v_personal -> 'weekly',
          'monthly', v_personal -> 'monthly',
          'term', v_personal -> 'term',
          'unresolved_correction_count', v_personal -> 'unresolved_correction_count',
          'message', case when not coalesce((v_personal ->> 'attendance_required')::boolean, true) then 'Personal Attendance is not required for this institutional account.' when coalesce((v_personal -> 'records' ->> 'available')::boolean, false) then null else 'No personal attendance records have been recorded yet.' end
        ),
        'attendance', v_attendance,
        'roster_sync', v_attendance -> 'roster_sync',
        'administrator_dashboard', v_admin,
        'module_summaries', v_modules
      );
  else
    v_summary := v_summary || jsonb_build_object(
      'institutional_authority', v_authority,
      'attendance', jsonb_build_object('ok', false, 'code', v_attendance ->> 'code'),
      'module_summaries', coalesce(v_summary -> 'module_summaries', '{}'::jsonb) || jsonb_build_object(
        'attendance', jsonb_build_object('status', 'operational', 'available', false, 'summary', 'Attendance is not included in this identity''s active module access.')
      )
    );
  end if;

  return v_legacy || jsonb_build_object('summary', v_summary, 'institutional_authority', v_authority);
end;
$function$;

revoke all on function wts_internal.school_staff_workspace_read_summary(uuid, text)
  from public, anon, authenticated;

create or replace function public.school_staff_workspace_read_summary_api(
  p_session_id uuid,
  p_session_secret text
)
returns jsonb
language sql
security definer
set search_path to 'pg_catalog', 'extensions', 'public'
as $function$
  select wts_internal.school_staff_workspace_read_summary(p_session_id, p_session_secret);
$function$;

revoke all on function public.school_staff_workspace_read_summary_api(uuid, text)
  from public, authenticated;
grant execute on function public.school_staff_workspace_read_summary_api(uuid, text)
  to anon;
