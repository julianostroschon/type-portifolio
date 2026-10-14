import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seedAdmin, seedProjects } from '../scripts/lib/seed-platform.js'
const input = {
  email: ' JulianoStroschon@gmail.com ',
  password: 'A-test-password-123',
}
function mockClient({ pages = [[]], grantError = null, projects = [] } = {}) {
  const calls = { pages: [], created: [], grants: [], inserted: [] }
  return {
    calls,
    auth: {
      admin: {
        listUsers: async ({ page }) => {
          calls.pages.push(page)
          return { data: { users: pages[page - 1] ?? [] }, error: null }
        },
        createUser: async (data) => {
          calls.created.push(data)
          return {
            data: { user: { id: 'new-user', email: data.email } },
            error: null,
          }
        },
      },
    },
    from(table) {
      if (table === 'platform_admins')
        return {
          upsert: async (data) => {
            calls.grants.push(data)
            return { error: grantError }
          },
        }
      return {
        select: () => ({ in: async () => ({ data: projects, error: null }) }),
        insert: async (data) => {
          calls.inserted.push(...data)
          return { error: null }
        },
      }
    },
  }
}
test('creates confirmed admin and records actual credentials before granting access', async () => {
  const client = mockClient()
  const result = await seedAdmin(client, {
    ...input,
    onCreated: async (user, password) => {
      assert.equal(user.id, 'new-user')
      assert.equal(password, input.password)
      assert.equal(client.calls.grants.length, 0)
    },
  })
  assert.equal(result.created, true)
  assert.deepEqual(client.calls.created, [
    {
      email: 'julianostroschon@gmail.com',
      password: input.password,
      email_confirm: true,
    },
  ])
  assert.deepEqual(client.calls.grants, [{ user_id: 'new-user' }])
})
test('finds existing account across pages without resetting its password', async () => {
  const client = mockClient({
    pages: [
      Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        email: `user${i}@example.com`,
      })),
      [{ id: 'existing', email: 'julianostroschon@gmail.com' }],
    ],
  })
  const result = await seedAdmin(client, {
    ...input,
    onCreated: async () =>
      assert.fail('Existing credentials must not be overwritten'),
  })
  assert.equal(result.created, false)
  assert.deepEqual(client.calls.pages, [1, 2])
  assert.equal(client.calls.created.length, 0)
  assert.deepEqual(client.calls.grants, [{ user_id: 'existing' }])
})
test('retains issued credentials if assigning the role fails', async () => {
  const client = mockClient({ grantError: { message: 'missing migration' } })
  let retained = false
  await assert.rejects(
    seedAdmin(client, {
      ...input,
      onCreated: async () => {
        retained = true
      },
    }),
    /permissão não foi aplicada/,
  )
  assert.equal(retained, true)
})
test('validates credentials before making requests', async () => {
  const client = mockClient()
  await assert.rejects(seedAdmin(client, { ...input, password: 'short' }), /12/)
  await assert.rejects(
    seedAdmin(client, { ...input, email: 'invalid' }),
    /e-mail/,
  )
  assert.equal(client.calls.pages.length, 0)
})
test('seeds only missing projects, preserving existing content and publication', async () => {
  const client = mockClient({ projects: [{ slug: 'pulso' }, { slug: 'pj' }] })
  assert.equal(await seedProjects(client), 1)
  assert.deepEqual(
    client.calls.inserted.map((project) => project.slug),
    ['fortuna'],
  )
  const existing = mockClient({
    projects: [{ slug: 'pulso' }, { slug: 'pj' }, { slug: 'fortuna' }],
  })
  assert.equal(await seedProjects(existing), 0)
  assert.equal(existing.calls.inserted.length, 0)
})
