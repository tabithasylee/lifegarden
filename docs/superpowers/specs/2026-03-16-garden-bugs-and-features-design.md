# Garden App — Bugs & Features Design
**Date:** 2026-03-16

## Scope

Four bug fixes and two new features for the garden app frontend and backend.

---

## Bug 1 — Task notes never saved

### Root cause
The `tasks` and `backlog_tasks` tables have no `notes` column (confirmed: `supabase/migrations/001_initial.sql`). For tree tasks, `api.ts` already has `notes` wired throughout (`TaskRow`, `mapTask`, `updateTask`) — but the Supabase call silently fails because the column doesn't exist. For backlog tasks the gap is deeper: `BacklogRow`, `mapBacklogTask`, and `api.updateBacklogTask` don't reference `notes` at all. The `GardenStore` interface declaration for `updateBacklogTask` (line 126) is typed as `Partial<Pick<Task, 'title' | 'priority'>>`, which will cause a TypeScript error if the implementation body is updated without also fixing the interface. `TaskDetailModal.tsx` line 147 (the `updateBacklogTask` branch) drops `notes` before it reaches the store.

### Fix
1. **Migration `003_add_notes.sql`**: `ALTER TABLE tasks ADD COLUMN notes text; ALTER TABLE backlog_tasks ADD COLUMN notes text;`
2. **`api.ts` — `BacklogRow`**: add `notes?: string | null`
3. **`api.ts` — `mapBacklogTask`**: map `row.notes ?? undefined` onto the returned task
4. **`api.ts` — `updateBacklogTask`**: accept `notes?: string` in the updates param; include in the Supabase `.update()` call
5. **`api.ts` — `insertBacklogTasksIntoTree`**: add `notes: t.notes ?? null` to each inserted row — otherwise notes are silently dropped when a backlog task is pulled into a tree (this gap is exposed by the schema migration)
6. **`store/garden.ts` — `GardenStore` interface line 126**: update type to `Partial<Pick<Task, 'title' | 'priority' | 'notes'>>`
7. **`store/garden.ts` — `updateBacklogTask` action body**: pass `notes` through to the API call
8. **`TaskDetailModal.tsx` line 147** (`else if (activeBacklogTaskId)` branch only): add `notes: notes || undefined` to the `updateBacklogTask` call — the tree-task branch at line 145 already passes notes correctly and must not be changed

---

## Bug 2 — New task not saved when planting from a new project

### Root cause
`plantTree` creates the tree with a temp ID then immediately sets `activeTreeId = tempId`. The `useEffect` in `PlanningModal` fires and calls `addTaskToTree(tempId, title)`, which calls `api.createTask(tempId, ...)` before `api.createTree` has resolved. The foreign key doesn't exist in Supabase yet, so the task creation fails. The task lands in local Zustand state only and is lost on next page load when `loadUserData` overwrites from Supabase.

A related existing bug: `api.deleteBacklogTasksById(backlogTaskIds)` fires outside the `.then()` block in parallel with `api.createTree`. If `createTree` fails, backlog tasks are deleted from the DB but the tree was never created — data loss.

### Fix
1. Remove the `_pendingTaskTitle` ref + `useEffect` hack in `PlanningModal` entirely.
2. Add optional `initialTaskTitle?: string` parameter to `plantTree`.
3. Inside the `.then(dbTreeId => ...)` block, after the real tree ID is established:
   - If `initialTaskTitle` is provided: generate a `crypto.randomUUID()` temp task ID, build the full `Task` object locally, then fire `api.createTask(dbTreeId, initialTaskTitle, ...)` fire-and-forget (same pattern as `addTaskToTree`). Add the task to local state in the same `set()` call as the ID swap — optimistic write, no waiting on the `createTask` round-trip.
   - Move `api.deleteBacklogTasksById(backlogTaskIds)` inside this `.then()` block (currently fires in parallel — move it after the tree is confirmed created to prevent data loss on `createTree` failure).
4. Update `handlePlant` in `PlanningModal` to pass `newTaskTitle.trim()` as the new argument.

---

## Bug 3 — Tree click opens wrong tree

### Root cause
`onMouseUp` and `onMouseMove` both use a first-match-wins loop over `treeMeshes`. Trees within the same project are spaced 55 world units apart; the hit radius is 32 units — giving a combined diameter of 64, wider than the 55-unit gap. The first tree in insertion order wins regardless of which is geometrically closer.

### Fix
Replace first-match with nearest-within-radius in both `onMouseUp` and `onMouseMove`. Reduce hit radius from 32 to 24 world units (safe gap: `55 − 2×24 = 7` units). The loop accumulates a `closest: { tm, dist }` candidate and only fires on the nearest tree within the radius.

---

