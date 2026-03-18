import { motion } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import { weekLabel, weekDateRange, offsetWeek } from '@/lib/weeks'
import AnimatedCheckbox from '@/components/shared/AnimatedCheckbox'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'

export default function TasksView() {
  const {
    biomes, projects, trees, currentWeek, viewWeek, setViewWeek,
    setActiveView,
    setActiveTask, toggleTaskStatus,
  } = useGardenStore()

  const wLabel    = weekLabel(viewWeek)
  const dateRange = weekDateRange(viewWeek)

  // Collect all trees for the viewed week, grouped by biome
  const currentTrees = trees.filter(t => t.week === viewWeek)
  const totalTasks   = currentTrees.flatMap(t => t.tasks).length
  const doneTasks    = currentTrees.flatMap(t => t.tasks).filter(t => t.status === 'complete').length

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(6,18,14,0.78)' }}
        onClick={() => setActiveView('garden')}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      {/* Panel */}
      <GlitchPanel triggerKey={viewWeek} className="w-[560px] max-h-[calc(100vh-120px)] pointer-events-auto">
      <motion.div
        className="relative w-full max-h-[calc(100vh-120px)] flex flex-col overflow-hidden"
        style={{
          background: 'rgba(8,22,16,0.97)',
        }}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-5 pr-4 pt-4 pb-3">
          <div>
            <div className="flex items-baseline gap-3 mb-[2px]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewWeek(offsetWeek(viewWeek, -1))}
                  className="font-mono text-[16px] leading-none transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(251,230,160,0.4)', marginRight: 2 }}
                >
                  ‹
                </button>
                <span className="font-mono text-[22px] font-[400] leading-none" style={{ color: viewWeek === currentWeek ? '#e2b540' : '#fbe6a0' }}>
                  <GlitchText text={wLabel} />
                </span>
                <button
                  onClick={() => setViewWeek(offsetWeek(viewWeek, 1))}
                  className="font-mono text-[16px] leading-none transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(251,230,160,0.4)', marginLeft: 2 }}
                >
                  ›
                </button>
              </div>
              <span className="font-serif italic text-[11px] font-[300]" style={{ color: 'rgba(251,230,160,0.45)' }}>
                {dateRange}
              </span>
            </div>
            <span className="font-mono text-[7.5px] tracking-[0.12em] uppercase" style={{ color: 'rgba(123,158,139,0.7)' }}>
              <GlitchText text={viewWeek === currentWeek ? 'THIS WEEK' : 'WEEK VIEW'} options={{ stagger: 40 }} />
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-[18px] font-[400] leading-none" style={{ color: '#44CF6C' }}>
                {doneTasks}
                <span className="text-[12px] font-[400]" style={{ color: 'rgba(251,230,160,0.3)' }}>/{totalTasks}</span>
              </div>
              <div className="font-mono text-[7px] tracking-[0.1em] uppercase" style={{ color: 'rgba(251,230,160,0.3)' }}>
                done
              </div>
            </div>
            <button
              onClick={() => setActiveView('garden')}
              className="font-mono text-[10px] text-sage/50 hover:text-sage/80 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mx-5 mb-3" style={{ height: '1px' }}>
          <div className="absolute inset-0" style={{ background: 'rgba(232,213,160,0.08)' }} />
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%`, background: '#44CF6C' }}
          />
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* Task list — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {biomes.map(biome => {
            const biomeProjects = projects.filter(p => p.biomeId === biome.id)
            const biomeTrees = currentTrees.filter(t =>
              biomeProjects.some(p => p.id === t.projectId)
            )
            if (biomeTrees.length === 0) return null

            return (
              <div key={biome.id}>
                {/* Biome header */}
                <div className="flex items-center gap-3 pl-5 pr-5 pt-4 pb-2">
                  <span
                    className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                    style={{ background: biome.color }}
                  />
                  <span
                    className="font-mono text-[8px] tracking-[0.12em] uppercase flex-1"
                    style={{ color: biome.color }}
                  >
                    <GlitchText text={biome.name.toUpperCase()} options={{ stagger: 35 }} />
                  </span>
                  <div className="h-px flex-1" style={{ background: 'rgba(232,213,160,0.07)' }} />
                </div>

                {biomeTrees.map(tree => {
                  const project = projects.find(p => p.id === tree.projectId)
                  if (!project) return null

                  return (
                    <div key={tree.id}>
                      {/* Project label */}
                      <div className="pl-12 pr-5 pb-1">
                        <span className="font-serif text-[11px] font-[400]" style={{ color: 'rgba(251,230,160,0.45)' }}>
                          {project.name}
                        </span>
                        {tree.intention && (
                          <span className="font-serif italic text-[10px] font-[300] ml-3" style={{ color: 'rgba(251,230,160,0.25)' }}>
                            — {tree.intention}
                          </span>
                        )}
                      </div>

                      {/* Task rows */}
                      {tree.tasks.length === 0 ? (
                        <p className="pl-12 pb-3 font-serif italic text-[11px] font-[300]" style={{ color: 'rgba(251,230,160,0.18)' }}>
                          No tasks
                        </p>
                      ) : (
                        tree.tasks.map(task => {
                          const done = task.status === 'complete'
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 pl-12 pr-5 py-[6px] transition-colors hover:bg-white/[0.025]"
                              style={{
                                borderLeft: task.priority === 'critical' ? '1.5px solid #da525d' : '1.5px solid transparent',
                                background: done ? 'rgba(251,230,160,0.02)' : 'transparent',
                              }}
                            >
                              {/* Checkbox */}
                              <AnimatedCheckbox done={done} size={13} onClick={() => toggleTaskStatus(tree.id, task.id)} />

                              {/* Title */}
                              <span
                                className="flex-1 font-serif text-[12px] font-[400] leading-snug cursor-pointer hover:opacity-75 transition-opacity"
                                style={{
                                  color: done ? 'rgba(251,230,160,0.3)' : '#fbe6a0',
                                  textDecoration: done ? 'line-through' : 'none',
                                  textDecorationColor: 'rgba(251,230,160,0.2)',
                                }}
                                onClick={() => setActiveTask({ treeId: tree.id, taskId: task.id })}
                              >
                                {task.title}
                              </span>

                              {task.carriedCount > 0 && (
                                <span className="font-mono text-[7px]" style={{ color: '#e2b540' }}>
                                  ↩ ×{task.carriedCount}
                                </span>
                              )}

                              {task.priority !== 'none' && (
                                <span
                                  className="font-mono text-[7px] tracking-[0.06em] flex-shrink-0"
                                  style={{ color: task.priority === 'critical' ? '#da525d' : '#e2b540' }}
                                >
                                  {task.priority.toUpperCase()}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {currentTrees.length === 0 && (
            <p className="pl-5 py-8 font-serif italic text-[13px] font-[300]" style={{ color: 'rgba(251,230,160,0.2)' }}>
              No trees planted for {wLabel} yet.{viewWeek === currentWeek ? ' Click a biome on the garden to get started.' : ''}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />
        <div className="pl-5 pr-5 py-3 flex items-center justify-between">
          <span className="font-mono text-[7.5px] tracking-[0.1em] uppercase" style={{ color: 'rgba(123,158,139,0.5)' }}>
            {currentTrees.length} tree{currentTrees.length !== 1 ? 's' : ''} this week
          </span>
          <button
            onClick={() => setActiveView('backlog')}
            className="font-mono text-[8px] tracking-[0.08em] transition-colors hover:opacity-80"
            style={{ color: 'rgba(251,230,160,0.35)' }}
          >
            View backlog →
          </button>
        </div>
      </motion.div>
      </GlitchPanel>
    </div>
  )
}
