-- Run this in Supabase: Project > SQL Editor > New query

create extension if not exists "pgcrypto";

-- One row per signed-up user, created automatically on signup (see trigger below)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table lots (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) not null,
  title text not null,
  artist text not null,
  medium text not null,
  edition_info text,
  year_claimed text not null,
  description text,
  images text[] not null,
  starting_bid numeric not null check (starting_bid > 0),
  current_bid numeric not null,
  status text not null check (status in ('certified', 'flagged', 'insufficient_photos')),
  ai_report jsonb,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references lots(id) not null,
  bidder_id uuid references profiles(id) not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Collector'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row-level security
alter table profiles enable row level security;
alter table lots enable row level security;
alter table bids enable row level security;

create policy "Profiles are publicly readable" on profiles
  for select using (true);

create policy "Certified lots are publicly readable" on lots
  for select using (status = 'certified' or seller_id = auth.uid());

create policy "Users can list their own lots" on lots
  for insert with check (seller_id = auth.uid());

create policy "Bids on certified lots are publicly readable" on bids
  for select using (
    exists (select 1 from lots where lots.id = lot_id and lots.status = 'certified')
  );

create policy "Signed-in users can bid on certified lots" on bids
  for insert with check (
    bidder_id = auth.uid()
    and exists (select 1 from lots where lots.id = lot_id and lots.status = 'certified' and lots.ends_at > now())
  );
