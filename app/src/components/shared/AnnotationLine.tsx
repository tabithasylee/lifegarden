// app/src/components/shared/AnnotationLine.tsx
import { motion } from 'framer-motion'

interface AnnotationLineProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  visible: boolean
}

export default function AnnotationLine({ fromX, fromY, toX, toY, visible }: AnnotationLineProps) {
  const length = Math.hypot(toX - fromX, toY - fromY)

  return (
    <svg
      className="pointer-events-none fixed inset-0 w-full h-full"
      style={{ zIndex: 45 }}
    >
      <motion.line
        x1={fromX} y1={fromY} x2={toX} y2={toY}
        stroke="rgba(232,213,160,0.5)"
        strokeWidth={0.5}
        strokeDasharray={length}
        initial={{ strokeDashoffset: length, opacity: 0 }}
        animate={visible
          ? { strokeDashoffset: 0, opacity: 1 }
          : { strokeDashoffset: length, opacity: 0 }
        }
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
      <motion.circle
        cx={fromX} cy={fromY} r={2.5}
        fill="rgba(232,213,160,0.5)"
        initial={{ opacity: 0, scale: 0 }}
        animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ duration: 0.12, delay: 0.08 }}
        style={{ transformOrigin: `${fromX}px ${fromY}px` }}
      />
    </svg>
  )
}
