import { useGardenStore } from '@/store/garden'
import { weekLabel, offsetWeek } from '@/lib/weeks'
import MobileBottomTabs from './MobileBottomTabs'

const BIOME_COLOR: Record<string, string> = {
  work: '#7BA89A', personal: '#A8B87A', health: '#7AB88A',
}

export default function MobileWeekView() {
  const { trees, projects, biomes, currentWeek, viewWeek, setViewWeek, setActiveTask, updateTask } = useGardenStore()

  const weekTrees = trees.filter(t => t.week === viewWeek)

  // Group: biome → project → tasks
  const grouped = biomes.flatMap(biome => {
    const biomeProjects = projects.filter(p => p.biomeId === biome.id)
    return biomeProjects.flatMap(project => {
      const tree = weekTrees.find(t => t.projectId === project.id)
      if (!tree || tree.tasks.length === 0) return []
      return [{ biome, project, tree, tasks: tree.tasks }]
    })
  })

  const allTasks  = weekTrees.flatMap(t => t.tasks)
  const completed = allTasks.filter(t => t.status === 'complete').length
  const total     = allTasks.length

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
          <span className="font-mono text-[7px] tracking-[0.1em] leading-none" style={{ color: '#7B9E8B' }}>WEEK VIEW</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewWeek(offsetWeek(viewWeek, -1))}
            className="flex items-center justify-center font-mono text-[14px] leading-none"
            style={{ width: 30, height: 30, color: 'rgba(251,230,160,0.45)' }}
          >
            ‹
          </button>
          <div className="text-center" style={{ minWidth: 48 }}>
            <span className="font-mono text-[11px] font-bold" style={{ color: viewWeek === currentWeek ? '#e2b540' : '#fbe6a0' }}>
              {weekLabel(viewWeek)}
            </span>
          </div>
          <button
            onClick={() => setViewWeek(offsetWeek(viewWeek, 1))}
            className="flex items-center justify-center font-mono text-[14px] leading-none"
            style={{ width: 30, height: 30, color: 'rgba(251,230,160,0.45)' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Progress summary */}
      {total > 0 && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-2"
          style={{ borderBottom: '0.5px solid rgba(232,213,160,0.07)' }}
        >
          <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: 'rgba(251,230,160,0.35)' }}>
            {completed} / {total} COMPLETE
          </span>
          <div
            className="relative rounded-full overflow-hidden"
            style={{ width: 80, height: 1.5, background: 'rgba(232,213,160,0.08)' }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(completed / total) * 100}%`, background: '#44CF6C' }}
            />
          </div>
        </div>
      )}

      {/* Task list grouped by biome → project */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-5 py-6">
            <span className="font-serif italic text-[12px] font-[300]" style={{ color: 'rgba(251,230,160,0.22)' }}>
              Nothing scheduled this week…
            </span>
          </div>
        ) : (
          grouped.map(({ biome, project, tree, tasks }) => {
            const biomeColor = BIOME_COLOR[biome.id] ?? '#7B9E8B'
            const done  = tasks.filter(t => t.status === 'complete').length
            return (
              <div key={`${biome.id}-${project.id}`}>
                {/* Biome + project header */}
                <div
                  className="flex items-center gap-2 px-5 py-2"
                  style={{ borderBottom: '0.5px solid rgba(232,213,160,0.06)' }}
                >
                  <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: biomeColor }} />
                  <span className="font-mono text-[8px] tracking-[0.1em] uppercase" style={{ color: biomeColor }}>
                    {biome.name}
                  </span>
                  <span className="font-mono text-[8px]" style={{ color: 'rgba(251,230,160,0.2)' }}>·</span>
                  <span className="font-mono text-[8px] tracking-[0.08em] uppercase flex-1" style={{ color: 'rgba(251,230,160,0.5)' }}>
                    {project.name}
                  </span>
                  <span className="font-mono text-[8px]" style={{ color: 'rgba(251,230,160,0.25)' }}>
                    {done}/{tasks.length}
                  </span>
                </div>

                {/* Tasks */}
                {tasks.map(task => {
                  const isDone = task.status === 'complete'
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 px-5 py-[10px] cursor-pointer"
                      style={{
                        borderBottom: '0.5px solid rgba(232,213,160,0.05)',
                        borderLeft: task.priority === 'critical' ? '1.5px solid #da525d'
                          : task.priority === 'high' ? '1.5px solid rgba(226,181,64,0.5)'
                          : '1.5px solid transparent',
                      }}
                      onClick={() => setActiveTask({ treeId: tree.id, taskId: task.id })}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className="flex-shrink-0 mt-[3px] rounded-full"
                        style={{
                          width: 12, height: 12,
                          border: isDone ? 'none' : '0.5px solid rgba(251,230,160,0.3)',
                          background: isDone ? '#44CF6C' : 'transparent',
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          updateTask(tree.id, task.id, { status: isDone ? 'scheduled' : 'complete' })
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className="font-serif text-[13px] font-[400] leading-snug block"
                          style={{
                            color: isDone ? 'rgba(251,230,160,0.3)' : '#fbe6a0',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </span>
                        {task.priority !== 'none' && (
                          <span
                            className="font-mono text-[8px] tracking-[0.06em]"
                            style={{ color: task.priority === 'critical' ? '#da525d' : '#e2b540' }}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <MobileBottomTabs />
    </div>
  )
}
