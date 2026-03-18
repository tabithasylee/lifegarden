export type Priority = 'critical' | 'high' | 'none'

export type TaskStatus = 'backlog' | 'scheduled' | 'complete'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  biome: string          // 'work' | 'personal' | 'health'
  project: string        // project name
  carriedCount: number
  createdAt: string
  scheduledWeek?: string // ISO week key e.g. '2026-W10'
  completedAt?: string
  notes?: string
}

export interface Project {
  id: string
  name: string
  biomeId: string
}

export interface Biome {
  id: string
  name: string
  color: string          // contour stroke color
}

export interface Tree {
  id: string
  projectId: string
  week: string           // ISO week key '2026-W10'
  tasks: Task[]
  intention?: string
}

export interface BiomeLayout {
  cx: number; cy: number   // center in world XZ
  rx: number; ry: number   // radii
}

