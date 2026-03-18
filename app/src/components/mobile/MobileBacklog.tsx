import { useState } from 'react'
import { useGardenStore } from '@/store/garden'
import MobileBottomTabs from './MobileBottomTabs'

const BIOME_COLOR: Record<string, string> = {
  work: '#7BA89A', personal: '#A8B87A', health: '#7AB88A',
}

type FilterId = 'all' | 'work' | 'personal' | 'health'

export default function MobileBacklog() {
  const { biomes, projects, backlog, setActiveBacklogTask, setCreatingTask } = useGardenStore()
  const [filter, setFilter] = useState<FilterId>('all')

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all',      label: 'ALL'      },
    { id: 'work',     label: 'WORK'     },
    { id: 'personal', label: 'PERSONAL' },
    { id: 'health',   label: 'HEALTH'   },
  ]

  const visibleTasks = backlog.filter(task => {
    if (filter === 'all') return true
    return task.biome === filter
  })

  return (
    <div className="flex flex-col w-full h-full">
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: 44,
          background: 'rgba(8,20,16,0.95)',
          borderBottom: '0.5px solid rgba(232,213,160,0.08)',
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-cream leading-none">LIFEGARDEN</span>
          <span className="font-mono text-[7px] tracking-[0.1em] leading-none" style={{ color: '#7B9E8B' }}>BACKLOG</span>
        </div>
        <button
          onClick={() => setCreatingTask(true)}
          className="font-mono text-[9px] font-bold tracking-[0.08em] px-3 py-1.5"
          style={{ background: '#e2b540', color: '#112f2c' }}
        >
          + Add task
        </button>
      </div>

      {/* Filter tabs */}
      <div
        className="flex-shrink-0 flex"
        style={{ borderBottom: '0.5px solid rgba(232,213,160,0.08)' }}
      >
        {filters.map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-4 py-2.5"
              style={{
                borderBottom: active ? '1.5px solid #e2b540' : '1.5px solid transparent',
              }}
            >
              <span
                className="font-mono text-[8px] tracking-[0.08em]"
                style={{ color: active ? '#e2b540' : 'rgba(251,230,160,0.4)' }}
              >
                {f.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {filter === 'all' ? (
          // Grouped by biome → project
          biomes.map(biome => {
            const biomeProjects = projects.filter(p => p.biomeId === biome.id)
            const biomeTasks    = backlog.filter(t => t.biome === biome.id)
            if (biomeTasks.length === 0) return null
            return (
              <div key={biome.id}>
                {/* Biome header */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 6, height: 6, background: BIOME_COLOR[biome.id] ?? '#7B9E8B' }}
                  />
                  <span
                    className="font-mono text-[8px] tracking-[0.12em] uppercase"
                    style={{ color: BIOME_COLOR[biome.id] ?? '#7B9E8B' }}
                  >
                    {biome.name}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(232,213,160,0.07)' }} />
                </div>
                {biomeProjects.map(project => {
                  const projectTasks = backlog.filter(t => t.project === project.name)
                  if (projectTasks.length === 0) return null
                  return (
                    <div key={project.id}>
                      <div className="flex items-baseline justify-between px-5 pt-2 pb-1">
                        <span className="font-serif text-[12px] font-[400]" style={{ color: 'rgba(251,230,160,0.55)' }}>
                          {project.name}
                        </span>
                        <span className="font-mono text-[8px]" style={{ color: 'rgba(251,230,160,0.25)' }}>
                          {projectTasks.length}
                        </span>
                      </div>
                      {projectTasks.map(task => (
                        <TaskRow key={task.id} task={task} onTap={() => setActiveBacklogTask(task.id)} />
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })
        ) : (
          // Flat filtered list
          visibleTasks.map(task => (
            <TaskRow key={task.id} task={task} onTap={() => setActiveBacklogTask(task.id)} />
          ))
        )}

        {visibleTasks.length === 0 && (
          <div className="px-5 py-6">
            <span className="font-serif italic text-[12px] font-[300]" style={{ color: 'rgba(251,230,160,0.22)' }}>
              Nothing here yet.
            </span>
          </div>
        )}
      </div>

      <MobileBottomTabs />
    </div>
  )
}

function TaskRow({ task, onTap }: { task: import('@/types').Task; onTap: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-[10px] cursor-pointer"
      style={{
        borderBottom: '0.5px solid rgba(232,213,160,0.06)',
        borderLeft: task.priority === 'critical' ? '1.5px solid #da525d'
          : task.priority === 'high' ? '1.5px solid rgba(226,181,64,0.5)'
          : '1.5px solid transparent',
      }}
      onClick={onTap}
    >
      <div
        className="flex-shrink-0 rounded-full"
        style={{ width: 13, height: 13, border: '1px solid rgba(251,230,160,0.22)' }}
      />
      <span className="flex-1 font-serif text-[13px] font-[400] leading-snug" style={{ color: '#fbe6a0' }}>
        {task.title}
      </span>
      {task.priority !== 'none' ? (
        <span
          className="font-mono text-[8px] tracking-[0.07em] flex-shrink-0"
          style={{ color: task.priority === 'critical' ? '#da525d' : '#e2b540' }}
        >
          {task.priority.toUpperCase()}
        </span>
      ) : (
        <span className="font-mono text-[8px] flex-shrink-0" style={{ color: 'rgba(251,230,160,0.2)' }}>—</span>
      )}
    </div>
  )
}
