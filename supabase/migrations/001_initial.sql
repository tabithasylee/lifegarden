-- Lifegarden schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

-- ─── Biomes ───────────────────────────────────────────────────────────────────
-- User-configurable biome zones (work / personal / health, or whatever the user wants).

create table if not exists biomes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  color       text not null,       -- hex stroke color e.g. '#7BA89A'
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

alter table biomes enable row level security;

create policy "biomes: own rows" on biomes
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Projects ─────────────────────────────────────────────────────────────────

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  biome_id    uuid references biomes not null,
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

alter table projects enable row level security;

create policy "projects: own rows" on projects
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Trees ────────────────────────────────────────────────────────────────────
-- One tree per project per week.

create table if not exists trees (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  project_id  uuid references projects not null,
  week        text not null,        -- ISO week key e.g. '2026-W10'
  intention   text,
  created_at  timestamptz default now(),
  unique (project_id, week)
);

alter table trees enable row level security;

create policy "trees: own rows" on trees
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Tasks (tree-scoped) ──────────────────────────────────────────────────────

create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  tree_id       uuid references trees not null,
  title         text not null,
  status        text not null default 'scheduled',  -- 'scheduled' | 'complete'
  priority      text not null default 'none',        -- 'none' | 'high' | 'critical'
  carried_count int  not null default 0,
  sort_order    int  not null default 0,
  created_at    timestamptz default now()
);

alter table tasks enable row level security;

create policy "tasks: own rows" on tasks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Backlog tasks ────────────────────────────────────────────────────────────

create table if not exists backlog_tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  project_id    uuid references projects not null,
  title         text not null,
  priority      text not null default 'none',
  carried_count int  not null default 0,
  sort_order    int  not null default 0,
  created_at    timestamptz default now()
);

alter table backlog_tasks enable row level security;

create policy "backlog_tasks: own rows" on backlog_tasks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
