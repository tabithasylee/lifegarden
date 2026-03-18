import { useState, useEffect } from 'react'
import { useGardenStore } from '@/store/garden'
import { supabase } from '@/lib/supabase'
import { setCurrentUserId } from '@/lib/api'

function GardenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M7 21H5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M15 18L21 18" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M9 19L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M3 19L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M7 15H5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M7 9H5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M15 6L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M9 7L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M3 7L3 5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M7 3L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
    </svg>
  )
}
function TasksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M14 12L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M21 12L21 19" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M3 12L3 19" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M19 21L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M20 3L4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M20 8L4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
    </svg>
  )
}
function BacklogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M16.01 7L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M6.01 12L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M8.01 14L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M10.01 16L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M2 18V17" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M4 15V14" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M4 20L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M12 14V12" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M14 10V9" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M20 14V12" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <path d="M22 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
    </svg>
  )
}

const NAV_ICONS = { garden: BacklogIcon, tasks: TasksIcon, backlog: GardenIcon }
import { weekLabel, weekDateRange } from '@/lib/weeks'
import GlitchText from '@/components/shared/GlitchText'

function todayLabel(): string {
  const now = new Date()
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2,'0')} ${MONTHS[now.getMonth()]}`
}

function clockLabel(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px h-6 flex-shrink-0 bg-[rgba(251,230,160,0.22)]" />
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'garden',  title: 'Garden'  },
  { id: 'tasks',   title: 'Tasks'   },
  { id: 'backlog', title: 'Backlog' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopBar() {
  const { currentWeek, activeView, setActiveView } = useGardenStore()
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const time   = clockLabel()
  const today  = todayLabel()
  const wLabel = weekLabel(currentWeek)
  const wRange = weekDateRange(currentWeek)

  return (
    <div className="flex items-center h-12 flex-shrink-0 bg-sidebar border-b border-[rgba(251,230,160,0.12)] z-20">

      {/* Icon-only nav */}
      <nav className="flex items-center h-full flex-shrink-0">
        {NAV_ITEMS.map(item => {
          const active = activeView === item.id
          return (
            <button
              key={item.id}
              title={item.title}
              onClick={() => setActiveView(item.id)}
              className={[
                'w-12 h-full flex items-center justify-center flex-shrink-0',
                'transition-colors border-b-2 border-r border-r-[rgba(251,230,160,0.1)] box-border',
                active
                  ? 'text-amber border-b-amber bg-amber/[0.07]'
                  : 'text-cream/30 border-b-transparent hover:text-cream/55 hover:bg-white/[0.03]',
              ].join(' ')}
            >
              {(() => { const Icon = NAV_ICONS[item.id]; return <Icon /> })()}
            </button>
          )
        })}
      </nav>

      {/* Brand — clear left separator */}
      <div className="flex flex-col gap-0.5 pl-5 pr-4 border-l border-[rgba(251,230,160,0.22)] flex-shrink-0 ml-1">
        <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-cream leading-none">
          <GlitchText text="LIFEGARDEN" active={true} options={{ stagger: 80 }} />
        </span>
        <span className="font-mono text-[7.5px] tracking-[0.1em] text-sage leading-none">
          GARDEN VIEW
        </span>
      </div>

      {/* Tick fill — min-width ensures it always provides some gap */}
      <div className="flex-1 min-w-[48px] h-px bg-[rgba(251,230,160,0.08)] mx-3" />

      {/* Week */}
      <div className="flex flex-col items-end gap-[3px] pl-5 pr-5 flex-shrink-0">
        <span className="font-mono text-[15px] font-[400] text-cream leading-none tracking-[0.02em]">
          <GlitchText text={wLabel} active={true} options={{ stagger: 80 }} />
        </span>
        <span className="font-serif italic text-[8.5px] font-[300] text-cream/50 leading-none">
          {wRange}
        </span>
      </div>

      <Sep />

      {/* Date */}
      <div className="flex flex-col items-end gap-[3px] pl-5 pr-5 flex-shrink-0">
        <span className="font-mono text-[7px] font-bold tracking-[0.1em] text-sage leading-none">TODAY</span>
        <span className="font-mono text-[10px] text-cream tracking-[0.06em] leading-none">{today}</span>
      </div>

      <Sep />

      {/* Time */}
      <div className="flex flex-col items-end gap-[3px] pl-5 pr-5 flex-shrink-0">
        <span className="font-mono text-[17px] font-bold text-cream leading-none tracking-[0.04em]">
          {time}
        </span>
        <span className="font-mono text-[7px] tracking-[0.12em] text-sage leading-none">LOCAL</span>
      </div>

      {/* Logout / LIVE */}
      {supabase ? (
        <button
          onClick={() => { setCurrentUserId(null); supabase!.auth.signOut() }}
          title="Sign out"
          className="flex items-center gap-2 pl-5 pr-6 h-full flex-shrink-0 border-l border-[rgba(251,230,160,0.22)] ml-2 transition-colors hover:bg-white/[0.03] group"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-sage/50 group-hover:text-sage/80 transition-colors">
            <path d="M5 2H2v8h3M8 9l3-3-3-3M11 6H5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="square"/>
          </svg>
          <span className="font-mono text-[7px] tracking-[0.12em] text-sage/50 group-hover:text-sage/80 transition-colors">OUT</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 pl-5 pr-6 border-l border-[rgba(251,230,160,0.22)] h-full flex-shrink-0 ml-2">
          <span className="w-[5px] h-[5px] rounded-full bg-green flex-shrink-0" />
          <span className="font-mono text-[7px] tracking-[0.12em] text-sage">LIVE</span>
        </div>
      )}

    </div>
  )
}
