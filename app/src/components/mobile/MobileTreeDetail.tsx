import { useState, useRef } from 'react'
import { useGardenStore } from '@/store/garden'
import { weekLabel, weekDateRange } from '@/lib/weeks'
import MobileNavBar from './MobileNavBar'
import MobileBottomTabs from './MobileBottomTabs'
import AnimatedCheckbox from '@/components/shared/AnimatedCheckbox'

const BIOME_COLOR: Record<string, string> = {
  work: '#7BA89A', personal: '#A8B87A', health: '#7AB88A',
}

export default function MobileTreeDetail() {
  const {
    activeTreeId, trees, projects, biomes,
    setActiveTree, setActiveTask, toggleTaskStatus, addTaskToTree,
  } = useGardenStore()

  const tree    = trees.find(t => t.id === activeTreeId)
  const project = projects.find(p => p.id === tree?.projectId)
  const biome   = biomes.find(b => b.id === project?.biomeId)

  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!tree || !project || !biome) return null

  const completed = tree.tasks.filter(t => t.status === 'complete').length
  const total     = tree.tasks.length
  const progress  = total > 0 ? completed / total : 0
  const wLabel    = weekLabel(tree.week)
  const dateRange = weekDateRange(tree.week)

  function submitTask() {
    if (!newTitle.trim()) return
    addTaskToTree(tree!.id, newTitle.trim())
    setNewTitle('')
  }

  return (
    <div className="flex flex-col w-full h-full">
      <MobileNavBar
        onBack={() => setActiveTree(null)}
        breadcrumb={`${biome.name.toUpperCase()} · ${project.name.toUpperCase()}`}
        biomeColor={BIOME_COLOR[biome.id]}
      />

      {/* Week header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid rgba(232,213,160,0.08)' }}>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-mono text-[32px] font-[400] leading-none text-amber">{wLabel}</span>
          <span className="font-serif italic text-[13px] font-[300]" style={{ color: 'rgba(251,230,160,0.55)' }}>
            {dateRange}
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(232,213,160,0.1)' }}>
            <div
              className="h-full"
              style={{ width: `${progress * 100}%`, background: '#e2b540', transition: 'width 0.3s' }}
            />
          </div>
          <span className="font-mono text-[9px] flex-shrink-0" style={{ color: 'rgba(251,230,160,0.45)' }}>
            {completed} / {total} COMPLETE
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tree.tasks.map(task => {
          const done = task.status === 'complete'
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-5 py-[11px]"
              style={{
                borderBottom: '0.5px solid rgba(232,213,160,0.06)',
                borderLeft: task.priority === 'critical' ? '1.5px solid #da525d'
                  : task.priority === 'high' ? '1.5px solid rgba(226,181,64,0.5)'
                  : '1.5px solid transparent',
              }}
            >
              {/* Checkbox */}
              <AnimatedCheckbox done={done} size={16} onClick={() => toggleTaskStatus(tree.id, task.id)} />

              {/* Title */}
              <span
                className="flex-1 font-serif text-[13px] font-[400] leading-snug cursor-pointer"
                style={{
                  color: done ? 'rgba(251,230,160,0.35)' : '#fbe6a0',
                  textDecoration: done ? 'line-through' : 'none',
                }}
                onClick={() => setActiveTask({ treeId: tree.id, taskId: task.id })}
              >
                {task.title}
              </span>

              {/* Priority dot / carried badge */}
              {task.carriedCount > 0 ? (
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5 flex-shrink-0"
                  style={{ border: '0.5px solid rgba(226,181,64,0.4)', color: '#e2b540' }}
                >
                  ×{task.carriedCount}
                </span>
              ) : (
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 6, height: 6,
                    background: task.priority === 'critical' ? '#da525d'
                      : task.priority === 'high' ? '#e2b540'
                      : 'rgba(251,230,160,0.18)',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Add task row */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ borderBottom: '0.5px dashed rgba(232,213,160,0.1)' }}
        >
          <div
            className="flex-shrink-0 rounded-full"
            style={{ width: 14, height: 14, border: '1px dashed rgba(251,230,160,0.2)' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTask() }}
            placeholder="+ Add a task this week…"
            className="flex-1 bg-transparent font-mono text-[11px] outline-none"
            style={{ color: newTitle ? '#fbe6a0' : 'rgba(251,230,160,0.25)' }}
          />
        </div>
      </div>

      <MobileBottomTabs />
    </div>
  )
}
