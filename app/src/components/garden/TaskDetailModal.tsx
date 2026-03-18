import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import { weekLabel } from '@/lib/weeks'
import type { Task, Priority } from '@/types'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'
import ProjectSelect from '@/components/shared/ProjectSelect'

const PRIORITY_BORDER: Record<Priority, string> = {
  critical: '#da525d',
  high:     '#e2b540',
  none:     'rgba(232,213,160,0.18)',
}

// ─── Priority chips ────────────────────────────────────────────────────────────

function PriorityChips({
  value, onChange,
}: { value: Priority; onChange: (p: Priority) => void }) {
  const priorities: { label: string; value: Priority }[] = [
    { label: 'None',     value: 'none'     },
    { label: 'High',     value: 'high'     },
    { label: 'Critical', value: 'critical' },
  ]
  return (
    <div className="flex gap-2">
      {priorities.map(p => {
        const active = value === p.value
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className="font-mono text-[9px] tracking-[0.08em] font-bold pl-3 pr-3 py-[5px] transition-colors"
            style={{
              border: active
                ? `0.5px solid ${PRIORITY_BORDER[p.value]}`
                : '0.5px solid rgba(232,213,160,0.14)',
              background: active ? `${PRIORITY_BORDER[p.value]}18` : 'transparent',
              color: active
                ? p.value === 'critical' ? '#da525d' : p.value === 'high' ? '#e2b540' : 'rgba(251,230,160,0.55)'
                : 'rgba(251,230,160,0.3)',
              transition: 'border-color 150ms ease, background-color 150ms ease, color 150ms ease',
            }}
          >
            {p.label.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ─── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 pl-5 pr-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
      <span
        className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0"
        style={{ width: 76, color: 'rgba(123,158,139,0.75)' }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function TaskDetailModal() {
  const {
    activeTask, activeBacklogTaskId, isCreatingTask, createContext,
    trees, projects, biomes, backlog,
    setActiveTask, setActiveBacklogTask, setCreatingTask,
    updateTask, deleteTask, updateBacklogTask, deleteBacklogTask, addBacklogTask,
  } = useGardenStore()

  // Resolve which task we're editing
  const treeTask = activeTask
    ? trees.find(t => t.id === activeTask.treeId)?.tasks.find(tk => tk.id === activeTask.taskId)
    : undefined
  const backlogTask = activeBacklogTaskId
    ? backlog.find(t => t.id === activeBacklogTaskId)
    : undefined
  const sourceTask: Task | undefined = treeTask ?? backlogTask

  const isOpen   = !!(activeTask || activeBacklogTaskId || isCreatingTask)
  const isCreate = isCreatingTask && !activeTask && !activeBacklogTaskId

  // Resolve context for display
  const treeForTask = activeTask ? trees.find(t => t.id === activeTask.treeId) : undefined
  const project = treeForTask
    ? projects.find(p => p.id === treeForTask.projectId)
    : projects.find(p => p.name === sourceTask?.project)
  const biome    = biomes.find(b => b.id === project?.biomeId)

  // ── Preserve last-known snapshot so exit animation has content to render ────
  // (App.tsx's AnimatePresence keeps us mounted during exit; we must not return null)
  const snapRef = useRef({ sourceTask, project, biome, treeForTask, isCreate, backlogTask })
  if (isOpen) snapRef.current = { sourceTask, project, biome, treeForTask, isCreate, backlogTask }
  const snap = snapRef.current

  // Use snapshotted values for rendering (valid during both open and exit phases)
  const displayTask     = snap.sourceTask
  const displayProject  = snap.project
  const displayBiome    = snap.biome
  const displayTree     = snap.treeForTask
  const displayIsCreate = snap.isCreate
  const displayBiomeRgb = displayBiome?.color ?? '#7B9E8B'

  // Local edit state
  const [title,           setTitle]           = useState('')
  const [priority,        setPriority]        = useState<Priority>('none')
  const [notes,           setNotes]           = useState('')
  const [createProjectId, setCreateProjectId] = useState<string>('')
  const titleRef = useRef<HTMLInputElement>(null)

  // Sync local state when source task changes
  useEffect(() => {
    if (sourceTask) {
      setTitle(sourceTask.title)
      setPriority(sourceTask.priority)
      setNotes(sourceTask.notes ?? '')
    } else if (isCreate) {
      setTitle('')
      setPriority('none')
      setNotes('')
      setCreateProjectId(createContext?.projectId ?? projects[0]?.id ?? '')
    }
  }, [sourceTask?.id, isCreate, createContext?.projectId])   // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])  // eslint-disable-line react-hooks/exhaustive-deps

  // Focus title on open
  useEffect(() => {
    if (isOpen) setTimeout(() => titleRef.current?.focus(), 60)
  }, [isOpen])

  // NOTE: do NOT early-return null here — App.tsx's AnimatePresence must keep us
  // mounted so our motion.div exit variants can run. Use the snap values to render.

  function handleClose() {
    setActiveTask(null)
    setActiveBacklogTask(null)
    setCreatingTask(false)
  }

  function handleSave() {
    if (!title.trim()) return
    if (activeTask) {
      updateTask(activeTask.treeId, activeTask.taskId, { title: title.trim(), priority, notes: notes || undefined })
    } else if (activeBacklogTaskId) {
      updateBacklogTask(activeBacklogTaskId, { title: title.trim(), priority, notes: notes || undefined })
    } else if (isCreate) {
      addBacklogTask(title.trim(), createProjectId || projects[0]?.id || '', priority)
    }
    handleClose()
  }

  function handleDelete() {
    if (activeTask) {
      deleteTask(activeTask.treeId, activeTask.taskId)
    } else if (activeBacklogTaskId) {
      deleteBacklogTask(activeBacklogTaskId)
    }
    handleClose()
  }

  const leftBorderColor = !displayIsCreate ? PRIORITY_BORDER[priority] : 'transparent'

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(6,18,14,0.72)' }}
        onClick={handleClose}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      {/* Panel */}
      <GlitchPanel triggerKey={activeTask?.taskId ?? activeBacklogTaskId ?? 'create'} className="w-[480px] pointer-events-auto">
      <motion.div
        className="relative w-full flex flex-col"
        style={{
          background:  'rgba(8,22,16,0.97)',
          borderLeft:  `1.5px solid ${leftBorderColor}`,
        }}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* ── Header ── */}
        <div className="pl-5 pr-4 pt-4 pb-3">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: displayIsCreate ? 'rgba(123,158,139,0.35)' : displayBiomeRgb }}
              />
              <span className="font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: 'rgba(123,158,139,0.85)' }}>
                <GlitchText
                  text={displayIsCreate ? 'NEW TASK' : `${displayBiome?.name ?? '—'} · ${displayProject?.name ?? '—'}`.toUpperCase()}
                  options={{ stagger: 30 }}
                />
              </span>
            </div>
            {displayTree && (
              <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: 'rgba(251,230,160,0.4)' }}>
                {weekLabel(displayTree.week)}
              </span>
            )}
            {snap.backlogTask && !displayTree && (
              <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: 'rgba(123,158,139,0.5)' }}>
                BACKLOG
              </span>
            )}
          </div>

          {/* Editable title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder="Task title…"
            className="w-full bg-transparent font-serif text-[20px] font-[300] leading-snug outline-none"
            style={{ color: title ? '#fbe6a0' : 'rgba(251,230,160,0.25)' }}
          />
          {!displayIsCreate && (
            <span className="font-mono text-[8px] tracking-[0.08em]" style={{ color: 'rgba(251,230,160,0.18)' }}>
              EDIT TITLE ABOVE
            </span>
          )}
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Priority ── */}
        <div className="pl-5 pr-5 pt-3 pb-3">
          <span className="block font-mono text-[7.5px] tracking-[0.12em] text-sage/60 uppercase mb-2">
            <GlitchText text="PRIORITY" options={{ stagger: 40 }} />
          </span>
          <PriorityChips value={priority} onChange={setPriority} />
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Details ── */}
        {displayIsCreate ? (
          <DetailRow label="Project">
            <ProjectSelect
              value={createProjectId}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              onChange={setCreateProjectId}
            />
          </DetailRow>
        ) : displayTask && (
          <>
            <DetailRow label="Status">
              <span className="font-serif text-[13px] font-[400]" style={{ color: 'rgba(251,230,160,0.65)' }}>
                {displayTask.status.charAt(0).toUpperCase() + displayTask.status.slice(1)}
              </span>
            </DetailRow>
            <DetailRow label="Week">
              <span className="font-serif text-[13px] font-[400]" style={{ color: 'rgba(251,230,160,0.65)' }}>
                {displayTree ? weekLabel(displayTree.week) : 'Backlog'}
              </span>
            </DetailRow>
            {displayTask.carriedCount > 0 && (
              <DetailRow label="Carried">
                <span className="font-mono text-[10px]" style={{ color: '#e2b540' }}>
                  ↩ ×{displayTask.carriedCount}
                </span>
              </DetailRow>
            )}
          </>
        )}

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Notes ── */}
        <div className="pl-5 pr-5 pt-3 pb-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes…"
            rows={3}
            className="w-full bg-transparent font-serif text-[13px] font-[300] italic leading-relaxed outline-none resize-none"
            style={{ color: notes ? 'rgba(251,230,160,0.55)' : 'rgba(251,230,160,0.22)' }}
          />
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pl-5 pr-5 py-3">
          {!displayIsCreate ? (
            <button
              onClick={handleDelete}
              className="font-mono text-[9px] tracking-[0.08em] transition-colors"
              style={{ color: '#da525d' }}
            >
              Delete task
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="font-mono text-[9px] tracking-[0.08em] pl-3 pr-3 py-[6px] transition-colors"
              style={{
                border: '0.5px solid rgba(232,213,160,0.18)',
                color: 'rgba(251,230,160,0.45)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="font-mono text-[9px] font-bold tracking-[0.08em] pl-4 pr-4 py-[6px] transition-colors disabled:opacity-30"
              style={{
                background: '#e2b540',
                color: '#112f2c',
              }}
            >
              {displayIsCreate ? 'Create task' : 'Save changes'}
            </button>
          </div>
        </div>
      </motion.div>
      </GlitchPanel>
    </div>
  )
}
