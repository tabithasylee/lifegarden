// app/src/components/shared/GlitchPanel.tsx
// Wraps any panel with an animated SVG border that draws in on mount.
// After the initial draw-in, the border silently extends as content grows.

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'

interface GlitchPanelProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  strokeColor?: string
  duration?: number
  delay?: number
  triggerKey?: string | number
}

export default function GlitchPanel({
  children,
  className = '',
  style,
  strokeColor = 'rgba(232,213,160,0.18)',
  duration = 200,
  delay = 0,
  triggerKey,
}: GlitchPanelProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const controls       = useAnimation()
  const [perimeter, setPerimeter] = useState(0)
  const lastAnimatedKey = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const p = (width + height) * 2
      setPerimeter(p)

      // Only play draw-in animation when a new modal opens (triggerKey changed).
      // On content resize (same key), just update strokeDasharray — border extends silently.
      if (lastAnimatedKey.current !== triggerKey) {
        lastAnimatedKey.current = triggerKey
        controls.set({ strokeDashoffset: p })
        controls.start({
          strokeDashoffset: 0,
          transition: { duration: duration / 1000, delay: delay / 1000, ease: 'easeOut' },
        })
      }
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [triggerKey, controls, duration, delay])

  return (
    <div ref={containerRef} className={`relative ${className}`} style={style}>
      {children}
      {perimeter > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <motion.rect
            x={0.5} y={0.5}
            width="calc(100% - 1px)" height="calc(100% - 1px)"
            fill="none"
            stroke={strokeColor}
            strokeWidth={0.5}
            strokeDasharray={perimeter}
            animate={controls}
          />
        </svg>
      )}
    </div>
  )
}
