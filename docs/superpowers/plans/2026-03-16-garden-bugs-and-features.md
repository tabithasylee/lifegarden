# Garden Bugs & Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs (notes not saving, task race condition, wrong tree click, wrong tree placement) and add 2 features (dynamic biome contours, move-to-backlog button).

**Architecture:** Changes span the DB schema, Supabase API layer, Zustand store, and React components. The Three.js canvas (`GardenCanvas.tsx`) handles both bug fixes (hit detection, placement) and the new dynamic contour feature. All other changes are in the store and modal components.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Zustand + Three.js + Supabase + Framer Motion + Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-garden-bugs-and-features-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/003_add_notes.sql` | Create | Add `notes text` column to `tasks` and `backlog_tasks` |
| `app/src/lib/api.ts` | Modify | BacklogRow notes; updateBacklogTask notes; insertBacklogTasksIntoTree notes; moveTasksToBacklog helper |
| `app/src/store/garden.ts` | Modify | updateBacklogTask notes; plantTree initialTaskTitle + treeLayouts + deleteBacklogTasksById fix; plantPos + treeLayouts state; setActiveBiome pos; moveUncompletedToBacklog action |
| `app/src/components/garden/GardenCanvas.tsx` | Modify | setActiveBiome passes {x,z}; buildTreeMesh uses snap layouts + treeLayouts; nearest-tree hit detection; stale store fix; dynamic contour algorithm + per-biome data structure |
| `app/src/components/garden/TaskDetailModal.tsx` | Modify | Pass notes in updateBacklogTask branch |
| `app/src/components/garden/PlanningModal.tsx` | Modify | Remove _pendingTaskTitle hack; pass newTaskTitle to plantTree |
| `app/src/components/garden/TreeClickModal.tsx` | Modify | Add move-incomplete-to-backlog button |

---

## Chunk 1: Notes persistence (DB + API + store + modal)

### Task 1: DB migration

**Files:**
- Create: `supabase/migrations/003_add_notes.sql`

- [ ] Create the migration file:

```sql
-- Migration 003: Add notes column to tasks and backlog_tasks

alter table tasks
  add column if not exists notes text;

alter table backlog_tasks
  add column if not exists notes text;
