-- Таблица синхронизации Kairema: одна таблица для всех видов данных (чаты, память и т.д.).
-- Выполняется один раз в Supabase: SQL Editor, вставить, нажать Run.
create table if not exists public.sync_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb,
  ts bigint not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists sync_items_user_updated on public.sync_items (user_id, updated_at);
alter table public.sync_items enable row level security;
drop policy if exists "own rows select" on public.sync_items;
drop policy if exists "own rows insert" on public.sync_items;
drop policy if exists "own rows update" on public.sync_items;
drop policy if exists "own rows delete" on public.sync_items;
create policy "own rows select" on public.sync_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.sync_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.sync_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.sync_items for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.sync_items to authenticated;
create or replace function public.sync_items_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end $$;
drop trigger if exists sync_items_touch on public.sync_items;
create trigger sync_items_touch before insert or update on public.sync_items
  for each row execute function public.sync_items_touch();
