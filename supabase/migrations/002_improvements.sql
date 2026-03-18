-- Migration 002: Add constraints and performance indexes

-- ─── CHECK constraints on text enum columns ───────────────────────────────────

alter table tasks
  add constraint tasks_status_check
    check (status in ('scheduled', 'complete')),
  add constraint tasks_priority_check
    check (priority in ('none', 'high', 'critical'));

alter table backlog_tasks
  add constraint backlog_tasks_priority_check
    check (priority in ('none', 'high', 'critical'));

-- ─── Performance indexes on FK columns used in WHERE clauses ─────────────────

create index if not exists tasks_tree_id_idx       on tasks (tree_id);
create index if not exists tasks_user_id_idx       on tasks (user_id);
create index if not exists backlog_tasks_project_id_idx on backlog_tasks (project_id);
create index if not exists backlog_tasks_user_id_idx    on backlog_tasks (user_id);
create index if not exists trees_project_id_idx    on trees (project_id);
create index if not exists projects_biome_id_idx   on projects (biome_id);
