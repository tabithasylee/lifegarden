import { useGardenStore } from '@/store/garden'

// SVG icons matching the Paper design
function GardenIcon({ active }: { active: boolean }) {
  const c = active ? '#e2b540' : 'rgba(251,230,160,0.4)'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="9" y1="16" x2="9" y2="8"  stroke={c} strokeWidth="0.8"/>
      <line x1="9" y1="12" x2="6" y2="9"  stroke={c} strokeWidth="0.6"/>
      <line x1="9" y1="10" x2="12" y2="7" stroke={c} strokeWidth="0.6"/>
      <ellipse cx="9" cy="16.5" rx="3.5" ry="1" stroke={c} strokeWidth="0.5" fill="none"/>
      <ellipse cx="6"  cy="8.5"  rx="1.8" ry="1"   stroke={c} strokeWidth="0.45" fill="none"/>
      <ellipse cx="12" cy="6.5"  rx="1.8" ry="1"   stroke={c} strokeWidth="0.45" fill="none"/>
    </svg>
  )
}

function WeekIcon({ active }: { active: boolean }) {
  const c = active ? '#e2b540' : 'rgba(251,230,160,0.4)'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="1" stroke={c} strokeWidth="0.7"/>
      <line x1="2" y1="7" x2="16" y2="7" stroke={c} strokeWidth="0.5"/>
      <line x1="6" y1="1" x2="6" y2="5"  stroke={c} strokeWidth="0.7"/>
      <line x1="12" y1="1" x2="12" y2="5" stroke={c} strokeWidth="0.7"/>
      <line x1="5"  y1="10" x2="13" y2="10" stroke={c} strokeWidth="0.5"/>
      <line x1="5"  y1="13" x2="11" y2="13" stroke={c} strokeWidth="0.5"/>
    </svg>
  )
}

function BacklogIcon({ active }: { active: boolean }) {
  const c = active ? '#e2b540' : 'rgba(251,230,160,0.4)'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="6" y1="5"  x2="15" y2="5"  stroke={c} strokeWidth="0.7"/>
      <line x1="6" y1="9"  x2="15" y2="9"  stroke={c} strokeWidth="0.7"/>
      <line x1="6" y1="13" x2="13" y2="13" stroke={c} strokeWidth="0.7"/>
      <circle cx="3.5" cy="5"  r="1" stroke={c} strokeWidth="0.6" fill="none"/>
      <circle cx="3.5" cy="9"  r="1" stroke={c} strokeWidth="0.6" fill="none"/>
      <circle cx="3.5" cy="13" r="1" stroke={c} strokeWidth="0.6" fill="none"/>
    </svg>
  )
}

export default function MobileBottomTabs() {
  const {
    activeView,
    setActiveView, setActiveTree, setActiveBiome,
    setActiveTask, setActiveBacklogTask, setCreatingTask,
  } = useGardenStore()

  // Always clear ALL overlay state before switching tabs — overlay state
  // (activeTreeId, activeTask, etc.) takes priority in MobileApp routing, so
  // leaving any of it set would prevent the new tab from becoming visible.
  function navigate(view: 'garden' | 'tasks' | 'backlog') {
    document.activeElement instanceof HTMLElement && document.activeElement.blur()
    setActiveTree(null)
    setActiveBiome(null)
    setActiveTask(null)
    setActiveBacklogTask(null)
    setCreatingTask(false)
    setActiveView(view)
  }

  const tabs = [
    { id: 'garden'  as const, label: 'GARDEN',  Icon: GardenIcon  },
    { id: 'tasks'   as const, label: 'WEEK',    Icon: WeekIcon    },
    { id: 'backlog' as const, label: 'BACKLOG', Icon: BacklogIcon },
  ]

  return (
    <div
      className="flex-shrink-0 flex"
      style={{
        height: 60,
        background: 'rgba(8,20,16,0.97)',
        borderTop: '0.5px solid rgba(232,213,160,0.1)',
      }}
    >
      {tabs.map(tab => {
        const active = activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{
              borderTop: active ? '2px solid #e2b540' : '2px solid transparent',
              transition: 'border-top-color 200ms ease',
            }}
          >
            <tab.Icon active={active} />
            <span
              className="font-mono text-[8px] tracking-[0.1em]"
              style={{ color: active ? '#e2b540' : 'rgba(251,230,160,0.4)' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
