-- TeamPlus production schema. Preview D1 data is deliberately not imported.
begin;
create schema if not exists teamplus_private;
revoke all on schema teamplus_private from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);
create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('admin','manager','member','viewer')),
  primary key (organization_id,user_id)
);
create index memberships_user on public.memberships(user_id,organization_id);
create function teamplus_private.member_role(org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.memberships where organization_id=org and user_id=(select auth.uid());
$$;
grant usage on schema teamplus_private to authenticated;
revoke all on function teamplus_private.member_role(uuid) from public,anon;
grant execute on function teamplus_private.member_role(uuid) to authenticated;

create table public.jobs (
  organization_id uuid not null references public.organizations(id),
  id text not null default ('TP-' || upper(replace(gen_random_uuid()::text,'-',''))),
  customer text not null check (char_length(btrim(customer)) between 2 and 120),
  contact text not null default '' check (char_length(contact)<=120),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  category text not null check (category in ('LED signage','Print & display','Promotional products','Branding & design','Digital services')),
  stage text not null default 'New lead' check (stage in ('New lead','Qualified','Quotation','Confirmed','Design','Production','Quality check','Ready','Delivered','Paid')),
  -- Existing product records whole INR; no floating point arithmetic.
  value bigint not null check (value between 0 and 100000000),
  cost bigint not null check (cost between 0 and 100000000),
  paid bigint not null default 0 check (paid>=0 and paid<=value),
  due date not null check (due between date '2000-01-01' and date '2199-12-31'),
  owner text not null check (char_length(btrim(owner)) between 1 and 60),
  source text not null check (source in ('Website','WhatsApp','Referral','Call','Email','Walk-in')),
  priority text not null check (priority in ('Normal','High')),
  notes text not null default '' check (char_length(notes)<=5000),
  artwork_approved boolean not null default false,
  qc_passed boolean not null default false,
  approval_reference text check (char_length(approval_reference) between 4 and 1000),
  qc_note text check (char_length(qc_note) between 4 and 1000),
  delivery_reference text check (char_length(delivery_reference) between 4 and 1000),
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,id),
  check (not artwork_approved or approval_reference is not null),
  check (not qc_passed or qc_note is not null),
  check (stage not in ('Production','Quality check','Ready','Delivered','Paid') or artwork_approved),
  check (stage not in ('Ready','Delivered','Paid') or qc_passed),
  check (stage not in ('Delivered','Paid') or delivery_reference is not null),
  check (stage<>'Paid' or paid=value)
);
create index jobs_org_stage_due on public.jobs(organization_id,stage,due,id);
create index jobs_org_created on public.jobs(organization_id,created_at desc,id);
create table public.tasks (
  organization_id uuid not null references public.organizations(id),
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  customer text not null default '' check (char_length(customer)<=120),
  due date not null check (due between date '2000-01-01' and date '2199-12-31'),
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  done boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create index tasks_org_due on public.tasks(organization_id,due,id);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  job_id text,
  actor_id uuid not null,
  action text not null,
  message text not null,
  at timestamptz not null default now(),
  foreign key (organization_id,job_id) references public.jobs(organization_id,id)
);
create index events_org_at on public.events(organization_id,at desc,id);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id text not null,
  actor_id uuid not null,
  amount bigint not null check(amount>0 and amount<=100000000),
  reference text not null check(char_length(btrim(reference)) between 3 and 200),
  at timestamptz not null default now(),
  foreign key(organization_id,job_id) references public.jobs(organization_id,id)
);
create index payments_org_job on public.payments(organization_id,job_id);
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id text not null,
  uploaded_by uuid not null,
  name text not null check(char_length(name) between 1 and 200 and name !~ '[\x00-\x1F\x7F]'),
  size integer not null check(size between 1 and 10485760),
  content_type text not null check(content_type in ('application/pdf','image/png','image/jpeg','image/webp','text/plain','application/zip')),
  state text not null default 'pending' check(state in ('pending','ready')),
  at timestamptz not null default now(),
  foreign key(organization_id,job_id) references public.jobs(organization_id,id)
);
create index attachments_org_job on public.attachments(organization_id,job_id,state);
create table teamplus_private.requests (
  organization_id uuid not null,
  actor_id uuid not null,
  request_id uuid not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(organization_id,actor_id,request_id)
);
create table teamplus_private.rate_limits (
  organization_id uuid not null,
  actor_id uuid not null,
  window_start timestamptz not null,
  count integer not null,
  primary key(organization_id,actor_id)
);

