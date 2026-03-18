import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function TrashIcon({ size = 12, color = '#da525d' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 6h5L9 3" stroke={color} strokeWidth="0.9" strokeLinecap="square"/>
    </svg>
  )
}

import { useGardenStore } from '@/store/garden'
import type { Priority } from '@/types'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: '#da525d',
  high:     '#e2b540',
  none:     'rgba(251,230,160,0.2)',
}

// ─── Inline rename input ───────────────────────────────────────────────────────

function InlineRename({
  value,
  textClassName,
  textStyle,
  onSave,
}: {
  value: string
  textClassName: string
  textStyle: React.CSSProperties
  onSave: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        onBlur={commit}
        className={`bg-transparent outline-none ${textClassName}`}
        style={{ ...textStyle, borderBottom: '0.5px solid rgba(232,213,160,0.3)', minWidth: 60 }}
      />
    )
  }

  return (
    <span
      className={`${textClassName} cursor-text hover:opacity-70 transition-opacity`}
      style={textStyle}
      title="Click to rename"
      onClick={() => { setDraft(value); setEditing(true) }}
    >
      {value}
    </span>
  )
}

// ─── Add-task ghost row ────────────────────────────────────────────────────────

function AddRow({ projectId }: { projectId: string }) {
  const addBacklogTask = useGardenStore(s => s.addBacklogTask)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    if (!value.trim()) return
    addBacklogTask(value.trim(), projectId)
    setValue('')
  }

  return (
    <div className="flex items-center gap-3 pl-5 pr-5 py-[7px]">
      <div
        className="w-[13px] h-[13px] rounded-full flex-shrink-0"
        style={{ border: '1px dashed rgba(251,230,160,0.18)' }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={`Add to backlog…`}
        className="flex-1 bg-transparent font-serif italic text-[12px] font-[300] outline-none"
        style={{ color: value ? '#fbe6a0' : 'rgba(251,230,160,0.2)' }}
      />
    </div>
  )
}

// ─── Backlog view ──────────────────────────────────────────────────────────────