## Bug 4 — New tree appears at wrong canvas position after planting

### Root cause (two parts)

**Part A — Click position never threaded through.** When `onMouseUp` detects a click inside a biome it calls `s.setActiveBiome(biome.id)` but drops the `{ x, z }` click coordinates. `plantTree` has no way to know where the user clicked, so the tree is always placed at a grid-computed position relative to the biome center, which may be far from where the user intended.

**Part B — Stale `store` snapshot.** The `useEffect` captures `const store = useGardenStore.getState()` once at mount. `buildTreeMesh` uses `store.biomeLayouts` even when called from `unsubTrees` with fresh `state`. The biome hit-detection loops in `onMouseMove` (lines 426–432) and `onMouseUp` (lines 452–457) also use the stale `store.biomes` / `store.biomeLayouts` — biomes added after mount are invisible to hover and click detection.

### Fix

**Manual tree placement:**
1. Add `plantPos: { x: number; z: number } | null` to the store interface and initial state (`null`). This is transient UI state — do **not** include it in `partialize`.
2. Update `setActiveBiome(id, pos?)` in store and interface: when `id` is non-null, set `plantPos = pos ?? null`; when `id` is null (close), always clear `plantPos = null`. The current store setter is a one-liner — expand it to handle both cases.
3. Update `onMouseUp` in `GardenCanvas`: `s.setActiveBiome(biome.id, { x, z })`. All other `setActiveBiome(null)` callsites in `PlanningModal` (`onEscape`, backdrop click, Cancel button) remain valid since `pos` is optional.
4. Add `treeLayouts: Record<string, { wx: number; wy: number }>` to the store interface and initial state (`{}`). Include in Zustand `partialize` so it persists across sessions.
5. `plantTree` reads `get().plantPos` and writes it into `treeLayouts[newTree.id]` (the temp ID). After `api.createTree` resolves: write `treeLayouts[dbTreeId]` and **delete `treeLayouts[tempId]`** to prevent orphaned entries accumulating in the persisted store.
6. `buildTreeMesh`: check `snap.treeLayouts[tree.id]` first — if present, use as `wx`/`wy`. Otherwise fall back to computed grid position (preserves layout of all existing trees).
7. Change `getBiomeLayout(biome, biomeIndex, store.biomeLayouts)` → `getBiomeLayout(biome, biomeIndex, snap.biomeLayouts)` in `buildTreeMesh`. This single change fixes both call sites: the initial `store.trees.forEach` call (where `store` and `snap` are the same snapshot) and the `unsubTrees` subscription call `buildTreeMesh(tree, state, true)` (where `state` is already passed as `snap`, so `snap.biomeLayouts` correctly reads the live state).

**Fix stale store in hit-detection loops:**
8. In `onMouseMove` and `onMouseUp`, replace the module-captured `store.biomes` / `store.biomeLayouts` in the biome-hit loops with a fresh `const s = useGardenStore.getState()` call — consistent with how tree hit detection at line 444 already works.

---

## Feature 1 — Dynamic biome contours (attract toward trees)

### Behaviour
Biome contour vertices are pulled toward tree positions within the biome using a Gaussian-weighted algorithm. The contour live-updates when trees are added or removed. Trees outside the original ellipse are embraced by the expanding contour shape.

### Algorithm

```
For each contour vertex at angle θ:
  base = (rx·cos(θ), ry·sin(θ))                        // ellipse point (biome-local)
  offset = Perlin noise (existing, unchanged)
  pull = Σ over trees in biome:
    treeLocal = treeWorldPos - biomeCenter               // tree pos relative to biome center
    d = distance(base, treeLocal)
    weight = exp(-d² / (2·σ²))                          // Gaussian falloff
    pull += normalize(treeLocal - base) · weight · MAX_PULL
  vertex = base + offset + pull
```

Parameters: `MAX_PULL = 80` world units, `σ = 120` world units.

### Implementation

1. Extract `computeTreePositionsForBiome(biomeId, snap)` — returns `{ wx, wy }[]` for all trees in the biome. Must use the **post-Bug-4-fix** position formula: check `snap.treeLayouts[tree.id]` first (manual placement override), then fall back to the `rawX/rawZ → wx/wy` grid formula. Must derive `biomeIndex` via `snap.biomes.indexOf(biome)` — identical to how `buildTreeMesh` does it — to guarantee consistent world positions. Uses `snap.biomeLayouts` (not stale `store.biomeLayouts`).

2. Extract `buildContourVerts(layout, treePositions, seed)` — returns the `number[]` vertex array using the Gaussian-pull algorithm above.

