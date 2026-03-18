import { supabase } from './supabase'
import type { Biome, Project, Tree, Task, Priority, TaskStatus } from '@/types'

let _userId: string | null = null
export function setCurrentUserId(id: string | null) { _userId = id }

// ─── Supabase row shapes ───────────────────────────────────────────────────────

interface BiomeRow {
  id: string
  user_id: string
  name: string
  color: string
  sort_order: number
}

interface ProjectRow {
  id: string
  user_id: string
  biome_id: string
  name: string
  sort_order: number
}

interface TreeRow {
  id: string
  user_id: string
  project_id: string
  week: string
  intention: string | null
  tasks?: TaskRow[]
}

interface TaskRow {
  id: string
  user_id: string
  tree_id: string
  title: string
  status: string
  priority: string
  carried_count: number
  sort_order: number
  created_at: string
  notes?: string | null
}

interface BacklogRow {
  id: string
  user_id: string
  project_id: string
  title: string
  priority: string
  carried_count: number
  sort_order: number
  created_at: string
  notes?: string | null
}

// ─── Row → store type mappers ─────────────────────────────────────────────────

function mapBiome(row: BiomeRow): Biome {
  return { id: row.id, name: row.name, color: row.color }
}

function mapProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, biomeId: row.biome_id }
}

function mapTask(
  row: TaskRow,
  week: string,
  project: Project | undefined,
  biome: Biome | undefined,
): Task {
  return {
    id:            row.id,
    title:         row.title,
    status:        row.status as TaskStatus,
    priority:      row.priority as Priority,
    biome:         biome?.id ?? '',
    project:       project?.name ?? '',
    carriedCount:  row.carried_count,
    createdAt:     row.created_at.slice(0, 10),
    scheduledWeek: week,
    notes:         row.notes ?? undefined,
  }
}

function mapBacklogTask(
  row: BacklogRow,
  project: Project | undefined,
  biome: Biome | undefined,
): Task {
  return {
    id:           row.id,
    title:        row.title,
    status:       'backlog' as TaskStatus,
    priority:     row.priority as Priority,
    biome:        biome?.id ?? '',
    project:      project?.name ?? '',
    carriedCount: row.carried_count,
    createdAt:    row.created_at.slice(0, 10),
    notes:        row.notes ?? undefined,
  }
}

// ─── Fetch all user data ───────────────────────────────────────────────────────

export async function fetchGardenData(): Promise<{
  biomes: Biome[]
  projects: Project[]
  trees: Tree[]
  backlog: Task[]
} | null> {
  if (!supabase) return null

  const [biomesRes, projectsRes, treesRes, tasksRes, backlogRes] = await Promise.all([
    supabase.from('biomes').select('*').order('sort_order'),
    supabase.from('projects').select('*').order('sort_order'),
    supabase.from('trees').select('*'),
    supabase.from('tasks').select('*').order('sort_order'),
    supabase.from('backlog_tasks').select('*').order('sort_order'),
  ])

  if (biomesRes.error || projectsRes.error || treesRes.error || tasksRes.error || backlogRes.error) {
    console.error('fetchGardenData errors:', biomesRes.error, projectsRes.error, treesRes.error, tasksRes.error, backlogRes.error)
    return null
  }

  const biomes   = (biomesRes.data   as BiomeRow[]).map(mapBiome)
  const projects = (projectsRes.data as ProjectRow[]).map(mapProject)

  const trees: Tree[] = (treesRes.data as TreeRow[]).map(treeRow => {
    const project = projects.find(p => p.id === treeRow.project_id)
    const biome   = biomes.find(b => b.id === project?.biomeId)
    const treeTasks = (tasksRes.data as TaskRow[])
      .filter(t => t.tree_id === treeRow.id)
      .map(t => mapTask(t, treeRow.week, project, biome))
    return {
      id:        treeRow.id,
      projectId: treeRow.project_id,
      week:      treeRow.week,
      intention: treeRow.intention ?? undefined,
      tasks:     treeTasks,
    }
  })

  const backlog: Task[] = (backlogRes.data as BacklogRow[]).map(row => {
    const project = projects.find(p => p.id === row.project_id)
    const biome   = biomes.find(b => b.id === project?.biomeId)
    return mapBacklogTask(row, project, biome)
  })

  return { biomes, projects, trees, backlog }
}

// ─── Seed default biomes for new users ────────────────────────────────────────

const DEFAULT_BIOMES = [
  { name: 'Work',     color: '#7BA89A', sort_order: 0 },
  { name: 'Personal', color: '#A8B87A', sort_order: 1 },
  { name: 'Health',   color: '#7AB88A', sort_order: 2 },
]

export async function seedDefaultBiomesIfEmpty(userId: string): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.from('biomes').select('id').limit(1)
  if (data && data.length > 0) return  // user already has biomes
  await supabase.from('biomes').insert(DEFAULT_BIOMES.map(b => ({ ...b, user_id: userId })))
}

// ─── Biomes ────────────────────────────────────────────────────────────────────

export async function renameBiome(id: string, name: string): Promise<void> {
  if (!supabase || !_userId) return
  await supabase.from('biomes').update({ name }).eq('id', id).eq('user_id', _userId)
}

