import { useState, useEffect, useRef } from 'react'
import { useGardenStore } from '@/store/garden'
import { weekLabel, weekDateRange } from '@/lib/weeks'
import MobileNavBar from './MobileNavBar'

const BIOME_COLOR: Record<string, string> = {
  work: '#7BA89A', personal: '#A8B87A', health: '#7AB88A',
}

export default function MobilePlanningModal() {
  const {
    activeBiomeId, biomes, projects, backlog, currentWeek,
    setActiveBiome, plantTree, addProject, addTaskToTree,
    activeTreeId,
  } = useGardenStore()

  const biome         = biomes.find(b => b.id === activeBiomeId)
  const biomeProjects = projects.filter(p => p.biomeId === activeBiomeId)

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [pulledIds,          setPulledIds]          = useState<Set<string>>(new Set())
  const [newTaskTitle,       setNewTaskTitle]        = useState('')
  const [intention,          setIntention]           = useState('')
  const [showNewProject,     setShowNewProject]      = useState(false)
  const [newProjectName,     setNewProjectName]      = useState('')

  const _pendingTaskTitle = useRef('')

  useEffect(() => {
    if (activeTreeId && _pendingTaskTitle.current) {
      addTaskToTree(activeTreeId, _pendingTaskTitle.current)
      _pendingTaskTitle.current = ''
    }
  }, [activeTreeId, addTaskToTree])

  useEffect(() => {
    if (!activeBiomeId) return
    setSelectedProjectId(biomeProjects[0]?.id ?? '')
    setPulledIds(new Set())
    setNewTaskTitle('')
    setIntention('')
    setShowNewProject(false)
    setNewProjectName('')
  }, [activeBiomeId])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!biome || !activeBiomeId) return null

  const wLabel        = weekLabel(currentWeek)
  const dateRange     = weekDateRange(currentWeek)
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
    plantTree(selectedProjectId, Array.from(pulledIds), intention)
    if (newTaskTitle.trim()) {
      _pendingTaskTitle.current = newTaskTitle.trim()
    }
  }

  const biomeColor = BIOME_COLOR[biome.id] ?? '#7B9E8B'

  return (
    <div className="flex flex-col w-full h-full">
      <MobileNavBar
        onBack={() => setActiveBiome(null)}
        breadcrumb={`${biome.name.toUpperCase()} · ${wLabel}`}
        biomeColor={biomeColor}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Week context */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '0.5px solid rgba(232,213,160,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-full" style={{ width: 7, height: 7, background: biomeColor }} />
            <span className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: '#7B9E8B' }}>
              {biome.name.toUpperCase()}
            </span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(232,213,160,0.4)' }}>
            {wLabel} · {dateRange}
          </span>
        </div>

        {/* Project picker */}
        <div className="px-5 py-4" style={{ borderBottom: '0.5px solid rgba(232,213,160,0.07)' }}>
          <span className="block font-mono text-[9px] font-bold tracking-[0.12em] mb-2" style={{ color: '#7B9E8B' }}>
            PROJECT
          </span>
          <div
            className="w-full flex items-center justify-between px-3"
            style={{
              height: 38,
              border: '0.5px solid rgba(232,213,160,0.2)',
              background: 'rgba(232,213,160,0.04)',
            }}
          >
            <select
              value={selectedProjectId}
              onChange={e => { setSelectedProjectId(e.target.value); setPulledIds(new Set()) }}
              className="flex-1 bg-transparent font-serif text-[14px] font-[400] outline-none appearance-none"
              style={{ color: selectedProjectId ? '#fbe6a0' : 'rgba(251,230,160,0.35)' }}
            >
              <option value="" disabled style={{ background: '#0c2420' }}>Select a project…</option>
              {biomeProjects.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#0c2420', color: '#fbe6a0' }}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px]" style={{ color: 'rgba(232,213,160,0.35)' }}>▾</span>
          </div>

          {showNewProject ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddNewProject()
                  if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName('') }
                }}
                autoFocus
                placeholder="Project name…"
                className="flex-1 bg-transparent font-serif text-[13px] outline-none py-1"
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
                className="font-mono text-[10px]"
                style={{ color: 'rgba(251,230,160,0.3)' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-2 font-serif italic text-[11px] font-[300]"
              style={{ color: 'rgba(123,158,139,0.6)' }}
            >
              + New project
            </button>
          )}
        </div>

        {/* From backlog */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between px-5 mb-2">
            <span className="font-mono text-[9px] font-bold tracking-[0.12em]" style={{ color: '#7B9E8B' }}>
              FROM BACKLOG
            </span>
            <span className="font-mono text-[9px]" style={{ color: 'rgba(232,213,160,0.3)' }}>
              {projectBacklog.length} tasks
            </span>
          </div>

          {projectBacklog.length === 0 ? (
            <p className="px-5 py-2 font-serif italic text-[12px] font-[300]" style={{ color: 'rgba(251,230,160,0.2)' }}>
              Nothing in the backlog yet — add tasks below.
            </p>
          ) : (
            projectBacklog.map(task => {
              const pulled = pulledIds.has(task.id)
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-[10px] cursor-pointer"
                  style={{
                    borderBottom: '0.5px solid rgba(232,213,160,0.06)',
                    background: pulled ? 'rgba(226,181,64,0.06)' : 'transparent',
                  }}
                  onClick={() => togglePull(task.id)}
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <span
                      className="font-serif text-[13px] font-[400]"
                      style={{ color: pulled ? '#e2b540' : '#fbe6a0' }}
                    >
                      {task.title}
                    </span>
                    {task.priority !== 'none' && (
                      <span
                        className="font-mono text-[9px]"
                        style={{ color: task.priority === 'critical' ? '#da525d' : '#e2b540' }}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 22, height: 22,
                      border: pulled ? '0.5px solid rgba(226,181,64,0.5)' : '0.5px solid rgba(232,213,160,0.2)',
                      background: pulled ? 'rgba(226,181,64,0.12)' : 'transparent',
                      color: pulled ? '#e2b540' : 'rgba(251,230,160,0.35)',
                    }}
                  >
                    <span className="text-[13px] leading-none">{pulled ? '✓' : '+'}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Add task */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ borderTop: '0.5px dashed rgba(232,213,160,0.1)' }}
        >
          <div className="flex-shrink-0 rounded-full" style={{ width: 14, height: 14, border: '1px dashed rgba(251,230,160,0.2)' }} />
          <input
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            placeholder="Add a task this week…"
            className="flex-1 bg-transparent font-serif italic text-[12px] font-[300] outline-none"
            style={{ color: newTaskTitle ? '#fbe6a0' : 'rgba(251,230,160,0.22)' }}
          />
        </div>

        {/* Intention */}
        <div
          className="px-5 py-3 flex flex-col gap-2"
          style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.12em]" style={{ color: '#7B9E8B' }}>
            WEEK INTENTION
          </span>
          <input
            type="text"
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="What's the focus for this week?"
            className="bg-transparent font-serif italic text-[13px] font-[300] outline-none"
            style={{ color: intention ? 'rgba(251,230,160,0.7)' : 'rgba(251,230,160,0.22)' }}
          />
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5"
        style={{
          height: 60,
          background: 'rgba(8,20,16,0.97)',
          borderTop: '0.5px solid rgba(232,213,160,0.1)',
        }}
      >
        <button
          onClick={() => setActiveBiome(null)}
          className="font-mono text-[10px]"
          style={{ color: 'rgba(251,230,160,0.35)' }}
        >
          Cancel
        </button>
        <button
          onClick={handlePlant}
          disabled={!selectedProjectId}
          className="font-mono text-[10px] font-bold tracking-[0.04em] px-5 py-2 disabled:opacity-30"
          style={{ background: '#e2b540', color: '#112f2c' }}
        >
          Plant tree →
        </button>
      </div>
    </div>
  )
}
