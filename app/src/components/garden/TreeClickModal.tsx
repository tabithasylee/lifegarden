import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import { weekLabel, weekDateRange } from '@/lib/weeks'
import type { Task } from '@/types'
import AnimatedCheckbox from '@/components/shared/AnimatedCheckbox'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'

// ─── Priority dot ─────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#da525d',
  high:     '#e2b540',
  none:     'rgba(251,230,160,0.25)',
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, treeId, index, onCompleted, onDeleting, isDeleting,
}: {
  task: Task; treeId: string; index: number
  onCompleted: (id: string) => void
  onDeleting:  (id: string) => void
  isDeleting:  boolean
}) {
  const toggleTaskStatus = useGardenStore(s => s.toggleTaskStatus)
  const setActiveTask    = useGardenStore(s => s.setActiveTask)

  function handleCheck() {
    toggleTaskStatus(treeId, task.id)
    onCompleted(task.id)
  }

  return (
    <div
      className="flex items-center gap-3 pl-4 pr-3 py-[7px] group transition-colors duration-150"
      style={{
        borderLeft: task.priority === 'critical' ? '1.5px solid #da525d' : '1.5px solid transparent',
        background: isDeleting ? 'rgba(218,82,93,0.08)' : 'transparent',
      }}
    >
      {/* Checkbox */}
      <AnimatedCheckbox done={false} size={14} onClick={handleCheck} />

      {/* Title */}
      <span
        className="flex-1 font-serif text-[12px] font-[400] leading-snug cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: '#fbe6a0' }}
        onClick={() => setActiveTask({ treeId, taskId: task.id })}
      >
        <GlitchText text={task.title} options={{ stagger: index * 30 }} />
      </span>

      {/* Carried badge */}
      {task.carriedCount > 0 && (
        <span className="font-mono text-[8px] text-amber flex-shrink-0">
          ↩ ×{task.carriedCount}
        </span>
      )}

      {/* Priority dot */}
      <div
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ background: PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.none }}
      />

      {/* Delete — slides in on row hover, flashes red then exits */}
      <motion.button
        onClick={() => onDeleting(task.id)}
        className="opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 flex-shrink-0"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.85 }}
        title="Delete task"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 6h5L9 3" stroke="rgba(218,82,93,0.6)" strokeWidth="0.9" strokeLinecap="square"/>
        </svg>
      </motion.button>
    </div>
  )
}

// ─── Completed-row (strikethrough, exits automatically) ───────────────────────

function CompletedRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 pl-4 pr-3 py-[7px] pointer-events-none"
      style={{ borderLeft: '1.5px solid transparent' }}>
      <div className="w-[14px] h-[14px] rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ border: '1px solid rgba(68,207,108,0.6)', background: 'rgba(68,207,108,0.08)' }}>
        <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
          <path d="M1 3.5l2 2 4-4" stroke="#44CF6C" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="flex-1 font-serif text-[12px] font-[400] leading-snug"
        style={{ color: 'rgba(251,230,160,0.3)', textDecoration: 'line-through', textDecorationColor: 'rgba(251,230,160,0.18)' }}>
        {task.title}
      </span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function TreeClickModal() {
  const { activeTreeId, trees, projects, biomes, currentWeek, setActiveTree, addTaskToTree, moveUncompletedToBacklog, deleteTask } = useGardenStore()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [exitingIds,   setExitingIds]   = useState<Set<string>>(new Set())
  const [deletingIds,  setDeletingIds]  = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Refs to preserve data during exit animation ───────────────────────────
  const treeRef    = useRef(trees.find(t => t.id === activeTreeId))
  const projectRef = useRef<typeof projects[0] | undefined>(undefined)
  const biomeRef   = useRef<typeof biomes[0]   | undefined>(undefined)

  const liveTree    = trees.find(t => t.id === activeTreeId)
  const liveProject = projects.find(p => p.id === liveTree?.projectId)
  const liveBiome   = biomes.find(b => b.id === liveProject?.biomeId)

  if (liveTree)    treeRef.current    = liveTree
  if (liveProject) projectRef.current = liveProject
  if (liveBiome)   biomeRef.current   = liveBiome

  const tree    = treeRef.current
  const project = projectRef.current
  const biome   = biomeRef.current

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveTree(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setActiveTree])

  // Autofocus add-task input when modal opens
  useEffect(() => {
    if (!activeTreeId) return
    const id = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(id)
  }, [activeTreeId])

  if (!tree) return null

  const isCurrent  = tree.week === currentWeek
  const completed  = tree.tasks.filter(t => t.status === 'complete').length
  const incomplete = tree.tasks.filter(t => t.status !== 'complete')
  const total      = tree.tasks.length
  const progress   = total > 0 ? completed / total : 0
  const wLabel     = weekLabel(tree.week)
  const dateRange  = weekDateRange(tree.week)
  const biomeColor = biome?.color ?? '#7B9E8B'

  // Tasks shown in the live list: only incomplete, minus ones currently animating out/deleting
  const visibleTasks = tree.tasks.filter(t => t.status !== 'complete' && !exitingIds.has(t.id))
  // Tasks animating out (briefly show completed state before exiting)
  const exitingTasks = tree.tasks.filter(t => exitingIds.has(t.id))

  function handleCompleted(taskId: string) {
    setExitingIds(prev => new Set([...prev, taskId]))
    setTimeout(() => {
      setExitingIds(prev => { const next = new Set(prev); next.delete(taskId); return next })
    }, 420)
  }

  function handleDeleted(taskId: string) {
    setDeletingIds(prev => new Set([...prev, taskId]))
    setTimeout(() => {
      deleteTask(tree?.id ?? '', taskId)
      setDeletingIds(prev => { const next = new Set(prev); next.delete(taskId); return next })
    }, 220)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(6,18,14,0.72)' }}
        onClick={() => setActiveTree(null)}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      {/* Panel */}
      <GlitchPanel triggerKey={activeTreeId ?? ''} className="w-[400px] pointer-events-auto">
      <motion.div
        className="relative w-full flex flex-col"
        style={{ background: 'rgba(8,22,16,0.97)' }}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-5 pr-4 pt-4 pb-1">
          <span
            className="font-mono text-[8.5px] tracking-[0.1em] uppercase"
            style={{ color: 'rgba(123,158,139,0.85)' }}
          >
            <span style={{ color: biomeColor, opacity: 0.9 }}>●</span>
            {' '}{biome?.name ?? '—'} › {project?.name ?? '—'}
          </span>
          <button
            onClick={() => setActiveTree(null)}
            className="font-mono text-[10px] text-sage/50 hover:text-sage/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Week + date */}
        <div className="flex items-baseline gap-3 pl-5 pr-4 pb-3">
          <span
            className="font-mono text-[26px] font-[400] leading-none tracking-[0.02em]"
            style={{ color: isCurrent ? '#e2b540' : '#fbe6a0' }}
          >
            <GlitchText text={wLabel} />
          </span>
          <span className="font-serif italic text-[11px] font-[300]"
            style={{ color: 'rgba(251,230,160,0.5)' }}>
            <GlitchText text={dateRange} options={{ delay: 80 }} />
          </span>
          {isCurrent && (
            <span className="ml-auto font-mono text-[7px] tracking-[0.12em] text-amber opacity-70">
              NOW
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative mx-5 mb-1" style={{ height: '1px' }}>
          <div className="absolute inset-0" style={{ background: 'rgba(232,213,160,0.08)' }} />
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{ width: `${progress * 100}%`, background: '#e2b540' }}
          />
        </div>
        <div className="flex justify-end pr-5 mb-2">
          <span className="font-mono text-[8px]" style={{ color: 'rgba(251,230,160,0.45)' }}>
            {completed} / {total} complete
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* Task rows */}
        <div className="flex flex-col py-1">
          {tree.tasks.length === 0 ? (
            <p className="pl-5 py-4 font-serif italic text-[12px] font-[300]"
              style={{ color: 'rgba(251,230,160,0.2)' }}>
              No tasks yet this week.
            </p>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.22, ease: 'easeIn' } }}
                >
                  <TaskRow task={task} treeId={tree.id} index={index} onCompleted={handleCompleted} onDeleting={handleDeleted} isDeleting={deletingIds.has(task.id)} />
                </motion.div>
              ))}
              {exitingTasks.map(task => (
                <motion.div
                  key={`exiting-${task.id}`}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0.5, x: 6, transition: { duration: 0.12 } }}
                  exit={{ opacity: 0, x: 20, height: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
                >
                  <CompletedRow task={task} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* Move incomplete to backlog */}
        <AnimatePresence>
          {incomplete.length > 0 && !isCurrent && (
            <motion.div
              key="move-to-backlog"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex justify-end px-4 py-2">
                <button
                  onClick={() => moveUncompletedToBacklog(tree.id)}
                  className="font-mono text-[8px] tracking-[0.08em] px-2 py-1 transition-colors"
                  style={{
                    border: '0.5px solid rgba(226,181,64,0.3)',
                    color:  'rgba(226,181,64,0.7)',
                  }}
                >
                  ↩ move incomplete to backlog
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer — add task input */}
        <div className="flex items-center gap-3 pl-4 pr-4 py-3">
          <div
            className="w-[14px] h-[14px] rounded-full flex-shrink-0"
            style={{ border: '1px dashed rgba(251,230,160,0.2)' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTaskTitle.trim()) {
                addTaskToTree(tree.id, newTaskTitle.trim())
                setNewTaskTitle('')
              }
            }}
            placeholder="Add a task this week…"
            className="flex-1 bg-transparent font-serif italic text-[11px] font-[300] outline-none"
            style={{ color: newTaskTitle ? '#fbe6a0' : 'rgba(251,230,160,0.2)' }}
          />
        </div>
      </motion.div>
      </GlitchPanel>

    </div>
  )
}
