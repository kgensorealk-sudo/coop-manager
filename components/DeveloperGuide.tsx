
import React, { useState } from 'react';
import { FolderTree, Copy, Check, Database, Image, AlertTriangle } from 'lucide-react';

// COMPLETE SQL SCHEMA FOR THE 13TH PAGE
const SCHEMA_SQL = `-- THE 13TH PAGE: BULLETPROOF COOPERATIVE & PERSONAL LEDGER SCHEMA
-- Target Environment: Supabase / PostgreSQL

-- 0. REPAIR EXISTING TABLE CONSTRAINTS
-- Fixes the 42P10 "no unique constraint" error
do $$
begin
    if not exists (
        select 1 from pg_constraint 
        where conname = 'profiles_email_key' 
        and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles add constraint profiles_email_key unique (email);
    end if;
end $$;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. TABLES (Created only if they don't exist)
create table if not exists profiles (
  id uuid default uuid_generate_v4() primary key,
  auth_id uuid references auth.users,
  full_name text not null,
  email text not null unique,
  role text check (role in ('admin', 'member')) default 'member',
  is_coop_member boolean default true,
  equity numeric default 0,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists contributions (
  id uuid default uuid_generate_v4() primary key,
  member_id uuid references profiles(id) not null,
  amount numeric not null check (amount > 0),
  type text check (type in ('monthly_deposit', 'one_time')) default 'monthly_deposit',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending'
);

create table if not exists loans (
  id uuid default uuid_generate_v4() primary key,
  borrower_id uuid references profiles(id) not null,
  principal numeric not null check (principal > 0),
  interest_rate numeric not null default 10,
  duration_months integer not null check (duration_months > 0),
  start_date timestamp with time zone,
  status text check (status in ('pending', 'active', 'rejected', 'paid')) default 'pending',
  purpose text,
  remaining_principal numeric not null,
  interest_accrued numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  loan_id uuid references loans(id) not null,
  amount numeric not null check (amount > 0),
  interest_paid numeric not null default 0,
  principal_paid numeric not null default 0,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text not null,
  priority text check (priority in ('urgent', 'high', 'normal', 'low')) default 'normal',
  is_active boolean default true,
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  author_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists gallery_items (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  caption text,
  uploaded_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_archived boolean default false,
  archived_at timestamp with time zone
);

create table if not exists personal_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  name text not null,
  type text check (type in ('cash', 'bank', 'digital', 'savings')) not null,
  balance numeric default 0,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists personal_ledger (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  account_id uuid references personal_accounts(id),
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  description text not null,
  amount numeric not null check (amount > 0),
  type text check (type in ('income', 'expense')) not null,
  category text,
  is_recurring boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists saving_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric default 0,
  deadline timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists category_budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  category text not null,
  limit_amount numeric not null default 0,
  unique(user_id, category)
);

create table if not exists settings (
  key text primary key,
  value text
);

-- Seed Defaults
insert into settings (key, value) values ('monthly_goal', '50000') on conflict do nothing;

-- =========================================================
-- AUTH TRIGGER (AUTOMATIC PROFILE CREATION)
-- =========================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (auth_id, full_name, email, role, is_coop_member, equity)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Member'),
    new.email,
    'member',
    true,
    0
  )
  on conflict (email) do update 
  set auth_id = excluded.auth_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
-- Use DROP POLICY IF EXISTS to avoid 42710 error

alter table profiles enable row level security;
alter table contributions enable row level security;
alter table loans enable row level security;
alter table payments enable row level security;
alter table announcements enable row level security;
alter table gallery_items enable row level security;
alter table personal_accounts enable row level security;
alter table personal_ledger enable row level security;
alter table saving_goals enable row level security;
alter table category_budgets enable row level security;
alter table settings enable row level security;

-- 1. PROFILES
drop policy if exists "Profiles: Public view" on profiles;
create policy "Profiles: Public view" on profiles for select using (true);
drop policy if exists "Profiles: Admin manage" on profiles;
create policy "Profiles: Admin manage" on profiles for all using (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));

-- 2. FINANCIALS (Transparency for members)
drop policy if exists "Coop: View access" on contributions;
create policy "Coop: View access" on contributions for select using (true);
drop policy if exists "Coop: View access" on loans;
create policy "Coop: View access" on loans for select using (true);
drop policy if exists "Coop: View access" on payments;
create policy "Coop: View access" on payments for select using (true);

-- 3. PERSONAL PRIVATE DATA (User Isolation)
drop policy if exists "Personal: Account isolation" on personal_accounts;
create policy "Personal: Account isolation" on personal_accounts for all using (auth.uid() in (select auth_id from profiles where id = user_id));
drop policy if exists "Personal: Ledger isolation" on personal_ledger;
create policy "Personal: Ledger isolation" on personal_ledger for all using (auth.uid() in (select auth_id from profiles where id = user_id));
drop policy if exists "Personal: Goals isolation" on saving_goals;
create policy "Personal: Goals isolation" on saving_goals for all using (auth.uid() in (select auth_id from profiles where id = user_id));
drop policy if exists "Personal: Budget isolation" on category_budgets;
create policy "Personal: Budget isolation" on category_budgets for all using (auth.uid() in (select auth_id from profiles where id = user_id));

-- 4. SYSTEM COMPONENTS
drop policy if exists "Public: Notice read" on announcements;
create policy "Public: Notice read" on announcements for select using (true);
drop policy if exists "Admin: Notice manage" on announcements;
create policy "Admin: Notice manage" on announcements for all using (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));

drop policy if exists "Public: Gallery read" on gallery_items;
create policy "Public: Gallery read" on gallery_items for select using (true);
drop policy if exists "Admin: Gallery manage" on gallery_items;
create policy "Admin: Gallery manage" on gallery_items for all using (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));

-- =========================================================
-- ONE-TIME BACKFILL SCRIPT (FOR EXISTING USERS)
-- =========================================================

insert into public.profiles (auth_id, full_name, email, role, is_coop_member, equity)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Existing Member'), 
  email, 
  'member', 
  true, 
  0
from auth.users
on conflict (email) do update 
set auth_id = excluded.auth_id;
`;

