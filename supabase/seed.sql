-- Initial public projects only; administrative credentials are provisioned by yarn seed.
-- Run after migrations. Existing projects keep their content and publication status.
begin;
insert into public.projects (slug,name,label,category,description,url,repository,theme,symbol,tags,published)
select seed.* from (values
('pulso','Pulso','01 / INDICADORES','Dados & acompanhamento','Uma visão dos indicadores que importam. Organize métricas, acompanhe sua evolução e transforme dados em contexto.','https://pulso.julianostroschon.dev/','https://github.com/julianostroschon/indicadores','pulso','↗',array['Next.js','Prisma','PostgreSQL'],true),
('pj','PJ','02 / GESTÃO','Organização & negócios','Um espaço para organizar a operação PJ. Projetos, contratos e finanças conectados ao dia a dia do negócio.','https://pj.julianostroschon.dev/','https://github.com/julianostroschon/controle-pj','pj','◫',array['Next.js','Drizzle','PostgreSQL'],true),
('fortuna','Fortuna','03 / FINANÇAS','Finanças & planejamento','Mais clareza sobre as finanças pessoais. Contas, investimentos e objetivos reunidos para acompanhar suas escolhas.','https://fortuna.julianostroschon.dev/','https://github.com/julianostroschon/fortuna-app','fortuna','✳',array['Next.js','Drizzle','PostgreSQL'],true)) as seed(slug,name,label,category,description,url,repository,theme,symbol,tags,published)
where not exists (select 1 from public.projects existing where existing.slug = seed.slug);
commit;
