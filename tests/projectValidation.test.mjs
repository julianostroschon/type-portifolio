import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateProject } from '../src/services/projectValidation.js'
const valid = {
  slug: 'meu-projeto',
  name: ' Projeto ',
  label: '01 / APP',
  category: 'Gestão',
  description: 'Descrição',
  url: 'https://example.com/',
  repository: 'https://github.com/example/app',
  theme: 'pulso',
  symbol: '↗',
  tags: ' Vue, PostgreSQL, ',
  published: false,
}
test('normalizes form fields and keeps drafts unpublished', () => {
  const result = validateProject(valid)
  assert.equal(result.name, 'Projeto')
  assert.deepEqual(result.tags, ['Vue', 'PostgreSQL'])
  assert.equal(result.published, false)
  assert.equal('id' in result, false)
})
test('rejects unsafe URLs and embedded credentials', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:password@example.com',
    'not a URL',
  ]) {
    assert.throws(() => validateProject({ ...valid, url }), /HTTPS/)
    assert.throws(() => validateProject({ ...valid, repository: url }), /HTTPS/)
  }
})
test('rejects invalid identifiers, themes and oversized fields', () => {
  for (const slug of ['Meu Projeto', '-app', 'app-', 'a'.repeat(81)])
    assert.throws(() => validateProject({ ...valid, slug }))
  assert.throws(() => validateProject({ ...valid, theme: 'unknown' }))
  assert.throws(() =>
    validateProject({ ...valid, description: 'a'.repeat(1001) }),
  )
  assert.throws(() =>
    validateProject({ ...valid, tags: Array(11).fill('Vue').join(',') }),
  )
  assert.throws(() => validateProject({ ...valid, tags: 'a'.repeat(41) }))
})
