-- ============================================================================
-- coop-manager (The 13th Page) - Database Schema Reference
-- ============================================================================
-- Generated directly from the live Supabase project (ygnxgcqnfwcecrtjqwnb) by
-- introspecting information_schema / pg_catalog. This file replaces a
-- previous version that had become corrupted (binary garbage, not valid SQL).
--
-- This is a REFERENCE document for onboarding and understanding the schema -
-- it is not meant to be run directly to recreate the database. Use the
-- Supabase CLI (`supabase db diff` / `supabase migration new`) for actual
-- migrations; the migrations already applied to this project are tracked in
-- Supabase's own migration history, not in this file.
--
-- All tables have Row Level Security (RLS) enabled.
-- ============================================================================


-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- One row per app user (both members and admins). Linked to Supabase Auth via
-- auth_id. `equity` is the member's running contribution balance.
create table public.profiles (
  id             uuid primary key default uuid_generate_v4(),
  auth_id        uuid,                              -- FK to auth.users(id)
  full_name      text,
  email          text,
  role           text default 'member',              -- 'member' | 'admin'
  is_coop_member boolean default true,
  equity         numeric default 0,
  avatar_url     text,
  updated_at     timestamptz,
  created_at     timestamptz not null default timezone('utc', now())
);

-- RLS: profiles
-- Anyone can view any profile (needed for member directory, name lookups, etc).
--   SELECT: true
--
-- A user may update their OWN row, but a BEFORE UPDATE trigger (see below)
-- blocks changes to role/equity/is_coop_member/auth_id unless they're an admin -
-- this is what stops a member from self-promoting or setting their own equity.
--   UPDATE "Users can update own profile": auth.uid() = auth_id
--
-- Admins may update ANY profile (used by the Member Directory admin edit screen).
--   UPDATE "Admins can update any profile": caller's profiles row has role='admin'


-- ============================================================================
-- TABLE: contributions
-- ============================================================================
create table public.contributions (
  id        uuid primary key default uuid_generate_v4(),
  member_id uuid not null,                          -- FK to profiles(id)
  amount    numeric not null,
  type      text default 'monthly_deposit',          -- 'monthly_deposit' | 'one_time'
  date      timestamptz not null default timezone('utc', now()),
  status    text default 'pending'                   -- 'pending' | 'approved' | 'rejected'
);

-- RLS: contributions
--   SELECT: true (everyone can view all contributions)
--   INSERT: admin (any status) OR the member themself (status must be 'pending')
--   UPDATE: admin only (approve/reject) - members cannot self-approve
--   DELETE: admin only
--
-- Trigger: on_contribution_approved (AFTER INSERT OR UPDATE)
--   -> handle_contribution_status_change(): when status becomes 'approved',
--      adds `amount` to the member's profiles.equity.


-- ============================================================================
-- TABLE: loans
-- ============================================================================
create table public.loans (
  id                  uuid primary key default uuid_generate_v4(),
  borrower_id         uuid not null,                 -- FK to profiles(id)
  principal           numeric not null,
  interest_rate       numeric not null default 10,    -- flat rate, % per the loan's duration
  duration_months     integer not null,
  start_date          timestamptz,
  status              text default 'pending',         -- 'pending' | 'active' | 'rejected' | 'paid'
  purpose             text,
  remaining_principal numeric not null,
  interest_accrued    numeric default 0,
  waived_penalty      numeric default 0,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz
);

-- RLS: loans
--   SELECT: true
--   INSERT: admin (any status) OR the borrower themself (status must be 'pending')
--   UPDATE: admin only (approve/reject/activate/mark paid/waive penalty)
--   DELETE: admin only


-- ============================================================================
-- TABLE: payments
-- ============================================================================
create table public.payments (
  id             uuid primary key default uuid_generate_v4(),
  loan_id        uuid not null,                      -- FK to loans(id)
  amount         numeric not null,
  interest_paid  numeric not null,
  principal_paid numeric not null,
  penalty_paid   numeric default 0,
  date           timestamptz not null default timezone('utc', now())
);

-- RLS: payments
--   SELECT: true
--   INSERT: admin only (recording a repayment received from a borrower)
--   No UPDATE/DELETE policy - payments are an immutable ledger once recorded.
--
-- Trigger: on_payment_inserted (AFTER INSERT)
--   -> handle_loan_payment(): reduces the related loan's remaining_principal
--      (and updates its status, e.g. to 'paid' once fully repaid).


-- ============================================================================
-- TABLE: withdrawals
-- ============================================================================
-- A member cashing out some or all of their equity. Added alongside the
-- Withdrawal feature; mirrors the contributions approval flow.
create table public.withdrawals (
  id                 uuid primary key default uuid_generate_v4(),
  member_id          uuid not null,                  -- FK to profiles(id)
  amount             numeric not null,
  is_full_withdrawal boolean not null default false,  -- true = ends coop membership on approval
  date               timestamptz not null default timezone('utc', now()),
  status             text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at         timestamptz not null default timezone('utc', now())
);

-- RLS: withdrawals
--   SELECT: true
--   INSERT: the member themself only, and only as 'pending' (no admin bypass -
--           a withdrawal always starts as a member-initiated request)
--   UPDATE: admin only (approve/reject)
--   DELETE: admin only
--
-- Trigger: on_withdrawal_status_change (AFTER UPDATE)
--   -> handle_withdrawal_status_change(): when status becomes 'approved',
--      deducts `amount` from the member's equity, and sets is_coop_member=false
--      if is_full_withdrawal or the resulting equity is ~0.


