-- Isolated PostgreSQL fixtures, never run against a production database.
begin;
insert into public.platform_admins(user_id) values ('00000000-0000-0000-0000-000000000001');
update public.projects set published = false where slug = 'pj';
-- Initial public projects only; administrative credentials are provisioned by yarn seed.
-- Run after migrations. Existing projects keep their content and publication status.

insert into public.projects (slug,name,label,category,description,url,repository,theme,symbol,tags,published)
select seed.* from (values
('pulso','Pulso','01 / INDICADORES','Dados & acompanhamento','Uma visão dos indicadores que importam. Organize métricas, acompanhe sua evolução e transforme dados em contexto.','https://pulso.julianostroschon.dev/','https://github.com/julianostroschon/indicadores','pulso','↗',array['Next.js','Prisma','PostgreSQL'],true),
('pj','PJ','02 / GESTÃO','Organização & negócios','Um espaço para organizar a operação PJ. Projetos, contratos e finanças conectados ao dia a dia do negócio.','https://pj.julianostroschon.dev/','https://github.com/julianostroschon/controle-pj','pj','◫',array['Next.js','Drizzle','PostgreSQL'],true),
('fortuna','Fortuna','03 / FINANÇAS','Finanças & planejamento','Mais clareza sobre as finanças pessoais. Contas, investimentos e objetivos reunidos para acompanhar suas escolhas.','https://fortuna.julianostroschon.dev/','https://github.com/julianostroschon/fortuna-app','fortuna','✳',array['Next.js','Drizzle','PostgreSQL'],true)) as seed(slug,name,label,category,description,url,repository,theme,symbol,tags,published)
where not exists (select 1 from public.projects existing where existing.slug = seed.slug);


do $$ begin
  if (select count(*) from public.projects) <> 3 then raise exception 'Seed duplicated projects'; end if;
  if (select published from public.projects where slug = 'pj') then raise exception 'Seed republished draft'; end if;
  if (select count(*) from public.project_audit) <> 4 then raise exception 'Seed generated audit for unchanged projects'; end if;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.projects) <> 2 then raise exception 'Anonymous sees draft'; end if;
  begin
    insert into public.platform_admins(user_id) values ('00000000-0000-0000-0000-000000000002');
    raise exception 'Anonymous can grant admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
insert into public.portfolio_link_attempts (central_user_id, state_hash, expires_at)
values ('00000000-0000-0000-0000-000000000001', 'test-link-state-hash', now() + interval '5 minutes');
insert into public.portfolio_account_links (
  central_user_id, app_key, app_user_id, external_link_id, attempt_id, display_email
)
select
  '00000000-0000-0000-0000-000000000001', 'pj', '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004', id, 'pj-user@example.com'
from public.portfolio_link_attempts where state_hash = 'test-link-state-hash';
do $$ begin
  if (select count(*) from public.portfolio_link_attempts) <> 1 then raise exception 'Service cannot read link attempt'; end if;
  if (select count(*) from public.portfolio_account_links) <> 1 then raise exception 'Service cannot read account link'; end if;
end $$;
reset role;

set local role anon;
do $$ begin
  begin
    perform * from public.portfolio_link_attempts;
    raise exception 'Anonymous can read link attempts';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.portfolio_account_links;
    raise exception 'Anonymous can read account links';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
do $$ begin
  begin
    perform * from public.portfolio_link_attempts;
    raise exception 'Authenticated browser can read link attempts';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.portfolio_account_links;
    raise exception 'Authenticated browser can read account links';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.projects) <> 2 then raise exception 'Member sees draft'; end if;
  if (select count(*) from public.platform_admins) <> 0 then raise exception 'Member sees admin membership'; end if;
  update public.projects set name = 'Unauthorized' where slug = 'pulso';
  if found then raise exception 'Member can edit'; end if;
  begin
    insert into public.projects (slug,name,label,category,description,url,repository,theme,symbol)
    values ('member-project','Member','01','Test','Description','https://example.com','https://github.com/example/app','pulso','x');
    raise exception 'Member can insert';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.platform_admins(user_id) values ('00000000-0000-0000-0000-000000000002');
    raise exception 'Member can self promote';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.project_audit) <> 0 then raise exception 'Member sees audit'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.projects) <> 3 then raise exception 'Admin cannot see draft'; end if;
  insert into public.projects (slug,name,label,category,description,url,repository,theme,symbol)
  values ('admin-project','Admin project','04','Test','Description','https://example.com','https://github.com/example/app','pulso','x');
  update public.projects set published = true where slug = 'admin-project';
  if not found then raise exception 'Admin cannot publish'; end if;
  update public.projects set published = false where slug = 'admin-project';
  if (select count(*) from public.project_audit where actor_id = auth.uid()) <> 3 then raise exception 'Missing audit'; end if;
  begin
    update public.projects set url = 'javascript:alert(1)' where slug = 'admin-project';
    raise exception 'Unsafe URL accepted';
  exception when check_violation then null; end;
  begin
    update public.projects set tags = array[repeat('x',41)] where slug = 'admin-project';
    raise exception 'Oversized tag accepted';
  exception when check_violation then null; end;
end $$;
reset role;

delete from public.platform_admins where user_id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
  if exists(select 1 from public.projects where slug = 'admin-project') then raise exception 'Revoked admin sees draft'; end if;
  update public.projects set name = 'Revoked write' where slug = 'pulso';
  if found then raise exception 'Revoked admin can edit'; end if;
end $$;
reset role;
rollback;
