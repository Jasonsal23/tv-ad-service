-- locations
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_user_id uuid references auth.users,
  created_at timestamptz default now()
);

-- screens
create table screens (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  name text not null,
  player_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- advertisers
create table advertisers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  business_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz default now()
);

-- ads
create table ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references advertisers(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  title text not null,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) not null,
  duration_seconds int default 10,
  status text check (status in ('draft', 'active', 'paused', 'expired')) default 'draft',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- playlists
create table playlists (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- playlist_items
create table playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade,
  ad_id uuid references ads(id) on delete cascade,
  order_index int not null,
  weight int default 1
);

-- screen_playlists
create table screen_playlists (
  screen_id uuid references screens(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete cascade,
  primary key (screen_id, playlist_id)
);

-- impressions
create table impressions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references ads(id) on delete cascade,
  screen_id uuid references screens(id) on delete cascade,
  played_at timestamptz default now(),
  duration_played_seconds int
);

-- RLS policies
alter table locations enable row level security;
alter table screens enable row level security;
alter table advertisers enable row level security;
alter table ads enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;
alter table screen_playlists enable row level security;
alter table impressions enable row level security;

-- Allow authenticated users to manage their own location's data
create policy "owners can manage locations" on locations
  for all using (owner_user_id = auth.uid());

create policy "owners can manage screens" on screens
  for all using (location_id in (select id from locations where owner_user_id = auth.uid()));

create policy "owners can manage advertisers" on advertisers
  for all using (location_id in (select id from locations where owner_user_id = auth.uid()));

create policy "owners can manage ads" on ads
  for all using (location_id in (select id from locations where owner_user_id = auth.uid()));

create policy "owners can manage playlists" on playlists
  for all using (location_id in (select id from locations where owner_user_id = auth.uid()));

create policy "owners can manage playlist_items" on playlist_items
  for all using (playlist_id in (select id from playlists where location_id in (select id from locations where owner_user_id = auth.uid())));

create policy "owners can manage screen_playlists" on screen_playlists
  for all using (screen_id in (select id from screens where location_id in (select id from locations where owner_user_id = auth.uid())));

create policy "owners can manage impressions" on impressions
  for all using (screen_id in (select id from screens where location_id in (select id from locations where owner_user_id = auth.uid())));

-- Service role bypass for player API routes
create policy "service role bypass" on impressions for insert with check (true);
create policy "service role bypass screens" on screens for update using (true);
