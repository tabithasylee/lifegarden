import { useState, useEffect, useRef } from 'react'

interface Option { value: string; label: string }

interface ProjectSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
}

export default function ProjectSelect({ value, options, onChange, placeholder = 'Select project…' }: ProjectSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 font-serif text-[13px] font-[400] outline-none"
        style={{ color: selected ? '#fbe6a0' : 'rgba(251,230,160,0.3)' }}
      >
        <span>{selected?.label ?? placeholder}</span>
        <svg
          width="8" height="5" viewBox="0 0 8 5" fill="none"
          style={{
            opacity: 0.4,
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <path d="M1 1l3 3 3-3" stroke="#fbe6a0" strokeWidth="1" strokeLinecap="square"/>
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute z-50 top-full mt-1 min-w-[160px] flex flex-col py-1"
          style={{
            background: 'rgba(8,22,16,0.99)',
            border: '0.5px solid rgba(232,213,160,0.18)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {options.map(opt => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="text-left px-4 py-[7px] font-serif text-[12px] font-[400] transition-colors"
                style={{
                  color: active ? '#e2b540' : '#fbe6a0',
                  background: active ? 'rgba(226,181,64,0.07)' : 'transparent',
                  borderLeft: active ? '1.5px solid #e2b540' : '1.5px solid transparent',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
