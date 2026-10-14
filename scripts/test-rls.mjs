import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const name = `portfolio-rls-${randomUUID()}`
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout
}
try {
  docker([
    'run',
    '--rm',
    '-d',
    '--name',
    name,
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    'postgres:16-alpine',
  ])
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    if (
      spawnSync(
        'docker',
        ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
        { stdio: 'ignore' },
      ).status === 0
    ) {
      ready = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!ready) throw new Error('PostgreSQL did not start')
  const fixture = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
`
  docker(
    [
      'exec',
      '-i',
      name,
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    fixture +
      readFileSync(
        new URL(
          '../supabase/migrations/202610130001_portfolio.sql',
          import.meta.url,
        ),
        'utf8',
      ) +
      readFileSync(
        new URL(
          '../supabase/migrations/202610130002_audit_project_deletion.sql',
          import.meta.url,
        ),
        'utf8',
      ) +
      readFileSync(
        new URL(
          '../supabase/migrations/202610130003_pj_account_linking.sql',
          import.meta.url,
        ),
        'utf8',
      ) +
      readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8'),
  )
  docker(
    [
      'exec',
      '-i',
      name,
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    readFileSync(new URL('../tests/rls.sql', import.meta.url), 'utf8'),
  )
  console.log(
    'Passed: PostgreSQL migrations, project and account-link policies, member isolation, admin writes, revocation and audit.',
  )
} finally {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
}
