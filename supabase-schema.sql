-- Supabase SQL Editor에 붙여넣고 실행하세요

-- 작가 프로필
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  bio text,
  created_at timestamp with time zone default now()
);

-- 시리즈
create table series (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text not null,
  created_at timestamp with time zone default now()
);

-- 글 (화)
create table episodes (
  id uuid default gen_random_uuid() primary key,
  series_id uuid references series(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  ep_number int not null,
  title text not null,
  content text,
  is_published boolean default false,
  password text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS (보안 정책)
alter table profiles enable row level security;
alter table series enable row level security;
alter table episodes enable row level security;

-- 프로필: 본인만 수정, 누구나 읽기
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- 시리즈: 본인만 수정, 누구나 읽기
create policy "series_read" on series for select using (true);
create policy "series_insert" on series for insert with check (auth.uid() = author_id);
create policy "series_update" on series for update using (auth.uid() = author_id);
create policy "series_delete" on series for delete using (auth.uid() = author_id);

-- 글: 발행된 건 누구나 읽기, 본인만 쓰기
create policy "episodes_read" on episodes for select using (is_published = true or auth.uid() = author_id);
create policy "episodes_insert" on episodes for insert with check (auth.uid() = author_id);
create policy "episodes_update" on episodes for update using (auth.uid() = author_id);
create policy "episodes_delete" on episodes for delete using (auth.uid() = author_id);

-- 프로필 자동 생성 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
