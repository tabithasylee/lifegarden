import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import { backdropVariants, panelVariants } from '@/components/shared/modalVariants'
import GlitchPanel from '@/components/shared/GlitchPanel'
import GlitchText from '@/components/shared/GlitchText'

const PRESET_COLORS = [
  { label: 'Teal',   value: '#7BA89A' },
  { label: 'Olive',  value: '#A8B87A' },
  { label: 'Green',  value: '#7AB88A' },
  { label: 'Violet', value: '#8A7AB8' },
  { label: 'Rose',   value: '#B87A8A' },
  { label: 'Sand',   value: '#B8A07A' },
]

export default function CreateBiomeModal() {
  const { isCreatingBiome, setCreatingBiome, addBiome } = useGardenStore()
  const [name, setName]   = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0].value)

  useEffect(() => {
    if (!isCreatingBiome) return
    setName(''); setColor(PRESET_COLORS[0].value)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreatingBiome(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isCreatingBiome, setCreatingBiome])

  function handleCreate() {
    if (!name.trim()) return
    addBiome(name.trim(), color)
    setCreatingBiome(false)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">

      <motion.div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(6,18,14,0.75)' }}
        onClick={() => setCreatingBiome(false)}
        variants={backdropVariants}
        initial="hidden" animate="visible" exit="exit"
      />

      <GlitchPanel triggerKey="create-biome" className="w-[360px] pointer-events-auto">
        <motion.div
          className="relative w-full flex flex-col"
          style={{ background: 'rgba(8,22,16,0.97)' }}
          variants={panelVariants}
          initial="hidden" animate="visible" exit="exit"
        >
          {/* Header */}
          <div className="flex items-center justify-between pl-5 pr-4 pt-4 pb-3">
            <span className="font-mono text-[9px] font-bold tracking-[0.12em] text-sage">
              <GlitchText text="NEW BIOME" />
            </span>
            <button
              onClick={() => setCreatingBiome(false)}
              className="font-mono text-[10px] text-sage/50 hover:text-sage/80 transition-colors"
            >✕</button>
          </div>

          <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

          {/* Name */}
          <div className="pl-5 pr-4 pt-3 pb-3">
            <span className="font-mono text-[7.5px] tracking-[0.12em] text-sage/70 uppercase block mb-2">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
              placeholder="e.g. Creative, Learning…"
              className="w-full bg-transparent font-serif text-[13px] font-[400] outline-none py-1"
              style={{
                borderBottom: '0.5px solid rgba(226,181,64,0.3)',
                color: name ? '#fbe6a0' : 'rgba(251,230,160,0.3)',
              }}
            />
          </div>

          <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

          {/* Color */}
          <div className="pl-5 pr-4 pt-3 pb-3">
            <span className="font-mono text-[7.5px] tracking-[0.12em] text-sage/70 uppercase block mb-2">
              Color
            </span>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="w-6 h-6 transition-transform hover:scale-110"
                  style={{
                    background: c.value,
                    outline: color === c.value ? `2px solid rgba(226,181,64,0.7)` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ height: '0.5px', background: 'rgba(232,213,160,0.08)' }} />

          {/* Footer */}
          <div className="flex items-center justify-between pl-5 pr-4 py-3">
            <button
              onClick={() => setCreatingBiome(false)}
              className="font-mono text-[9px] tracking-[0.1em] transition-colors"
              style={{ color: 'rgba(251,230,160,0.3)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="font-mono text-[10px] font-bold tracking-[0.1em] pl-4 pr-4 py-2 disabled:opacity-30"
              style={{ background: '#e2b540', color: '#112f2c' }}
            >
              Create biome →
            </button>
          </div>
        </motion.div>
      </GlitchPanel>
    </div>
  )
}
