import React, { useState } from 'react';
import { FolderTree, Copy, Check, Database, Image } from 'lucide-react';

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
  type text check (type in ('monthly_deposit' | 'one_time')) default 'monthly_deposit',
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

-- 6. GALLERY ITEMS
create table if not exists gallery_items (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  caption text,
  uploaded_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_archived boolean default false,
  archived_at timestamp with time zone
);

-- 7. SETTINGS
create table if not exists settings (
  key text primary key,
  value text
);

-- Default Goal
insert into settings (key, value) values ('monthly_goal', '10000') on conflict do nothing;

-- 8. STORAGE BUCKET
-- Ensure the gallery bucket exists
insert into storage.buckets (id, name, public) 
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- =========================================================
-- MIGRATIONS (FIX FOR EXISTING DATABASES)
-- Run this block if you are getting "column not found" errors
-- =========================================================

alter table gallery_items add column if not exists is_archived boolean default false;
alter table gallery_items add column if not exists archived_at timestamp with time zone;

-- Enable RLS on Tables
alter table profiles enable row level security;
alter table contributions enable row level security;
alter table loans enable row level security;
alter table payments enable row level security;
alter table announcements enable row level security;
alter table gallery_items enable row level security;
alter table settings enable row level security;

-- Drop old policies to prevent conflicts
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Admins can insert profiles" on profiles;
drop policy if exists "Admins can update profiles" on profiles;
drop policy if exists "Admins can delete profiles" on profiles;

drop policy if exists "Announcements are viewable by everyone" on announcements;
drop policy if exists "Admins can insert announcements" on announcements;
drop policy if exists "Admins can update announcements" on announcements;
drop policy if exists "Admins can delete announcements" on announcements;

drop policy if exists "Gallery is viewable by everyone" on gallery_items;
drop policy if exists "Admins can insert gallery items" on gallery_items;
drop policy if exists "Admins can update gallery items" on gallery_items;
drop policy if exists "Admins can delete gallery items" on gallery_items;

drop policy if exists "Enable read access for all users" on settings;
drop policy if exists "Admins can update settings" on settings;
drop policy if exists "Admins can insert settings" on settings;

drop policy if exists "Enable read access for all users" on contributions;
drop policy if exists "Enable insert for all users" on contributions;
drop policy if exists "Enable update for all users" on contributions;
drop policy if exists "Admins can delete contributions" on contributions;

drop policy if exists "Enable read access for all users" on loans;
drop policy if exists "Enable insert for all users" on loans;
drop policy if exists "Enable update for all users" on loans;
drop policy if exists "Admins can delete loans" on loans;

drop policy if exists "Enable read access for all users" on payments;
drop policy if exists "Enable insert for all users" on payments;
drop policy if exists "Admins can delete payments" on payments;

-- Storage Policies cleanup
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;
drop policy if exists "Admin Delete Assets" on storage.objects;

-- =========================================================
-- CREATE POLICIES (Run this section to fix permissions)
-- =========================================================

-- 1. PROFILES
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Admins can insert profiles" on profiles for insert with check (true);
create policy "Admins can update profiles" on profiles for update using (true);

-- 2. ANNOUNCEMENTS
create policy "Announcements are viewable by everyone" on announcements for select using (true);
create policy "Admins can insert announcements" on announcements for insert with check (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));
create policy "Admins can update announcements" on announcements for update using (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));

-- 3. GALLERY ITEMS
create policy "Gallery is viewable by everyone" on gallery_items for select using (true);
create policy "Admins can insert gallery items" on gallery_items for insert with check (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));
create policy "Admins can update gallery items" on gallery_items for update using (exists (select 1 from profiles where auth_id = auth.uid() and role = 'admin'));

-- 4. SETTINGS
create policy "Enable read access for all users" on settings for select using (true);
create policy "Admins can update settings" on settings for update using (true);
create policy "Admins can insert settings" on settings for insert with check (true);

-- 5. FINANCIAL TABLES (Loans, Contributions, Payments)
-- Read/Write for everyone (simplified for demo), NO DELETE ALLOWED
create policy "Enable read access for all users" on contributions for select using (true);
create policy "Enable insert for all users" on contributions for insert with check (true);
create policy "Enable update for all users" on contributions for update using (true);

create policy "Enable read access for all users" on loans for select using (true);
create policy "Enable insert for all users" on loans for insert with check (true);
create policy "Enable update for all users" on loans for update using (true);

create policy "Enable read access for all users" on payments for select using (true);
create policy "Enable insert for all users" on payments for insert with check (true);

-- 6. STORAGE POLICIES
create policy "Public Access" on storage.objects for select using ( bucket_id = 'gallery' );
create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'gallery' and auth.role() = 'authenticated' );
`;

const STORAGE_INSTRUCTIONS = `
-- OPTIONAL: If the schema above fails to create the bucket (due to permissions), use the Dashboard:

1. Go to Supabase Dashboard -> Storage
2. Create a new bucket named 'gallery'
3. Toggle "Public bucket" to ON.
4. Save.

The policies in the SQL Schema section will handle the permissions.
`;

// Folder Structure
const STRUCTURE_MD = `/
├── .env                        # Store keys here
├── .gitignore
├── index.html                  # Entry Point
├── types.ts                    # Shared Interfaces
├── lib/
│   └── supabaseClient.ts       # Database Connection
├── services/
│   └── dataService.ts          # Business Logic
├── components/
│   ├── ui/
│   ├── Sidebar.tsx
│   ├── GalleryView.tsx         # New!
│   ├── UploadPhotoModal.tsx    # New!
│   └── ...
└── App.tsx                     # Main Router Logic`;

export const DeveloperGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'storage' | 'structure'>('schema');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'schema') content = SCHEMA_SQL;
    if (activeTab === 'storage') content = STORAGE_INSTRUCTIONS;
    if (activeTab === 'structure') content = STRUCTURE_MD;
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCodeContent = () => {
    if (activeTab === 'schema') return SCHEMA_SQL;
    if (activeTab === 'storage') return STORAGE_INSTRUCTIONS;
    if (activeTab === 'structure') return STRUCTURE_MD;
    return SCHEMA_SQL;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Developer Resources</h1>
        <p className="text-slate-500 mt-2">
          Use these artifacts to initialize your Supabase backend and configure your environment.
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
              onClick={() => setActiveTab('storage')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'storage' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Image size={16} />
              <span>Manual Storage</span>
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
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0 ml-4"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
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
