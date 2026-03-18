import { motion, AnimatePresence } from 'framer-motion'
import { useGardenStore } from '@/store/garden'
import MobileGarden        from './MobileGarden'
import MobileTreeDetail    from './MobileTreeDetail'
import MobileWeekView      from './MobileWeekView'
import MobileBacklog       from './MobileBacklog'
import MobilePlanningModal from './MobilePlanningModal'
import MobileTaskDetail    from './MobileTaskDetail'

type RouteKey = 'task-detail' | 'tree-detail' | 'planning' | 'week' | 'backlog' | 'garden'

interface Route {
  key: RouteKey
  Component: React.ComponentType
}

function getRoute(s: ReturnType<typeof useGardenStore.getState>): Route {
  if (s.activeTask || s.activeBacklogTaskId || s.isCreatingTask)
    return { key: 'task-detail', Component: MobileTaskDetail    }
  if (s.activeTreeId)
    return { key: 'tree-detail', Component: MobileTreeDetail    }
  if (s.activeBiomeId)
    return { key: 'planning',    Component: MobilePlanningModal }
  if (s.activeView === 'tasks')
    return { key: 'week',        Component: MobileWeekView      }
  if (s.activeView === 'backlog')
    return { key: 'backlog',     Component: MobileBacklog       }
  return   { key: 'garden',      Component: MobileGarden        }
}

const variants = {
  initial: { opacity: 0, filter: 'blur(8px)', scale: 0.99 },
  animate: {
    opacity: 1, filter: 'blur(0px)', scale: 1,
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0, filter: 'blur(6px)', scale: 0.99,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  },
}

export default function MobileApp() {
  const state = useGardenStore()
  const route = getRoute(state)

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={route.key}
          className="absolute inset-0"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <route.Component />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
