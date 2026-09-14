begin;
alter table public.attachments drop constraint attachments_state_check;
alter table public.attachments add constraint attachments_state_check check(state in ('pending','ready','deleting'));
-- Mark incomplete objects before deleting bytes, so finalization cannot race a
-- maintenance worker and expose an attachment whose object has been removed.
create function teamplus_private.attachment_transition() returns trigger language plpgsql set search_path='' as $$
begin
  if old.state='deleting' and new.state<>'deleting' then raise exception using errcode='22023',message='This incomplete upload expired. Select the file again.';end if;
  return new;
end;
$$;
revoke all on function teamplus_private.attachment_transition() from public,anon,authenticated;
create trigger attachment_transition before update of state on public.attachments for each row execute function teamplus_private.attachment_transition();
create function public.teamplus_claim_abandoned_uploads(p_org uuid) returns table(id uuid)
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.organizations where organizations.id=p_org for update;
  return query update public.attachments a set state='deleting' where a.id in (
    select b.id from public.attachments b where b.organization_id=p_org and (b.state='deleting' or (b.state='pending' and b.at<now()-interval '24 hours')) order by b.at limit 100
  ) returning a.id;
end;
$$;
revoke all on function public.teamplus_claim_abandoned_uploads(uuid) from public,anon,authenticated;
grant execute on function public.teamplus_claim_abandoned_uploads(uuid) to service_role;
alter table teamplus_private.requests add foreign key(organization_id) references public.organizations(id) on delete cascade;
alter table teamplus_private.rate_limits add foreign key(organization_id) references public.organizations(id) on delete cascade;
commit;
