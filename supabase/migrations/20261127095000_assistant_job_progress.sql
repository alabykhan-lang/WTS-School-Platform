-- Live progress for a running assistant turn, so the chat can name the class
-- or subject being read instead of a bare "Working".

alter table wts_internal.assistant_jobs add column if not exists progress text;

create or replace function public.school_assistant_job_progress(
  p_session_id uuid,
  p_session_secret text,
  p_job_id uuid,
  p_progress text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'public', 'wts_internal'
as $function$
declare
  v_session jsonb;
  v_person_id uuid;
begin
  v_session := public.school_identity_session_validate(p_session_id, p_session_secret, 'staff_self_service');
  if coalesce((v_session ->> 'ok')::boolean, false) is not true then
    return v_session;
  end if;

  v_person_id := (v_session ->> 'person_id')::uuid;

  update wts_internal.assistant_jobs
    set progress = left(coalesce(p_progress, ''), 160), updated_at = now()
  where job_id = p_job_id
    and person_id = v_person_id
    and status = 'running';

  return jsonb_build_object('ok', true, 'job_id', p_job_id);
end;
$function$;

revoke all on function public.school_assistant_job_progress(uuid, text, uuid, text)
  from public, authenticated;
grant execute on function public.school_assistant_job_progress(uuid, text, uuid, text)
  to anon;

create or replace function public.school_assistant_job_read(
  p_session_id uuid,
  p_session_secret text,
  p_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'public', 'wts_internal'
as $function$
declare
  v_session jsonb;
  v_person_id uuid;
  v_job wts_internal.assistant_jobs%rowtype;
begin
  v_session := public.school_identity_session_validate(p_session_id, p_session_secret, 'staff_self_service');
  if coalesce((v_session ->> 'ok')::boolean, false) is not true then
    return v_session;
  end if;

  v_person_id := (v_session ->> 'person_id')::uuid;

  select *
    into v_job
  from wts_internal.assistant_jobs
  where job_id = p_job_id
    and person_id = v_person_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'ASSISTANT_JOB_NOT_FOUND');
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', v_job.job_id,
    'status', v_job.status,
    'progress', v_job.progress,
    'result', v_job.result,
    'updated_at', v_job.updated_at
  );
end;
$function$;

revoke all on function public.school_assistant_job_read(uuid, text, uuid)
  from public, authenticated;
grant execute on function public.school_assistant_job_read(uuid, text, uuid)
  to anon;
