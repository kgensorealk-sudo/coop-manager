
import React, { useState } from 'react';
import { Copy, Check, Database } from 'lucide-react';

// SQL Schema - Updated with Equity Sync Trigger
const SCHEMA_SQL = `-- 1. INITIAL SETUP
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE
create table if not exists profiles (
  id uuid default uuid_generate_v4() primary key,
  auth_id uuid references auth.users on delete cascade,
  full_name text,
  email text,
  role text check (role in ('admin', 'member')) default 'member',
  is_coop_member boolean default true,
  equity numeric default 0,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. AUTOMATIC PROFILE TRIGGER (Fixes signup errors)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (auth_id, email, full_name, role, is_coop_member, equity)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'member', 
    true, 
    0
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. FINANCIAL TABLES
create table if not exists contributions (
  id uuid default uuid_generate_v4() primary key,
  member_id uuid references profiles(id) not null,
  amount numeric not null,
  type text check (type in ('monthly_deposit', 'one_time')) default 'monthly_deposit',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending'
);

-- 5. EQUITY SYNC TRIGGER (Fixes "0 Equity" mismatch)
create or replace function public.handle_contribution_status_change()
returns trigger as $$
begin
  if (new.status = 'approved' and (old.status is null or old.status != 'approved')) then
    update public.profiles set equity = equity + new.amount where id = new.member_id;
  elsif (new.status != 'approved' and old.status = 'approved') then
    update public.profiles set equity = equity - new.amount where id = new.member_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_contribution_approved on public.contributions;
create trigger on_contribution_approved
  after insert or update of status on public.contributions
  for each row execute procedure public.handle_contribution_status_change();

create table if not exists loans (
  id uuid default uuid_generate_v4() primary key,
  borrower_id uuid references profiles(id) not null,
  principal numeric not null,
  interest_rate numeric not null default 10,
  duration_months integer not null,
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
  amount numeric not null,
  interest_paid numeric not null,
  principal_paid numeric not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PERSONAL LEDGER TABLES
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
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,
  category text,
  is_recurring boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists saving_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  name text not null,
  target_amount numeric not null,
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

-- 7. SYSTEM TABLES
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

create table if not exists settings (
  key text primary key,
  value text
);

insert into settings (key, value) values ('monthly_goal', '10000') on conflict do nothing;

-- 8. ENABLE RLS
alter table profiles enable row level security;
alter table personal_accounts enable row level security;
alter table personal_ledger enable row level security;
alter table saving_goals enable row level security;
alter table category_budgets enable row level security;

-- 9. POLICIES
create policy "Public profiles" on profiles for select using (true);
create policy "Users manage own accounts" on personal_accounts for all using (auth.uid() in (select auth_id from profiles where id = user_id));
create policy "Users manage own ledger" on personal_ledger for all using (auth.uid() in (select auth_id from profiles where id = user_id));
create policy "Users manage own goals" on saving_goals for all using (auth.uid() in (select auth_id from profiles where id = user_id));
create policy "Users manage own budgets" on category_budgets for all using (auth.uid() in (select auth_id from profiles where id = user_id));
`;

export const DeveloperGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'storage' | 'structure'>('schema');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'schema') content = SCHEMA_SQL;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Developer Resources</h1>
        <p className="text-slate-500 mt-2">Initialize your sovereign ledger environment.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4">
          <div className="flex space-x-1">
            <button onClick={() => setActiveTab('schema')} className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schema' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Database size={16} /><span>SQL Schema</span>
            </button>
          </div>
          <button onClick={handleCopy} className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0 ml-4">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}<span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <pre className="font-mono text-sm text-blue-100 leading-relaxed">{SCHEMA_SQL}</pre>
        </div>
      </div>
    </div>
  );
};

export default DeveloperGuide;