export default function BacklogView() {
  const {
    biomes, projects, backlog,
    setActiveView, setActiveBacklogTask, setCreatingTask,
    deleteBiome, deleteProject, addBacklogTasksToCurrentWeek,
    renameBiome, renameProject,
  } = useGardenStore()

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'biome' | 'project'; id: string; name: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleAddToWeek() {
    if (selected.size === 0) return
    addBacklogTasksToCurrentWeek([...selected])
    setSelected(new Set())
  }

  const totalCount    = backlog.length
  const criticalCount = backlog.filter(t => t.priority === 'critical').length
  const highCount     = backlog.filter(t => t.priority === 'high').length

  return (
    <div className="absolute inset-0 z-30 flex pointer-events-none">

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

      {/* Main panel */}
      <GlitchPanel triggerKey="backlog" className="flex-1 ml-[15%] mr-[280px] mt-[48px] mb-[48px] pointer-events-auto">
      <motion.div
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{ background: 'rgba(8,22,16,0.97)' }}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="pl-8 pr-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[8px] tracking-[0.14em] uppercase" style={{ color: 'rgba(123,158,139,0.7)' }}>
              <GlitchText text="BACKLOG" options={{ stagger: 50 }} />
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCreatingTask(true)}
                className="font-mono text-[9px] font-bold tracking-[0.08em] pl-3 pr-3 py-1 transition-colors"
                style={{ background: '#e2b540', color: '#112f2c' }}
              >
                + Add task
              </button>
              <button
                onClick={() => setActiveView('garden')}
                className="font-mono text-[10px] text-sage/50 hover:text-sage/80 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <h1 className="font-serif text-[24px] font-[300] leading-none" style={{ color: '#fbe6a0' }}>
            Unscheduled tasks
          </h1>
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* Task list — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence initial={false}>
          {biomes.map(biome => {
            const biomeProjects = projects.filter(p => p.biomeId === biome.id)
            const dotColor = biome.color

            return (
              <motion.div
                key={biome.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -16, transition: { duration: 0.22, ease: 'easeIn' } }}
              >
                {/* Biome section header */}
                <div className="flex items-center gap-3 pl-8 pr-6 pt-5 pb-2 group/biome">
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <InlineRename
                    value={biome.name.toUpperCase()}
                    textClassName="font-mono text-[8px] tracking-[0.14em]"
                    textStyle={{ color: dotColor }}
                    onSave={name => renameBiome(biome.id, name)}
                  />
                  <div className="flex-1 h-px" style={{ background: 'rgba(232,213,160,0.07)' }} />
                  <button
                    onClick={() => setConfirmDelete({ type: 'biome', id: biome.id, name: biome.name })}
                    className="opacity-0 group-hover/biome:opacity-100 transition-opacity ml-1"
                    title="Delete biome"
                  >
                    <TrashIcon size={10} color="rgba(218,82,93,0.6)" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                {biomeProjects.map(project => {
                  const projectTasks = backlog.filter(t => t.project === project.name)

                  return (
                    <motion.div
                      key={project.id}
                      className="mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -12, transition: { duration: 0.2, ease: 'easeIn' } }}
                    >
                      {/* Project label */}
                      <div className="flex items-baseline justify-between pl-8 pr-6 pt-2 pb-1 group/proj">
                        <InlineRename
                          value={project.name}
                          textClassName="font-serif text-[13px] font-[400]"
                          textStyle={{ color: 'rgba(251,230,160,0.6)' }}
                          onSave={name => renameProject(project.id, name)}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px]" style={{ color: 'rgba(251,230,160,0.25)' }}>
                            {projectTasks.length}
                          </span>
                          <button
                            onClick={() => setConfirmDelete({ type: 'project', id: project.id, name: project.name })}
                            className="opacity-0 group-hover/proj:opacity-100 transition-opacity"
                            title="Delete project"
                          >
                            <TrashIcon size={10} color="rgba(218,82,93,0.6)" />
                          </button>
                        </div>
                      </div>

                      {/* Task rows — animated */}
                      <AnimatePresence mode="popLayout" initial={false}>
                        {projectTasks.map(task => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                            exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: 'easeIn' } }}
                          >
                            <div
                              className="flex items-center gap-3 pl-8 pr-6 py-[7px] group/task transition-colors hover:bg-white/[0.025]"
                              style={{
                                borderLeft: task.priority === 'critical'
                                  ? '1.5px solid #da525d'
                                  : task.priority === 'high'
                                  ? '1.5px solid rgba(226,181,64,0.4)'
                                  : '1.5px solid transparent',
                              }}
                            >
                              {/* Select circle */}
                              <div
                                className="w-[13px] h-[13px] rounded-full flex-shrink-0 cursor-pointer flex items-center justify-center transition-all"
                                style={{
                                  border: selected.has(task.id)
                                    ? '1px solid #e2b540'
                                    : '1px solid rgba(251,230,160,0.22)',
                                  background: selected.has(task.id)
                                    ? 'rgba(226,181,64,0.15)'
                                    : 'transparent',
                                }}
                                onClick={() => toggleSelect(task.id)}
                                title="Select to add to current week"
                              >
                                {selected.has(task.id) && (
                                  <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                                    <path d="M1 3l2 2 3-4" stroke="#e2b540" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              {/* Title */}
                              <span
                                className="flex-1 font-serif text-[13px] font-[400] leading-snug cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ color: '#fbe6a0' }}
                                onClick={() => setActiveBacklogTask(task.id)}
                              >
                                {task.title}
                              </span>
                              {/* Priority label */}
                              {task.priority !== 'none' ? (
                                <span
                                  className="font-mono text-[8px] tracking-[0.07em] flex-shrink-0"
                                  style={{ color: PRIORITY_COLOR[task.priority] }}
                                >
                                  {task.priority.toUpperCase()}
                                </span>
                              ) : (
                                <span className="font-mono text-[8px] flex-shrink-0" style={{ color: 'rgba(251,230,160,0.2)' }}>
                                  —
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add ghost row */}
                      <AddRow projectId={project.id} />
                    </motion.div>
                  )
                })}
                </AnimatePresence>
              </motion.div>
            )
          })}
          </AnimatePresence>
        </div>

        {/* Add to current week — multi-select footer */}
        <AnimatePresence>
          {selected.size > 0 && !confirmDelete && (
            <motion.div
              key="add-to-week"
              className="sticky bottom-0 flex items-center justify-between px-8 py-3 gap-4"
              style={{ background: 'rgba(8,22,16,0.97)', borderTop: '0.5px solid rgba(226,181,64,0.22)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.13 } }}
            >
              <span className="font-mono text-[9px] tracking-[0.07em]" style={{ color: 'rgba(226,181,64,0.6)' }}>
                {selected.size} task{selected.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(new Set())}
                  className="font-mono text-[9px] tracking-[0.08em] px-3 py-1 transition-colors hover:opacity-80"
                  style={{ border: '0.5px solid rgba(232,213,160,0.18)', color: 'rgba(251,230,160,0.45)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToWeek}
                  className="font-mono text-[9px] font-bold tracking-[0.08em] px-3 py-1 transition-opacity hover:opacity-80"
                  style={{ background: '#e2b540', color: '#112f2c' }}
                >
                  Add to current week →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              key={confirmDelete.id}
              className="sticky bottom-0 flex items-center justify-between px-8 py-3 gap-4"
              style={{ background: 'rgba(8,22,16,0.97)', borderTop: '0.5px solid rgba(218,82,93,0.22)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.13 } }}
            >
              <span className="font-serif text-[12px] font-[300]" style={{ color: 'rgba(251,230,160,0.65)' }}>
                Delete "<GlitchText text={confirmDelete.name} options={{ stagger: 30 }} />"?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="font-mono text-[9px] tracking-[0.08em] px-3 py-1 transition-colors hover:opacity-80"
                  style={{ border: '0.5px solid rgba(232,213,160,0.18)', color: 'rgba(251,230,160,0.45)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'biome') deleteBiome(confirmDelete.id)
                    else deleteProject(confirmDelete.id)
                    setConfirmDelete(null)
                  }}
                  className="font-mono text-[9px] font-bold tracking-[0.08em] px-3 py-1 transition-opacity hover:opacity-80"
                  style={{ background: '#da525d', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </GlitchPanel>

      {/* Sidebar */}
      <motion.div
        className="absolute right-0 top-[48px] bottom-[48px] w-[264px] pointer-events-auto flex flex-col"
        style={{
          background: 'rgba(8,22,16,0.97)',
          border:     '0.5px solid rgba(232,213,160,0.15)',
          borderRight: 'none',
        }}
        variants={{ hidden: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: 0.06 } }, exit: { opacity: 0, x: 16, transition: { duration: 0.15 } } }}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="pl-5 pr-5 pt-5 pb-4">
          <span className="block font-mono text-[7.5px] tracking-[0.12em] uppercase mb-2" style={{ color: 'rgba(123,158,139,0.6)' }}>
            Total
          </span>
          <span className="font-serif text-[34px] font-[300] leading-none" style={{ color: '#fbe6a0' }}>
            {totalCount}
          </span>
          <span className="font-serif text-[13px] font-[300] ml-2" style={{ color: 'rgba(251,230,160,0.3)' }}>
            tasks
          </span>
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* By biome */}
        <div className="pl-5 pr-5 pt-4 pb-3">
          <span className="block font-mono text-[7.5px] tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(123,158,139,0.6)' }}>
            By biome
          </span>
          {biomes.map(biome => {
            const biomeProjects = projects.filter(p => p.biomeId === biome.id)
            const count = backlog.filter(t => biomeProjects.some(p => p.name === t.project)).length
            const dotColor = biome.color
            return (
              <div key={biome.id} className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-[6px] h-[6px] rounded-full" style={{ background: dotColor }} />
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(251,230,160,0.55)' }}>
                    {biome.name}
                  </span>
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'rgba(251,230,160,0.6)' }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* By priority */}
        <div className="pl-5 pr-5 pt-4 pb-3">
          <span className="block font-mono text-[7.5px] tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(123,158,139,0.6)' }}>
            By priority
          </span>
          {[
            { label: 'Critical', count: criticalCount, color: '#da525d' },
            { label: 'High',     count: highCount,     color: '#e2b540' },
            { label: 'None',     count: totalCount - criticalCount - highCount, color: 'rgba(251,230,160,0.3)' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px]" style={{ color: row.color }}>
                {row.label}
              </span>
              <span className="font-mono text-[11px]" style={{ color: 'rgba(251,230,160,0.6)' }}>
                {row.count}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
