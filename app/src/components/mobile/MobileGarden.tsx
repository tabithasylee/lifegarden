import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GardenCanvas from '@/components/garden/GardenCanvas'
import MobileBottomTabs from './MobileBottomTabs'
import { weekLabel } from '@/lib/weeks'
import { useGardenStore } from '@/store/garden'

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

export default function MobileGarden() {
  const { currentWeek, isEditMode, setEditMode } = useGardenStore()
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const wLabel = weekLabel(currentWeek)

  return (
    <div className="flex flex-col w-full h-full">
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: 48,
          background: 'rgba(8,20,16,0.92)',
          borderBottom: '0.5px solid rgba(232,213,160,0.08)',
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-cream leading-none">
            LIFEGARDEN
          </span>
          <span className="font-mono text-[7px] tracking-[0.1em] leading-none" style={{ color: '#7B9E8B' }}>
            GARDEN VIEW
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-[2px]">
            <span className="font-mono text-[7px] tracking-[0.08em]" style={{ color: '#7B9E8B' }}>WEEK</span>
            <span className="font-mono text-[15px] font-bold text-cream leading-none">{wLabel}</span>
          </div>
          <div
            style={{ width: 1, height: 24, background: 'rgba(232,213,160,0.15)' }}
          />
          <div className="flex flex-col items-end gap-[2px]">
            <span className="font-mono text-[9px] font-bold tracking-[0.06em] text-cream leading-none">
              {todayLabel()}
            </span>
            <span className="font-mono text-[11px] font-bold text-cream leading-none">
              {clockLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas fills remaining space */}
      <div className="relative flex-1 overflow-hidden">
        <GardenCanvas />
        {/* Floating edit button — top-right corner */}
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, delay: 0.3 } }}
          onClick={() => setEditMode(!isEditMode)}
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9"
          style={{
            background: isEditMode ? 'rgba(226,181,64,0.15)' : 'rgba(8,22,16,0.88)',
            border:     isEditMode ? '0.5px solid rgba(226,181,64,0.5)' : '0.5px solid rgba(232,213,160,0.2)',
            color:      isEditMode ? '#e2b540' : 'rgba(251,230,160,0.45)',
            transition: 'background 200ms, border-color 200ms, color 200ms',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 11h10M8.5 1.5l2 2L4 10H2V8l6.5-6.5z" stroke="currentColor" strokeWidth="0.9" strokeLinecap="square" strokeLinejoin="miter"/>
          </svg>
        </motion.button>
      </div>

      <MobileBottomTabs />
    </div>
  )
}
