create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

alter table api_keys enable row level security;

create policy "Users can view their own keys" on api_keys for select using (auth.uid() = user_id);
create policy "Users can delete their own keys" on api_keys for delete using (auth.uid() = user_id);
create policy "Users can create their own keys" on api_keys for insert with check (auth.uid() = user_id);
