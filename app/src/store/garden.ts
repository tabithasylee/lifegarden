import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Biome, BiomeLayout, Project, Tree, Task } from '@/types'
import * as api from '@/lib/api'

const CURRENT_WEEK = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const wNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
  return `${d.getFullYear()}-W${String(wNum).padStart(2, '0')}`
})()

// Seed data — shown when Supabase is not configured (local mode)
const BIOMES: Biome[] = [
  { id: 'work',     name: 'Work',     color: '#7BA89A' },
  { id: 'personal', name: 'Personal', color: '#A8B87A' },
  { id: 'health',   name: 'Health',   color: '#7AB88A' },
]

const PROJECTS: Project[] = [
  { id: 'project-alpha', name: 'Project Alpha', biomeId: 'work'     },
  { id: 'side-quest',    name: 'Side Quest',    biomeId: 'work'     },
  { id: 'reading',       name: 'Reading',       biomeId: 'personal' },
  { id: 'fitness',       name: 'Fitness',       biomeId: 'health'   },
]

const TREES: Tree[] = [
  {
    id: 'tree-alpha-w10', projectId: 'project-alpha', week: '2026-W10',
    intention: 'Ship the plugin fix and take the afternoons slower.',
    tasks: [
      { id: 't1', title: 'Set up CI/CD pipeline',  status: 'complete',  priority: 'none',     biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-03-02' },
      { id: 't2', title: 'Write API spec draft',    status: 'complete',  priority: 'none',     biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-03-02' },
      { id: 't3', title: 'Review design handoff',   status: 'complete',  priority: 'high',     biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-03-03' },
      { id: 't4', title: 'Deploy to staging',       status: 'complete',  priority: 'critical', biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-03-04' },
      { id: 't5', title: 'Update docs',             status: 'scheduled', priority: 'none',     biome: 'work', project: 'Project Alpha', carriedCount: 2, createdAt: '2026-02-24' },
    ],
  },
  {
    id: 'tree-alpha-w09', projectId: 'project-alpha', week: '2026-W09',
    intention: 'Stabilise the API layer and close out open reviews.',
    tasks: [
      { id: 'w9t1', title: 'Triage open issues',      status: 'complete', priority: 'none', biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-23' },
      { id: 'w9t2', title: 'Fix auth token refresh',  status: 'complete', priority: 'high', biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-24' },
      { id: 'w9t3', title: 'Write integration tests', status: 'complete', priority: 'none', biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-25' },
    ],
  },
  {
    id: 'tree-alpha-w08', projectId: 'project-alpha', week: '2026-W08',
    tasks: [
      { id: 'w8t1', title: 'Kickoff planning', status: 'complete', priority: 'none', biome: 'work', project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-16' },
    ],
  },
  {
    id: 'tree-personal-w10', projectId: 'reading', week: '2026-W10',
    tasks: [
      { id: 't6',  title: 'Finish Thinking Fast and Slow', status: 'complete',  priority: 'none', biome: 'personal', project: 'Reading', carriedCount: 0, createdAt: '2026-03-03' },
      { id: 't6b', title: 'Notes + highlights pass',       status: 'scheduled', priority: 'none', biome: 'personal', project: 'Reading', carriedCount: 0, createdAt: '2026-03-04' },
    ],
  },
  {
    id: 'tree-health-w10', projectId: 'fitness', week: '2026-W10',
    tasks: [
      { id: 't7', title: 'Morning run 5k', status: 'complete',  priority: 'none', biome: 'health', project: 'Fitness', carriedCount: 0, createdAt: '2026-03-03' },
      { id: 't8', title: 'Gym — pull day', status: 'complete',  priority: 'none', biome: 'health', project: 'Fitness', carriedCount: 0, createdAt: '2026-03-04' },
      { id: 't9', title: 'Yoga session',   status: 'scheduled', priority: 'none', biome: 'health', project: 'Fitness', carriedCount: 0, createdAt: '2026-03-05' },
    ],
  },
]

const BACKLOG: Task[] = [
  { id: 'b1', title: 'Write Q1 retrospective doc',          status: 'backlog', priority: 'critical', biome: 'work',     project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-20' },
  { id: 'b2', title: 'Update onboarding flow',              status: 'backlog', priority: 'high',     biome: 'work',     project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-22' },
  { id: 'b3', title: 'Set up error monitoring',             status: 'backlog', priority: 'none',     biome: 'work',     project: 'Project Alpha', carriedCount: 0, createdAt: '2026-02-25' },
  { id: 'b4', title: 'Research new note-taking tools',      status: 'backlog', priority: 'none',     biome: 'work',     project: 'Side Quest',    carriedCount: 0, createdAt: '2026-02-28' },
  { id: 'b5', title: 'Start Meditations — Marcus Aurelius', status: 'backlog', priority: 'none',     biome: 'personal', project: 'Reading',       carriedCount: 0, createdAt: '2026-03-01' },
]

interface GardenStore {
  // Data
  biomes:   Biome[]
  projects: Project[]
  trees:    Tree[]
  backlog:  Task[]
  currentWeek: string

  // UI state
  activeView:          'garden' | 'tasks' | 'backlog'
  viewWeek:            string
  activeTreeId:        string | null
  activeBiomeId:       string | null
  biomeLayouts:        Record<string, BiomeLayout>
  biomeCreatePos:      { x: number; z: number } | null
  activeTask:          { treeId: string; taskId: string } | null
  activeBacklogTaskId: string | null
  isCreatingTask:      boolean
  isCreatingBiome:     boolean
  createContext:       { projectId: string } | null
  treeLayouts:         Record<string, { wx: number; wy: number }>
  plantPos:            { x: number; z: number } | null

  // Async state
  isLoading: boolean

  // Edit mode
  isEditMode: boolean
  setEditMode: (v: boolean) => void
  setTreeLayout: (treeId: string, wx: number, wy: number) => void

  // UI setters
  setActiveView:        (view: 'garden' | 'tasks' | 'backlog') => void
  setViewWeek:          (week: string) => void
  setActiveTree:        (id: string | null) => void
  setActiveBiome:       (id: string | null, pos?: { x: number; z: number }) => void
  setBiomeLayout:       (id: string, layout: BiomeLayout) => void
  setActiveTask:        (ref: { treeId: string; taskId: string } | null) => void
  setActiveBacklogTask: (id: string | null) => void
  setCreatingTask:      (creating: boolean, context?: { projectId: string }) => void
  setCreatingBiome:     (creating: boolean, pos?: { x: number; z: number }) => void

  // Data actions
  loadUserData:    (userId: string) => Promise<void>
  addBiome:        (name: string, color: string) => void
  deleteBiome:     (biomeId: string) => void
  addProject:      (name: string, biomeId: string) => Promise<Project>
  renameProject:   (projectId: string, name: string) => void
  renameBiome:     (biomeId: string, name: string) => void
  deleteProject:   (projectId: string) => void
  toggleTaskStatus:(treeId: string, taskId: string) => void
  updateTask:      (treeId: string, taskId: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'status' | 'notes'>>) => void
  deleteTask:      (treeId: string, taskId: string) => void
  updateBacklogTask:(taskId: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'notes'>>) => void
  deleteBacklogTask:(taskId: string) => void
  addBacklogTask:  (title: string, projectId: string, priority?: Task['priority']) => void
  plantTree:       (projectId: string, backlogTaskIds: string[], intention: string, initialTaskTitle?: string) => void
  addTaskToTree:                  (treeId: string, title: string) => void
  moveUncompletedToBacklog:       (treeId: string) => void
  addBacklogTasksToCurrentWeek:   (taskIds: string[]) => void

  getTreesForWeek:          (week: string) => Tree[]
  getTreeByProjectAndWeek:  (projectId: string, week: string) => Tree | undefined
}

export const useGardenStore = create<GardenStore>()(
  persist(
    (set, get) => ({
      biomes:      BIOMES,
      projects:    PROJECTS,
      trees:       TREES,
      backlog:     BACKLOG,
      currentWeek: CURRENT_WEEK,

      activeView:          'garden',
      viewWeek:            CURRENT_WEEK,
      activeTreeId:        null,
      activeBiomeId:       null,
      biomeLayouts:        {},
      biomeCreatePos:      null,
      activeTask:          null,
      activeBacklogTaskId: null,
      isCreatingTask:      false,
      isCreatingBiome:     false,
      createContext:       null,
      treeLayouts:         {},
      plantPos:            null,
      isLoading:           false,
      isEditMode:          false,

      setEditMode:   (v) => set({ isEditMode: v }),
      setTreeLayout: (treeId, wx, wy) =>
        set(s => ({ treeLayouts: { ...s.treeLayouts, [treeId]: { wx, wy } } })),

      setActiveView:        (view)    => set({ activeView: view }),
      setViewWeek:          (week)    => set({ viewWeek: week }),
      setActiveTree:        (id)      => set({ activeTreeId: id }),
      setActiveBiome:       (id, pos) => set({ activeBiomeId: id, plantPos: id ? (pos ?? null) : null }),
      setBiomeLayout:       (id, layout) => set(s => ({ biomeLayouts: { ...s.biomeLayouts, [id]: layout } })),
      setActiveTask:        (ref)     => set({ activeTask: ref }),
      setActiveBacklogTask: (id)      => set({ activeBacklogTaskId: id }),
      setCreatingTask:      (creating, context) =>
        set({ isCreatingTask: creating, createContext: context ?? null }),
      setCreatingBiome:     (creating, pos) => set({ isCreatingBiome: creating, biomeCreatePos: pos ?? null }),

      // Load all user data from Supabase (replaces seed data on first login)
      loadUserData: async (userId) => {
        set({ isLoading: true })
        const data = await api.fetchGardenData()
        if (data) {
          if (data.biomes.length === 0) {
            await api.seedDefaultBiomesIfEmpty(userId)
            const fresh = await api.fetchGardenData()
            set({ ...(fresh ?? data), isLoading: false })
          } else {
            // Deduplicate biomes by name in case of past race-condition inserts
            const seen = new Set<string>()
            data.biomes = data.biomes.filter(b => {
              const k = b.name.toLowerCase()
              if (seen.has(k)) return false
              seen.add(k); return true
            })
            set({ ...data, isLoading: false })
          }
        } else {
          set({ isLoading: false })
        }
      },

      addBiome: (name, color) => {
        const newBiome: Biome = {
          id:    `biome-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name:  name.trim(),
          color,
        }
        const pos = get().biomeCreatePos
        set(state => ({
          biomes: [...state.biomes, newBiome],
          biomeLayouts: pos ? {
            ...state.biomeLayouts,
            [newBiome.id]: { cx: pos.x, cy: pos.z, rx: 260, ry: 180 },
          } : state.biomeLayouts,
        }))
        api.createBiome({ name: newBiome.name, color }).catch(console.error)
      },

      deleteBiome: (biomeId) => {
        const projectIds = get().projects.filter(p => p.biomeId === biomeId).map(p => p.id)
        set(state => ({
          biomes:   state.biomes.filter(b => b.id !== biomeId),
          projects: state.projects.filter(p => p.biomeId !== biomeId),
          trees:    state.trees.filter(t => !projectIds.includes(t.projectId)),
          backlog:  state.backlog.filter(t => t.biome !== biomeId),
        }))
        api.deleteBiome(biomeId).catch(console.error)
      },

      renameBiome: (biomeId, name) => {
        set(state => ({ biomes: state.biomes.map(b => b.id === biomeId ? { ...b, name: name.trim() } : b) }))
        api.renameBiome(biomeId, name.trim()).catch(console.error)
      },

      renameProject: (projectId, name) => {
        const oldName = get().projects.find(p => p.id === projectId)?.name
        set(state => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, name: name.trim() } : p),
          backlog:  state.backlog.map(t => t.project === oldName ? { ...t, project: name.trim() } : t),
          trees:    state.trees.map(tree => ({
            ...tree,
            tasks: tree.tasks.map(t => t.project === oldName ? { ...t, project: name.trim() } : t),
          })),
        }))
        api.renameProject(projectId, name.trim()).catch(console.error)
      },

      deleteProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId)
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          trees:    state.trees.filter(t => t.projectId !== projectId),
          backlog:  state.backlog.filter(t => t.project !== project?.name),
        }))
        api.deleteProject(projectId).catch(console.error)
      },

      addProject: async (name, biomeId) => {
        const tempId = `project-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        const newProject: Project = { id: tempId, name: name.trim(), biomeId }
        set(state => ({ projects: [...state.projects, newProject] }))
        const dbId = await api.createProject(newProject.name, biomeId).catch(() => null)
        if (dbId) {
          set(state => ({
            projects: state.projects.map(p => p.id === tempId ? { ...p, id: dbId } : p),
            trees:    state.trees.map(t => t.projectId === tempId ? { ...t, projectId: dbId } : t),
          }))
          return { ...newProject, id: dbId }
        }
        return newProject
      },

      toggleTaskStatus: (treeId, taskId) => {
        set(state => ({
          trees: state.trees.map(tree =>
            tree.id !== treeId ? tree : {
              ...tree,
              tasks: tree.tasks.map(task =>
                task.id !== taskId ? task : {
                  ...task,
                  status: task.status === 'complete' ? 'scheduled' : 'complete',
                }
              ),
            }
          ),
        }))
        const task = get().trees.find(t => t.id === treeId)?.tasks.find(t => t.id === taskId)
        if (task) {
          api.updateTask(taskId, { status: task.status }).catch(console.error)
        }
      },

      updateTask: (treeId, taskId, updates) => {
        set(state => ({
          trees: state.trees.map(tree =>
            tree.id !== treeId ? tree : {
              ...tree,
              tasks: tree.tasks.map(task =>
                task.id !== taskId ? task : { ...task, ...updates }
              ),
            }
          ),
        }))
        api.updateTask(taskId, {
          title:    updates.title,
          priority: updates.priority,
          status:   updates.status,
          notes:    updates.notes,
        }).catch(console.error)
      },

      deleteTask: (treeId, taskId) => {
        set(state => ({
          trees: state.trees.map(tree =>
            tree.id !== treeId ? tree : {
              ...tree,
              tasks: tree.tasks.filter(task => task.id !== taskId),
            }
          ),
          activeTask: state.activeTask?.taskId === taskId ? null : state.activeTask,
        }))
        api.deleteTask(taskId).catch(console.error)
      },

      updateBacklogTask: (taskId, updates) => {
        set(state => ({
          backlog: state.backlog.map(t => t.id !== taskId ? t : { ...t, ...updates }),
        }))
        api.updateBacklogTask(taskId, {
          title:    updates.title,
          priority: updates.priority,
          notes:    updates.notes,
        }).catch(console.error)
      },

      deleteBacklogTask: (taskId) => {
        set(state => ({
          backlog: state.backlog.filter(t => t.id !== taskId),
          activeBacklogTaskId: state.activeBacklogTaskId === taskId ? null : state.activeBacklogTaskId,
        }))
        api.deleteBacklogTask(taskId).catch(console.error)
      },

      addBacklogTask: (title, projectId, priority = 'none') => {
        const { projects, biomes } = get()
        const project = projects.find(p => p.id === projectId)
        const biome   = biomes.find(b => b.id === project?.biomeId)
        const newTask: Task = {
          id:           crypto.randomUUID(),
          title:        title.trim(),
          status:       'backlog',
          priority,
          biome:        biome?.id   ?? '',
          project:      project?.name ?? '',
          carriedCount: 0,
          createdAt:    new Date().toISOString().slice(0, 10),
        }
        set(state => ({ backlog: [...state.backlog, newTask] }))
        api.createBacklogTask(projectId, title.trim(), priority).catch(console.error)
      },

      plantTree: (projectId, backlogTaskIds, intention, initialTaskTitle = '') => {
        const { currentWeek, trees, backlog } = get()
        const plantPos = get().plantPos

        const pulledTasks: Task[] = backlogTaskIds
          .map(id => backlog.find(t => t.id === id))
          .filter((t): t is Task => t !== undefined)
          .map(t => ({ ...t, status: 'scheduled' as const, scheduledWeek: currentWeek }))

        const existing = trees.find(t => t.projectId === projectId && t.week === currentWeek)
        if (existing) {
          set({
            trees: trees.map(tree =>
              tree.id === existing.id
                ? { ...tree, tasks: [...tree.tasks, ...pulledTasks] }
                : tree
            ),
            backlog:       backlog.filter(t => !backlogTaskIds.includes(t.id)),
            activeBiomeId: null,
            activeTreeId:  existing.id,
          })
          api.insertBacklogTasksIntoTree(existing.id, pulledTasks, existing.tasks.length).catch(console.error)
          api.deleteBacklogTasksById(backlogTaskIds).catch(console.error)
          return
        }

        const newTree: Tree = {
          id:        `tree-${projectId}-${currentWeek}-${Date.now()}`,
          projectId,
          week:      currentWeek,
          tasks:     pulledTasks,
          intention: intention.trim() || undefined,
        }

        set({
          trees:         [...trees, newTree],
          backlog:       backlog.filter(t => !backlogTaskIds.includes(t.id)),
          activeBiomeId: null,
          activeTreeId:  newTree.id,
          treeLayouts: plantPos
            ? { ...get().treeLayouts, [newTree.id]: { wx: plantPos.x, wy: plantPos.z } }
            : get().treeLayouts,
        })

        const tempId = newTree.id
        api.createTree(projectId, currentWeek, intention.trim() || undefined)
          .then(dbTreeId => {
            if (!dbTreeId) return

            const initialTask: Task | null = initialTaskTitle.trim() ? {
              id:            crypto.randomUUID(),
              title:         initialTaskTitle.trim(),
              status:        'scheduled' as const,
              priority:      'none' as const,
              biome:         get().biomes.find(b => b.id === get().projects.find(p => p.id === projectId)?.biomeId)?.id ?? '',
              project:       get().projects.find(p => p.id === projectId)?.name ?? '',
              carriedCount:  0,
              createdAt:     new Date().toISOString().slice(0, 10),
              scheduledWeek: currentWeek,
            } : null

            set(state => ({
              trees: state.trees.map(t => t.id === tempId
                ? {
                    ...t,
                    id: dbTreeId,
                    tasks: initialTask ? [...t.tasks, initialTask] : t.tasks,
                  }
                : t
              ),
              activeTreeId: state.activeTreeId === tempId ? dbTreeId : state.activeTreeId,
              treeLayouts: (() => {
                const next = { ...state.treeLayouts }
                if (next[tempId]) { next[dbTreeId] = next[tempId]; delete next[tempId] }
                return next
              })(),
            }))

            const apiCalls: Promise<unknown>[] = []
            if (pulledTasks.length > 0) {
              apiCalls.push(api.insertBacklogTasksIntoTree(dbTreeId, pulledTasks, 0))
            }
            if (initialTask) {
              apiCalls.push(api.createTask(dbTreeId, initialTask.title, pulledTasks.length).catch(console.error))
            }
            apiCalls.push(api.deleteBacklogTasksById(backlogTaskIds))
            return Promise.all(apiCalls)
          })
          .catch(console.error)
      },

      addTaskToTree: (treeId, title) => {
        if (!title.trim()) return
        const { trees, projects, biomes, currentWeek } = get()
        const tree    = trees.find(t => t.id === treeId)
        const project = projects.find(p => p.id === tree?.projectId)
        const biome   = biomes.find(b => b.id === project?.biomeId)
        if (!tree) return

        const newTask: Task = {
          id:            crypto.randomUUID(),
          title:         title.trim(),
          status:        'scheduled',
          priority:      'none',
          biome:         biome?.id   ?? '',
          project:       project?.name ?? '',
          carriedCount:  0,
          createdAt:     new Date().toISOString().slice(0, 10),
          scheduledWeek: currentWeek,
        }
        set({
          trees: trees.map(t =>
            t.id === treeId ? { ...t, tasks: [...t.tasks, newTask] } : t
          ),
        })
        api.createTask(treeId, title.trim(), tree.tasks.length).catch(console.error)
      },

      moveUncompletedToBacklog: (treeId) => {
        const { trees, projects } = get()
        const tree = trees.find(t => t.id === treeId)
        if (!tree) return

        const incomplete = tree.tasks.filter(t => t.status !== 'complete')
        if (incomplete.length === 0) return

        const moved: Task[] = incomplete.map(t => ({
          ...t,
          status:        'backlog' as const,
          carriedCount:  t.carriedCount + 1,
          scheduledWeek: undefined,
        }))

        set(state => ({
          trees:   state.trees.map(tr =>
            tr.id !== treeId ? tr : { ...tr, tasks: tr.tasks.filter(t => t.status === 'complete') }
          ),
          backlog: [...state.backlog, ...moved],
        }))

        const project = projects.find(p => p.id === tree.projectId)
        if (!project) return
        const enriched = moved.map(t => ({ ...t, projectId: project.id }))
        api.moveTasksToBacklog(enriched).catch(console.error)
      },

      addBacklogTasksToCurrentWeek: (taskIds) => {
        const { currentWeek, trees, backlog, projects } = get()
        const selected = taskIds
          .map(id => backlog.find(t => t.id === id))
          .filter((t): t is Task => t !== undefined)

        // Group by projectId (tasks store project name, look up id)
        const byProject = new Map<string, Task[]>()
        for (const task of selected) {
          const project = projects.find(p => p.name === task.project)
          if (!project) continue
          const arr = byProject.get(project.id) ?? []
          arr.push(task)
          byProject.set(project.id, arr)
        }

        let nextTrees = [...trees]
        const newBacklog = backlog.filter(t => !taskIds.includes(t.id))
        const apiCalls: Promise<unknown>[] = []

        for (const [projectId, tasks] of byProject) {
          const pulled = tasks.map(t => ({ ...t, status: 'scheduled' as const, scheduledWeek: currentWeek }))
          const existing = nextTrees.find(t => t.projectId === projectId && t.week === currentWeek)

          if (existing) {
            nextTrees = nextTrees.map(t =>
              t.id === existing.id ? { ...t, tasks: [...t.tasks, ...pulled] } : t
            )
            apiCalls.push(
              api.insertBacklogTasksIntoTree(existing.id, pulled, existing.tasks.length)
                .then(() => api.deleteBacklogTasksById(tasks.map(t => t.id)))
            )
          } else {
            const tempId = `tree-${projectId}-${currentWeek}-${Date.now()}`
            const newTree: Tree = { id: tempId, projectId, week: currentWeek, tasks: pulled }
            nextTrees = [...nextTrees, newTree]
            apiCalls.push(
              api.createTree(projectId, currentWeek, undefined).then(dbTreeId => {
                if (!dbTreeId) {
                  // Rollback: remove temp tree, restore tasks to backlog
                  set(state => ({
                    trees:   state.trees.filter(t => t.id !== tempId),
                    backlog: [...state.backlog, ...tasks],
                  }))
                  return
                }
                set(state => ({
                  trees: state.trees.map(t => t.id === tempId ? { ...t, id: dbTreeId } : t),
                }))
                return api.insertBacklogTasksIntoTree(dbTreeId, pulled, 0)
                  .then(() => api.deleteBacklogTasksById(tasks.map(t => t.id)))
              })
            )
          }
        }

        set({ trees: nextTrees, backlog: newBacklog })
        Promise.all(apiCalls).catch(console.error)
      },

      getTreesForWeek:         (week) => get().trees.filter(t => t.week === week),
      getTreeByProjectAndWeek: (projectId, week) =>
        get().trees.find(t => t.projectId === projectId && t.week === week),
    }),
    {
      name: 'lifegarden-store',
      // Only persist data, not transient UI state
      partialize: (state) => ({
        biomes:       state.biomes,
        projects:     state.projects,
        trees:        state.trees,
        backlog:      state.backlog,
        currentWeek:  state.currentWeek,
        viewWeek:     state.viewWeek,
        biomeLayouts: state.biomeLayouts,
        treeLayouts:  state.treeLayouts,
      }),
    }
  )
)