export const DeveloperGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'storage' | 'structure'>('schema');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'schema') content = SCHEMA_SQL;
    if (activeTab === 'storage') content = "-- 1. Go to Supabase Dashboard\n-- 2. Go to Storage\n-- 3. Create 'gallery' bucket\n-- 4. Set bucket to PUBLIC\n-- 5. Add RLS policies for Select (public) and Insert (authenticated)";
    if (activeTab === 'structure') content = "/components\n/services\n/types\nApp.tsx\nindex.tsx";
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-serif">Developer Resources</h1>
        <p className="text-slate-500 mt-2 font-serif italic text-lg">Initialize or repair your database environment.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schema' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database size={16} />
              <span>SQL Schema (Bulletproof)</span>
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'storage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Image size={16} />
              <span>Storage</span>
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'structure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderTree size={16} />
              <span>Project Structure</span>
            </button>
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0 ml-4 shadow-sm"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <pre className="font-mono text-xs text-blue-100 leading-relaxed">
            {activeTab === 'schema' && SCHEMA_SQL}
            {activeTab === 'storage' && "-- 1. Go to Supabase Dashboard\n-- 2. Go to Storage\n-- 3. Create 'gallery' bucket\n-- 4. Set bucket to PUBLIC\n-- 5. Add RLS policies for Select (public) and Insert (authenticated)"}
            {activeTab === 'structure' && "/components\n/services\n/types\nApp.tsx\nindex.tsx"}
          </pre>
        </div>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-sm">
         <h4 className="text-blue-900 font-bold mb-2 flex items-center gap-2 uppercase tracking-widest text-xs">
            <AlertTriangle size={14} />
            Important Troubleshooting
         </h4>
         <ul className="text-sm text-blue-800 space-y-2 list-disc pl-5 font-serif italic">
            <li><strong>Safe Re-runs:</strong> This updated script uses <code>DROP POLICY IF EXISTS</code>. If you get errors about policies already existing, running this version will fix them.</li>
            <li><strong>Manual Repair:</strong> The top section of the script explicitly adds a <code>UNIQUE</code> constraint to the email column, which is required for the user logic to work correctly.</li>
         </ul>
      </div>
    </div>
  );
};

export default DeveloperGuide;
