import { useState, useEffect } from 'react'
import { useGardenStore } from '@/store/garden'
import { weekLabel } from '@/lib/weeks'
import type { Priority, Task } from '@/types'
import MobileNavBar from './MobileNavBar'
import ProjectSelect from '@/components/shared/ProjectSelect'

const BIOME_COLOR: Record<string, string> = {
  work: '#7BA89A', personal: '#A8B87A', health: '#7AB88A',
}

const PRIORITY_BORDER: Record<Priority, string> = {
  critical: '#da525d',
  high:     '#e2b540',
  none:     'transparent',
}

export default function MobileTaskDetail() {
  const {
    activeTask, activeBacklogTaskId, isCreatingTask, createContext,
    trees, projects, biomes, backlog,
    setActiveTask, setActiveBacklogTask, setCreatingTask,
    updateTask, deleteTask, updateBacklogTask, deleteBacklogTask, addBacklogTask,
  } = useGardenStore()

  const treeTask    = activeTask
    ? trees.find(t => t.id === activeTask.treeId)?.tasks.find(tk => tk.id === activeTask.taskId)
    : undefined
  const backlogTask = activeBacklogTaskId ? backlog.find(t => t.id === activeBacklogTaskId) : undefined
  const sourceTask: Task | undefined = treeTask ?? backlogTask

  const isCreate = isCreatingTask && !activeTask && !activeBacklogTaskId

  const treeForTask = activeTask ? trees.find(t => t.id === activeTask.treeId) : undefined
  const project = treeForTask
    ? projects.find(p => p.id === treeForTask.projectId)
    : projects.find(p => p.name === sourceTask?.project)
  const biome = biomes.find(b => b.id === project?.biomeId)
  const biomeColor = BIOME_COLOR[biome?.id ?? ''] ?? '#7B9E8B'

  const [title,           setTitle]           = useState('')
  const [priority,        setPriority]        = useState<Priority>('none')
  const [notes,           setNotes]           = useState('')
  const [createProjectId, setCreateProjectId] = useState('')

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
  }, [sourceTask?.id, isCreate, createContext?.projectId])  // eslint-disable-line react-hooks/exhaustive-deps

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
    if (activeTask) deleteTask(activeTask.treeId, activeTask.taskId)
    else if (activeBacklogTaskId) deleteBacklogTask(activeBacklogTaskId)
    handleClose()
  }

  const breadcrumb = isCreate
    ? 'NEW TASK'
    : `${(biome?.name ?? '').toUpperCase()} · ${(project?.name ?? '').toUpperCase()}`

  const leftBorder = !isCreate ? PRIORITY_BORDER[priority] : 'transparent'

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{ borderLeft: `1.5px solid ${leftBorder}` }}
    >
      <MobileNavBar
        onBack={handleClose}
        breadcrumb={breadcrumb}
        biomeColor={isCreate ? undefined : biomeColor}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: '0.5px solid rgba(232,213,160,0.08)' }}
        >
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder={isCreate ? 'What needs to get done?' : 'Task title…'}
            className="w-full bg-transparent font-serif text-[22px] font-[300] leading-snug outline-none"
            style={{
              color: title ? '#fbe6a0' : 'rgba(251,230,160,0.25)',
              fontStyle: isCreate && !title ? 'italic' : 'normal',
            }}
          />
          <span className="font-mono text-[8px] tracking-[0.12em]" style={{ color: 'rgba(251,230,160,0.15)' }}>
            {isCreate ? 'CLICK TO NAME THIS TASK' : 'CLICK TO EDIT TITLE'}
          </span>
        </div>

        {/* Priority */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: '0.5px solid rgba(232,213,160,0.08)' }}
        >
          <span className="block font-mono text-[9px] font-bold tracking-[0.12em] mb-3" style={{ color: '#7B9E8B' }}>
            PRIORITY
          </span>
          <div className="flex gap-2">
            {(['none', 'high', 'critical'] as Priority[]).map(p => {
              const active = priority === p
              const chipColor = p === 'critical' ? '#da525d' : p === 'high' ? '#e2b540' : 'rgba(251,230,160,0.55)'
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className="font-mono text-[9px] font-bold tracking-[0.08em] px-3 py-[6px]"
                  style={{
                    border: active ? `0.5px solid ${PRIORITY_BORDER[p] || 'rgba(226,181,64,0.5)'}` : '0.5px solid rgba(232,213,160,0.14)',
                    background: active ? `${PRIORITY_BORDER[p] || '#e2b540'}18` : 'transparent',
                    color: active ? chipColor : 'rgba(251,230,160,0.3)',
                    transition: 'border-color 150ms ease, background-color 150ms ease, color 150ms ease',
                  }}
                >
                  {p === 'none' ? 'NONE' : p === 'high' ? 'HIGH' : 'CRITICAL'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Details */}
        <div style={{ borderBottom: '0.5px solid rgba(232,213,160,0.08)' }}>
          {isCreate ? (
            <div className="flex items-center gap-4 px-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
              <span className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0" style={{ width: 72, color: 'rgba(123,158,139,0.75)' }}>
                Project
              </span>
              <ProjectSelect
                value={createProjectId}
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                onChange={setCreateProjectId}
              />
            </div>
          ) : sourceTask && (
            <>
              <div className="flex items-center gap-4 px-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0" style={{ width: 72, color: 'rgba(123,158,139,0.75)' }}>Biome</span>
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full" style={{ width: 6, height: 6, background: biomeColor }} />
                  <span className="font-serif text-[13px] font-[400]" style={{ color: '#fbe6a0' }}>{biome?.name ?? '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0" style={{ width: 72, color: 'rgba(123,158,139,0.75)' }}>Project</span>
                <span className="font-serif text-[13px] font-[400]" style={{ color: '#fbe6a0' }}>{project?.name ?? '—'}</span>
              </div>
              <div className="flex items-center gap-4 px-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0" style={{ width: 72, color: 'rgba(123,158,139,0.75)' }}>Week</span>
                <span className="font-serif text-[13px] font-[400]" style={{ color: '#fbe6a0' }}>
                  {treeForTask ? weekLabel(treeForTask.week) : 'Backlog'}
                </span>
              </div>
              <div className="flex items-center gap-4 px-5 py-[9px]" style={{ borderTop: '0.5px solid rgba(232,213,160,0.07)' }}>
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase flex-shrink-0" style={{ width: 72, color: 'rgba(123,158,139,0.75)' }}>Status</span>
                <span className="font-serif text-[13px] font-[400]" style={{ color: '#fbe6a0' }}>
                  {sourceTask.status.charAt(0).toUpperCase() + sourceTask.status.slice(1)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        <div className="px-5 py-4">
          <span className="block font-mono text-[9px] font-bold tracking-[0.12em] mb-3" style={{ color: '#7B9E8B' }}>NOTES</span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any context, links, blockers…"
            rows={4}
            className="w-full bg-transparent font-serif text-[14px] font-[300] italic leading-relaxed outline-none resize-none"
            style={{ color: notes ? 'rgba(251,230,160,0.55)' : 'rgba(251,230,160,0.22)' }}
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
        {!isCreate ? (
          <button
            onClick={handleDelete}
            className="font-mono text-[10px] tracking-[0.08em]"
            style={{ color: '#da525d' }}
          >
            Delete task
          </button>
        ) : <span />}

        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="font-mono text-[10px] tracking-[0.08em] px-3 py-[7px]"
            style={{ border: '0.5px solid rgba(232,213,160,0.22)', color: 'rgba(251,230,160,0.4)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="font-mono text-[10px] font-bold tracking-[0.08em] px-4 py-[7px] disabled:opacity-30"
            style={{ background: '#e2b540', color: '#112f2c' }}
          >
            {isCreate ? 'Create task' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
