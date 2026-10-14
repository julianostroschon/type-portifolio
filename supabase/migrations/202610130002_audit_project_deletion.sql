begin;

alter table public.project_audit
  drop constraint project_audit_action_check;
alter table public.project_audit
  add constraint project_audit_action_check
  check (action in ('INSERT', 'UPDATE', 'DELETE'));

grant delete on public.projects to authenticated;
create policy "Administrators delete projects" on public.projects
  for delete to authenticated
  using (exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid())
  ));

create or replace function public.audit_project_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.project_audit (project_id, actor_id, action, previous_data, new_data)
    values (old.id, auth.uid(), 'DELETE', to_jsonb(old), to_jsonb(old));
    return old;
  end if;

  if cardinality(new.tags) > 10 or exists (
    select 1 from unnest(new.tags) tag
    where tag is null or length(btrim(tag)) not between 1 and 40
  ) then
    raise exception 'Invalid project tags' using errcode = '23514';
  end if;

  new.updated_at := now();
  insert into public.project_audit (project_id, actor_id, action, previous_data, new_data)
  values (
    new.id,
    auth.uid(),
    tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger project_delete_audit
  before delete on public.projects
  for each row execute function public.audit_project_change();

commit;
