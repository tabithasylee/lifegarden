-- Migration 003: Add notes column to tasks and backlog_tasks

alter table tasks
  add column if not exists notes text;

alter table backlog_tasks
  add column if not exists notes text;
