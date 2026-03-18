// app/src/components/garden/GardenCanvas.tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js'
import { useGardenStore } from '@/store/garden'
import { cursorState }    from '@/lib/cursorState'
import { noise2D } from '@/lib/noiseUtils'
import { buildTreeGeometry } from '@/lib/treeGen'
import type { Biome, BiomeLayout, Tree } from '@/types'
import TreeTooltip, { registerTreePosition, clearTreePositions } from './TreeTooltip'
import { anyOverlayOpen } from '@/lib/overlay'


// ── Biome layout in world space (keyed by lowercase name) ──────────────────
const BIOME_LAYOUT_BY_NAME: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  work:     { cx: -340, cy:  60, rx: 340, ry: 230 },
  personal: { cx:  140, cy: -90, rx: 290, ry: 200 },
  health:   { cx:  420, cy: 110, rx: 265, ry: 185 },
}
const EXTRA_LAYOUTS = [
  { cx: -120, cy: 280, rx: 200, ry: 130 },
  { cx:  300, cy: -220, rx: 180, ry: 120 },
  { cx: -480, cy: -180, rx: 190, ry: 120 },
]

const EXTRA_COLORS = [
  new THREE.Color(0x8A7AB8),
  new THREE.Color(0xB87A8A),
  new THREE.Color(0xB8A07A),
]

// ── Color pairs per biome (keyed by lowercase name) ────────────────────────
const BIOME_COLOR_PAIRS_BY_NAME: Record<string, [THREE.Color, THREE.Color]> = {
  work:     [new THREE.Color(0xf5a623), new THREE.Color(0xe2b540)],
  personal: [new THREE.Color(0x44cf6c), new THREE.Color(0xfbe6a0)],
  health:   [new THREE.Color(0x7b9e8b), new THREE.Color(0xfbe6a0)],
}

function getBiomeLayout(biome: Biome, index: number, layouts?: Record<string, BiomeLayout>) {
  if (layouts?.[biome.id]) return layouts[biome.id]
  return BIOME_LAYOUT_BY_NAME[biome.name.toLowerCase()]
    ?? EXTRA_LAYOUTS[index % EXTRA_LAYOUTS.length]
}
function getBiomeColorPair(biome: Biome, index: number): [THREE.Color, THREE.Color] {
  return BIOME_COLOR_PAIRS_BY_NAME[biome.name.toLowerCase()]
    ?? [EXTRA_COLORS[index % EXTRA_COLORS.length], new THREE.Color(0xfbe6a0)]
}