3. **Refactor contour data structure.** Replace the flat `contourRings: ContourRing[]` array with `biomeContours: Map<string, { geo: THREE.BufferGeometry; rings: ContourRing[] }>` keyed by `biome.id`. All 5 rings per biome continue to share one geometry instance (unchanged). The animation loop currently iterates `contourRings` — update it to iterate `biomeContours.values()` and animate each biome's `rings` array. The existing scene-traversal cleanup in the `return () => {}` block handles disposal correctly since all `LineLoop` objects remain added to the scene; `rebuildContourGeo` writes into the existing geometry in-place (no new allocation) so no additional cleanup is required. Three.js `LineLoop` does not frustum-cull, so calling `computeBoundingSphere()` after vertex updates is not needed.

4. Add `rebuildContourGeo(biomeId, snap)` — looks up the biome's `BufferGeometry` in `biomeContours`, recomputes verts via `buildContourVerts`, writes into `geo.attributes.position.array`, sets `needsUpdate = true`.

5. In `unsubTrees`, after processing tree additions/removals, detect which biomes changed and call `rebuildContourGeo` for each affected biome.

---

## Feature 2 — Move uncompleted tasks to backlog

### Behaviour
A button in `TreeClickModal` moves all incomplete tasks from the current tree into the backlog in one action. Each moved task has its `carriedCount` incremented by 1. The tree retains only completed tasks. No confirmation dialog.

### UI placement
Between the task list divider and the add-task input row. Rendered only when `incomplete.length > 0`. Derive: `const incomplete = tree.tasks.filter(t => t.status !== 'complete')`. Wrap in `AnimatePresence` so it appears/disappears as tasks are completed. Style: `0.5px rgba(226,181,64,0.3)` border, amber text, Space Mono 8px — `"↩ move incomplete to backlog"`.

### Store action: `moveUncompletedToBacklog(treeId: string) => void`
Add to the `GardenStore` interface with this exact signature.

Implementation:
1. Filter `tree.tasks` where `status !== 'complete'`
2. For each: increment `carriedCount`, set `status = 'backlog'`, remove `scheduledWeek`
3. Add to `backlog` array
4. Remove from tree's task list (tree retains only completed tasks)
5. Call `api.moveTasksToBacklog(tasks)`

### New API helper: `api.moveTasksToBacklog(tasks: Task[])`
1. `DELETE FROM tasks WHERE id IN (task ids)`
2. `INSERT INTO backlog_tasks (project_id, title, priority, carried_count, sort_order, user_id, notes)` — rows with incremented `carried_count` and `notes: t.notes ?? null` (the `backlog_tasks.notes` column is added by Bug 1's migration — include it here to avoid silently dropping notes on move)

Guard with `if (!supabase || !_userId) return` before the delete/insert block, consistent with all other write helpers in `api.ts`. Use `_userId` for the `user_id` column value.

Delete before insert to avoid FK conflicts.

For `unsubTrees` contour rebuild triggering (Feature 1): rebuild contours for all biomes unconditionally whenever `state.trees !== prev.trees`. This is the conservative approach — avoids diffing task counts per biome and handles all cases (new trees, task moves, moves-to-backlog) correctly. Contour geometry rebuild is cheap relative to a full render frame.

---

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/003_add_notes.sql` | New — adds `notes text` to `tasks` and `backlog_tasks` |
| `app/src/lib/api.ts` | `BacklogRow` + `mapBacklogTask` notes; `updateBacklogTask` notes param; `insertBacklogTasksIntoTree` notes field; new `moveTasksToBacklog` helper |
| `app/src/store/garden.ts` | `GardenStore` interface: `updateBacklogTask` type fix, `plantPos` + `treeLayouts` fields, `moveUncompletedToBacklog` signature; `setActiveBiome` pos param + plantPos clear; `updateBacklogTask` body notes; `plantTree` initialTaskTitle + treeLayouts write + tempId cleanup + deleteBacklogTasksById moved inside .then(); new `moveUncompletedToBacklog` action |
| `app/src/components/garden/GardenCanvas.tsx` | `setActiveBiome` passes `{x,z}`; `buildTreeMesh` uses `snap.biomeLayouts` + `snap.treeLayouts`; nearest-tree hit detection (radius 32→24); stale store fix in `onMouseMove`/`onMouseUp` biome loops; dynamic contour algorithm + per-biome `biomeContours` Map + animation loop refactor |
| `app/src/components/garden/TaskDetailModal.tsx` | Pass `notes` in `updateBacklogTask` call (backlog branch only, line 147) |
| `app/src/components/garden/PlanningModal.tsx` | Remove `_pendingTaskTitle` + useEffect; pass `newTaskTitle` to `plantTree` |
| `app/src/components/garden/TreeClickModal.tsx` | Add `moveUncompletedToBacklog` button with `AnimatePresence` |
