// app/src/components/shared/GlitchText.tsx
import { useEffect, useState, useRef } from 'react'

export const NOISE_CHARS = '?_>*[]{}~|/\\!#@=+-^<>'

/** Exported for testing — pure function, no React dependency */
export function resolveChar(target: string, resolveAt: number, elapsed: number): string {
  if (target === ' ') return ' '
  if (elapsed >= resolveAt) return target
  return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]
}

interface UseGlitchTextOptions {
  stagger?: number   // ms between each character resolving, default 35
  interval?: number  // scramble tick rate in ms, default 50
  delay?: number     // ms before the scramble starts, default 0
}

export function useGlitchText(
  text: string,
  active: boolean,
  options: UseGlitchTextOptions = {}
): string {
  const { stagger = 35, interval = 50, delay = 0 } = options
  const [displayed, setDisplayed] = useState(text)
  const startRef  = useRef<number | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const delayRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
      startRef.current = null
      setDisplayed(text)
      return
    }

    const start = () => {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (startRef.current ?? Date.now())
        const chars = text.split('').map((ch, i) =>
          resolveChar(ch, i * stagger, elapsed)
        )
        setDisplayed(chars.join(''))
        if (elapsed >= text.length * stagger) {
          clearInterval(timerRef.current!)
          setDisplayed(text)
        }
      }, interval)
    }

    if (delay > 0) {
      delayRef.current = setTimeout(start, delay)
    } else {
      start()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [active, text, stagger, interval, delay])

  return displayed
}

interface GlitchTextProps {
  text: string
  active?: boolean
  className?: string
  options?: UseGlitchTextOptions
}

export default function GlitchText({ text, active = true, className, options }: GlitchTextProps) {
  const displayed = useGlitchText(text, active, options)
  return <span className={className}>{displayed}</span>
}
