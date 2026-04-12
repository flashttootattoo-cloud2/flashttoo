-- ============================================================
-- FLASHTTO — Schema SQL para Supabase
-- Correr en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Limpiar tablas existentes (en orden por foreign keys)
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists reservations cascade;
drop table if exists designs cascade;
drop table if exists profiles cascade;

-- Limpiar trigger y función si existen
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'tattoo_artist')),
  full_name text not null default '',
  username text unique not null,
  avatar_url text,
  bio text,
  city text,
  country text,
  phone text,
  instagram text,
  plan text not null default 'free' check (plan in ('free', 'basic', 'premium')),
  plan_expires_at timestamptz,
  designs_count integer not null default 0,
  followers_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, username, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'city'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- DESIGNS
-- ============================================================
create table designs (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  width_cm numeric(5,1),
  height_cm numeric(5,1),
  price numeric(10,2),
  currency text not null default 'ARS',
  style text,
  body_part text,
  is_available boolean not null default true,
  is_flash boolean not null default true,
  views_count integer not null default 0,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast artist queries
create index designs_artist_id_idx on designs(artist_id);
create index designs_is_available_idx on designs(is_available);
create index designs_style_idx on designs(style);

-- ============================================================
-- RESERVATIONS
-- ============================================================
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  design_id uuid not null references designs(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete cascade,
  artist_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'completed')),
  message text,
  preferred_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_artist_id_idx on reservations(artist_id);
create index reservations_client_id_idx on reservations(client_id);
create index reservations_status_idx on reservations(status);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_1 uuid not null references profiles(id) on delete cascade,
  participant_2 uuid not null references profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique(participant_1, participant_2)
);

create index conversations_p1_idx on conversations(participant_1);
create index conversations_p2_idx on conversations(participant_2);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  status text not null default 'sent' check (status in ('sent', 'read')),
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages(conversation_id);
create index messages_sender_id_idx on messages(sender_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles: anyone can read, users can update their own
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Designs: anyone can read, artists can create/update/delete their own
alter table designs enable row level security;
create policy "Designs are viewable by everyone" on designs for select using (true);
create policy "Artists can insert own designs" on designs for insert with check (auth.uid() = artist_id);
create policy "Artists can update own designs" on designs for update using (auth.uid() = artist_id);
create policy "Artists can delete own designs" on designs for delete using (auth.uid() = artist_id);

-- Reservations: clients and artists can see their own
alter table reservations enable row level security;
create policy "Users can see their reservations" on reservations
  for select using (auth.uid() = client_id or auth.uid() = artist_id);
create policy "Clients can create reservations" on reservations
  for insert with check (auth.uid() = client_id);
create policy "Artists can update reservation status" on reservations
  for update using (auth.uid() = artist_id);

-- Conversations: participants can see and update their own
alter table conversations enable row level security;
create policy "Participants can see their conversations" on conversations
  for select using (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "Users can create conversations" on conversations
  for insert with check (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "Participants can update their conversations" on conversations
  for update using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- Messages: participants can see and create messages
alter table messages enable row level security;
create policy "Participants can see their messages" on messages
  for select using (
    auth.uid() = sender_id or
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and (participant_1 = auth.uid() or participant_2 = auth.uid())
    )
  );
create policy "Users can send messages" on messages
  for insert with check (auth.uid() = sender_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in the Supabase Storage section or as SQL:
insert into storage.buckets (id, name, public)
values ('designs', 'designs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can view design images" on storage.objects
  for select using (bucket_id = 'designs');
create policy "Authenticated users can upload design images" on storage.objects
  for insert with check (bucket_id = 'designs' and auth.role() = 'authenticated');
create policy "Users can update own design images" on storage.objects
  for update using (bucket_id = 'designs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own design images" on storage.objects
  for delete using (bucket_id = 'designs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ============================================================
-- DESIGN LIKES
-- ============================================================
create table if not exists design_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  design_id uuid not null references designs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, design_id)
);

create index if not exists design_likes_design_id_idx on design_likes(design_id);
create index if not exists design_likes_user_id_idx on design_likes(user_id);

alter table design_likes enable row level security;
create policy "Users can see own likes" on design_likes
  for select using (auth.uid() = user_id);
create policy "Users can insert own likes" on design_likes
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes" on design_likes
  for delete using (auth.uid() = user_id);

-- Keep likes_count in sync
create or replace function handle_like_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update designs set likes_count = likes_count + 1 where id = NEW.design_id;
  elsif TG_OP = 'DELETE' then
    update designs set likes_count = greatest(0, likes_count - 1) where id = OLD.design_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_change on design_likes;
create trigger on_like_change
  after insert or delete on design_likes
  for each row execute procedure handle_like_change();

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_follower_id_idx on follows(follower_id);
create index if not exists follows_following_id_idx on follows(following_id);

alter table follows enable row level security;
create policy "Users can see own follows" on follows
  for select using (auth.uid() = follower_id);
create policy "Users can follow" on follows
  for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on follows
  for delete using (auth.uid() = follower_id);

-- Keep followers_count in sync
create or replace function handle_follow_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = NEW.following_id;
  elsif TG_OP = 'DELETE' then
    update profiles set followers_count = greatest(0, followers_count - 1) where id = OLD.following_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_change on follows;
create trigger on_follow_change
  after insert or delete on follows
  for each row execute procedure handle_follow_change();

-- ============================================================
-- VIEWS RPC
-- ============================================================
create or replace function increment_design_views(design_id uuid)
returns void as $$
  update designs set views_count = views_count + 1 where id = design_id;
$$ language sql security definer;

create or replace function decrement_designs_count(artist_id_input uuid)
returns void as $$
  update profiles set designs_count = greatest(0, designs_count - 1) where id = artist_id_input;
$$ language sql security definer;

-- ============================================================
-- REALTIME (enable for messages)
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ============================================================
-- MIGRATION: archive + pin features
-- Run this block in Supabase SQL Editor if upgrading an existing DB
-- ============================================================
alter table designs add column if not exists is_archived boolean not null default false;
alter table designs add column if not exists is_pinned   boolean not null default false;

create index if not exists designs_is_archived_idx on designs(is_archived);
create index if not exists designs_is_pinned_idx   on designs(is_pinned);

-- ============================================================
-- DESIGN IMAGES (multi-photo per design — premium feature)
-- ============================================================
create table if not exists design_images (
  id uuid primary key default uuid_generate_v4(),
  design_id uuid not null references designs(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists design_images_design_id_idx on design_images(design_id);

alter table design_images enable row level security;
create policy "Anyone can view design images" on design_images for select using (true);
create policy "Artists can insert own design images" on design_images for insert
  with check (auth.uid() = (select artist_id from designs where id = design_id));
create policy "Artists can delete own design images" on design_images for delete
  using (auth.uid() = (select artist_id from designs where id = design_id));