// ── Ambient particles ──────────────────────────────────────────────────────
const N_PARTICLES = 1400
const PARTICLE_EXTENT = 2800   // covers full visible grid at any reasonable zoom
const PARTICLE_Y_RANGE = 320   // vertical float range
function buildParticles() {
  const pos = new Float32Array(N_PARTICLES * 3)
  const vel = Array.from({ length: N_PARTICLES }, () => ({
    angle:      Math.random() * Math.PI * 2,
    angleSpeed: (Math.random() - 0.5) * 0.010,   // slower direction drift
    speed:      0.012 + Math.random() * 0.030,    // slower horizontal movement
    yOffset:    Math.random() * Math.PI * 2,       // phase for sinusoidal float
    ySpeed:     0.003 + Math.random() * 0.006,     // float oscillation speed
    yAmp:       8 + Math.random() * 40,            // float amplitude (world units)
  }))
  for (let i = 0; i < N_PARTICLES; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * PARTICLE_EXTENT * 2
    pos[i * 3 + 1] = (Math.random() - 0.5) * PARTICLE_Y_RANGE
    pos[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_EXTENT * 2
  }
  return { pos, vel }
}

// ── Biome contour rotation (rings rotated -π/4 around Y) ──────────────────
const BIOME_ROT   = -Math.PI / 4
const COS_BIOME   = Math.cos(BIOME_ROT)   // ≈  0.707
const SIN_BIOME   = Math.sin(BIOME_ROT)   // ≈ -0.707

// Test point against a biome ellipse that is rotated by BIOME_ROT around Y.
// Inverse rotation is R(θ)^T: lx = dx*cos - dz*sin, lz = dx*sin + dz*cos
function pointInBiomeEllipse(px: number, pz: number, cx: number, cy: number, rx: number, ry: number, scale = 1) {
  const dx = px - cx, dz = pz - cy
  const lx = dx * COS_BIOME - dz * SIN_BIOME
  const lz = dx * SIN_BIOME + dz * COS_BIOME
  return (lx / (rx * scale)) ** 2 + (lz / (ry * scale)) ** 2 <= 1
}

// ── Isometric camera constants ─────────────────────────────────────────────
const ISO_DIST    = 1400
const ISO_ELEV    = Math.PI / 4   // 45° from horizontal — lower, trees more visible
const ISO_AZIMUTH = -Math.PI / 4  // 45° rotation for classic isometric look
const ISO_DX = ISO_DIST * Math.cos(ISO_ELEV) * Math.sin(ISO_AZIMUTH)  // ≈ -700
const ISO_DY = ISO_DIST * Math.sin(ISO_ELEV)                           // ≈  990
const ISO_DZ = ISO_DIST * Math.cos(ISO_ELEV) * Math.cos(ISO_AZIMUTH)  // ≈  700

// ── Week distance helper ───────────────────────────────────────────────────
function weekToOrdinal(w: string): number {
  const m = w.match(/(\d{4})-W(\d{2})/)
  return m ? parseInt(m[1]) * 53 + parseInt(m[2]) : 0
}
function weekDistance(a: string, b: string) {
  return Math.abs(weekToOrdinal(a) - weekToOrdinal(b))
}

// ── Component ──────────────────────────────────────────────────────────────
export default function GardenCanvas() {
  const mountRef  = useRef<HTMLDivElement>(null)
  const cameraRef = useRef(null) as React.MutableRefObject<THREE.OrthographicCamera | null>

  useEffect(() => {
    const el = mountRef.current!

    // ── Leaf textures (created per-mount so they can be disposed on cleanup) ──
    function makeCanvasTex(draw: (ctx: CanvasRenderingContext2D) => void) {
      const c = document.createElement('canvas')
      c.width = 64; c.height = 64
      draw(c.getContext('2d')!)
      return new THREE.CanvasTexture(c)
    }
    const LEAF_TEXTURES = {
      dot: makeCanvasTex(ctx => {
        // Hard-edged disc — no glow, no gradient
        ctx.fillStyle = 'rgba(255,255,255,1)'
        ctx.beginPath()
        ctx.arc(32, 32, 14, 0, Math.PI * 2)
        ctx.fill()
      }),
      ring: makeCanvasTex(ctx => {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 4.5
        ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI * 2); ctx.stroke()
      }),
    }
    const LEAF_TEX_LIST = [LEAF_TEXTURES.dot, LEAF_TEXTURES.ring]

    const store = useGardenStore.getState()

    let zoom = 1.0
    let panX = 0, panZ = 0
    let dragStart: { sx0: number; sy0: number; panX0: number; panZ0: number; worldX0: number; worldZ0: number } | null = null
    let editDrag:  { tm: TreeMesh; grabOffsetX: number; grabOffsetZ: number } | null = null
    let lastPinchDist = 0
    let wasPinching = false
    let modalWasOpen = false

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ReinhardToneMapping
    renderer.toneMappingExposure = 1.2
    el.appendChild(renderer.domElement)

    // ── Scene & Camera ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x112f2c)

    let W = el.clientWidth, H = el.clientHeight
    const camera = new THREE.OrthographicCamera(
      -W / 2, W / 2, H / 2, -H / 2, 1, 4000
    )
    cameraRef.current = camera

    function updateCamera() {
      const hw = (W / 2) / zoom
      const hh = (H / 2) / zoom
      camera.left = -hw; camera.right = hw
      camera.top  =  hh; camera.bottom = -hh
      camera.position.set(panX + ISO_DX, ISO_DY, panZ + ISO_DZ)
      camera.lookAt(panX, 0, panZ)
      camera.updateProjectionMatrix()
    }
    renderer.setSize(W, H)
    updateCamera()

    // ── Post-processing ──
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new OutputPass())

    // ── Grid (XZ ground plane) ──
    {
      const MAJOR = 200, MINOR = 40, HALF = 3000
      const majorVerts: number[] = [], minorVerts: number[] = []
      for (let x = -HALF; x <= HALF; x += MINOR) {
        const arr = x % MAJOR === 0 ? majorVerts : minorVerts
        arr.push(x, 0, -HALF, x, 0, HALF)
      }
      for (let z = -HALF; z <= HALF; z += MINOR) {
        const arr = z % MAJOR === 0 ? majorVerts : minorVerts
        arr.push(-HALF, 0, z, HALF, 0, z)
      }
      const mkGrid = (verts: number[], opacity: number) => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
        scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
          color: new THREE.Color(0xe8d5a0), transparent: true, opacity,
        })))
      }
      mkGrid(majorVerts, 0.018)
      mkGrid(minorVerts, 0.008)
    }


    // ── Biome contours — smooth pulsing rings with dynamic tree-position pull ──
    const N_CONTOUR_RINGS = 5
    const N_CONTOUR_VERTS = 128
    const CONTOUR_MAX_PULL      = 220
    const CONTOUR_THETA_SIGMA   = 0.85   // angular spread (radians, ~49°)
    const CONTOUR_RADIAL_SIGMA  = 0.55   // radial weight spread (normalized ellipse units, for interior trees)
    const CONTOUR_ANIM_DURATION = 1.2   // seconds for bulge to bloom in
    const CENTROID_BLEND        = 0.55   // how far (0–1) the ring center drifts toward the tree centroid

    function computeCentroid(treePositions: { wx: number; wy: number }[]): { wx: number; wy: number } {
      if (treePositions.length === 0) return { wx: 0, wy: 0 }
      const sumWx = treePositions.reduce((s, t) => s + t.wx, 0)
      const sumWy = treePositions.reduce((s, t) => s + t.wy, 0)
      return { wx: sumWx / treePositions.length, wy: sumWy / treePositions.length }
    }
    interface ContourRing { loop: THREE.LineLoop; mat: THREE.LineBasicMaterial; phase: number }
    interface BiomeContourEntry {
      geo: THREE.BufferGeometry; rings: ContourRing[]; biomeId: string
      prevVerts: number[]; targetVerts: number[]; animProgress: number
      prevCenter: { x: number; z: number }; targetCenter: { x: number; z: number }
    }
    const biomeContours = new Map<string, BiomeContourEntry>()

    function computeTreePositionsForBiome(
      biomeId: string,
      snap: ReturnType<typeof useGardenStore.getState>
    ): { wx: number; wy: number }[] {
      const biome = snap.biomes.find(b => b.id === biomeId)
      if (!biome) return []
      const biomeIndex = snap.biomes.indexOf(biome)
      const layout = getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)
      return snap.trees
        .filter(t => snap.projects.find(p => p.id === t.projectId)?.biomeId === biomeId)
        .map(tree => {
          const manual = snap.treeLayouts?.[tree.id]
          if (manual) return { wx: manual.wx - layout.cx, wy: manual.wy - layout.cy }
          const project = snap.projects.find(p => p.id === tree.projectId)!
          const projIdx = snap.projects.filter(p => p.biomeId === biomeId).indexOf(project)
          const treeIdx = snap.trees
            .filter(t2 => t2.projectId === tree.projectId)
            .sort((a, b) => a.week.localeCompare(b.week))
            .indexOf(tree)
          const rawX = (projIdx - 1) * 140 + treeIdx * 55
          const rawZ = projIdx * 40
          const wx = rawX * COS_BIOME + rawZ * SIN_BIOME
          const wy = -rawX * SIN_BIOME + rawZ * COS_BIOME
          return { wx, wy }
        })
    }

    function buildContourVerts(
      layout: { rx: number; ry: number },
      treePositions: { wx: number; wy: number }[],
      seed: number
    ): number[] {
      // Tree positions are in the biome-rotated world frame (same as buildTreeMesh output,
      // minus layout center). The LineLoop has rotation.y = BIOME_ROT applied by Three.js,
      // so contour vertices (bx, bz) live in the unrotated local frame. We must un-rotate
      // tree positions into that same local frame before computing distances.
      // Inverse of rotation.y = BIOME_ROT is rotation.y = -BIOME_ROT:
      //   lx = wx * cos(BIOME_ROT) - wy * sin(BIOME_ROT)  = wx*COS - wy*SIN
      //   lz = wx * sin(BIOME_ROT) + wy * cos(BIOME_ROT)  = wx*SIN + wy*COS
      // Un-rotate tree world positions into the biome's local (unrotated) frame
      const localTrees = treePositions.map(tp => ({
        lx: tp.wx * COS_BIOME - tp.wy * SIN_BIOME,
        lz: tp.wx * SIN_BIOME + tp.wy * COS_BIOME,
      }))

      // Precompute each tree's parametric angle and normalized radial position
      // in ellipse space (r=1 means on the boundary, <1 inside, >1 outside)
      const treeData = localTrees.map(lt => ({
        theta: Math.atan2(lt.lz / layout.ry, lt.lx / layout.rx),
        r:     Math.hypot(lt.lx / layout.rx, lt.lz / layout.ry),
      }))

      const verts: number[] = []
      for (let i = 0; i <= N_CONTOUR_VERTS; i++) {
        const angle = (i / N_CONTOUR_VERTS) * Math.PI * 2
        const bx = Math.cos(angle) * layout.rx
        const bz = Math.sin(angle) * layout.ry
        const nx = noise2D(bx * 0.004 + seed, bz * 0.004) * 22
        const nz = noise2D(bx * 0.004, bz * 0.004 + seed + 50) * 22

        // Outward normal of the ellipse at (bx, bz): gradient of x²/rx² + z²/ry² = 1
        const enx  = bx / (layout.rx * layout.rx)
        const enz  = bz / (layout.ry * layout.ry)
        const elen = Math.hypot(enx, enz)
        const onx  = elen > 0 ? enx / elen : 0
        const onz  = elen > 0 ? enz / elen : 0

        // Angular-projection pull: trees angularly close to this vertex AND near
        // the ellipse boundary push the contour outward along its normal.
        let pull = 0
        for (const td of treeData) {
          let dTheta = angle - td.theta
          if (dTheta >  Math.PI) dTheta -= Math.PI * 2
          if (dTheta < -Math.PI) dTheta += Math.PI * 2
          const angWeight = Math.exp(-(dTheta * dTheta) / (2 * CONTOUR_THETA_SIGMA  * CONTOUR_THETA_SIGMA))
          // Outlier trees (r > 1, outside the ellipse) pull harder the further out they are.
          // Interior trees taper off so they don't over-inflate the boundary.
          const dist = td.r - 1
          const radWeight = dist > 0
            ? 1 + dist * 2.5
            : Math.exp(-(dist * dist) / (2 * CONTOUR_RADIAL_SIGMA * CONTOUR_RADIAL_SIGMA))
          pull += angWeight * radWeight * CONTOUR_MAX_PULL
        }
        pull = Math.min(pull, CONTOUR_MAX_PULL)

        verts.push(bx + nx + onx * pull, 0, bz + nz + onz * pull)
      }
      return verts
    }

    store.biomes.forEach((biome: Biome, biomeIndex: number) => {
      const layout = getBiomeLayout(biome, biomeIndex, store.biomeLayouts)
      const color  = new THREE.Color(biome.color)
      const seed   = biomeIndex * 91.7

      const treePositions = computeTreePositionsForBiome(biome.id, store)
      const centroid = computeCentroid(treePositions)
      const adjCx = layout.cx + centroid.wx * CENTROID_BLEND
      const adjCy = layout.cy + centroid.wy * CENTROID_BLEND
      const adjPositions = treePositions.map(t => ({ wx: t.wx - centroid.wx * CENTROID_BLEND, wy: t.wy - centroid.wy * CENTROID_BLEND }))
      const verts = buildContourVerts(layout, adjPositions, seed)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))

      const rings: ContourRing[] = []
      for (let ri = 0; ri < N_CONTOUR_RINGS; ri++) {
        const mat  = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        const loop = new THREE.LineLoop(geo, mat)
        loop.position.set(adjCx, 0, adjCy)
        loop.rotation.y = -Math.PI / 4
        scene.add(loop)
        rings.push({ loop, mat, phase: ri / N_CONTOUR_RINGS })
      }
      biomeContours.set(biome.id, { geo, rings, biomeId: biome.id, prevVerts: [...verts], targetVerts: [...verts], animProgress: -1, prevCenter: { x: adjCx, z: adjCy }, targetCenter: { x: adjCx, z: adjCy } })
    })

    function rebuildContourGeo(biomeId: string, snap: ReturnType<typeof useGardenStore.getState>) {
      const entry = biomeContours.get(biomeId)
      if (!entry) return
      const biome = snap.biomes.find(b => b.id === biomeId)
      if (!biome) return
      const biomeIndex = snap.biomes.indexOf(biome)
      const layout = getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)
      const seed   = biomeIndex * 91.7
      const treePositions = computeTreePositionsForBiome(biomeId, snap)
      const centroid = computeCentroid(treePositions)
      const adjCx = layout.cx + centroid.wx * CENTROID_BLEND
      const adjCy = layout.cy + centroid.wy * CENTROID_BLEND
      const adjPositions = treePositions.map(t => ({ wx: t.wx - centroid.wx * CENTROID_BLEND, wy: t.wy - centroid.wy * CENTROID_BLEND }))
      const verts = buildContourVerts(layout, adjPositions, seed)
      const arr = entry.geo.attributes.position.array as Float32Array
      entry.prevVerts = Array.from(arr)
      entry.targetVerts = verts
      entry.prevCenter = { x: entry.rings[0].loop.position.x, z: entry.rings[0].loop.position.z }
      entry.targetCenter = { x: adjCx, z: adjCy }
      entry.animProgress = 0
    }

    // ── Trees ──
    function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3) }

    interface TreeMesh {
      group: THREE.Group; pulseRing: THREE.LineLoop; pulseRingMat: THREE.LineBasicMaterial
      wx: number; wy: number; treeId: string
      swaySpeed: number; swayAmp: number; swayOffset: number
      hovered: boolean; pulsePhase: number
      spawnDelay: number; spawnDuration: number; spawnDone: boolean
      targetScale: number  // grows as tasks complete
    }
    const treeMeshes: TreeMesh[] = []

    function buildTreeMesh(tree: Tree, snap: ReturnType<typeof useGardenStore.getState>, immediate = false) {
      const project = snap.projects.find(p => p.id === tree.projectId)
      if (!project) return
      const biome = snap.biomes.find(b => b.id === project.biomeId)
      if (!biome) return

      const biomeIndex = snap.biomes.indexOf(biome)
      const layout   = getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)
      const projIdx  = snap.projects.filter(p => p.biomeId === biome.id).indexOf(project)
      const treeIdx  = snap.trees
        .filter(t => t.projectId === tree.projectId)
        .sort((a, b) => a.week.localeCompare(b.week))
        .indexOf(tree)

      // Position trees relative to biome center, fanning along the biome's rotated axes
      const rawX = (projIdx - 1) * 140 + treeIdx * 55
      const rawZ = projIdx * 40
      // Forward rotation R(θ): wx = rawX*cos + rawZ*sin, wz = -rawX*sin + rawZ*cos
      const wx = layout.cx + rawX * COS_BIOME + rawZ * SIN_BIOME
      const wy = layout.cy - rawX * SIN_BIOME + rawZ * COS_BIOME

      // Manual placement override (from treeLayouts — set when user clicks to plant)
      const manualPos = snap.treeLayouts?.[tree.id]
      const finalWx = manualPos ? manualPos.wx : wx
      const finalWy = manualPos ? manualPos.wy : wy

      const done  = tree.tasks.filter(t => t.status === 'complete').length
      const total = tree.tasks.length
      const growthScale = total === 0 ? 0.3 : 0.5 + (done / Math.max(total, 1)) * 0.7

      const { lineVerts, tips } = buildTreeGeometry(tree.projectId, growthScale)

      const isCurrentWeek = tree.week === snap.currentWeek
      const wkDist = weekDistance(tree.week, snap.currentWeek)
      const opacity = isCurrentWeek ? 1.0 : Math.max(0.25, 0.82 - wkDist * 0.15)

      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3))
      const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        color: new THREE.Color(0.72, 0.68, 0.55), transparent: true, opacity,
      }))

      const colorPair = getBiomeColorPair(biome, biomeIndex)
      const pPos: number[] = [], pCol: number[] = []
      tips.forEach((v, i) => {
        pPos.push(v.x, v.y, v.z)
        const c = colorPair[i % 2]; pCol.push(c.r, c.g, c.b)
      })
      const ptGeo = new THREE.BufferGeometry()
      ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3))
      ptGeo.setAttribute('color',    new THREE.Float32BufferAttribute(pCol, 3))
      const points = new THREE.Points(ptGeo, new THREE.PointsMaterial({
        size: 8, vertexColors: true, transparent: true, opacity,
        map: LEAF_TEX_LIST[tree.id.charCodeAt(0) % LEAF_TEX_LIST.length],
        blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true,
      }))

      const ringPts: number[] = []
      const N_RING = 64
      for (let i = 0; i <= N_RING; i++) {
        const a = (i / N_RING) * Math.PI * 2
        ringPts.push(Math.cos(a), 0, Math.sin(a))
      }
      const ringGeo = new THREE.BufferGeometry()
      ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPts, 3))
      const ringMat = new THREE.LineBasicMaterial({
        color: colorPair[0], transparent: true, opacity: 0,
      })
      const pulseRing = new THREE.LineLoop(ringGeo, ringMat)
      pulseRing.scale.set(0, 0, 0)

      const group = new THREE.Group()
      group.add(lines, points, pulseRing)
      group.position.set(finalWx, 0, finalWy)
      scene.add(group)
      registerTreePosition(tree.id, finalWx, finalWy)

      const spawnIdx = treeMeshes.length
      // Newly added trees after initial load spawn immediately (no stagger delay)
      group.scale.set(0, 0, 0)
      treeMeshes.push({
        group, pulseRing, pulseRingMat: ringMat, wx: finalWx, wy: finalWy, treeId: tree.id,
        swaySpeed:  0.22 + Math.random() * 0.33,
        swayAmp:    0.005 + Math.random() * 0.008,
        swayOffset: Math.random() * Math.PI * 2,
        hovered: false, pulsePhase: -1,
        spawnDelay:    immediate ? 0 : spawnIdx * 0.08,
        spawnDuration: immediate ? 0.4 : 0.65,
        spawnDone: false,
        targetScale: growthScale * 3,
      })
    }

    store.trees.forEach((tree: Tree) => buildTreeMesh(tree, store))

    // ── Reactively sync tree meshes when store changes ──────────────────────
    // Handles: new trees planted, trees deleted, ID replaced after Supabase round-trip.
    const unsubTrees = useGardenStore.subscribe((state, prev) => {
      if (state.trees === prev.trees) return

      const existingIds = new Set(treeMeshes.map(tm => tm.treeId))
      const newIds      = new Set(state.trees.map(t => t.id))

      // Add meshes for trees that just appeared
      state.trees.forEach(tree => {
        if (!existingIds.has(tree.id)) buildTreeMesh(tree, state, true)
      })

      // Update targetScale when a tree's tasks change (e.g. task completed)
      state.trees.forEach(tree => {
        const mesh = treeMeshes.find(tm => tm.treeId === tree.id)
        if (!mesh) return
        const prevTree = prev.trees.find(t => t.id === tree.id)
        if (!prevTree || prevTree.tasks === tree.tasks) return
        const done = tree.tasks.filter(t => t.status === 'complete').length
        const total = tree.tasks.length
        const gs = total === 0 ? 0.3 : 0.5 + (done / Math.max(total, 1)) * 0.7
        mesh.targetScale = gs * 3
      })

      // Remove meshes for trees that are gone (includes old temp-ID entries
      // that were replaced by the real Supabase ID)
      for (let i = treeMeshes.length - 1; i >= 0; i--) {
        if (!newIds.has(treeMeshes[i].treeId)) {
          scene.remove(treeMeshes[i].group)
          treeMeshes.splice(i, 1)
        }
      }

      // Rebuild contours for all biomes whenever trees change
      state.biomes.forEach((biome: Biome) => rebuildContourGeo(biome.id, state))
    })

    // ── Ambient particles ──
    const { pos: pArr, vel: pVel } = buildParticles()
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3))
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 1.8, color: 0xfbe6a0, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })))

    // ── World conversion (ground plane raycasting) ──
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()

    function screenToWorld(clientX: number, clientY: number): { x: number; z: number } {
      const rect = el.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / W) * 2 - 1
      const ndcY = -((clientY - rect.top)  / H) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const target = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, target)
      return { x: target.x, z: target.z }
    }

    // ── Interaction ──
    function pointerDown(clientX: number, clientY: number) {
      modalWasOpen = anyOverlayOpen(useGardenStore.getState())
      if (modalWasOpen) return
      const { x, z } = screenToWorld(clientX, clientY)
      const s = useGardenStore.getState()

      if (s.isEditMode) {
        // In edit mode: grab a tree if hit, otherwise do nothing (no pan)
        let closest: TreeMesh | null = null
        let closestDist = Infinity
        for (const tm of treeMeshes) {
          const d = Math.hypot(x - tm.wx, z - tm.wy)
          if (d < 30 && d < closestDist) { closest = tm; closestDist = d }
        }
        if (closest) {
          editDrag = { tm: closest, grabOffsetX: x - closest.wx, grabOffsetZ: z - closest.wy }
          el.style.cursor = 'grabbing'
        }
        return
      }

      dragStart = { sx0: clientX, sy0: clientY, panX0: panX, panZ0: panZ, worldX0: x, worldZ0: z }
    }

    function pointerMove(clientX: number, clientY: number) {
      const s = useGardenStore.getState()

      if (editDrag) {
        const { x, z } = screenToWorld(clientX, clientY)
        const newWx = x - editDrag.grabOffsetX
        const newWy = z - editDrag.grabOffsetZ
        editDrag.tm.wx = newWx
        editDrag.tm.wy = newWy
        editDrag.tm.group.position.set(newWx, 0, newWy)
        return
      }

      if (dragStart) {
        panX = dragStart.panX0; panZ = dragStart.panZ0
        updateCamera()
        const { x, z } = screenToWorld(clientX, clientY)
        panX = dragStart.panX0 + (dragStart.worldX0 - x)
        panZ = dragStart.panZ0 + (dragStart.worldZ0 - z)
        updateCamera(); return
      }

      if (anyOverlayOpen(s)) { cursorState.hoveredTreeId = null; return }

      const { x, z } = screenToWorld(clientX, clientY)
      let hit: TreeMesh | null = null
      let hitDist = Infinity
      for (const tm of treeMeshes) {
        const d = Math.hypot(x - tm.wx, z - tm.wy)
        if (d < 24 && d < hitDist) { hit = tm; hitDist = d }
      }
      cursorState.hoveredTreeId = hit ? hit.treeId : null

      if (s.isEditMode) {
        el.style.cursor = hit ? 'grab' : 'crosshair'
      } else {
        el.style.cursor = ''
      }

      let inBiome = false
      for (let bi = 0; bi < s.biomes.length; bi++) {
        const biome = s.biomes[bi]
        const layout = getBiomeLayout(biome, bi, s.biomeLayouts)
        if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry, 1.2)) {
          cursorState.inBiome = true; cursorState.biomeId = biome.id; inBiome = true; break
        }
      }
      if (!inBiome) { cursorState.inBiome = false; cursorState.biomeId = '' }
    }

    function pointerUp(clientX: number, clientY: number) {
      // Commit edit drag
      if (editDrag) {
        const { tm } = editDrag
        editDrag = null
        el.style.cursor = 'crosshair'
        registerTreePosition(tm.treeId, tm.wx, tm.wy)
        const s = useGardenStore.getState()
        s.setTreeLayout(tm.treeId, tm.wx, tm.wy)
        // Re-read after setTreeLayout so treeLayouts reflects new position
        const fresh = useGardenStore.getState()
        fresh.biomes.forEach((biome: Biome) => rebuildContourGeo(biome.id, fresh))
        return
      }

      const wasDragging = dragStart &&
        (Math.abs(clientX - dragStart.sx0) > 4 || Math.abs(clientY - dragStart.sy0) > 4)
      dragStart = null
      if (wasDragging || modalWasOpen) return
      if (anyOverlayOpen(useGardenStore.getState())) return

      const { x, z } = screenToWorld(clientX, clientY)
      const s = useGardenStore.getState()
      if (s.isEditMode) return   // no modal actions in edit mode

      let closest: TreeMesh | null = null
      let closestDist = Infinity
      for (const tm of treeMeshes) {
        const d = Math.hypot(x - tm.wx, z - tm.wy)
        if (d < 24 && d < closestDist) { closest = tm; closestDist = d }
      }
      if (closest) {
        cursorState.hoveredTreeId = null
        s.setActiveTree(closest.treeId); return
      }
      for (let bi = 0; bi < s.biomes.length; bi++) {
        const biome = s.biomes[bi]
        const layout = getBiomeLayout(biome, bi, s.biomeLayouts)
        if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry)) {
          s.setActiveBiome(biome.id, { x, z }); return
        }
      }
      s.setCreatingBiome(true, { x, z })
    }

    // ── Mouse wrappers ──
    function onMouseDown(e: MouseEvent) { pointerDown(e.clientX, e.clientY) }
    function onMouseMove(e: MouseEvent) { pointerMove(e.clientX, e.clientY) }
    function onMouseUp(e: MouseEvent)   { pointerUp(e.clientX, e.clientY) }

    function onWheel(e: WheelEvent) {
      if (anyOverlayOpen(useGardenStore.getState())) return
      e.preventDefault()
      zoom = Math.max(0.3, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 0.9)))
      updateCamera()
    }

    // ── Touch handlers ──
    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      if (gardenEnterTime < 0) gardenEnterTime = clock.getElapsedTime()
      if (e.touches.length === 1 && !wasPinching) {
        pointerDown(e.touches[0].clientX, e.touches[0].clientY)
      } else if (e.touches.length === 2) {
        wasPinching = true
        dragStart = null   // cancel any pan
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 1 && !wasPinching) {
        pointerMove(e.touches[0].clientX, e.touches[0].clientY)
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        if (lastPinchDist > 0) {
          zoom = Math.max(0.3, Math.min(4, zoom * (dist / lastPinchDist)))
          updateCamera()
        }
        lastPinchDist = dist
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 0) {
        // All fingers lifted — only fire click if this wasn't a pinch gesture
        if (!wasPinching && e.changedTouches.length > 0) {
          pointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        }
        lastPinchDist = 0
        wasPinching = false
        dragStart = null
      }
      // If 1 finger remains after pinch, don't start a drag (let next touchstart do it)
    }

    el.addEventListener('mousedown',  onMouseDown)
    el.addEventListener('mousemove',  onMouseMove)
    el.addEventListener('mouseup',    onMouseUp)
    el.addEventListener('wheel',      onWheel,      { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: false })

    // ── Animation loop ──
    const clock = new THREE.Clock()
    let lastT = clock.getElapsedTime()

    // ── Sprouting: triggered on first canvas mouseenter ──
    let gardenEnterTime = -1  // -1 = not yet entered

    function onMouseEnter() {
      if (gardenEnterTime < 0) gardenEnterTime = clock.getElapsedTime()
    }
    el.addEventListener('mouseenter', onMouseEnter)
    let rafId: number

    function animate() {
      rafId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const dt = t - lastT
      lastT = t

      // Contour rings pulse outward — each ring is a distinct organic shape
      biomeContours.forEach(entry => {
        // Animate bulge: lerp geometry vertices from prev → target when a tree changes
        if (entry.animProgress >= 0) {
          entry.animProgress = Math.min(1, entry.animProgress + dt / CONTOUR_ANIM_DURATION)
          const p = easeOutCubic(entry.animProgress)
          const arr = entry.geo.attributes.position.array as Float32Array
          for (let i = 0; i < arr.length; i++) {
            arr[i] = entry.prevVerts[i] + (entry.targetVerts[i] - entry.prevVerts[i]) * p
          }
          entry.geo.attributes.position.needsUpdate = true
          const cx = entry.prevCenter.x + (entry.targetCenter.x - entry.prevCenter.x) * p
          const cz = entry.prevCenter.z + (entry.targetCenter.z - entry.prevCenter.z) * p
          entry.rings.forEach(r => r.loop.position.set(cx, 0, cz))
          if (entry.animProgress >= 1) entry.animProgress = -1
        }

        entry.rings.forEach(cr => {
          cr.phase = (cr.phase + dt / 50) % 1.0
          const s = 0.06 + cr.phase * 0.94
          cr.loop.scale.set(s, s, s)
          const fadeIn  = Math.min(cr.phase / 0.15, 1.0)
          const fadeOut = Math.max(0, 1 - Math.max(0, cr.phase - 0.10) / 0.90)
          cr.mat.opacity = fadeIn * fadeOut * 0.22
        })
      })

      treeMeshes.forEach(tm => {
        // Sprouting: scale from 0 → targetScale with easeOutCubic, staggered per tree
        // Waits for user to hover the canvas before starting
        if (!tm.spawnDone && gardenEnterTime >= 0) {
          const elapsed = t - gardenEnterTime
          const spawnT = Math.max(0, Math.min(1, (elapsed - tm.spawnDelay) / tm.spawnDuration))
          const s = easeOutCubic(spawnT) * tm.targetScale
          tm.group.scale.set(s, s, s)
          if (spawnT >= 1) tm.spawnDone = true
        } else if (tm.spawnDone) {
          // Smoothly grow toward targetScale as tasks are completed
          const cur = tm.group.scale.x
          if (Math.abs(cur - tm.targetScale) > 0.005) {
            const s = cur + (tm.targetScale - cur) * 0.06
            tm.group.scale.set(s, s, s)
          }
        }

        // Cylindrical billboard: rotate Y so tree always faces camera
        const dx = camera.position.x - tm.wx
        const dz = camera.position.z - tm.wy
        tm.group.rotation.y = Math.atan2(dx, dz)
        // Sway around local Z
        tm.group.rotation.z = Math.sin(t * tm.swaySpeed + tm.swayOffset) * tm.swayAmp
        const wasHovered = tm.hovered
        tm.hovered = cursorState.hoveredTreeId === tm.treeId
        if (tm.hovered && !wasHovered) tm.pulsePhase = 0

        if (tm.pulsePhase >= 0) {
          tm.pulsePhase += 0.003   // slower expand
          const r  = tm.pulsePhase * 50  // radius in world units
          const op = Math.max(0, 1 - tm.pulsePhase) * 0.6
          tm.pulseRing.scale.set(r, r, r)
          tm.pulseRingMat.opacity = op
          if (tm.pulsePhase >= 1) {
            tm.pulsePhase = tm.hovered ? 0 : -1
            if (!tm.hovered) { tm.pulseRingMat.opacity = 0; tm.pulseRing.scale.set(0, 0, 0) }
          }
        }
      })

      const pos = pGeo.attributes.position.array as Float32Array
      for (let i = 0; i < N_PARTICLES; i++) {
        pVel[i].angle   += pVel[i].angleSpeed
        pVel[i].yOffset += pVel[i].ySpeed
        pos[i * 3]     += Math.cos(pVel[i].angle) * pVel[i].speed
        pos[i * 3 + 1]  = Math.sin(pVel[i].yOffset) * pVel[i].yAmp  // dreamy float
        pos[i * 3 + 2] += Math.sin(pVel[i].angle) * pVel[i].speed
        if (pos[i * 3]     >  PARTICLE_EXTENT) pos[i * 3]     = -PARTICLE_EXTENT
        if (pos[i * 3]     < -PARTICLE_EXTENT) pos[i * 3]     =  PARTICLE_EXTENT
        if (pos[i * 3 + 2] >  PARTICLE_EXTENT) pos[i * 3 + 2] = -PARTICLE_EXTENT
        if (pos[i * 3 + 2] < -PARTICLE_EXTENT) pos[i * 3 + 2] =  PARTICLE_EXTENT
      }
      pGeo.attributes.position.needsUpdate = true
      composer.render()
    }
    animate()

    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight
      renderer.setSize(W, H); composer.setSize(W, H); updateCamera()
    }
    window.addEventListener('resize', onResize)

    const unsubEditMode = useGardenStore.subscribe((state, prev) => {
      if (state.isEditMode === prev.isEditMode) return
      // Cancel any in-progress drag and reset cursor when edit mode changes
      editDrag = null
      dragStart = null
      el.style.cursor = state.isEditMode ? 'crosshair' : ''
    })

    return () => {
      unsubTrees()
      unsubEditMode()
      cancelAnimationFrame(rafId)
      el.removeEventListener('mousedown',  onMouseDown)
      el.removeEventListener('mousemove',  onMouseMove)
      el.removeEventListener('mouseup',    onMouseUp)
      el.removeEventListener('wheel',      onWheel)
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('resize', onResize)
      // Dispose all GPU resources
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments ||
            obj instanceof THREE.LineLoop || obj instanceof THREE.Points ||
            obj instanceof THREE.Line) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material?.dispose()
          }
        }
      })
      LEAF_TEXTURES.dot.dispose()
      LEAF_TEXTURES.ring.dispose()
      composer.dispose()
      clearTreePositions()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} className="absolute inset-0">
      <TreeTooltip cameraRef={cameraRef} viewportRef={mountRef} />
    </div>
  )
}