export async function renameProject(id: string, name: string): Promise<void> {
  if (!supabase || !_userId) return
  await supabase.from('projects').update({ name }).eq('id', id).eq('user_id', _userId)
}

export async function createBiome(biome: Omit<Biome, 'id'>): Promise<string | null> {
  if (!supabase || !_userId) return null
  const { data } = await supabase.from('biomes').insert({ name: biome.name, color: biome.color, user_id: _userId }).select('id').single()
  return data?.id ?? null
}

export async function deleteBiome(biomeId: string): Promise<void> {
  if (!supabase) return
  const { data: projs } = await supabase.from('projects').select('id').eq('biome_id', biomeId)
  if (projs && projs.length > 0) {
    const projIds = projs.map((p: { id: string }) => p.id)
    const { data: treeRows } = await supabase.from('trees').select('id').in('project_id', projIds)
    if (treeRows && treeRows.length > 0) {
      const treeIds = treeRows.map((t: { id: string }) => t.id)
      await supabase.from('tasks').delete().in('tree_id', treeIds)
      await supabase.from('trees').delete().in('project_id', projIds)
    }
    await supabase.from('backlog_tasks').delete().in('project_id', projIds)
    await supabase.from('projects').delete().in('id', projIds)
  }
  await supabase.from('biomes').delete().eq('id', biomeId)
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(name: string, biomeId: string): Promise<string | null> {
  if (!supabase || !_userId) return null
  const { data } = await supabase.from('projects').insert({ name, biome_id: biomeId, user_id: _userId }).select('id').single()
  return data?.id ?? null
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!supabase) return
  const { data: treeRows } = await supabase.from('trees').select('id').eq('project_id', projectId)
  if (treeRows && treeRows.length > 0) {
    const treeIds = treeRows.map((t: { id: string }) => t.id)
    await supabase.from('tasks').delete().in('tree_id', treeIds)
    await supabase.from('trees').delete().eq('project_id', projectId)
  }
  await supabase.from('backlog_tasks').delete().eq('project_id', projectId)
  await supabase.from('projects').delete().eq('id', projectId)
}

// ─── Trees ────────────────────────────────────────────────────────────────────

export async function createTree(projectId: string, week: string, intention?: string): Promise<string | null> {
  if (!supabase || !_userId) return null
  const { data } = await supabase
    .from('trees')
    .insert({ project_id: projectId, week, intention: intention ?? null, user_id: _userId })
    .select('id')
    .single()
  return data?.id ?? null
}

// ─── Tree tasks ───────────────────────────────────────────────────────────────

export async function createTask(treeId: string, title: string, sortOrder = 0): Promise<string | null> {
  if (!supabase || !_userId) return null
  const { data } = await supabase
    .from('tasks')
    .insert({ tree_id: treeId, title, status: 'scheduled', priority: 'none', carried_count: 0, sort_order: sortOrder, user_id: _userId })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updateTask(taskId: string, updates: {
  title?: string
  status?: string
  priority?: string
  notes?: string
}): Promise<void> {
  if (!supabase) return
  await supabase.from('tasks').update(updates).eq('id', taskId)
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('tasks').delete().eq('id', taskId)
}

export async function insertBacklogTasksIntoTree(
  treeId: string,
  tasks: Task[],
  startSortOrder: number,
): Promise<void> {
  if (!supabase || tasks.length === 0) return
  const rows = tasks.map((t, i) => ({
    id:            t.id,
    tree_id:       treeId,
    title:         t.title,
    status:        'scheduled',
    priority:      t.priority,
    carried_count: t.carriedCount,
    sort_order:    startSortOrder + i,
    user_id:       _userId,
    notes:         t.notes ?? null,
  }))
  await supabase.from('tasks').insert(rows)
}

// ─── Backlog tasks ────────────────────────────────────────────────────────────

export async function createBacklogTask(
  projectId: string,
  title: string,
  priority: string = 'none',
  sortOrder = 0,
): Promise<string | null> {
  if (!supabase || !_userId) return null
  const { data } = await supabase
    .from('backlog_tasks')
    .insert({ project_id: projectId, title, priority, carried_count: 0, sort_order: sortOrder, user_id: _userId })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updateBacklogTask(taskId: string, updates: {
  title?: string
  priority?: string
  notes?: string
}): Promise<void> {
  if (!supabase) return
  await supabase.from('backlog_tasks').update(updates).eq('id', taskId)
}

export async function deleteBacklogTask(taskId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('backlog_tasks').delete().eq('id', taskId)
}

export async function deleteBacklogTasksById(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return
  await supabase.from('backlog_tasks').delete().in('id', ids)
}

export async function moveTasksToBacklog(
  tasks: Array<Task & { projectId: string }>
): Promise<void> {
  if (!supabase || !_userId || tasks.length === 0) return
  await supabase.from('tasks').delete().in('id', tasks.map(t => t.id))
  const rows = tasks.map((t, i) => ({
    project_id:    t.projectId,
    title:         t.title,
    priority:      t.priority,
    carried_count: t.carriedCount,
    sort_order:    i,
    user_id:       _userId,
    notes:         t.notes ?? null,
  }))
  await supabase.from('backlog_tasks').insert(rows)
}
