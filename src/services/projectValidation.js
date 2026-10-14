export function validateProject(input) {
  const text = (key, max) => {
    const value = String(input[key] ?? '').trim()
    if (!value || value.length > max)
      throw new Error(`Preencha ${key} com até ${max} caracteres.`)
    return value
  }
  const link = (key) => {
    const value = text(key, 2048)
    let url
    try {
      url = new URL(value)
    } catch {
      throw new Error('Informe URLs HTTPS válidas.')
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Informe URLs HTTPS válidas, sem credenciais.')
    return value
  }
  const slug = text('slug', 80)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      'O identificador deve usar letras minúsculas, números e hífens.',
    )
  if (!['pulso', 'pj', 'fortuna'].includes(input.theme))
    throw new Error('Escolha uma cor válida.')
  const tags = String(input.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length > 10 || tags.some((tag) => tag.length > 40))
    throw new Error('Use até 10 tecnologias, com até 40 caracteres cada.')
  return {
    slug,
    name: text('name', 120),
    label: text('label', 80),
    category: text('category', 120),
    description: text('description', 1000),
    url: link('url'),
    repository: link('repository'),
    theme: input.theme,
    symbol: text('symbol', 8),
    tags,
    published: Boolean(input.published),
  }
}
