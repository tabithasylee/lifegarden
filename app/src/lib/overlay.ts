import type { useGardenStore } from '@/store/garden'

export function anyOverlayOpen(store: ReturnType<typeof useGardenStore.getState>): boolean {
  return !!(
    store.activeTreeId || store.activeBiomeId ||
    store.activeTask   || store.activeBacklogTaskId ||
    store.isCreatingTask || store.isCreatingBiome || store.activeView !== 'garden'
  )
}
