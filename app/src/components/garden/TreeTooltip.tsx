// app/src/components/garden/TreeTooltip.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { cursorState }    from '@/lib/cursorState'
import { useGardenStore } from '@/store/garden'
import { anyOverlayOpen } from '@/lib/overlay'
import { weekLabel, weekDateRange } from '@/lib/weeks'
import GlitchText  from '@/components/shared/GlitchText'
import GlitchPanel from '@/components/shared/GlitchPanel'
import AnnotationLine from '@/components/shared/AnnotationLine'

// Module-level map: populated by GardenCanvas after mount
const treeWorldPositions = new Map<string, { wx: number; wy: number }>()

export function registerTreePosition(id: string, wx: number, wy: number) {
  treeWorldPositions.set(id, { wx, wy })
}

export function clearTreePositions() {
  treeWorldPositions.clear()
}

const PANEL_W = 200

interface TooltipState {
  treeId:  string
  screenX: number
  screenY: number
  panelX:  number
  panelY:  number
  lineToX: number
  visible: boolean
}

interface TreeTooltipProps {
  cameraRef:   React.MutableRefObject<THREE.OrthographicCamera | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
}

export default function TreeTooltip({ cameraRef, viewportRef }: TreeTooltipProps) {
  const [state, setState] = useState<TooltipState | null>(null)
  const rafRef   = useRef<number>(0)
  const prevIdRef = useRef<string | null>(null)

  const trees    = useGardenStore(s => s.trees)
  const projects = useGardenStore(s => s.projects)
  const biomes   = useGardenStore(s => s.biomes)

  const tick = useCallback(() => {
    const camera   = cameraRef.current
    const viewport = viewportRef.current
    if (!camera || !viewport) { rafRef.current = requestAnimationFrame(tick); return }

    const id = anyOverlayOpen(useGardenStore.getState()) ? null : cursorState.hoveredTreeId

    if (!id) {
      if (prevIdRef.current !== null) {
        prevIdRef.current = null
        setState(s => s ? { ...s, visible: false } : null)
      }
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    const wp = treeWorldPositions.get(id)
    if (!wp) { rafRef.current = requestAnimationFrame(tick); return }

    // Project world position (base of tree on ground) to screen
    const v = new THREE.Vector3(wp.wx, 0, wp.wy)
    v.project(camera)
    const rect    = viewport.getBoundingClientRect()
    const screenX = (v.x * 0.5 + 0.5) * rect.width  + rect.left
    const screenY = (-v.y * 0.5 + 0.5) * rect.height + rect.top

    // Use canvas-relative x to decide which side the panel appears on
    const relX     = (v.x * 0.5 + 0.5)  // 0 = canvas left, 1 = canvas right
    const nearRight = relX > 0.55
    const panelX   = nearRight ? screenX - PANEL_W - 20 : screenX + 20
    const panelY   = screenY - 80
    const lineToX  = nearRight ? panelX + PANEL_W : panelX

    if (id !== prevIdRef.current) {
      prevIdRef.current = id
      setState({ treeId: id, screenX, screenY, panelX, panelY, lineToX, visible: true })
    } else {
      setState(s => s ? { ...s, screenX, screenY, panelX, panelY, lineToX, visible: true } : s)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [cameraRef, viewportRef])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  if (!state) return null

  const tree    = trees.find(t => t.id === state.treeId)
  if (!tree) return null
  const project = projects.find(p => p.id === tree.projectId)
  const biome   = biomes.find(b => b.id === project?.biomeId)
  const done    = tree.tasks.filter(t => t.status === 'complete').length
  const total   = tree.tasks.length
  const wLabel  = weekLabel(tree.week)
  const dRange  = weekDateRange(tree.week)
  const headerText = `${wLabel} · ${(biome?.name ?? '').toUpperCase()} · ${(project?.name ?? '').toUpperCase()}`

  return (
    <>
      <AnnotationLine
        fromX={state.screenX} fromY={state.screenY}
        toX={state.lineToX}   toY={state.panelY + 40}
        visible={state.visible}
      />
      <motion.div
        className="fixed pointer-events-none"
        style={{ left: state.panelX, top: state.panelY, zIndex: 46, width: PANEL_W }}
        animate={{ opacity: state.visible ? 1 : 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <GlitchPanel
          triggerKey={state.treeId}
          delay={120}
          duration={200}
          className="px-3 py-2"
          style={{ background: 'rgba(8,22,16,0.97)' }}
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-[8.5px] tracking-[0.08em] text-[var(--color-sage)]">
              <GlitchText text={headerText} active={state.visible} options={{ stagger: 18, delay: 250 }} />
            </p>
            <p className="font-serif text-[11px] italic font-light text-[var(--color-cream)] opacity-70">
              <GlitchText text={dRange} active={state.visible} options={{ stagger: 25, interval: 40, delay: 270 }} />
            </p>
            {total > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-[1px] bg-[rgba(232,213,160,0.08)] relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#44CF6C]"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[8px] text-[var(--color-sage)]">
                  <GlitchText text={`${done}/${total}`} active={state.visible} options={{ stagger: 40, delay: 300 }} />
                </span>
              </div>
            )}
          </div>
        </GlitchPanel>
      </motion.div>
    </>
  )
}
