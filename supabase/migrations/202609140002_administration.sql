begin;
-- Atomic, idempotent workspace bootstrap; never available to a browser identity.
create function public.teamplus_bootstrap(p_org uuid,p_name text,p_admin uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  insert into public.organizations(id,name) values(p_org,p_name) on conflict(id) do nothing;
  perform 1 from public.organizations where id=p_org for update;
  if exists(select 1 from public.memberships where organization_id=p_org) then
    if not exists(select 1 from public.memberships where organization_id=p_org and user_id=p_admin and role='admin') then
      raise exception 'Workspace already has an administrator. Use the existing workspace access process.';
    end if;
  else
    insert into public.memberships values(p_org,p_admin,'admin');
    insert into public.events(organization_id,actor_id,action,message) values(p_org,p_admin,'bootstrap','Workspace created');
  end if;
  return p_org;
end;
$$;
revoke all on function public.teamplus_bootstrap(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.teamplus_bootstrap(uuid,text,uuid) to service_role;
create function public.teamplus_members(p_org uuid) returns table(user_id uuid,email text,role text)
language plpgsql stable security definer set search_path='' as $$
begin
  if teamplus_private.member_role(p_org) is distinct from 'admin' then raise exception using errcode='42501',message='Only administrators can view team accounts.';end if;
  return query select m.user_id,u.email::text,m.role from public.memberships m join auth.users u on u.id=m.user_id where m.organization_id=p_org order by u.email;
end;
$$;
revoke all on function public.teamplus_members(uuid) from public,anon;
grant execute on function public.teamplus_members(uuid) to authenticated;
commit;
