
import React, { useState } from 'react';
import { FolderTree, Copy, Check, Database, Terminal } from 'lucide-react';

// SQL Schema
const SCHEMA_SQL = `-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists profiles (
  id uuid default uuid_generate_v4() primary key,
  auth_id uuid references auth.users,
  full_name text,
  email text,
  role text check (role in ('admin', 'member')) default 'member',
  is_coop_member boolean default true,
  equity numeric default 0,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CONTRIBUTIONS
create table if not exists contributions (
  id uuid default uuid_generate_v4() primary key,
  member_id uuid references profiles(id) not null,
  amount numeric not null,
  type text check (type in ('monthly_deposit', 'one_time')) default 'monthly_deposit',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending'
);

-- 3. LOANS
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

-- 4. PAYMENTS
create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  loan_id uuid references loans(id) not null,
  amount numeric not null,
  interest_paid numeric not null,
  principal_paid numeric not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ANNOUNCEMENTS
-- Recreated to include scheduling columns
drop table if exists announcements;

create table announcements (
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

-- 6. SETTINGS
create table if not exists settings (
  key text primary key,
  value text
);

-- Default Goal
insert into settings (key, value) values ('monthly_goal', '10000') on conflict do nothing;

-- Enable RLS
alter table profiles enable row level security;
alter table contributions enable row level security;
alter table loans enable row level security;
alter table payments enable row level security;
alter table announcements enable row level security;
alter table settings enable row level security;

-- Cleanup old policies to prevent errors
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Admins can insert profiles" on profiles;
drop policy if exists "Admins can update profiles" on profiles;

drop policy if exists "Announcements are viewable by everyone" on announcements;
drop policy if exists "Admins can insert announcements" on announcements;
drop policy if exists "Admins can update announcements" on announcements;
drop policy if exists "Admins can delete announcements" on announcements;

drop policy if exists "Enable read access for all users" on contributions;
drop policy if exists "Enable insert for all users" on contributions;
drop policy if exists "Enable update for all users" on contributions;

drop policy if exists "Enable read access for all users" on loans;
drop policy if exists "Enable insert for all users" on loans;
drop policy if exists "Enable update for all users" on loans;

drop policy if exists "Enable read access for all users" on payments;
drop policy if exists "Enable insert for all users" on payments;

drop policy if exists "Enable read access for all users" on settings;
drop policy if exists "Admins can update settings" on settings;
drop policy if exists "Admins can insert settings" on settings;

-- Create Policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Admins can insert profiles" on profiles for insert with check (true);
create policy "Admins can update profiles" on profiles for update using (true);

create policy "Announcements are viewable by everyone" on announcements for select using (true);

-- Enhanced Security: Check for Admin Role explicitly
create policy "Admins can insert announcements" on announcements for insert 
with check (
  auth.uid() in (select auth_id from profiles where role = 'admin')
);

create policy "Admins can update announcements" on announcements for update 
using (
  auth.uid() in (select auth_id from profiles where role = 'admin')
);

create policy "Admins can delete announcements" on announcements for delete 
using (
  auth.uid() in (select auth_id from profiles where role = 'admin')
);

create policy "Enable read access for all users" on settings for select using (true);
create policy "Admins can update settings" on settings for update using (true);
create policy "Admins can insert settings" on settings for insert with check (true);

-- Open Access Policies (For testing)
create policy "Enable read access for all users" on contributions for select using (true);
create policy "Enable insert for all users" on contributions for insert with check (true);
create policy "Enable update for all users" on contributions for update using (true);

create policy "Enable read access for all users" on loans for select using (true);
create policy "Enable insert for all users" on loans for insert with check (true);
create policy "Enable update for all users" on loans for update using (true);

create policy "Enable read access for all users" on payments for select using (true);
create policy "Enable insert for all users" on payments for insert with check (true);
`;

// Folder Structure
const STRUCTURE_MD = `/
├── .env.local                  # Store keys here (Add to .gitignore!)
├── .gitignore
├── middleware.ts               # Protects admin routes
├── types/
│   └── index.ts
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Client
│       └── server.ts           # Server Client
├── components/
│   ├── ui/
│   └── dashboard/
│       ├── Sidebar.tsx
│       └── LoanApprovalModal.tsx
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── auth/
│   │   └── login/
│   │   │   └── page.tsx
│   └── dashboard/
│       ├── layout.tsx          # Dashboard Shell
│       ├── page.tsx            # Overview
│       └── loans/
│           └── page.tsx        # Loan Table
└── utils/
    └── calculations.ts`;

// Integration Code
const INTEGRATION_CODE = `// 1. .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ygnxgcqnfwcecrtjqwnb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbnhnY3FuZndjZWNydGpxd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODAzOTIsImV4cCI6MjA4MjA1NjM5Mn0.ThbIV7hKzY8Za_at7WBclNbScTQT3fMT2RJR2JpQ64A

// 2. lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 3. services/loanService.ts (The Real Logic)
import { createClient } from '@/lib/supabase/client';

export const getLoans = async () => {
  const supabase = createClient();
  
  // Fetch loans with borrower details (Joined Query)
  const { data, error } = await supabase
    .from('loans')
    .select(\`
      *,
      borrower:profiles(*)
    \`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateLoanStatus = async (
  loanId: string, 
  status: 'active' | 'rejected', 
  interestRate?: number
) => {
  const supabase = createClient();
  
  const updates: any = { status, updated_at: new Date().toISOString() };
  
  if (status === 'active') {
    updates.start_date = new Date().toISOString();
  }
  
  // Critical Feature: Admin Override
  if (interestRate !== undefined) {
    updates.interest_rate = interestRate;
  }

  const { data, error } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', loanId)
    .select()
    .single();

  if (error) throw error;
  return data;
};`;

export const DeveloperGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'structure' | 'integration'>('schema');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'schema') content = SCHEMA_SQL;
    if (activeTab === 'structure') content = STRUCTURE_MD;
    if (activeTab === 'integration') content = INTEGRATION_CODE;
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCodeContent = () => {
    if (activeTab === 'schema') return SCHEMA_SQL;
    if (activeTab === 'structure') return STRUCTURE_MD;
    return INTEGRATION_CODE;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Developer Resources</h1>
        <p className="text-slate-500 mt-2">
          Use these artifacts to initialize your Supabase backend and configure your local Next.js environment.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4 overflow-x-auto">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'schema' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database size={16} />
              <span>SQL Schema</span>
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'structure' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderTree size={16} />
              <span>Folder Structure</span>
            </button>
            <button
              onClick={() => setActiveTab('integration')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'integration' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Terminal size={16} />
              <span>Integration Code</span>
            </button>
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0 ml-4"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <pre className="font-mono text-sm text-blue-100 leading-relaxed">
            {getCodeContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DeveloperGuide;