-- No client DML grants. Business writes must use the bounded command below.
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.jobs enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;
revoke all on public.organizations,public.memberships,public.jobs,public.tasks,public.events,public.payments,public.attachments from public,anon,authenticated;
grant select on public.organizations,public.memberships,public.jobs,public.tasks,public.events,public.payments,public.attachments to authenticated;
-- The operator's Supabase service key is only used by the provisioning CLI.
grant all on public.organizations,public.memberships,public.jobs,public.tasks,public.events,public.payments,public.attachments to service_role;
create policy member_read on public.organizations for select to authenticated using (teamplus_private.member_role(id) is not null);
create policy member_read on public.memberships for select to authenticated using (teamplus_private.member_role(organization_id) is not null);
create policy member_read on public.jobs for select to authenticated using (teamplus_private.member_role(organization_id) is not null);
create policy member_read on public.tasks for select to authenticated using (teamplus_private.member_role(organization_id) is not null);
create policy member_read on public.events for select to authenticated using (teamplus_private.member_role(organization_id) is not null);
create policy member_read on public.payments for select to authenticated using (teamplus_private.member_role(organization_id) is not null);
create policy member_read on public.attachments for select to authenticated using (teamplus_private.member_role(organization_id) is not null and (state='ready' or uploaded_by=(select auth.uid())));

