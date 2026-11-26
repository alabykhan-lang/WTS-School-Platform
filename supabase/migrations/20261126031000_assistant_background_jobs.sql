-- Background job storage for the WTS proprietor assistant so minimizing the app
-- does not interrupt an in-flight response.

create table if not exists wts_internal.assistant_jobs (
  job_id uuid primary key,
  person_id uuid not null,
  status text not null check (status in ('running', 'done', 'error')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_jobs_person_created
  on wts_internal.assistant_jobs (person_id, created_at desc);

create or replace function public.school_assistant_job_upsert(
  p_session_id uuid,
  p_session_secret text,
  p_job_id uuid,
  p_status text,
  p_result jsonb default null
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

  if p_status not in ('running', 'done', 'error') then
    return jsonb_build_object('ok', false, 'code', 'ASSISTANT_JOB_STATUS_INVALID');
  end if;

  delete from wts_internal.assistant_jobs
  where created_at < now() - interval '1 day';

  insert into wts_internal.assistant_jobs (job_id, person_id, status, result, created_at, updated_at)
  values (p_job_id, v_person_id, p_status, p_result, now(), now())
  on conflict (job_id) do update
    set status = excluded.status,
        result = excluded.result,
        updated_at = now()
    where wts_internal.assistant_jobs.person_id = v_person_id;

  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', p_status);
end;
$function$;

revoke all on function public.school_assistant_job_upsert(uuid, text, uuid, text, jsonb)
  from public, authenticated;
grant execute on function public.school_assistant_job_upsert(uuid, text, uuid, text, jsonb)
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
    'result', v_job.result,
    'updated_at', v_job.updated_at
  );
end;
$function$;

revoke all on function public.school_assistant_job_read(uuid, text, uuid)
  from public, authenticated;
grant execute on function public.school_assistant_job_read(uuid, text, uuid)
  to anon;
