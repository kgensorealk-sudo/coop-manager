
import { User, Loan, Contribution, Payment, Announcement, PersonalLedgerEntry } from './types';

// Default Interest Rate as per requirements
export const DEFAULT_INTEREST_RATE = 10;

// Mock Data to simulate Supabase
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    full_name: 'Admin Sarah',
    email: 'admin@coop.com',
    role: 'admin',
    is_coop_member: true,
    equity: 15000, // Increased to provide initial liquidity
    avatar_url: 'https://picsum.photos/id/1/200/200'
  },
  {
    id: 'u2',
    full_name: 'John Doe',
    email: 'john@coop.com',
    role: 'member',
    is_coop_member: true,
    equity: 2500,
    avatar_url: 'https://picsum.photos/id/2/200/200'
  },
  {
    id: 'u3',
    full_name: 'Jane Smith',
    email: 'jane@coop.com',
    role: 'member',
    is_coop_member: true,
    equity: 2500,
    avatar_url: 'https://picsum.photos/id/3/200/200'
  },
  {
    id: 'u4',
    full_name: 'Robert External',
    email: 'robert@external.com',
    role: 'member',
    is_coop_member: false, // Non-member borrower
    equity: 0,
    avatar_url: 'https://picsum.photos/id/4/200/200'
  }
];

export const MOCK_LOANS: Loan[] = [
  {
    id: 'l1',
    borrower_id: 'u2',
    principal: 5000,
    interest_rate: 10,
    duration_months: 6,
    status: 'active',
    start_date: '2023-10-01',
    purpose: 'Home Renovation',
    remaining_principal: 3000,
    interest_accrued: 0,
    created_at: '2023-09-28T10:00:00Z'
  },
  {
    id: 'l2',
    borrower_id: 'u3',
    principal: 10000,
    interest_rate: 10,
    duration_months: 12,
    status: 'pending',
    purpose: 'Business Capital',
    remaining_principal: 10000,
    interest_accrued: 0,
    created_at: '2023-10-15T14:30:00Z'
  },
  {
    id: 'l3',
    borrower_id: 'u4', // Non-member
    principal: 2000,
    interest_rate: 15, // Higher rate example
    duration_months: 3,
    status: 'pending',
    purpose: 'Emergency Fund',
    remaining_principal: 2000,
    interest_accrued: 0,
    created_at: '2023-10-25T09:00:00Z'
  }
];

export const MOCK_CONTRIBUTIONS: Contribution[] = [
  // Initial Capital Injection by Admin
  { id: 'c1', member_id: 'u1', amount: 15000, date: '2023-01-01', type: 'one_time', status: 'approved' },
  // Member Contributions
  { id: 'c2', member_id: 'u2', amount: 2500, date: '2023-02-15', type: 'monthly_deposit', status: 'approved' },
  { id: 'c3', member_id: 'u3', amount: 2500, date: '2023-03-01', type: 'monthly_deposit', status: 'approved' },
  // A pending contribution
  { id: 'c4', member_id: 'u2', amount: 500, date: '2023-10-25', type: 'monthly_deposit', status: 'pending' },
];

export const MOCK_PAYMENTS: Payment[] = [
  { 
    id: 'p1', 
    loan_id: 'l1', 
    amount: 1000, 
    date: '2023-11-01', 
    interest_paid: 500, // 10% of 5000
    principal_paid: 500 
  },
  { 
    id: 'p2', 
    loan_id: 'l1', 
    amount: 1500, 
    date: '2023-12-01', 
    interest_paid: 500, // Flat rate based on original principal (5000 * 10%)
    principal_paid: 1000 
  }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Welcome to The 13th Page',
    message: 'We have updated our interest rate policies for the upcoming quarter. Please review the new terms in your dashboard.',
    created_at: '2023-10-20T10:00:00Z',
    is_active: true,
    author_id: 'u1',
    priority: 'high'
  },
  {
    id: 'a2',
    title: 'System Maintenance',
    message: 'The system will be offline for 30 minutes tonight for scheduled upgrades.',
    created_at: '2023-11-05T14:00:00Z',
    is_active: true,
    author_id: 'u1',
    priority: 'urgent'
  }
];

export const MOCK_PERSONAL_LEDGER: PersonalLedgerEntry[] = [
  {
    id: 'pe1',
    user_id: 'u1',
    date: '2023-10-01',
    description: 'Salary',
    amount: 50000,
    type: 'income',
    category: 'Employment',
    created_at: '2023-10-01T09:00:00Z'
  },
  {
    id: 'pe2',
    user_id: 'u1',
    date: '2023-10-05',
    description: 'Groceries',
    amount: 4500,
    type: 'expense',
    category: 'Food',
    created_at: '2023-10-05T14:30:00Z'
  },
  {
    id: 'pe3',
    user_id: 'u2',
    date: '2023-10-01',
    description: 'Freelance Project',
    amount: 15000,
    type: 'income',
    category: 'Side Hustle',
    created_at: '2023-10-01T10:00:00Z'
  }
];