create function teamplus_private.job_json(j public.jobs) returns jsonb
language sql immutable set search_path = '' as $$
select jsonb_build_object('id',j.id,'customer',j.customer,'contact',j.contact,'title',j.title,'category',j.category,'stage',j.stage,'value',j.value,'cost',j.cost,'paid',j.paid,'due',j.due,'owner',j.owner,'source',j.source,'priority',j.priority,'notes',j.notes,'artworkApproved',j.artwork_approved,'qcPassed',j.qc_passed,'approvalReference',j.approval_reference,'qcNote',j.qc_note,'deliveryReference',j.delivery_reference,'version',j.version,'createdAt',(j.created_at at time zone 'Asia/Kolkata')::date);
$$;
revoke all on function teamplus_private.job_json(public.jobs) from public,anon;
grant execute on function teamplus_private.job_json(public.jobs) to authenticated;
create function public.teamplus_workspace(p_org uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if teamplus_private.member_role(p_org) is null then raise exception using errcode='42501',message='Workspace access is not assigned. Contact your administrator.'; end if;
  -- One statement provides a consistent read snapshot; no silent REST row cap.
  return jsonb_build_object(
    'jobs',coalesce((select jsonb_agg(teamplus_private.job_json(j) order by created_at desc,id) from public.jobs j where organization_id=p_org),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'customer',customer,'due',due,'time',time,'done',done,'version',version) order by due,time,id) from public.tasks where organization_id=p_org),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'jobId',job_id,'message',message,'at',at,'actorId',actor_id) order by at desc,id) from (select * from public.events where organization_id=p_org order by at desc,id limit 200) e),'[]'::jsonb),
    'files',coalesce((select jsonb_agg(jsonb_build_object('id',id,'jobId',job_id,'name',name,'size',size,'contentType',content_type,'at',at) order by at desc,id) from public.attachments where organization_id=p_org and state='ready'),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.teamplus_workspace(uuid) from public,anon;
grant execute on function public.teamplus_workspace(uuid) to authenticated;

-- Bucket and object policies bind uploads to pre-authorized job metadata.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('teamplus-files','teamplus-files',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/zip']);
create function teamplus_private.can_upload(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
select exists(select 1 from public.attachments a where object_name=a.organization_id::text||'/'||a.id::text
  and a.state='pending' and a.uploaded_by=(select auth.uid()) and a.at>now()-interval '2 hours'
  and teamplus_private.member_role(a.organization_id) in ('admin','manager','member'));
$$;
create function teamplus_private.can_download(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
select exists(select 1 from public.attachments a where object_name=a.organization_id::text||'/'||a.id::text
  and a.state='ready' and teamplus_private.member_role(a.organization_id) is not null);
$$;
revoke all on function teamplus_private.can_upload(text),teamplus_private.can_download(text) from public,anon;
grant execute on function teamplus_private.can_upload(text),teamplus_private.can_download(text) to authenticated;
create policy teamplus_upload on storage.objects for insert to authenticated
with check(bucket_id='teamplus-files' and teamplus_private.can_upload(name));
create policy teamplus_download on storage.objects for select to authenticated
using(bucket_id='teamplus-files' and teamplus_private.can_download(name));

create function public.teamplus_command(p_org uuid,p_request_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  role_name text;
  action_name text := p_input->>'action';
  j public.jobs;
  f public.attachments;
  payload jsonb;
  old_input jsonb;
  result jsonb;
  entity_id text;
  event_job text;
  msg text;
  target text;
  amount bigint;
  ref text;
  n integer;
  pos integer;
  sequence text[] := array['New lead','Qualified','Quotation','Confirmed','Design','Production','Quality check','Ready','Delivered','Paid'];
begin
  if actor is null then raise exception using errcode='42501',message='Sign in required.'; end if;
  if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>50000 then
    raise exception using errcode='22023',message='Invalid request.';
  end if;
  -- Serialize short commands per team. Membership revocation, aggregate payments,
  -- idempotency, activity and workflow updates share this transaction boundary.
  perform 1 from public.organizations where id=p_org for update;
  role_name := teamplus_private.member_role(p_org);
  if role_name is null or role_name='viewer' then raise exception using errcode='42501',message='You do not have permission to change this workspace.'; end if;
  select input,r.result into old_input,result from teamplus_private.requests r where organization_id=p_org and actor_id=actor and request_id=p_request_id;
  if found then
    if old_input<>p_input then raise exception using errcode='PT409',message='This request ID was already used for another change.'; end if;
    return result;
  end if;
  insert into teamplus_private.rate_limits as r values(p_org,actor,date_trunc('minute',now()),1)
    on conflict(organization_id,actor_id) do update set window_start=excluded.window_start,count=case when r.window_start=excluded.window_start then r.count+1 else 1 end
    returning count into n;
  if n>120 then raise exception using errcode='PT429',message='Too many changes. Wait a minute and try again.'; end if;
  if action_name='createJob' then
    payload:=p_input->'job';
    if jsonb_typeof(payload->'value')<>'number' or jsonb_typeof(payload->'cost')<>'number' or (payload->>'value')::numeric<>trunc((payload->>'value')::numeric) or (payload->>'cost')::numeric<>trunc((payload->>'cost')::numeric) then raise exception using errcode='22023',message='Enter whole INR amounts.'; end if;
    insert into public.jobs(organization_id,customer,contact,title,category,value,cost,due,owner,source,priority,notes)
    values(p_org,btrim(payload->>'customer'),coalesce(payload->>'contact',''),btrim(payload->>'title'),payload->>'category',(payload->>'value')::bigint,(payload->>'cost')::bigint,(payload->>'due')::date,btrim(payload->>'owner'),payload->>'source',payload->>'priority',coalesce(payload->>'notes','')) returning * into j;
    entity_id:=j.id; event_job:=j.id; msg:='Enquiry created';
  elsif action_name='createTask' then
    payload:=p_input->'task';
    insert into public.tasks(organization_id,title,customer,due,time) values(p_org,btrim(payload->>'title'),coalesce(payload->>'customer',''),(payload->>'due')::date,payload->>'time') returning id::text into entity_id;
    msg:='Follow-up created';
  elsif action_name='completeTask' then
    if jsonb_typeof(p_input->'done') is distinct from 'boolean' then raise exception using errcode='22023',message='Invalid task state.'; end if;
    update public.tasks set done=(p_input->>'done')::boolean,version=version+1 where organization_id=p_org and id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer returning id::text into entity_id;
    if not found then raise exception using errcode='PT409',message='This task changed or is unavailable. Refresh and try again.'; end if;
    msg:=case when (p_input->>'done')::boolean then 'Follow-up completed' else 'Follow-up reopened' end;
  elsif action_name='setMember' then
    if role_name<>'admin' then raise exception using errcode='42501',message='Only administrators can manage team access.'; end if;
    target:=p_input->>'role';
    if target is null or target not in ('admin','manager','member','viewer','remove') then raise exception using errcode='22023',message='Invalid role.'; end if;
    if exists(select 1 from public.memberships where organization_id=p_org and user_id=(p_input->>'userId')::uuid and role='admin') and target<>'admin' and (select count(*) from public.memberships where organization_id=p_org and role='admin')<=1 then raise exception using errcode='22023',message='Keep at least one administrator.'; end if;
    if target='remove' then
      delete from public.memberships where organization_id=p_org and user_id=(p_input->>'userId')::uuid;
    else
      insert into public.memberships values(p_org,(p_input->>'userId')::uuid,target) on conflict(organization_id,user_id) do update set role=excluded.role;
    end if;
    entity_id:=p_input->>'userId'; msg:='Team access changed: '||entity_id||' · '||target;
  elsif action_name='completeUpload' then
    select * into f from public.attachments where organization_id=p_org and id=(p_input->>'id')::uuid and uploaded_by=actor;
    if not found then raise exception using errcode='PT404',message='Upload not found.'; end if;
    if f.state<>'ready' then
      if not exists(select 1 from storage.objects where bucket_id='teamplus-files' and name=p_org::text||'/'||f.id::text and (metadata->>'size')::bigint=f.size and metadata->>'mimetype'=f.content_type) then raise exception using errcode='22023',message='The upload is incomplete or does not match the file details.'; end if;
      update public.attachments set state='ready' where id=f.id;
      event_job:=f.job_id;msg:='File added: '||f.name;
    end if;
    entity_id:=f.id::text;
  else
    select * into j from public.jobs where organization_id=p_org and id=p_input->>'id' for update;
    if not found then raise exception using errcode='PT404',message='Job not found.'; end if;
    entity_id:=j.id;event_job:=j.id;
    pos:=array_position(sequence,j.stage);
    ref:=btrim(p_input->>'reference');
    if action_name='note' then
      msg:=btrim(p_input->>'text');
      if msg is null or char_length(msg) not between 1 and 5000 then raise exception using errcode='22023',message='Enter a note up to 5000 characters.'; end if;
    elsif action_name='prepareUpload' then
      if (select count(*) from public.attachments where organization_id=p_org and job_id=j.id)>=100 then raise exception using errcode='22023',message='This job has reached its 100-file limit.'; end if;
      insert into public.attachments(organization_id,job_id,uploaded_by,name,size,content_type) values(p_org,j.id,actor,p_input->>'name',(p_input->>'size')::integer,p_input->>'contentType') returning id::text into entity_id;
      event_job:=null;
    else
      if (p_input->>'version')::integer is distinct from j.version then raise exception using errcode='PT409',message='This job changed in another session. Refresh and try again.'; end if;
      if action_name='editJob' then
        payload:=p_input->'job';
        if jsonb_typeof(payload->'value')<>'number' or jsonb_typeof(payload->'cost')<>'number' or (payload->>'value')::numeric<>trunc((payload->>'value')::numeric) or (payload->>'cost')::numeric<>trunc((payload->>'cost')::numeric) then raise exception using errcode='22023',message='Enter whole INR amounts.'; end if;
        if pos>=6 and (payload->>'title' is distinct from j.title or payload->>'category' is distinct from j.category or payload->>'notes' is distinct from j.notes or (payload->>'value')::bigint is distinct from j.value or (payload->>'cost')::bigint is distinct from j.cost) then raise exception using errcode='22023',message='Scope and pricing are locked after production starts.'; end if;
        if j.artwork_approved and (payload->>'title' is distinct from j.title or payload->>'category' is distinct from j.category or payload->>'notes' is distinct from j.notes) then j.artwork_approved:=false;j.approval_reference:=null;end if;
        update public.jobs set customer=btrim(payload->>'customer'),contact=coalesce(payload->>'contact',''),title=btrim(payload->>'title'),category=payload->>'category',value=(payload->>'value')::bigint,cost=(payload->>'cost')::bigint,due=(payload->>'due')::date,owner=btrim(payload->>'owner'),source=payload->>'source',priority=payload->>'priority',notes=coalesce(payload->>'notes',''),artwork_approved=j.artwork_approved,approval_reference=j.approval_reference where organization_id=p_org and id=j.id;
        msg:='Job details updated';
      elsif action_name='advance' then
        target:=p_input->>'stage';
        if target is null or sequence[pos+1] is null or target<>sequence[pos+1] then raise exception using errcode='22023',message='Jobs must advance one stage at a time.'; end if;
        if target='Delivered' then raise exception using errcode='22023',message='Record delivery confirmation to complete this handoff.'; end if;
        if target='Production' and not j.artwork_approved then raise exception using errcode='22023',message='Record artwork approval before starting production.'; end if;
        if target='Ready' and not j.qc_passed then raise exception using errcode='22023',message='Complete quality check before marking this job ready.'; end if;
        if target='Paid' and j.paid<>j.value then raise exception using errcode='22023',message='Record the outstanding payment before closing this job.'; end if;
        update public.jobs set stage=target where organization_id=p_org and id=j.id;msg:='Moved to '||target;
      elsif action_name in ('approveArtwork','passQC','recordDelivery') then
        if ref is null or char_length(ref) not between 4 and 1000 then raise exception using errcode='22023',message='Include a confirmation reference (4–1000 characters).'; end if;
        if action_name='approveArtwork' and j.stage='Design' then
          update public.jobs set artwork_approved=true,approval_reference=ref where organization_id=p_org and id=j.id;msg:='Artwork approved · '||ref;
        elsif action_name='passQC' and j.stage='Quality check' then
          update public.jobs set qc_passed=true,qc_note=ref where organization_id=p_org and id=j.id;msg:='Quality check passed · '||ref;
        elsif action_name='recordDelivery' and j.stage='Ready' then
          update public.jobs set stage='Delivered',delivery_reference=ref where organization_id=p_org and id=j.id;msg:='Delivery confirmed · '||ref;
        else raise exception using errcode='22023',message='This confirmation is not allowed at the current stage.';
        end if;
      elsif action_name='payment' then
        if role_name not in ('admin','manager') then raise exception using errcode='42501',message='Only administrators and managers can record payments.'; end if;
        if jsonb_typeof(p_input->'amount') is distinct from 'number' or (p_input->>'amount')::numeric<>trunc((p_input->>'amount')::numeric) then raise exception using errcode='22023',message='Enter a whole INR amount.'; end if;
        amount:=(p_input->>'amount')::bigint;
        if amount is null or amount<=0 or amount+j.paid>j.value or pos<4 then raise exception using errcode='22023',message='Confirm the order and enter a payment within the outstanding balance.'; end if;
        insert into public.payments(organization_id,job_id,actor_id,amount,reference) values(p_org,j.id,actor,amount,ref);
        update public.jobs set paid=paid+amount where organization_id=p_org and id=j.id;msg:='Payment recorded: INR '||amount||' · '||ref;
      else raise exception using errcode='22023',message='Unknown action.';
      end if;
      update public.jobs set version=version+1,updated_at=now() where organization_id=p_org and id=j.id;
    end if;
  end if;
  if msg is not null then insert into public.events(organization_id,job_id,actor_id,action,message) values(p_org,event_job,actor,action_name,msg);end if;
  result:=jsonb_build_object('id',entity_id);
  insert into teamplus_private.requests(organization_id,actor_id,request_id,input,result) values(p_org,actor,p_request_id,p_input,result);
  return result;
end;
$$;
revoke all on function public.teamplus_command(uuid,uuid,jsonb) from public,anon;
grant execute on function public.teamplus_command(uuid,uuid,jsonb) to authenticated;
commit;
