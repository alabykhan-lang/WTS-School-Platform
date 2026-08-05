-- WTS Workspace read-only cross-module summary contract.
--
-- This contract does not create or modify operational records. It validates
-- the existing staff_self_service session, applies active grants/scopes, and
-- returns only summary data required by the Workspace command centre.

create or replace function wts_internal.school_workspace_class_summary(
  p_class_key text,
  p_academic_session text,
  p_term text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'public', 'wts_internal'
as $function$
declare
  v_class public.school_classes%rowtype;
  v_total_pupils integer := 0;
  v_male_pupils integer := 0;
  v_female_pupils integer := 0;
  v_expected_subjects integer := 0;
  v_subjects_with_scores integer := 0;
  v_missing_required integer := 0;
  v_published_subjects integer := 0;
  v_attendance_records integer := 0;
  v_absent_today integer := 0;
  v_repeated_absence_alerts integer := 0;
  v_registry_incomplete integer := 0;
  v_readiness text;
  v_attendance_available boolean;
begin
  select *
    into v_class
  from public.school_classes
  where class_key = nullif(trim(coalesce(p_class_key, '')), '')
    and is_active;

  if not found then
    return jsonb_build_object(
      'available', false,
      'class_key', nullif(trim(coalesce(p_class_key, '')), ''),
      'class_name', null,
      'status', 'not_available'
    );
  end if;

  select
    count(*)::integer,
    count(*) filter (where lower(trim(coalesce(s.gender, ''))) in ('male', 'm'))::integer,
    count(*) filter (where lower(trim(coalesce(s.gender, ''))) in ('female', 'f'))::integer
    into v_total_pupils, v_male_pupils, v_female_pupils
  from public.students s
  where s.class_key = v_class.class_key
    and not coalesce(s.archived, false);

  select count(*)::integer
    into v_expected_subjects
  from public.result_subject_catalog r
  where r.class_key = v_class.class_key
    and r.active;

  if p_academic_session is not null and p_term is not null then
    select count(distinct sc.subject_index)::integer
      into v_subjects_with_scores
    from public.scores sc
    join public.result_subject_catalog r
      on r.class_key = sc.class_key
     and r.subject_index = sc.subject_index
     and r.active
    where sc.class_key = v_class.class_key
      and sc.academic_session = p_academic_session
      and sc.term = p_term
      and (sc.ca1 is not null or sc.ca2 is not null or sc.ca3 is not null or sc.exam is not null);

    select count(*)::integer
      into v_missing_required
    from public.students s
    where s.class_key = v_class.class_key
      and not coalesce(s.archived, false)
      and exists (
        select 1
        from public.result_subject_catalog r
        where r.class_key = v_class.class_key
          and r.active
          and not exists (
            select 1
            from public.scores sc
            where sc.student_id = s.id
              and sc.class_key = v_class.class_key
              and sc.subject_index = r.subject_index
              and sc.academic_session = p_academic_session
              and sc.term = p_term
              and (sc.ca1 is not null or sc.ca2 is not null or sc.ca3 is not null or sc.exam is not null)
          )
      );

    select count(distinct p.subject_index)::integer
      into v_published_subjects
    from public.published_subjects p
    where p.class_key = v_class.class_key
      and p.academic_session = p_academic_session
      and p.term = p_term;

    select count(*)::integer
      into v_attendance_records
    from public.attendance_daily a
    join public.students s on s.id = a.student_id
    where s.class_key = v_class.class_key
      and not coalesce(s.archived, false)
      and a.academic_session = p_academic_session
      and a.academic_term = p_term;

    select count(*)::integer
      into v_absent_today
    from public.attendance_daily a
    join public.students s on s.id = a.student_id
    where s.class_key = v_class.class_key
      and not coalesce(s.archived, false)
      and a.attendance_date = current_date
      and a.academic_session = p_academic_session
      and a.academic_term = p_term
      and lower(trim(coalesce(a.daily_status, ''))) = 'absent';

    select count(*)::integer
      into v_repeated_absence_alerts
    from (
      select a.student_id
      from public.attendance_daily a
      join public.students s on s.id = a.student_id
      where s.class_key = v_class.class_key
        and not coalesce(s.archived, false)
        and a.academic_session = p_academic_session
        and a.academic_term = p_term
        and a.attendance_date >= current_date - 30
        and lower(trim(coalesce(a.daily_status, ''))) = 'absent'
      group by a.student_id
      having count(*) >= 3
    ) repeated;
  end if;

  select count(*)::integer
    into v_registry_incomplete
  from public.students s
  where s.class_key = v_class.class_key
    and not coalesce(s.archived, false)
    and s.central_person_id is null;

  v_attendance_available := v_attendance_records > 0;

  v_readiness := case
    when v_total_pupils = 0 or v_expected_subjects = 0 then 'not_available'
    when v_missing_required = 0 then 'ready'
    else 'incomplete'
  end;

  return jsonb_build_object(
    'available', true,
    'class_key', v_class.class_key,
    'class_name', v_class.display_name,
    'academic_session', p_academic_session,
    'term', p_term,
    'total_pupils', v_total_pupils,
    'male_pupils', v_male_pupils,
    'female_pupils', v_female_pupils,
    'active_pupils', v_total_pupils,
    'expected_subjects', v_expected_subjects,
    'subjects_with_scores', case when p_academic_session is null or p_term is null then null else v_subjects_with_scores end,
    'incomplete_subjects', case when p_academic_session is null or p_term is null then null else greatest(v_expected_subjects - v_subjects_with_scores, 0) end,
    'pupils_with_missing_required_scores', case when p_academic_session is null or p_term is null or v_total_pupils = 0 or v_expected_subjects = 0 then null else v_missing_required end,
    'published_subjects', case when p_academic_session is null or p_term is null then null else v_published_subjects end,
    'report_card_readiness', jsonb_build_object(
      'status', v_readiness,
      'label', case v_readiness
        when 'ready' then 'Ready for report-card preparation'
        when 'incomplete' then 'Incomplete score coverage'
        else 'Not available for this class'
      end
    ),
    'attendance', jsonb_build_object(
      'available', v_attendance_available,
      'days_recorded', case when v_attendance_available then v_attendance_records else null end,
      'absent_pupils_today', case when v_attendance_available then v_absent_today else null end,
      'repeated_absence_alerts', case when v_attendance_available then v_repeated_absence_alerts else null end,
      'message', case when v_attendance_available then null else 'Attendance reporting will appear after operational attendance data becomes available.' end
    ),
    'registry', jsonb_build_object(
      'available', true,
      'incomplete_records', v_registry_incomplete,
      'definition', 'Active pupils without a Central Registry person link.'
    ),
    'announcements', jsonb_build_object(
      'available', false,
      'items', '[]'::jsonb,
      'message', 'No class announcement summary is currently connected.'
    )
  );
end;
$function$;

revoke all on function wts_internal.school_workspace_class_summary(text, text, text)
  from public, anon, authenticated;

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
  v_person_id uuid;
  v_staff public.staff_attendance_profiles%rowtype;
  v_academic_session text;
  v_term text;
  v_platform_admin boolean := false;
  v_result_admin boolean := false;
  v_class_teacher boolean := false;
  v_class_teacher_overviews jsonb := '[]'::jsonb;
  v_subject_assignments jsonb := '[]'::jsonb;
  v_admin_overviews jsonb := '[]'::jsonb;
  v_admin_summary jsonb := null;
  v_staff_attendance_records integer := 0;
  v_staff_present_days integer := 0;
  v_staff_absent_days integer := 0;
  v_global_attendance_records integer := 0;
  v_global_notification_attempts integer := 0;
  v_global_published_subjects integer := 0;
  v_global_expected_subjects integer := 0;
  v_active_pupils integer := 0;
  v_active_staff integer := 0;
  v_registry_incomplete integer := 0;
  v_missing_score_alerts integer := 0;
  v_ready_classes integer := 0;
  v_incomplete_classes integer := 0;
  v_class_count integer := 0;
  v_staff_attendance_available boolean;
  v_global_attendance_available boolean;
  v_person jsonb;
  v_modules jsonb;
begin
  v_session := public.school_identity_session_validate(p_session_id, p_session_secret, 'staff_self_service');
  if coalesce((v_session ->> 'ok')::boolean, false) is not true then
    return v_session;
  end if;

  v_person_id := (v_session ->> 'person_id')::uuid;

  select *
    into v_staff
  from public.staff_attendance_profiles
  where central_person_id = v_person_id
    and registration_status = 'active'
    and employment_status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STAFF_IDENTITY_NOT_ACTIVE');
  end if;

  select
    max(value) filter (where key = 'session'),
    max(value) filter (where key = 'term')
    into v_academic_session, v_term
  from public.settings
  where key in ('session', 'term');

  v_academic_session := nullif(trim(v_academic_session), '');
  v_term := nullif(trim(v_term), '');

  v_platform_admin := exists (
    select 1
    from public.school_access_grants g
    where g.person_id = v_person_id
      and g.grant_status = 'active'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now())
      and g.permissions && array[
        'access.manage',
        'central_registry.administer',
        'staff_management.administer',
        'system_administration.administer',
        'reports.view',
        'reports.export'
      ]::text[]
  );

  v_result_admin := exists (
    select 1
    from public.school_access_grants g
    where g.person_id = v_person_id
      and g.app_code = 'results'
      and g.grant_status = 'active'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now())
      and 'results.manage' = any(g.permissions)
  );

  v_class_teacher := exists (
    select 1
    from public.school_staff_role_assignments r
    where r.person_id = v_person_id
      and r.role_code = 'class_teacher'
      and r.assignment_status = 'active'
      and r.effective_from <= now()
      and (r.effective_until is null or r.effective_until > now())
  );

  v_person := jsonb_build_object(
    'staff_id', v_staff.id,
    'staff_number', v_staff.staff_number,
    'full_name', v_staff.full_name,
    'designation', v_staff.designation,
    'staff_category', v_staff.staff_category,
    'department', v_staff.department,
    'employment_status', v_staff.employment_status,
    'registration_status', v_staff.registration_status,
    'photo_url', case
      when coalesce(v_staff.photo, '') like 'http://%'
        or coalesce(v_staff.photo, '') like 'https://%'
        or coalesce(v_staff.photo, '') like '/%'
        or coalesce(v_staff.photo, '') like 'data:image/%'
      then v_staff.photo
      else null
    end
  );

  select coalesce(jsonb_agg(x.summary order by x.sort_order), '[]'::jsonb)
    into v_class_teacher_overviews
  from (
    select distinct c.class_key, c.sort_order,
      wts_internal.school_workspace_class_summary(c.class_key, v_academic_session, v_term) as summary
    from public.school_staff_access_scopes s
    join public.school_classes c on c.class_key = s.class_key and c.is_active
    where v_class_teacher
      and s.person_id = v_person_id
      and s.app_code = 'results'
      and s.scope_type = 'class'
      and s.scope_status = 'active'
      and s.effective_from <= now()
      and (s.effective_until is null or s.effective_until > now())
      and (v_academic_session is null or nullif(trim(s.metadata ->> 'academic_session'), '') is null or trim(s.metadata ->> 'academic_session') = v_academic_session)
      and (v_term is null or nullif(trim(s.metadata ->> 'term'), '') is null or trim(s.metadata ->> 'term') = v_term)
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'class_key', x.class_key,
    'class_name', x.class_name,
    'subject_index', x.subject_index,
    'subject_name', x.subject_name,
    'academic_session', v_academic_session,
    'term', v_term,
    'pupil_count', x.pupil_count,
    'recorded_score_count', x.recorded_score_count,
    'missing_score_count', case when x.pupil_count is null then null else greatest(x.pupil_count - x.recorded_score_count, 0) end,
    'score_entry_status', case
      when x.pupil_count is null or x.pupil_count = 0 then 'not_available'
      when x.recorded_score_count = 0 then 'not_started'
      when x.recorded_score_count < x.pupil_count then 'in_progress'
      else 'complete'
    end,
    'submission_status', jsonb_build_object(
      'available', false,
      'label', 'No current-session submission summary is connected.'
    ),
    'publication_status', case
      when v_academic_session is null or v_term is null then 'not_available'
      when exists (
        select 1 from public.published_subjects p
        where p.class_key = x.class_key
          and p.subject_index = x.subject_index
          and p.academic_session = v_academic_session
          and p.term = v_term
      ) then 'published'
      else 'not_published'
    end
  ) order by x.class_name, x.subject_index), '[]'::jsonb)
    into v_subject_assignments
  from (
    select distinct
      s.class_key,
      c.display_name as class_name,
      s.subject_index,
      r.subject_name,
      (select count(*)::integer from public.students st where st.class_key = s.class_key and not coalesce(st.archived, false)) as pupil_count,
      (select count(distinct sc.student_id)::integer
       from public.scores sc
       where sc.class_key = s.class_key
         and sc.subject_index = s.subject_index
         and sc.academic_session = v_academic_session
         and sc.term = v_term
         and (sc.ca1 is not null or sc.ca2 is not null or sc.ca3 is not null or sc.exam is not null)) as recorded_score_count
    from public.school_staff_access_scopes s
    join public.school_classes c on c.class_key = s.class_key and c.is_active
    join public.result_subject_catalog r on r.class_key = s.class_key and r.subject_index = s.subject_index and r.active
    where s.person_id = v_person_id
      and s.app_code = 'results'
      and s.scope_type = 'subject'
      and s.scope_status = 'active'
      and s.effective_from <= now()
      and (s.effective_until is null or s.effective_until > now())
      and (v_academic_session is null or nullif(trim(s.metadata ->> 'academic_session'), '') is null or trim(s.metadata ->> 'academic_session') = v_academic_session)
      and (v_term is null or nullif(trim(s.metadata ->> 'term'), '') is null or trim(s.metadata ->> 'term') = v_term)
  ) x;

  if v_platform_admin or v_result_admin then
    select coalesce(jsonb_agg(x.summary order by x.sort_order), '[]'::jsonb)
      into v_admin_overviews
    from (
      select c.class_key, c.sort_order,
        wts_internal.school_workspace_class_summary(c.class_key, v_academic_session, v_term) as summary
      from public.school_classes c
      where c.is_active
    ) x;

    select count(*)::integer into v_class_count
    from jsonb_array_elements(v_admin_overviews) item;

    select coalesce(sum(coalesce((item ->> 'pupils_with_missing_required_scores')::integer, 0)), 0)::integer
      into v_missing_score_alerts
    from jsonb_array_elements(v_admin_overviews) item;

    select
      count(*) filter (where item -> 'report_card_readiness' ->> 'status' = 'ready')::integer,
      count(*) filter (where item -> 'report_card_readiness' ->> 'status' = 'incomplete')::integer
      into v_ready_classes, v_incomplete_classes
    from jsonb_array_elements(v_admin_overviews) item;

    select count(*)::integer into v_active_pupils
    from public.students s
    where not coalesce(s.archived, false);

    select count(*)::integer into v_active_staff
    from public.staff_attendance_profiles s
    where s.registration_status = 'active'
      and s.employment_status = 'active'
      and s.central_person_id is not null;

    select count(*)::integer into v_registry_incomplete
    from public.students s
    where not coalesce(s.archived, false)
      and s.central_person_id is null;

    select count(*)::integer
      into v_global_expected_subjects
    from public.school_classes c
    join public.result_subject_catalog r on r.class_key = c.class_key and r.active
    where c.is_active;

    if v_academic_session is not null and v_term is not null then
      select count(distinct (p.class_key, p.subject_index))::integer
        into v_global_published_subjects
      from public.published_subjects p
      join public.school_classes c on c.class_key = p.class_key and c.is_active
      where p.academic_session = v_academic_session
        and p.term = v_term;
    end if;

    select count(*)::integer
      into v_global_attendance_records
    from public.attendance_daily a
    where v_academic_session is not null
      and v_term is not null
      and a.academic_session = v_academic_session
      and a.academic_term = v_term;

    select count(*)::integer
      into v_global_notification_attempts
    from public.school_notification_delivery_attempts;

    v_admin_summary := jsonb_build_object(
      'available', true,
      'active_pupils', v_active_pupils,
      'active_staff', v_active_staff,
      'class_overviews', v_admin_overviews,
      'missing_score_alerts', v_missing_score_alerts,
      'report_card_readiness', jsonb_build_object(
        'available', v_class_count > 0,
        'classes_ready', v_ready_classes,
        'classes_incomplete', v_incomplete_classes,
        'classes_not_available', greatest(v_class_count - v_ready_classes - v_incomplete_classes, 0)
      ),
      'attendance_overview', jsonb_build_object(
        'available', v_global_attendance_records > 0,
        'records', case when v_global_attendance_records > 0 then v_global_attendance_records else null end,
        'absent_pupils_today', case when v_global_attendance_records > 0 then (select count(*)::integer from public.attendance_daily a where a.attendance_date = current_date and lower(trim(coalesce(a.daily_status, ''))) = 'absent') else null end,
        'absent_staff_today', case when exists (select 1 from public.staff_attendance_daily a where a.attendance_date = current_date) then (select count(*)::integer from public.staff_attendance_daily a where a.attendance_date = current_date and lower(trim(coalesce(a.daily_status, ''))) = 'absent') else null end,
        'message', case when v_global_attendance_records > 0 then null else 'Attendance reporting will appear after operational attendance data becomes available.' end
      ),
      'registry', jsonb_build_object(
        'available', true,
        'incomplete_records', v_registry_incomplete,
        'definition', 'Active pupils without a Central Registry person link.'
      ),
      'pending_approvals', jsonb_build_object(
        'available', false,
        'count', null,
        'message', 'Approval summaries remain inside the specialist modules.'
      ),
      'publication', jsonb_build_object(
        'available', v_academic_session is not null and v_term is not null,
        'published_subjects', case when v_academic_session is not null and v_term is not null then v_global_published_subjects else null end,
        'expected_subjects', case when v_academic_session is not null and v_term is not null then v_global_expected_subjects else null end
      )
    );
  end if;

  select count(*)::integer,
         count(*) filter (where lower(trim(coalesce(a.daily_status, ''))) in ('present', 'late', 'checked_in'))::integer,
         count(*) filter (where lower(trim(coalesce(a.daily_status, ''))) = 'absent')::integer
    into v_staff_attendance_records, v_staff_present_days, v_staff_absent_days
  from public.staff_attendance_daily a
  where a.staff_id = v_staff.id
    and (v_academic_session is null or a.academic_session = v_academic_session)
    and (v_term is null or a.academic_term = v_term);

  v_staff_attendance_available := v_staff_attendance_records > 0;

  v_modules := jsonb_build_object(
    'central_registry', jsonb_build_object(
      'status', 'operational',
      'available', true,
      'summary', 'Identity, employment and access grants remain authoritative in Central Registry.'
    ),
    'results', jsonb_build_object(
      'status', 'operational',
      'available', true,
      'summary', case when jsonb_array_length(v_subject_assignments) > 0 or jsonb_array_length(v_class_teacher_overviews) > 0 or v_result_admin then 'Authorised Result responsibilities are summarised below.' else 'No current Result class or subject assignment is recorded.' end
    ),
    'attendance', jsonb_build_object(
      'status', 'under-development',
      'available', v_global_attendance_records > 0,
      'summary', case when v_global_attendance_records > 0 then 'Attendance records are available for read-only summary.' else 'Attendance reporting will appear after operational attendance data becomes available.' end
    ),
    'notifications', jsonb_build_object(
      'status', 'under-development',
      'available', v_global_notification_attempts > 0,
      'summary', case when v_global_notification_attempts > 0 then 'Notification delivery activity is available for read-only summary.' else 'Notification summaries are not yet available.' end
    ),
    'reports', jsonb_build_object(
      'status', 'protected',
      'available', v_platform_admin or v_result_admin,
      'summary', 'Report generation remains inside the authorised specialist Result module.'
    ),
    'website', jsonb_build_object(
      'status', 'protected',
      'available', false,
      'summary', 'Website-management actions are not performed in Workspace.'
    ),
    'system_administration', jsonb_build_object(
      'status', 'protected',
      'available', v_platform_admin,
      'summary', 'System administration remains inside the protected access-management service.'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'WORKSPACE_SUMMARY_READ',
    'summary', jsonb_build_object(
      'person', v_person,
      'academic_context', jsonb_build_object(
        'session', v_academic_session,
        'term', v_term,
        'source', 'school_default'
      ),
      'class_teacher', jsonb_build_object(
        'available', v_class_teacher and jsonb_array_length(v_class_teacher_overviews) > 0,
        'assignments', v_class_teacher_overviews,
        'message', case when v_class_teacher and jsonb_array_length(v_class_teacher_overviews) > 0 then null else 'No class-teacher assignment is currently active.' end
      ),
      'subject_teacher', jsonb_build_object(
        'available', jsonb_array_length(v_subject_assignments) > 0,
        'assignments', v_subject_assignments,
        'message', case when jsonb_array_length(v_subject_assignments) > 0 then null else 'No subject assignment has been recorded for this term.' end
      ),
      'subject_assignments', v_subject_assignments,
      'staff_attendance', jsonb_build_object(
        'available', v_staff_attendance_available,
        'days_recorded', case when v_staff_attendance_available then v_staff_attendance_records else null end,
        'present_days', case when v_staff_attendance_available then v_staff_present_days else null end,
        'absent_days', case when v_staff_attendance_available then v_staff_absent_days else null end,
        'message', case when v_staff_attendance_available then null else 'Your attendance summary will appear after operational attendance data becomes available.' end
      ),
      'administrator_dashboard', v_admin_summary,
      'module_summaries', v_modules
    )
  );
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
