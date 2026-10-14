import { initialProjects } from '../data/projects'
import { requireSupabase, supabase } from './supabase'
import { validateProject } from './projectValidation'
const fields =
  'id,slug,name,label,category,description,url,repository,theme,symbol,tags,published,created_at,updated_at'
export async function loadPublicProjects() {
  if (!supabase) return initialProjects
  const { data, error } = await supabase
    .from('projects')
    .select(fields)
    .eq('published', true)
    .order('created_at')
  if (error) throw error
  return data
}
export async function loadAdminProjects() {
  const { data, error } = await requireSupabase()
    .from('projects')
    .select(fields)
    .order('created_at')
  if (error) throw new Error('Não foi possível carregar os projetos.')
  return data
}
export async function saveProject(input) {
  const payload = validateProject(input)
  const query = input.id
    ? requireSupabase().from('projects').update(payload).eq('id', input.id)
    : requireSupabase().from('projects').insert(payload)
  const { data, error } = await query.select('id').single()
  if (error || !data)
    throw new Error(
      'Não foi possível salvar. Confira sua permissão e se o identificador já existe.',
    )
  return data
}

export async function deleteProject(id) {
  const { data, error } = await requireSupabase()
    .from('projects')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error || !data)
    throw new Error(
      'Não foi possível remover. Confira sua permissão e tente novamente.',
    )
  return data
}
