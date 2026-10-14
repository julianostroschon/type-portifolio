begin;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
create policy "Read own administrator membership" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) <= 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  label text not null check (length(btrim(label)) between 1 and 80),
  category text not null check (length(btrim(category)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 1000),
  url text not null check (length(url) <= 2048 and url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  repository text not null check (length(repository) <= 2048 and repository ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  theme text not null check (theme in ('pulso', 'pj', 'fortuna')),
  symbol text not null check (length(btrim(symbol)) between 1 and 8),
  tags text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert (slug,name,label,category,description,url,repository,theme,symbol,tags,published),
  update (slug,name,label,category,description,url,repository,theme,symbol,tags,published)
  on public.projects to authenticated;
create policy "Read published projects" on public.projects
  for select to anon, authenticated using (published);
create policy "Administrators read drafts" on public.projects
  for select to authenticated using (exists (select 1 from public.platform_admins where user_id = (select auth.uid())));
create policy "Administrators create projects" on public.projects
  for insert to authenticated with check (exists (select 1 from public.platform_admins where user_id = (select auth.uid())));
create policy "Administrators update projects" on public.projects
  for update to authenticated
  using (exists (select 1 from public.platform_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins where user_id = (select auth.uid())));

create table public.project_audit (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE')),
  previous_data jsonb,
  new_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.project_audit enable row level security;
revoke all on public.project_audit from anon, authenticated;
grant select on public.project_audit to authenticated;
create policy "Administrators read audit" on public.project_audit
  for select to authenticated using (exists (select 1 from public.platform_admins where user_id = (select auth.uid())));

create function public.audit_project_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if cardinality(new.tags) > 10 or exists (select 1 from unnest(new.tags) tag where tag is null or length(btrim(tag)) not between 1 and 40) then
    raise exception 'Invalid project tags' using errcode = '23514';
  end if;
  new.updated_at := now();
  insert into public.project_audit (project_id,actor_id,action,previous_data,new_data)
  values (new.id, auth.uid(), tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function public.audit_project_change() from public, anon, authenticated;
create trigger project_change before insert or update on public.projects
for each row execute function public.audit_project_change();

insert into public.projects (slug,name,label,category,description,url,repository,theme,symbol,tags,published) values
('pulso','Pulso','01 / INDICADORES','Dados & acompanhamento','Uma visão dos indicadores que importam. Organize métricas, acompanhe sua evolução e transforme dados em contexto.','https://pulso.julianostroschon.dev/','https://github.com/julianostroschon/indicadores','pulso','↗',array['Next.js','Prisma','PostgreSQL'],true),
('pj','PJ','02 / GESTÃO','Organização & negócios','Um espaço para organizar a operação PJ. Projetos, contratos e finanças conectados ao dia a dia do negócio.','https://pj.julianostroschon.dev/','https://github.com/julianostroschon/controle-pj','pj','◫',array['Next.js','Drizzle','PostgreSQL'],true),
('fortuna','Fortuna','03 / FINANÇAS','Finanças & planejamento','Mais clareza sobre as finanças pessoais. Contas, investimentos e objetivos reunidos para acompanhar suas escolhas.','https://fortuna.julianostroschon.dev/','https://github.com/julianostroschon/fortuna-app','fortuna','✳',array['Next.js','Drizzle','PostgreSQL'],true);
commit;
