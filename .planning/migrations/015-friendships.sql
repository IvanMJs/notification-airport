-- Migration 015: friendships table for Friends Travel Map feature

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

create policy "friendships_select"
  on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert"
  on public.friendships for insert
  with check (requester_id = auth.uid());

create policy "friendships_update"
  on public.friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_delete"
  on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- welcome_sent column (migration also applied manually):
alter table public.user_profiles
  add column if not exists welcome_sent boolean not null default false;
