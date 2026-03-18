import { AnimatePresence } from 'framer-motion'
import AuthGate from '@/components/auth/AuthGate'
import TopBar from '@/components/chrome/TopBar'
import GardenCanvas from '@/components/garden/GardenCanvas'
import TreeClickModal from '@/components/garden/TreeClickModal'
import PlanningModal from '@/components/garden/PlanningModal'
import TaskDetailModal from '@/components/garden/TaskDetailModal'
import TasksView from '@/components/views/TasksView'
import BacklogView from '@/components/views/BacklogView'
import MobileApp from '@/components/mobile/MobileApp'
import CreateBiomeModal from '@/components/garden/CreateBiomeModal'
import { useGardenStore } from '@/store/garden'
import { useIsMobile } from '@/hooks/useIsMobile'
import CursorSprout from '@/components/garden/CursorSprout'
import FloatingEditButton from '@/components/garden/FloatingEditButton'

export default function App() {
  const {
    activeView, activeTreeId, activeBiomeId,
    activeTask, activeBacklogTaskId, isCreatingTask, isCreatingBiome,
    biomes,
  } = useGardenStore()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <AuthGate>
        <div className="relative w-full h-full bg-bg overflow-hidden">
          <MobileApp />
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
    <div className="relative w-full h-full flex flex-col bg-bg overflow-hidden">
      <TopBar />

      {/* Garden canvas fills remaining space */}
      <div className="relative flex-1 overflow-hidden">
        <GardenCanvas key={biomes.length} />
        <CursorSprout />
        <FloatingEditButton />

        <AnimatePresence>
          {activeTreeId && <TreeClickModal key="tree-modal" />}
        </AnimatePresence>
        <AnimatePresence>
          {activeBiomeId && <PlanningModal key="planning-modal" />}
        </AnimatePresence>
        <AnimatePresence>
          {(activeTask || activeBacklogTaskId || isCreatingTask) &&
            <TaskDetailModal key="task-detail" />}
        </AnimatePresence>
        <AnimatePresence>
          {isCreatingBiome && <CreateBiomeModal key="create-biome" />}
        </AnimatePresence>
        <AnimatePresence>
          {activeView === 'tasks'   && <TasksView key="tasks-view" />}
          {activeView === 'backlog' && <BacklogView key="backlog-view" />}
        </AnimatePresence>
      </div>
    </div>
    </AuthGate>
  )
}
