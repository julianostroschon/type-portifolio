import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { seedAdmin, seedProjects } from './lib/seed-platform.js'

try {
  if (existsSync('.env.seed.local')) process.loadEnvFile('.env.seed.local')
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key)
    throw new Error(
      'Configure SUPABASE_URL e SUPABASE_SECRET_KEY em .env.seed.local. Veja .env.seed.example.',
    )
  if (key.startsWith('sb_publishable_'))
    throw new Error(
      'A seed exige uma chave administrativa, não a chave publishable.',
    )
  const email = (process.env.SEED_ADMIN_EMAIL || 'julianostroschon@gmail.com')
    .trim()
    .toLowerCase()
  const password =
    process.env.SEED_ADMIN_PASSWORD || randomBytes(24).toString('base64url')
  const file = '.seed-credentials.local.json'
  if (existsSync(file)) {
    const previous = JSON.parse(readFileSync(file, 'utf8'))
    if (previous.url !== url || previous.email !== email)
      throw new Error(
        'O arquivo de credenciais pertence a outro projeto/usuário. Guarde-o em outro local antes de executar esta seed.',
      )
  }
  function saveCredentials(credentials) {
    const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`
    writeFileSync(temporary, JSON.stringify(credentials, null, 2) + '\n', {
      mode: 0o600,
      flag: 'wx',
    })
    renameSync(temporary, file)
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const count = await seedProjects(client)
  const result = await seedAdmin(client, {
    email,
    password,
    onCreated: async (user, initialPassword) => {
      saveCredentials({
        url,
        email,
        password: initialPassword,
        user_id: user.id,
        adminProvisioned: false,
      })
    },
  })
  // Only report a password we actually issued for this account.
  if (existsSync(file)) {
    const credentials = JSON.parse(readFileSync(file, 'utf8'))
    if (credentials.url === url && credentials.user_id === result.id) {
      credentials.adminProvisioned = true
      saveCredentials(credentials)
      console.log(`Credenciais disponíveis em ${file}.`)
    }
  }
  console.log(
    `Seed concluída: ${count} projetos adicionados; administrador ${result.email} ${result.created ? 'criado' : 'já existente (senha preservada)'}.`,
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
