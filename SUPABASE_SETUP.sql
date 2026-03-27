-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- PETS TABLE
create table if not exists pets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  owner_name text not null,
  pet_name text not null,
  pet_type text not null,
  pet_breed text,
  emoji text default '🐾',
  bio text default '',
  location text default 'India',
  paw_coins integer default 150,
  created_at timestamptz default now()
);

-- POSTS TABLE
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references pets(id) on delete cascade not null,
  content text not null,
  image_url text,
  likes integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table pets enable row level security;
alter table posts enable row level security;

-- POLICIES: Pets
create policy "Anyone can view pets"
  on pets for select using (true);

create policy "Users can insert their own pet"
  on pets for insert with check (auth.uid() = user_id);

create policy "Users can update their own pet"
  on pets for update using (auth.uid() = user_id);

-- POLICIES: Posts
create policy "Anyone can view posts"
  on posts for select using (true);

create policy "Pet owners can create posts"
  on posts for insert with check (
    exists (select 1 from pets where id = pet_id and user_id = auth.uid())
  );

create policy "Pet owners can update their posts"
  on posts for update using (
    exists (select 1 from pets where id = pet_id and user_id = auth.uid())
  );
