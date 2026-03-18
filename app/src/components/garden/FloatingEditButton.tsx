import { motion, AnimatePresence } from 'framer-motion'
import { useGardenStore } from '@/store/garden'

export default function FloatingEditButton() {
  const { isEditMode, setEditMode, activeView } = useGardenStore()

  return (
    <AnimatePresence>
      {activeView === 'garden' && (
        <motion.button
          key="edit-btn"
          initial={{ opacity: 0, y: 6 }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
          animate={{
            opacity: 1, y: 0,
            background:  isEditMode ? 'rgba(226,181,64,0.1)'            : 'rgba(8,22,16,0.88)',
            borderColor: isEditMode ? 'rgba(226,181,64,0.45)'           : 'rgba(232,213,160,0.18)',
            color:       isEditMode ? '#e2b540'                         : 'rgba(251,230,160,0.4)',
          }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: isEditMode === undefined ? 0.25 : 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setEditMode(!isEditMode)}
          className="absolute bottom-[52px] left-5 z-20 flex items-center gap-[6px] px-3 py-[7px]"
          style={{ borderWidth: '0.5px', borderStyle: 'solid', textDecoration: 'none' }}
          title={isEditMode ? 'Exit edit mode' : 'Edit layout'}
        >
          {/* Pencil icon — rotates when active */}
          <motion.svg
            width="10" height="10" viewBox="0 0 12 12" fill="none"
            animate={{ rotate: isEditMode ? -12 : 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <path
              d="M1 11h10M8.5 1.5l2 2L4 10H2V8l6.5-6.5z"
              stroke="currentColor" strokeWidth="0.9" strokeLinecap="square" strokeLinejoin="miter"
            />
          </motion.svg>

          {/* Text — cross-fades between EDIT / EDITING */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isEditMode ? 'editing' : 'edit'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              className="font-mono text-[8px] font-bold tracking-[0.12em] leading-none"
              style={{ textDecoration: 'none' }}
            >
              {isEditMode ? 'EDITING' : 'EDIT'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
