import type { Variants } from 'framer-motion'

export const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

export const panelVariants: Variants = {
  hidden:  { opacity: 0, y: 8, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit:    { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.15 } },
}
