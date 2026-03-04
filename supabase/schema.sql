-- Pipeline Simulator V3 -- Supabase Schema

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;
create policy "Users read own profile" on user_profiles for select using (auth.uid() = id);
create policy "Users update own profile" on user_profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on user_profiles for insert with check (auth.uid() = id);

-- Cloud-synced pipelines
create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  type text not null default 'custom',
  status text not null default 'active' check (status in ('active', 'archived', 'template')),
  config jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table pipelines enable row level security;
create policy "Users read own pipelines" on pipelines for select using (auth.uid() = user_id);
create policy "Users write own pipelines" on pipelines for insert with check (auth.uid() = user_id);
create policy "Users update own pipelines" on pipelines for update using (auth.uid() = user_id);
create policy "Users delete own pipelines" on pipelines for delete using (auth.uid() = user_id);

-- Cloud-synced simulation results
create table if not exists simulation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pipeline_id uuid references pipelines(id) on delete cascade not null,
  sim_type text not null check (sim_type in ('monte_carlo', 'sensitivity', 'forecast')),
  inputs jsonb not null default '{}',
  results jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table simulation_results enable row level security;
create policy "Users read own sims" on simulation_results for select using (auth.uid() = user_id);
create policy "Users write own sims" on simulation_results for insert with check (auth.uid() = user_id);

-- Analytics events
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  pipeline_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table analytics_events enable row level security;
create policy "Insert analytics" on analytics_events for insert with check (true);
create policy "Users read own analytics" on analytics_events for select using (auth.uid() = user_id);