```

- [ ] Run the migration in the Supabase SQL editor (or `supabase db push` if CLI is configured). Verify both columns appear in the table schema.

- [ ] Commit:
```bash
git add supabase/migrations/003_add_notes.sql
git commit -m "feat(db): add notes column to tasks and backlog_tasks"
```

---

### Task 2: API layer — backlog notes wiring

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] In `api.ts`, find `interface BacklogRow` (around line 47). Add `notes?: string | null` to it:

```typescript
interface BacklogRow {
  id: string
  user_id: string
  project_id: string
  title: string
  priority: string
  carried_count: number
  sort_order: number
  created_at: string
  notes?: string | null   // ADD THIS
}
```

- [ ] Find `function mapBacklogTask` (around line 88). Add `notes` mapping to the returned object:

```typescript
function mapBacklogTask(
  row: BacklogRow,
  project: Project | undefined,
  biome: Biome | undefined,
): Task {
  return {
    id:           row.id,
    title:        row.title,
    status:       'backlog' as TaskStatus,
    priority:     row.priority as Priority,
    biome:        biome?.id ?? '',
    project:      project?.name ?? '',
    carriedCount: row.carried_count,
    createdAt:    row.created_at.slice(0, 10),
    notes:        row.notes ?? undefined,   // ADD THIS
  }
}
```

- [ ] Find `export async function updateBacklogTask` (around line 290). Update signature and body to include notes:

```typescript
export async function updateBacklogTask(taskId: string, updates: {
  title?: string
  priority?: string
  notes?: string
}): Promise<void> {
  if (!supabase) return
  await supabase.from('backlog_tasks').update(updates).eq('id', taskId)
}
```

- [ ] Find `export async function insertBacklogTasksIntoTree` (around line 254). Add `notes` to the inserted row object:

```typescript
const rows = tasks.map((t, i) => ({
  id:            t.id,
  tree_id:       treeId,
  title:         t.title,
  status:        'scheduled',
  priority:      t.priority,
  carried_count: t.carriedCount,
  sort_order:    startSortOrder + i,
  user_id:       _userId,
  notes:         t.notes ?? null,   // ADD THIS
}))
```

- [ ] Run `cd app && npx tsc --noEmit` to confirm no TypeScript errors.

- [ ] Commit:
```bash
git add app/src/lib/api.ts
git commit -m "feat(api): wire notes field for backlog tasks"
```

---

### Task 3: Store — updateBacklogTask notes

**Files:**
- Modify: `app/src/store/garden.ts`

- [ ] Find the `GardenStore` interface (around line 82). Update the `updateBacklogTask` type at line 126:

```typescript
updateBacklogTask:(taskId: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'notes'>>) => void
```

- [ ] Find the `updateBacklogTask` action body (around line 298). Update the API call to pass `notes`:

```typescript
updateBacklogTask: (taskId, updates) => {
  set(state => ({
    backlog: state.backlog.map(t => t.id !== taskId ? t : { ...t, ...updates }),
  }))
  api.updateBacklogTask(taskId, {
    title:    updates.title,
    priority: updates.priority,
    notes:    updates.notes,   // ADD THIS
  }).catch(console.error)
},
```

- [ ] Run `cd app && npx tsc --noEmit`. No errors expected.

- [ ] Commit:
```bash
git add app/src/store/garden.ts
git commit -m "feat(store): pass notes through updateBacklogTask"
```

---

### Task 4: TaskDetailModal — pass notes for backlog tasks

**Files:**
- Modify: `app/src/components/garden/TaskDetailModal.tsx`

- [ ] Find `handleSave` (around line 142). The `else if (activeBacklogTaskId)` branch at line 147 currently passes only `title` and `priority`. Update it to also pass `notes`:

```typescript
} else if (activeBacklogTaskId) {
  updateBacklogTask(activeBacklogTaskId, { title: title.trim(), priority, notes: notes || undefined })
```

Leave the `activeTask` branch at line 145 unchanged — it already passes `notes` correctly.

- [ ] Run `cd app && npx tsc --noEmit`. No errors.

- [ ] Test manually: open a backlog task, add notes, save, reopen — notes should persist. After a page reload (which re-fetches from Supabase), notes should still be there.

- [ ] Commit:
```bash
git add app/src/components/garden/TaskDetailModal.tsx
git commit -m "fix: save notes for backlog tasks in TaskDetailModal"
```

---

## Chunk 2: PlantTree race condition fix

### Task 5: Store — plantTree initialTaskTitle + deleteBacklogTasksById fix

**Files:**
- Modify: `app/src/store/garden.ts`

- [ ] Find `plantTree` in the `GardenStore` interface (line 129). Update the signature:

```typescript
plantTree: (projectId: string, backlogTaskIds: string[], intention: string, initialTaskTitle?: string) => void
```

- [ ] Find the `plantTree` action body (around line 334). Make these changes:

**a)** Add `initialTaskTitle = ''` to the function params:
```typescript
plantTree: (projectId, backlogTaskIds, intention, initialTaskTitle = '') => {
```

**b)** Move `api.deleteBacklogTasksById(backlogTaskIds)` from its current position (line 388, outside `.then()`) to inside the `.then()` block. The full updated async section becomes:

```typescript
const tempId = newTree.id
api.createTree(projectId, currentWeek, intention.trim() || undefined)
  .then(dbTreeId => {
    if (!dbTreeId) return

    // Build initial task if provided
    const initialTask: Task | null = initialTaskTitle.trim() ? {
      id:            crypto.randomUUID(),
      title:         initialTaskTitle.trim(),
      status:        'scheduled' as const,
      priority:      'none' as const,
      biome:         get().projects.find(p => p.id === projectId)
                       ? get().biomes.find(b => b.id === get().projects.find(p => p.id === projectId)?.biomeId)?.id ?? ''
                       : '',
      project:       get().projects.find(p => p.id === projectId)?.name ?? '',
      carriedCount:  0,
      createdAt:     new Date().toISOString().slice(0, 10),
      scheduledWeek: currentWeek,
    } : null

    set(state => ({
      trees: state.trees.map(t => t.id === tempId
        ? {
            ...t,
            id: dbTreeId,
            tasks: initialTask ? [...t.tasks, initialTask] : t.tasks,
          }
        : t
      ),
      activeTreeId: state.activeTreeId === tempId ? dbTreeId : state.activeTreeId,
      treeLayouts: (() => {
        const next = { ...state.treeLayouts }
        if (next[tempId]) { next[dbTreeId] = next[tempId]; delete next[tempId] }
        return next
      })(),
    }))

    const apiCalls: Promise<unknown>[] = []
    if (pulledTasks.length > 0) {
      apiCalls.push(api.insertBacklogTasksIntoTree(dbTreeId, pulledTasks, 0))
    }
    if (initialTask) {
      apiCalls.push(api.createTask(dbTreeId, initialTask.title, pulledTasks.length).catch(console.error))
    }
    apiCalls.push(api.deleteBacklogTasksById(backlogTaskIds))
    return Promise.all(apiCalls)
  })
  .catch(console.error)
// Remove the standalone api.deleteBacklogTasksById call that was here
```

**Note:** Remove the standalone `api.deleteBacklogTasksById(backlogTaskIds).catch(console.error)` that currently sits after the `.then()` block (around line 388) — it is now inside the `.then()`.

- [ ] Also add `treeLayouts: {}` to the initial store state (line ~149) and add it to the `GardenStore` interface and `partialize` — these are needed by Bug 4 but must be added now since Task 5 references `state.treeLayouts`. Add to interface:

```typescript
treeLayouts: Record<string, { wx: number; wy: number }>
```

Add to initial state:
```typescript
treeLayouts: {},
```

Add to `partialize`:
```typescript
partialize: (state) => ({
  biomes:       state.biomes,
  projects:     state.projects,
  trees:        state.trees,
  backlog:      state.backlog,
  currentWeek:  state.currentWeek,
  viewWeek:     state.viewWeek,
  biomeLayouts: state.biomeLayouts,
  treeLayouts:  state.treeLayouts,   // ADD
}),
```

- [ ] Run `cd app && npx tsc --noEmit`. Fix any errors.

- [ ] Commit:
```bash
git add app/src/store/garden.ts
git commit -m "fix: resolve plantTree race condition and add treeLayouts state"
```

---

### Task 6: PlanningModal — remove _pendingTaskTitle hack

**Files:**
- Modify: `app/src/components/garden/PlanningModal.tsx`

- [ ] Remove the `_pendingTaskTitle` ref (line 46), the `activeTreeId` selector (line 47), the `addTaskToTree` selector (line 48), and the `useEffect` block (lines 49–54) that inject the task after planting.

- [ ] Update `handlePlant` to pass `newTaskTitle` directly to `plantTree`:

```typescript
function handlePlant() {
  if (!selectedProjectId) return
  const allTaskIds = Array.from(pulledIds)
  plantTree(selectedProjectId, allTaskIds, intention, newTaskTitle.trim())
}
```

- [ ] Run `cd app && npx tsc --noEmit`. No errors.

- [ ] Test manually: create a new project, type a task name, click "Plant tree" — the task should appear in the TreeClickModal and persist after page reload.

- [ ] Commit:
```bash
git add app/src/components/garden/PlanningModal.tsx
git commit -m "fix: remove plantTree task race condition in PlanningModal"
```

---

## Chunk 3: Tree click detection + manual placement

### Task 7: Store — plantPos state + setActiveBiome with position

**Files:**
- Modify: `app/src/store/garden.ts`

- [ ] Add `plantPos: { x: number; z: number } | null` to the `GardenStore` interface (with other UI state fields):

```typescript
plantPos: { x: number; z: number } | null
```

- [ ] Add to initial state: `plantPos: null`

- [ ] Update the `setActiveBiome` setter signature in the interface:

```typescript
setActiveBiome: (id: string | null, pos?: { x: number; z: number }) => void
```

- [ ] Update the `setActiveBiome` implementation:

```typescript
setActiveBiome: (id, pos) => set({ activeBiomeId: id, plantPos: id ? (pos ?? null) : null }),
```

- [ ] Update `plantTree` to write `plantPos` into `treeLayouts`. At the start of `plantTree`, after reading `currentWeek`:

```typescript
const plantPos = get().plantPos
```

Then when creating `newTree` and calling `set(...)`, also write the layout:

```typescript
set({
  trees:         [...trees, newTree],
  backlog:       backlog.filter(t => !backlogTaskIds.includes(t.id)),
  activeBiomeId: null,
  activeTreeId:  newTree.id,
  treeLayouts:   plantPos
    ? { ...get().treeLayouts, [newTree.id]: { wx: plantPos.x, wy: plantPos.z } }
    : get().treeLayouts,
})
```

(The `treeLayouts[tempId] → treeLayouts[dbTreeId]` swap is already handled in Task 5's `.then()` block.)

- [ ] Do the same for the `existing` tree merge path (when a tree already exists for that project+week): no new `treeLayouts` entry needed since the tree is not new.

- [ ] `plantPos` must NOT be in `partialize` — it is already excluded since we only added `treeLayouts` to `partialize` in Task 5.

- [ ] Run `cd app && npx tsc --noEmit`.

- [ ] Commit:
```bash
git add app/src/store/garden.ts
git commit -m "feat: add plantPos + treeLayouts to store for manual tree placement"
```

---

### Task 8: GardenCanvas — hit detection fix + stale store fix + manual placement

**Files:**
- Modify: `app/src/components/garden/GardenCanvas.tsx`

- [ ] **Fix nearest-tree hit detection in `onMouseMove`** (around line 419–422). Replace the first-match loop with nearest-within-radius:

```typescript
let hit: TreeMesh | null = null
let hitDist = Infinity
for (const tm of treeMeshes) {
  const d = Math.hypot(x - tm.wx, z - tm.wy)
  if (d < 24 && d < hitDist) { hit = tm; hitDist = d }
}
cursorState.hoveredTreeId = hit ? hit.treeId : null
```

- [ ] **Fix nearest-tree hit detection in `onMouseUp`** (around line 446–451). Replace the first-match loop:

```typescript
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
```

- [ ] **Pass click coordinates to setActiveBiome in `onMouseUp`** (around line 455–458). Change:

```typescript
if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry)) {
  s.setActiveBiome(biome.id); return
}
```

to:

```typescript
if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry)) {
  s.setActiveBiome(biome.id, { x, z }); return
}
```

- [ ] **Fix stale `store` in `onMouseMove` biome loop** (around lines 426–433). Replace `store.biomes` and `store.biomeLayouts` with a fresh state read:

```typescript
// At the start of the non-drag section of onMouseMove, after the hit variable:
const freshState = useGardenStore.getState()
let inBiome = false
for (let bi = 0; bi < freshState.biomes.length; bi++) {
  const biome = freshState.biomes[bi]
  const layout = getBiomeLayout(biome, bi, freshState.biomeLayouts)
  if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry, 1.2)) {
    cursorState.inBiome = true; cursorState.biomeId = biome.id; inBiome = true; break
  }
}
if (!inBiome) { cursorState.inBiome = false; cursorState.biomeId = '' }
```

- [ ] **Fix stale `store` in `onMouseUp` biome loop** (around lines 452–460). The `s` variable is already `useGardenStore.getState()` at line 444. Replace the loop's `store.biomes` / `store.biomeLayouts` references with `s.biomes` / `s.biomeLayouts`:

```typescript
for (let bi = 0; bi < s.biomes.length; bi++) {
  const biome = s.biomes[bi]
  const layout = getBiomeLayout(biome, bi, s.biomeLayouts)
  if (pointInBiomeEllipse(x, z, layout.cx, layout.cy, layout.rx, layout.ry)) {
    s.setActiveBiome(biome.id, { x, z }); return
  }
}
```

- [ ] **Fix `buildTreeMesh` to use `snap.biomeLayouts` and `snap.treeLayouts`** (line 254). Find:

```typescript
const layout = getBiomeLayout(biome, biomeIndex, store.biomeLayouts)
```

Change to:

```typescript
const layout = getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)
```

Then add the manual placement override just before `group.position.set(wx, 0, wy)`:

```typescript
// Manual placement override (from treeLayouts — set when user clicks to plant)
const manualPos = snap.treeLayouts?.[tree.id]
const finalWx = manualPos ? manualPos.wx : wx
const finalWy = manualPos ? manualPos.wy : wy