-- ============================================================================
-- TABLE: settings
-- ============================================================================
-- Simple key/value store. Currently used for `monthly_goal` (the coop's
-- monthly contribution target shown on the Treasury dashboard).
create table public.settings (
  key   text primary key,
  value text
);

-- RLS: settings
--   SELECT: true
--   ALL (insert/update/delete): admin only


-- ============================================================================
-- TABLE: announcements
-- ============================================================================
create table public.announcements (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  message         text not null,
  priority        text default 'normal',              -- 'urgent' | 'high' | 'normal' | 'low'
  is_active       boolean default true,
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  author_id       uuid,                                -- FK to profiles(id)
  created_at      timestamptz not null default timezone('utc', now())
);

-- RLS: announcements
--   SELECT: true
--   ALL (insert/update/delete): admin only


-- ============================================================================
-- TABLE: gallery_items
-- ============================================================================
create table public.gallery_items (
  id          uuid primary key default uuid_generate_v4(),
  image_url   text not null,
  caption     text,
  uploaded_by uuid,                                    -- FK to profiles(id)
  is_archived boolean default false,
  archived_at timestamptz,
  created_at  timestamptz not null default timezone('utc', now())
);

-- RLS: gallery_items
--   SELECT: true
--   ALL (insert/update/delete): admin only


-- ============================================================================
-- TABLE: personal_accounts / personal_ledger / saving_goals / category_budgets
-- ============================================================================
-- Per-member personal finance tracking, entirely separate from coop treasury
-- data. Each of these follows the same ownership pattern: a user may manage
-- only their own rows.
create table public.personal_accounts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null,                            -- FK to profiles(id)
  name       text not null,
  type       text not null,                             -- 'cash' | 'bank' | 'digital' | 'savings'
  balance    numeric default 0,
  color      text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.personal_ledger (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null,                           -- FK to profiles(id)
  account_id   uuid,                                     -- FK to personal_accounts(id)
  date         timestamptz not null default timezone('utc', now()),
  description  text not null,
  amount       numeric not null,
  type         text not null,                            -- 'income' | 'expense'
  category     text,
  is_recurring boolean default false,
  created_at   timestamptz not null default timezone('utc', now())
);

create table public.saving_goals (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null,                          -- FK to profiles(id)
  name           text not null,
  target_amount  numeric not null,
  current_amount numeric default 0,
  deadline       timestamptz,
  created_at     timestamptz not null default timezone('utc', now())
);

create table public.category_budgets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null,                            -- FK to profiles(id)
  category     text not null,
  limit_amount numeric not null default 0
);

-- RLS (all four tables above): ALL (select/insert/update/delete) restricted to
-- rows where auth.uid() matches the owning profile's auth_id. Fully private
-- per-user data - not even other members or admins can see it.


-- ============================================================================
-- VIEWS: *_readable
-- ============================================================================
-- Read-only convenience views that join in member/borrower names, so browsing
-- the Supabase Table Editor (or querying directly) shows a human name instead
-- of a raw profile UUID. Created with security_invoker=true, so they respect
-- the RLS policies of the underlying tables for whoever queries them - they
-- do not grant any additional access.
--
--   contributions_readable  (contributions + profiles.full_name/email)
--   loans_readable          (loans + profiles.full_name/email)
--   withdrawals_readable    (withdrawals + profiles.full_name/email)
--   payments_readable       (payments + loans.purpose + profiles.full_name/email)


-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================
-- All SECURITY DEFINER functions below have search_path pinned to `public`
-- (prevents search_path hijacking) and EXECUTE revoked from PUBLIC/anon/
-- authenticated (they should only ever run as triggers, never called directly
-- as a REST RPC endpoint).

-- handle_new_user()
--   Trigger on auth.users (AFTER INSERT), Supabase-managed schema.
--   Creates the matching public.profiles row when a new auth user signs up.

-- handle_contribution_status_change()
--   Trigger: on_contribution_approved, AFTER INSERT OR UPDATE ON contributions.
--   When a contribution's status is/becomes 'approved', credits the member's
--   profiles.equity by the contribution amount.

-- handle_loan_payment()
--   Trigger: on_payment_inserted, AFTER INSERT ON payments.
--   Reduces the related loan's remaining_principal and updates its status.

-- handle_withdrawal_status_change()
--   Trigger: on_withdrawal_status_change, AFTER UPDATE ON withdrawals.
--   When a withdrawal's status becomes 'approved', deducts the amount from
--   the member's equity; ends coop membership if it was a full withdrawal
--   (or equity lands at ~0).

-- prevent_self_privilege_escalation()
--   Trigger: on_profile_update_guard, BEFORE UPDATE ON profiles.
--   Blocks changes to role/equity/is_coop_member/auth_id on an UPDATE unless
--   the caller is an admin - the actual fix for the profile self-promotion
--   vulnerability found during the security audit.


-- ============================================================================
-- EDGE FUNCTIONS
-- ============================================================================
-- invite-user (supabase/functions/invite-user)
--   Invites a new user via Supabase Auth and creates their profiles row.
--   verify_jwt=true, PLUS an explicit in-function check that the caller's own
--   profile has role='admin' before doing anything - added during the
--   security audit, since verify_jwt alone only proves the caller is SOME
--   logged-in user, not specifically an admin.
