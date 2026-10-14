import { initialProjects } from '../../src/data/projects.js'

export async function seedProjects(client) {
  const entries = initialProjects.map((project) => ({
    ...project,
    slug: project.name.toLowerCase(),
    published: true,
  }))
  const { data, error } = await client
    .from('projects')
    .select('slug')
    .in(
      'slug',
      entries.map((project) => project.slug),
    )
  if (error)
    throw new Error(
      'Não foi possível consultar os projetos. Aplique a migração antes da seed.',
    )
  const existing = new Set(data.map((project) => project.slug))
  const missing = entries.filter((project) => !existing.has(project.slug))
  if (missing.length) {
    const { error: insertError } = await client.from('projects').insert(missing)
    if (insertError)
      throw new Error('Não foi possível inserir os projetos iniciais.')
  }
  return missing.length
}

export async function seedAdmin(
  client,
  { email, password, onCreated = async () => {} },
) {
  email = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Informe um e-mail válido para o administrador.')
  if (password.length < 12)
    throw new Error('A senha da seed deve ter pelo menos 12 caracteres.')
  let user
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    if (error)
      throw new Error(
        'Não foi possível consultar usuários. Confira a chave administrativa da seed.',
      )
    user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    )
    if (user || data.users.length < 100) break
  }
  let created = false
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user)
      throw new Error(
        'Não foi possível criar o administrador. Confira a configuração de autenticação e a política de senha.',
      )
    user = data.user
    created = true
    // Save credentials before assigning the role so a later database failure cannot lose them.
    await onCreated(user, password)
  }
  const { error } = await client
    .from('platform_admins')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' })
  if (error)
    throw new Error(
      'Usuário encontrado/criado, mas a permissão não foi aplicada. Aplique a migração e execute a seed novamente.',
    )
  return { id: user.id, email, created }
}