registerTreePosition(tree.id, finalWx, finalWy)
// ... replace all subsequent uses of wx/wy with finalWx/finalWy in this function
group.position.set(finalWx, 0, finalWy)
treeMeshes.push({
  group, pulseRing, pulseRingMat: ringMat, wx: finalWx, wy: finalWy, treeId: tree.id,
  // ... rest unchanged
})
```

- [ ] Run `cd app && npx tsc --noEmit`. Fix type errors.

- [ ] Test manually:
  - Hover over closely-spaced trees — tooltip should highlight the nearest one, not always the same one.
  - Click inside a biome, plant a tree — the tree should appear near where you clicked.

- [ ] Commit:
```bash
git add app/src/components/garden/GardenCanvas.tsx
git commit -m "fix: nearest-tree hit detection, manual tree placement, stale store refs"
```

---

## Chunk 4: Dynamic biome contours

### Task 9: GardenCanvas — Gaussian contour pull

**Files:**
- Modify: `app/src/components/garden/GardenCanvas.tsx`

- [ ] Add a helper function `computeTreePositionsForBiome` near the top of the `useEffect` body (after the `store` capture, before contour building). This computes world positions for all trees in a biome using the same formula as `buildTreeMesh`, respecting `snap.treeLayouts` overrides:

```typescript
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
      // Return position relative to biome center (for the pull algorithm)
      const wx = rawX * COS_BIOME + rawZ * SIN_BIOME
      const wy = -rawX * SIN_BIOME + rawZ * COS_BIOME
      return { wx, wy }
    })
}
```

- [ ] Add `buildContourVerts` helper that takes layout, tree positions, and seed:

```typescript
const CONTOUR_MAX_PULL = 80
const CONTOUR_SIGMA    = 120

