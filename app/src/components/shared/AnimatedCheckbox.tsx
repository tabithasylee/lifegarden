import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  done: boolean
  size?: number
  onClick?: () => void
}

export default function AnimatedCheckbox({ done, size = 14, onClick }: Props) {
  return (
    <motion.div
      onClick={onClick}
      animate={done ? { scale: [1, 1.18, 0.9, 1] } : { scale: 1 }}
      transition={{ duration: 0.25, times: [0, 0.35, 0.65, 1] }}
      className="flex-shrink-0 flex items-center justify-center cursor-pointer"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: done ? 'none' : '1px solid rgba(251,230,160,0.3)',
        background: done ? '#44CF6C' : 'transparent',
      }}
    >
      <AnimatePresence>
        {done && (
          <motion.svg
            key="check"
            width={size * 0.6}
            height={size * 0.5}
            viewBox="0 0 8 6"
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.path
              d="M1 3l2 2 4-4"
              stroke="#112f2c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
