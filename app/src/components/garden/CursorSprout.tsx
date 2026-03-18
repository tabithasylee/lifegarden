import { useEffect, useRef, useState } from 'react'
import { cursorState } from '@/lib/cursorState'
import { useGardenStore } from '@/store/garden'
import { anyOverlayOpen } from '@/lib/overlay'

export default function CursorSprout() {
  const [show, setShow]   = useState(false)
  const [phase, setPhase] = useState<'enter' | 'idle'>('enter')
  const svgRef            = useRef<SVGSVGElement>(null)
  const prevInBiome       = useRef(false)
  const rafRef            = useRef<number>(0)
  const timeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (svgRef.current) {
        svgRef.current.style.left = `${e.clientX - 8}px`
        svgRef.current.style.top  = `${e.clientY - 22}px`
      }
    }

    function tick() {
      const inBiome = cursorState.inBiome && !anyOverlayOpen(useGardenStore.getState())
      if (inBiome !== prevInBiome.current) {
        prevInBiome.current = inBiome
        if (inBiome) {
          setShow(true)
          setPhase('enter')
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => setPhase('idle'), 420)
        } else {
          setShow(false)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMouseMove)
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!show) return null

  const animating = phase === 'enter'

  return (
    <svg
      ref={svgRef}
      width="16"
      height="22"
      viewBox="0 0 16 22"
      fill="none"
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 50,
        opacity: 0.55,
        left: 0,
        top: 0,
      }}
    >
      {/* Stem — grows from base upward */}
      <line
        x1="8" y1="22" x2="8" y2="8"
        stroke="#fbe6a0"
        strokeWidth="0.8"
        style={{
          transformOrigin: '8px 22px',
          transformBox: 'fill-box',
          animation: animating ? 'sproutStem 400ms ease-out forwards' : 'none',
        }}
      />
      {/* Left leaf arc */}
      <path
        d="M8 14 Q3 10 2 6"
        stroke="#fbe6a0"
        strokeWidth="0.65"
        style={{
          transformOrigin: '8px 14px',
          transformBox: 'fill-box',
          animation: animating ? 'sproutLeaf 320ms 120ms ease-out forwards' : 'none',
          opacity: animating ? 0 : 1,
        }}
      />
      {/* Right leaf arc */}
      <path
        d="M8 14 Q13 10 14 6"
        stroke="#fbe6a0"
        strokeWidth="0.65"
        style={{
          transformOrigin: '8px 14px',
          transformBox: 'fill-box',
          animation: animating ? 'sproutLeaf 320ms 120ms ease-out forwards' : 'none',
          opacity: animating ? 0 : 1,
        }}
      />
    </svg>
  )
}