function buildContourVerts(
  layout: { rx: number; ry: number },
  treePositions: { wx: number; wy: number }[],
  seed: number
): number[] {
  const verts: number[] = []
  for (let i = 0; i <= N_CONTOUR_VERTS; i++) {
    const angle = (i / N_CONTOUR_VERTS) * Math.PI * 2
    const bx = Math.cos(angle) * layout.rx
    const bz = Math.sin(angle) * layout.ry
    // Existing Perlin noise offset
    const nx = noise2D(bx * 0.004 + seed, bz * 0.004) * 22
    const nz = noise2D(bx * 0.004, bz * 0.004 + seed + 50) * 22
    // Gaussian pull toward tree positions
    let pullX = 0, pullZ = 0
    for (const tp of treePositions) {
      const dx = tp.wx - bx
      const dz = tp.wy - bz
      const dist = Math.hypot(dx, dz)
      if (dist < 0.01) continue
      const weight = Math.exp(-(dist * dist) / (2 * CONTOUR_SIGMA * CONTOUR_SIGMA))
      pullX += (dx / dist) * weight * CONTOUR_MAX_PULL
      pullZ += (dz / dist) * weight * CONTOUR_MAX_PULL
    }
    verts.push(bx + nx + pullX, 0, bz + nz + pullZ)
  }
  return verts
}
```

- [ ] **Refactor the contour-building loop** to use a per-biome Map. Replace the current `contourRings` array declaration and biome loop (lines 202–232) with:

```typescript
interface BiomeContourEntry {
  geo:   THREE.BufferGeometry
  rings: ContourRing[]
  biomeId: string
}
const biomeContours = new Map<string, BiomeContourEntry>()

