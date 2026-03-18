import { useState, useEffect, useRef } from 'react'
import type { Biome } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import { weekLabel, weekDateRange } from '@/lib/weeks'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'
import ProjectSelect from '@/components/shared/ProjectSelect'

export default function PlanningModal() {
  const {
    activeBiomeId, biomes, projects, trees, backlog, currentWeek,
    setActiveBiome, plantTree, addProject, deleteProject,
  } = useGardenStore()

  const biome             = biomes.find(b => b.id === activeBiomeId)
  const biomeProjects     = projects.filter(p => p.biomeId === activeBiomeId)
  const availableProjects = biomeProjects.filter(
    p => !trees.some(t => t.projectId === p.id && t.week === currentWeek)
  )
  const activeProjects    = biomeProjects.filter(
    p => trees.some(t => t.projectId === p.id && t.week === currentWeek)
  )

  // Cache last valid values so they survive during exit animation
  // (AnimatePresence keeps component mounted while animating out, but store is already cleared)
  const lastBiomeRef   = useRef<Biome | null>(null)
  const lastBiomeIdRef = useRef<string | null>(null)
  if (biome)        lastBiomeRef.current   = biome
  if (activeBiomeId) lastBiomeIdRef.current = activeBiomeId
  const displayBiome   = biome        ?? lastBiomeRef.current
  const displayBiomeId = activeBiomeId ?? lastBiomeIdRef.current

  const [selectedProjectId, setSelectedProjectId]       = useState<string>('')
  const [pulledIds, setPulledIds]                        = useState<Set<string>>(new Set())
  const [newTaskTitle, setNewTaskTitle]                  = useState('')
  const [intention, setIntention]                        = useState('')
  const [showNewProject, setShowNewProject]              = useState(false)
  const [newProjectName, setNewProjectName]              = useState('')
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null)
  const inputRef        = useRef<HTMLInputElement>(null)
  const newProjectRef   = useRef<HTMLInputElement>(null)

  // Reset state when modal opens with a new biome
  useEffect(() => {
    if (!activeBiomeId) return
    const firstAvailable = availableProjects[0]
    setSelectedProjectId(firstAvailable?.id ?? '')
    // Auto-open new project input if all existing projects are already active this week
    setShowNewProject(!firstAvailable && biomeProjects.length > 0)
    setPulledIds(new Set())
    setNewTaskTitle('')
    setIntention('')
    setNewProjectName('')
    setConfirmDeleteProjectId(null)
  }, [activeBiomeId])  // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!activeBiomeId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveBiome(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeBiomeId, setActiveBiome])

  if (!displayBiome) return null

  const wLabel    = weekLabel(currentWeek)
  const dateRange = weekDateRange(currentWeek)

  const projectBacklog = backlog.filter(t =>
    projects.find(p => p.id === selectedProjectId)?.name === t.project
  )

  function togglePull(id: string) {
    setPulledIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAddNewProject() {
    if (!newProjectName.trim() || !activeBiomeId) return
    const created = await addProject(newProjectName.trim(), activeBiomeId)
    setSelectedProjectId(created.id)
    setPulledIds(new Set())
    setNewProjectName('')
    setShowNewProject(false)
  }

  function handlePlant() {
    if (!selectedProjectId) return
    const allTaskIds = Array.from(pulledIds)
    plantTree(selectedProjectId, allTaskIds, intention, newTaskTitle.trim())
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(6,18,14,0.75)' }}
        onClick={() => setActiveBiome(null)}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      {/* Panel */}
      <GlitchPanel triggerKey={displayBiomeId ?? ''} className="w-[460px] pointer-events-auto">
      <motion.div
        className="relative w-full flex flex-col"
        style={{
          background: 'rgba(8,22,16,0.97)',
        }}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pl-5 pr-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: displayBiome.color }} />
            <span className="font-mono text-[9px] font-bold tracking-[0.12em] text-sage">
              <GlitchText text={displayBiome.name.toUpperCase()} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[12px] font-[400] text-cream"><GlitchText text={wLabel} /></span>
            <span className="font-serif italic text-[9px] font-[300] text-cream/45">{dateRange}</span>
          </div>
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Project picker ── */}
        <div className="pl-5 pr-4 pt-3 pb-3">
          <span className="font-mono text-[7.5px] tracking-[0.12em] text-sage/70 uppercase block mb-2">
            Project
          </span>
          {availableProjects.length === 0 && biomeProjects.length > 0 ? (
            <span className="font-serif italic text-[12px] font-[300]" style={{ color: 'rgba(251,230,160,0.3)' }}>
              All projects active this week — add a new one below.
            </span>
          ) : availableProjects.length > 1 ? (
            <div className="flex items-center gap-2">
              <ProjectSelect
                value={selectedProjectId}
                options={availableProjects.map(p => ({ value: p.id, label: p.name }))}
                onChange={v => { setSelectedProjectId(v); setPulledIds(new Set()); setConfirmDeleteProjectId(null) }}
              />
              <button
                onClick={() => setConfirmDeleteProjectId(
                  confirmDeleteProjectId === selectedProjectId ? null : selectedProjectId
                )}
                className="font-mono text-[9px] transition-colors ml-auto flex-shrink-0"
                style={{ color: confirmDeleteProjectId === selectedProjectId ? '#da525d' : 'rgba(251,230,160,0.2)' }}
                title="Delete project"
              >
                ✕
              </button>
            </div>
          ) : availableProjects.length === 1 ? (
            <div className="flex items-center gap-2">
              <span className="font-serif text-[13px] font-[400]" style={{ color: '#fbe6a0' }}>
                {availableProjects[0].name}
              </span>
              <button
                onClick={() => setConfirmDeleteProjectId(
                  confirmDeleteProjectId === availableProjects[0].id ? null : availableProjects[0].id
                )}
                className="font-mono text-[9px] transition-colors ml-auto flex-shrink-0"
                style={{ color: confirmDeleteProjectId === availableProjects[0].id ? '#da525d' : 'rgba(251,230,160,0.2)' }}
                title="Delete project"
              >
                ✕
              </button>
            </div>
          ) : null}

          {/* Delete confirmation */}
          <AnimatePresence initial={false}>
            {confirmDeleteProjectId && (
              <motion.div
                key="delete-confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2 px-3 py-2 flex items-center justify-between gap-3"
                  style={{ border: '0.5px solid rgba(218,82,93,0.3)', background: 'rgba(218,82,93,0.05)' }}
                >
                  <span className="font-mono text-[8px] tracking-[0.05em]" style={{ color: 'rgba(218,82,93,0.8)' }}>
                    Deletes all trees &amp; tasks for this project.
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirmDeleteProjectId(null)}
                      className="font-mono text-[8px] tracking-[0.08em] transition-opacity hover:opacity-100"
                      style={{ color: 'rgba(251,230,160,0.35)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteProject(confirmDeleteProjectId)
                        setConfirmDeleteProjectId(null)
                        setSelectedProjectId(availableProjects.find(p => p.id !== confirmDeleteProjectId)?.id ?? '')
                        setPulledIds(new Set())
                      }}
                      className="font-mono text-[8px] font-bold tracking-[0.08em] px-2 py-1 transition-colors"
                      style={{ background: 'rgba(218,82,93,0.15)', color: '#da525d', border: '0.5px solid rgba(218,82,93,0.4)' }}
                    >
                      Delete →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* + New project toggle — shown whenever the input isn't already open */}
          {!showNewProject && biomeProjects.length > 0 && (
            <button
              onClick={() => setShowNewProject(true)}
              className="font-mono text-[8px] tracking-[0.08em] mt-2 transition-colors"
              style={{ color: 'rgba(226,181,64,0.5)' }}
            >
              + New project
            </button>
          )}

          {/* New project inline input */}
          <AnimatePresence mode="wait" initial={false}>
            {showNewProject || biomeProjects.length === 0 ? (
              <motion.div
                key="new-project-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mt-2">
                  <input
                    ref={newProjectRef}
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddNewProject()
                      if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName('') }
                    }}
                    autoFocus
                    placeholder="Project name…"
                    className="flex-1 bg-transparent font-serif text-[12px] font-[400] outline-none py-1"
                    style={{
                      borderBottom: '0.5px solid rgba(226,181,64,0.4)',
                      color: newProjectName ? '#fbe6a0' : 'rgba(251,230,160,0.35)',
                    }}
                  />
                  <button
                    onClick={handleAddNewProject}
                    disabled={!newProjectName.trim()}
                    className="font-mono text-[8px] font-bold px-2 py-1 disabled:opacity-30"
                    style={{ background: '#e2b540', color: '#112f2c' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowNewProject(false); setNewProjectName('') }}
                    className="font-mono text-[8px]"
                    style={{ color: 'rgba(251,230,160,0.35)' }}
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Already-active projects — show with delete only */}
          <AnimatePresence initial={false}>
            {activeProjects.length > 0 && (
              <motion.div
                key="active-projects"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <span className="font-mono text-[7px] tracking-[0.1em] uppercase block mb-1" style={{ color: 'rgba(123,158,139,0.5)' }}>
                    Active this week
                  </span>
                  {activeProjects.map(p => (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex items-center gap-2 py-[3px]">
                        <span className="font-serif text-[12px] font-[300] flex-1" style={{ color: 'rgba(251,230,160,0.35)' }}>
                          {p.name}
                        </span>
                        <span className="font-mono text-[7px] tracking-[0.08em]" style={{ color: 'rgba(123,158,139,0.45)' }}>
                          planted
                        </span>
                        <button
                          onClick={() => setConfirmDeleteProjectId(
                            confirmDeleteProjectId === p.id ? null : p.id
                          )}
                          className="font-mono text-[9px] transition-colors"
                          style={{ color: confirmDeleteProjectId === p.id ? '#da525d' : 'rgba(251,230,160,0.2)' }}
                          title="Delete project"
                        >
                          ✕
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {confirmDeleteProjectId === p.id && (
                          <motion.div
                            key={`confirm-${p.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mb-1 px-3 py-2 flex items-center justify-between gap-3"
                              style={{ border: '0.5px solid rgba(218,82,93,0.3)', background: 'rgba(218,82,93,0.05)' }}
                            >
                              <span className="font-mono text-[8px] tracking-[0.05em]" style={{ color: 'rgba(218,82,93,0.8)' }}>
                                Deletes all trees &amp; tasks for this project.
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => setConfirmDeleteProjectId(null)}
                                  className="font-mono text-[8px] tracking-[0.08em]"
                                  style={{ color: 'rgba(251,230,160,0.35)' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    deleteProject(p.id)
                                    setConfirmDeleteProjectId(null)
                                  }}
                                  className="font-mono text-[8px] font-bold tracking-[0.08em] px-2 py-1"
                                  style={{ background: 'rgba(218,82,93,0.15)', color: '#da525d', border: '0.5px solid rgba(218,82,93,0.4)' }}
                                >
                                  Delete →
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── From backlog ── */}
        <div className="pt-3 pb-1">
          <div className="flex items-center justify-between pl-5 pr-4 mb-2">
            <span className="font-mono text-[7.5px] tracking-[0.12em] text-sage/70 uppercase">
              <GlitchText text="FROM BACKLOG" options={{ stagger: 40 }} />
            </span>
            <span className="font-mono text-[7.5px] text-sage/45">
              {projectBacklog.length} task{projectBacklog.length !== 1 ? 's' : ''}
            </span>
          </div>

          {projectBacklog.length === 0 ? (
            <p className="pl-5 py-2 font-serif italic text-[12px] font-[300] text-cream/20">
              Nothing in the backlog yet — add tasks below.
            </p>
          ) : (
            <div className="flex flex-col">
              {projectBacklog.map(task => {
                const pulled = pulledIds.has(task.id)
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 pl-5 pr-4 py-[6px] cursor-pointer transition-colors"
                    style={{ background: pulled ? 'rgba(226,181,64,0.06)' : 'transparent' }}
                    onClick={() => togglePull(task.id)}
                  >
                    <span
                      className="flex-1 font-serif text-[13px] font-[400] leading-snug"
                      style={{ color: pulled ? '#fbe6a0' : 'rgba(251,230,160,0.55)' }}
                    >
                      {task.title}
                    </span>
                    {task.priority !== 'none' && (
                      <span
                        className="font-mono text-[8px] tracking-[0.08em] flex-shrink-0"
                        style={{ color: task.priority === 'critical' ? '#da525d' : '#e2b540' }}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                    )}
                    {/* Pull toggle */}
                    <div
                      className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        border: pulled
                          ? '0.5px solid rgba(226,181,64,0.5)'
                          : '0.5px solid rgba(232,213,160,0.2)',
                        background: pulled ? 'rgba(226,181,64,0.12)' : 'transparent',
                        color: pulled ? '#e2b540' : 'rgba(251,230,160,0.35)',
                      }}
                    >
                      {pulled
                        ? <span className="text-[11px] leading-none">✓</span>
                        : <span className="text-[14px] leading-none font-light">+</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Add task ── */}
        <div className="flex items-center gap-3 pl-5 pr-4 py-3">
          <div
            className="w-[14px] h-[14px] rounded-full flex-shrink-0"
            style={{ border: '1px dashed rgba(251,230,160,0.2)' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) e.currentTarget.blur() }}
            placeholder="Add a task this week…"
            className="flex-1 bg-transparent font-serif italic text-[12px] font-[300] outline-none"
            style={{
              color: newTaskTitle ? '#fbe6a0' : 'rgba(251,230,160,0.22)',
            }}
          />
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Intention ── */}
        <div className="flex items-start gap-3 pl-5 pr-4 py-3">
          <span className="font-mono text-[7.5px] tracking-[0.1em] text-sage/60 pt-[3px] flex-shrink-0 uppercase">
            Intent
          </span>
          <input
            type="text"
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Set an intention for the week…"
            className="flex-1 bg-transparent font-serif italic text-[12px] font-[300] outline-none"
            style={{ color: intention ? 'rgba(251,230,160,0.7)' : 'rgba(251,230,160,0.2)' }}
          />
        </div>

        <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pl-5 pr-4 py-3">
          <button
            onClick={() => setActiveBiome(null)}
            className="font-mono text-[9px] tracking-[0.1em] transition-colors"
            style={{ color: 'rgba(251,230,160,0.3)' }}
          >
            Cancel
          </button>
          <button
            onClick={handlePlant}
            disabled={!selectedProjectId}
            className="font-mono text-[10px] font-bold tracking-[0.1em] pl-4 pr-4 py-2 transition-colors disabled:opacity-30"
            style={{
              background: '#e2b540',
              color: '#112f2c',
            }}
          >
            Plant tree →
          </button>
        </div>
      </motion.div>
      </GlitchPanel>

    </div>
  )
}
