import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

test('CLI generates private credentials and preserves them on a second run', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'portfolio-seed-test-'))
  let user = null
  let created = 0
  let projects = []
  const server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    const path = new URL(request.url, 'http://localhost').pathname
    let result = {}
    if (path === '/auth/v1/admin/users' && request.method === 'GET')
      result = { users: user ? [user] : [], aud: 'authenticated' }
    else if (path === '/auth/v1/admin/users' && request.method === 'POST') {
      const input = JSON.parse(body)
      user = { id: 'seed-test-user', email: input.email }
      created++
      result = user
    } else if (path === '/rest/v1/projects') {
      if (request.method === 'GET')
        result = projects.map((project) => ({ slug: project.slug }))
      else projects.push(...JSON.parse(body))
    }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(result))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const env = {
    ...process.env,
    SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
    SUPABASE_SECRET_KEY: 'seed-test-key',
    SEED_ADMIN_EMAIL: 'seed@example.com',
    SEED_ADMIN_PASSWORD: '',
  }
  const run = () =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL('../scripts/seed.mjs', import.meta.url))],
        { cwd: directory, env },
      )
      let output = ''
      child.stdout.on('data', (data) => {
        output += data
      })
      child.stderr.on('data', (data) => {
        output += data
      })
      child.on('error', reject)
      child.on('close', (code) =>
        code === 0 ? resolve(output) : reject(new Error(output)),
      )
    })
  try {
    const firstOutput = await run()
    const file = join(directory, '.seed-credentials.local.json')
    const first = JSON.parse(readFileSync(file, 'utf8'))
    assert.equal(first.email, 'seed@example.com')
    assert.equal(first.adminProvisioned, true)
    assert.equal(first.password.length, 32)
    assert.equal(statSync(file).mode & 0o777, 0o600)
    assert.equal(firstOutput.includes(first.password), false)
    await run()
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), first)
    assert.equal(created, 1)
    assert.equal(projects.length, 3)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    rmSync(directory, { recursive: true, force: true })
  }
})