store.biomes.forEach((biome: Biome, biomeIndex: number) => {
  const layout = getBiomeLayout(biome, biomeIndex, store.biomeLayouts)
  const color  = new THREE.Color(biome.color)
  const seed   = biomeIndex * 91.7

  const treePositions = computeTreePositionsForBiome(biome.id, store)
  const verts = buildContourVerts(layout, treePositions, seed)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))

  const rings: ContourRing[] = []
  for (let ri = 0; ri < N_CONTOUR_RINGS; ri++) {
    const mat  = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    const loop = new THREE.LineLoop(geo, mat)
    loop.position.set(layout.cx, 0, layout.cy)
    loop.rotation.y = -Math.PI / 4
    scene.add(loop)
    rings.push({ loop, mat, phase: ri / N_CONTOUR_RINGS })
  }
  biomeContours.set(biome.id, { geo, rings, biomeId: biome.id })
})
```

- [ ] **Update the animation loop** to iterate `biomeContours` instead of the old flat `contourRings` array. Replace:

```typescript
contourRings.forEach(cr => { ... })
```

with:

```typescript
biomeContours.forEach(entry => {
  entry.rings.forEach(cr => {
    cr.phase = (cr.phase + dt / 50) % 1.0
    const s = 0.06 + cr.phase * 0.94
    cr.loop.scale.set(s, s, s)
    const fadeIn  = Math.min(cr.phase / 0.15, 1.0)
    const fadeOut = Math.max(0, 1 - Math.max(0, cr.phase - 0.10) / 0.90)
    cr.mat.opacity = fadeIn * fadeOut * 0.22
  })
})
```

- [ ] **Add `rebuildContourGeo`** that rewrites a biome's geometry buffer in-place:

```typescript
function rebuildContourGeo(biomeId: string, snap: ReturnType<typeof useGardenStore.getState>) {
  const entry = biomeContours.get(biomeId)
  if (!entry) return
  const biome = snap.biomes.find(b => b.id === biomeId)
  if (!biome) return
  const biomeIndex = snap.biomes.indexOf(biome)
  const layout = getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)
  const seed   = biomeIndex * 91.7
  const treePositions = computeTreePositionsForBiome(biomeId, snap)
  const verts = buildContourVerts(layout, treePositions, seed)
  const arr = entry.geo.attributes.position.array as Float32Array
  for (let i = 0; i < verts.length; i++) arr[i] = verts[i]
  entry.geo.attributes.position.needsUpdate = true
}
```

- [ ] **Call `rebuildContourGeo` from `unsubTrees`** when trees change. At the start of the `unsubTrees` callback, after the `if (state.trees === prev.trees) return` guard, add:

```typescript
// Rebuild contours for all biomes whenever trees change (tree add/remove/move)
store.biomes.forEach((biome: Biome) => rebuildContourGeo(biome.id, state))
```

Place this AFTER the existing tree-add and tree-remove logic so the rebuild sees the final mesh state.

- [ ] Run `cd app && npx tsc --noEmit`. Fix any errors.

- [ ] Test manually: plant a tree inside a biome — the biome contour should visibly bulge toward the new tree's position. Trees outside the original ellipse should be embraced by the expanded contour.

- [ ] Commit:
```bash
git add app/src/components/garden/GardenCanvas.tsx
git commit -m "feat: dynamic biome contours with Gaussian tree-position attraction"
```

---

## Chunk 5: Move uncompleted tasks to backlog

### Task 10: API — moveTasksToBacklog helper

**Files:**
- Modify: `app/src/lib/api.ts`

- [ ] Add the new helper at the end of `api.ts`:

```typescript
export async function moveTasksToBacklog(tasks: Task[]): Promise<void> {
  if (!supabase || !_userId || tasks.length === 0) return
  const ids = tasks.map(t => t.id)
  // Delete from tasks first (avoids FK issues)
  await supabase.from('tasks').delete().in('id', ids)
  // Insert into backlog_tasks
  const rows = tasks.map((t, i) => ({
    project_id:    /* resolved from task — see note below */ '',  // placeholder
    title:         t.title,
    priority:      t.priority,
    carried_count: t.carriedCount,
    sort_order:    i,
    user_id:       _userId,
    notes:         t.notes ?? null,
  }))
  await supabase.from('backlog_tasks').insert(rows)
}
```

**Note:** The `project_id` foreign key is needed for the insert. `Task` stores `project` as a name string, not an ID. The store action will need to resolve project IDs and pass them. Update the signature to accept enriched rows instead:

```typescript
export async function moveTasksToBacklog(
  tasks: Array<Task & { projectId: string }>
): Promise<void> {
  if (!supabase || !_userId || tasks.length === 0) return
  await supabase.from('tasks').delete().in('id', tasks.map(t => t.id))
  const rows = tasks.map((t, i) => ({
    project_id:    t.projectId,
    title:         t.title,
    priority:      t.priority,
    carried_count: t.carriedCount,
    sort_order:    i,
    user_id:       _userId,
    notes:         t.notes ?? null,
  }))
  await supabase.from('backlog_tasks').insert(rows)
}
```

- [ ] Run `cd app && npx tsc --noEmit`.

- [ ] Commit:
```bash
git add app/src/lib/api.ts
git commit -m "feat(api): add moveTasksToBacklog helper"
```

---

### Task 11: Store — moveUncompletedToBacklog action

**Files:**
- Modify: `app/src/store/garden.ts`

- [ ] Add `moveUncompletedToBacklog: (treeId: string) => void` to the `GardenStore` interface.

- [ ] Add the action implementation:

```typescript
moveUncompletedToBacklog: (treeId) => {
  const { trees, projects, biomes } = get()
  const tree = trees.find(t => t.id === treeId)
  if (!tree) return

  const incomplete = tree.tasks.filter(t => t.status !== 'complete')
  if (incomplete.length === 0) return

  const moved: Task[] = incomplete.map(t => ({
    ...t,
    status:        'backlog' as const,
    carriedCount:  t.carriedCount + 1,
    scheduledWeek: undefined,
  }))

  set(state => ({
    trees:   state.trees.map(tr =>
      tr.id !== treeId ? tr : { ...tr, tasks: tr.tasks.filter(t => t.status === 'complete') }
    ),
    backlog: [...state.backlog, ...moved],
  }))

  // Resolve projectId for API call
  const project = projects.find(p => p.id === tree.projectId)
  if (!project) return
  const enriched = moved.map(t => ({ ...t, projectId: project.id }))
  api.moveTasksToBacklog(enriched).catch(console.error)
},
```

- [ ] Run `cd app && npx tsc --noEmit`.

- [ ] Commit:
```bash
git add app/src/store/garden.ts
git commit -m "feat(store): add moveUncompletedToBacklog action"
```

---

### Task 12: TreeClickModal — add move-to-backlog button

**Files:**
- Modify: `app/src/components/garden/TreeClickModal.tsx`

- [ ] Import `moveUncompletedToBacklog` from the store. Update the destructure at line 80:

```typescript
const { activeTreeId, trees, projects, biomes, currentWeek, setActiveTree, addTaskToTree, moveUncompletedToBacklog } = useGardenStore()
```

- [ ] Derive `incomplete` count right after the existing `completed`/`total`/`progress` lines (around line 106):

```typescript
const incomplete = tree.tasks.filter(t => t.status !== 'complete')
```

- [ ] Add the button between the task list divider and the add-task input section. Find the `{/* Divider */}` comment before the footer add-task row (around line 217) and insert:

```tsx
{/* Move incomplete to backlog */}
<AnimatePresence>
  {incomplete.length > 0 && (
    <motion.div
      key="move-to-backlog"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="flex justify-end px-4 py-2">
        <button
          onClick={() => moveUncompletedToBacklog(tree.id)}
          className="font-mono text-[8px] tracking-[0.08em] px-2 py-1 transition-colors"
          style={{
            border: '0.5px solid rgba(226,181,64,0.3)',
            color:  'rgba(226,181,64,0.7)',
          }}
        >
          ↩ move incomplete to backlog
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] Run `cd app && npx tsc --noEmit`.

- [ ] Test manually: open a tree with incomplete tasks, click the button — incomplete tasks should move to the backlog, the button should disappear if all tasks are now complete.

- [ ] Commit:
```bash
git add app/src/components/garden/TreeClickModal.tsx
git commit -m "feat: add move-incomplete-to-backlog button to TreeClickModal"
```

---

## Final verification

- [ ] Run `cd app && npm run build` — confirm clean build, no TypeScript or bundler errors.
- [ ] Smoke test all changed flows:
  1. Add notes to a tree task → save → reopen → notes present → reload → notes still present
  2. Add notes to a backlog task → save → reopen → notes present
  3. Create new project → add task title → Plant tree → task appears in TreeClickModal → reload → task persists
  4. Click tree closest to cursor when two trees are near each other — correct tree opens
  5. Click inside a biome → plant tree → tree appears near click position
  6. Biome contours visibly bulge toward tree clusters
  7. TreeClickModal with incomplete tasks → click "↩ move incomplete to backlog" → tasks appear in backlog, button disappears
- [ ] Commit any final cleanup.
