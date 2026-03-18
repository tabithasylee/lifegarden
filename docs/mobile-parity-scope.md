# Mobile Parity + Animation Polish — Scope

Captured from session ending 2026-03-17. These are features added to desktop that are missing from mobile, plus animation polish tasks.

---

## 1. Quick Fix (next session start)

### Edit button underline
- Remove `text-decoration` / underline from the EDIT/EDITING label text inside FloatingEditButton
- The `<motion.span>` inside the absolute-positioned div may be inheriting underline from a parent `<a>` or button style
- Fix: add `style={{ textDecoration: 'none' }}` or `className="no-underline"` to the span, or to the button
- Also: consider changing the active EDITING color to something more distinct (e.g. amber `#e2b540` already used, maybe add a subtle amber text-shadow or glow)
- All color/border transitions on the button should use framer-motion `animate` prop instead of CSS `transition` string so they are properly animated

---

## 2. Mobile Parity Tasks

Everything added to desktop that mobile is missing:

### 2a. Inline rename (biome + project name)
- In MobileBacklog: click biome name → inline input edit (same InlineRename component used in BacklogView)
- In MobileBacklog: click project name → inline input edit
- Reuse the `InlineRename` component from `BacklogView.tsx` — extract to `src/components/shared/InlineRename.tsx`

### 2b. Move tasks from backlog to current week
- In MobileBacklog: select tasks (tap circle) → "Add to current week" footer CTA
- Already exists on desktop BacklogView — replicate in MobileBacklog
- Uses `addBacklogTasksToCurrentWeek` store action

### 2c. Move incomplete tasks to backlog from tree modal
- In MobileTreeDetail: "↩ move incomplete to backlog" button for past weeks
- Already exists in desktop TreeClickModal — replicate in MobileTreeDetail
- Uses `moveUncompletedToBacklog` store action

### 2d. Delete task (with animation)
- In MobileTreeDetail: swipe-to-delete OR long-press → delete with red flash + slide exit
- In MobileWeekView task rows: same pattern

### 2e. Delete biome / delete project
- In MobileBacklog: trash icon on hover/press for biome + project sections
- Confirmation footer slides up (same as desktop)
- Exit animation: biome/project section fades + slides left

### 2f. Delete task from backlog
- Individual task delete in MobileBacklog (trash appears on long-press or swipe)

---

## 3. Animation Pass — All Workflows

### 3a. All modal open/close
- TreeClickModal ✅ (fixed exit animation with ref pattern)
- TaskDetailModal ✅ (fixed exit animation with ref pattern)
- PlanningModal — verify exit animation works (same ref pattern may be needed)
- BacklogView ✅ (has panelVariants)
- TasksView — verify exit animation works
- CreateBiomeModal — verify

### 3b. Task interactions
- Task tick → disappear ✅ (exitingIds pattern)
- Task delete → red flash → exit ✅ (deletingIds pattern, 220ms delay)
- Task add to week → slide right exit ✅ (BacklogView AnimatePresence on rows)
- Task add (new row appears) — entrance animation ✅

### 3c. Biome / project delete
- Biome section exit ✅ (motion.div + AnimatePresence)
- Project section exit ✅ (motion.div + AnimatePresence)

### 3d. Edit button
- Entrance/exit ✅ (AnimatePresence in FloatingEditButton)
- Toggle animation ✅ (icon rotation, text crossfade)
- Underline removal — PENDING (see §1)
- Color transition via framer-motion animate — PENDING

### 3e. Mobile transitions (all missing)
- MobileTreeDetail: task tick → disappear (same exitingIds pattern)
- MobileTreeDetail: task delete → red flash exit
- MobileBacklog: task row exits when moved to week
- MobileBacklog: biome/project section exits on delete
- MobilePlanningModal: pulled-in backlog tasks animate out

### 3f. Rename transitions
- InlineRename component: when editing starts, input fades/slides in
- When saved, value animates back in (brief scale or fade)
- Desktop ✅ (basic CSS transition on border-bottom)
- Mobile — PENDING (after 2a)

---

## 4. Component Extraction Needed

- `InlineRename` → `src/components/shared/InlineRename.tsx` (currently inlined in BacklogView)
- Used by: BacklogView (desktop), MobileBacklog (mobile)

---

## 5. Prod Deploy Status

- Last deploy: preview https://lifegarden-g9uufnh4i-tabithasylees-projects.vercel.app
- Prod domain: lifegrdn.vercel.app
- Deploy triggered at end of this session (`vercel --prod`)
