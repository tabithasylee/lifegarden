// app/src/lib/treeGen.ts
// Builds tree branch geometry deterministically from a string id.
// Returns raw vertex arrays — caller creates Three.js objects.

export interface TreeGeometry {
  lineVerts: number[]          // flat [x,y,0, x,y,0, ...] for LineSegments
  tips: Array<{ x: number; y: number; z: number }>  // leaf tip positions
}

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────
function createRng(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return (): number => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 0x100000000
  }
}

function idToSeed(id: string): number {
  return id.split('').reduce(
    (acc, c, i) => ((acc * 31 + c.charCodeAt(0) * (i + 1)) | 0), 17
  ) >>> 0
}

// ── Species profiles ──────────────────────────────────────────────────────────
const SPECIES = {
  upright:   { steps: [5, 8],  segLen: [9, 13],  latAngle: [0.45, 0.60], latScale: [0.40, 0.52], latDepth: [1, 1], wander: 0.015 },
  shrub:     { steps: [3, 5],  segLen: [7, 11],  latAngle: [0.60, 0.85], latScale: [0.45, 0.62], latDepth: [1, 1], wander: 0.015 },
  spread:    { steps: [4, 6],  segLen: [8, 3],  latAngle: [0.70, 0.90], latScale: [0.42, 0.58], latDepth: [1, 2], wander: 0.015 },
  recursive: { steps: [3, 5],  segLen: [8, 12],  latAngle: [0.32, 0.48], latScale: [0.48, 0.60], latDepth: [3, 4], wander: 0.015 },
  // tall narrow — cypress/poplar silhouette
  columnar:  { steps: [7, 11], segLen: [8, 11],  latAngle: [0.16, 0.26], latScale: [0.20, 0.32], latDepth: [1, 1], wander: 0.008 },
  // short trunk, wide canopy — oak/maple top silhouette
  canopy:    { steps: [5, 7],  segLen: [4, 6],   latAngle: [0.82, 1.08], latScale: [0.30, 0.42], latDepth: [2, 2], wander: 0.010 },
  // many short wandering segments, dense mid-depth — birch/willow feeling
  wispy:     { steps: [5, 8],  segLen: [3, 4],   latAngle: [-0.52, 0.72], latScale: [0.50, 0.65], latDepth: [2, 3], wander: 0.030 },
} as const

const SPECIES_NAMES = Object.keys(SPECIES) as Array<keyof typeof SPECIES>

function buildLateral(
  x: number, y: number,
  angle: number, length: number,
  depth: number, maxDepth: number,
  rng: () => number,
  verts: number[], tips: Array<{x:number;y:number;z:number}>
) {
  const ex = x + Math.sin(angle) * length
  const ey = y + Math.cos(angle) * length
  verts.push(x, y, 0, ex, ey, 0)

  if (depth >= maxDepth) {
    tips.push({ x: ex, y: ey, z: 0 })
    return
  }

  const n = rng() > 0.65 ? 3 : 2
  const spread = 0.20 + rng() * 0.18
  for (let i = 0; i < n; i++) {
    const a = angle + (i - (n - 1) / 2) * spread + (rng() - 0.5) * 0.14
    buildLateral(ex, ey, a, length * (0.52 + rng() * 0.16), depth + 1, maxDepth, rng, verts, tips)
  }
}

export function buildTreeGeometry(id: string, scale: number): TreeGeometry {
  const rng = createRng(idToSeed(id))
  const sp = SPECIES[SPECIES_NAMES[Math.floor(rng() * SPECIES_NAMES.length)]]

  const steps    = Math.floor(sp.steps[0]    + rng() * (sp.steps[1]    - sp.steps[0]))
  const segLen   = (sp.segLen[0]   + rng() * (sp.segLen[1]   - sp.segLen[0])) * scale
  const latAngle = sp.latAngle[0]  + rng() * (sp.latAngle[1]  - sp.latAngle[0])
  const latScale = sp.latScale[0]  + rng() * (sp.latScale[1]  - sp.latScale[0])
  const latDepth = Math.floor(sp.latDepth[0] + rng() * (sp.latDepth[1] - sp.latDepth[0]))
  const wander   = rng() * sp.wander

  const verts: number[] = []
  const tips: Array<{x:number;y:number;z:number}> = []

  let x = 0, y = 0, dir = 0

  for (let s = 0; s < steps; s++) {
    dir += (rng() - 0.5) * wander * 2
    const nx = x + Math.sin(dir) * segLen
    const ny = y + Math.cos(dir) * segLen
    verts.push(x, y, 0, nx, ny, 0)

    const isLastStep = s === steps - 1
    if (!isLastStep) {
      for (const side of [-1, 1]) {
        const a = dir + side * latAngle
        buildLateral(nx, ny, a, segLen * latScale, 0, latDepth, rng, verts, tips)
      }
    }

    x = nx; y = ny
  }

  // Single apex tip
  tips.push({ x, y, z: 0 })

  return { lineVerts: verts, tips }
}
