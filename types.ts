
export type Role = 'admin' | 'member';

export type LoanStatus = 'pending' | 'active' | 'rejected' | 'paid';

export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export type AnnouncementPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_coop_member: boolean;
  equity: number; // Total contributions
  avatar_url?: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  principal: number;
  interest_rate: number; // Monthly rate in percentage
  duration_months: number;
  start_date?: string;
  status: LoanStatus;
  purpose: string;
  remaining_principal: number;
  interest_accrued: number; // Accumulated unpaid interest
  waived_penalty?: number;
  created_at: string;
  updated_at?: string;
}

export interface Contribution {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  type: 'monthly_deposit' | 'one_time';
  status: ContributionStatus;
}

// A member cashing out some or all of their equity. Reuses ContributionStatus
// (pending/approved/rejected) since withdrawals go through the same admin review flow.
export interface Withdrawal {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  status: ContributionStatus;
  is_full_withdrawal: boolean; // true if this request would zero out the member's equity
  created_at: string;
}

export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  date: string;
  interest_paid: number;
  principal_paid: number;
  penalty_paid: number;
}

// A member's claim that they've made a repayment on their loan (e.g. via bank
// transfer or GCash), pending admin review. Approving one calls the same
// addPayment logic the admin's manual "Post Repayment" form uses - it doesn't
// skip the interest/principal/penalty allocation, it just pre-fills it.
export interface PaymentRequest {
  id: string;
  loan_id: string;
  member_id: string;
  amount: number;
  note?: string | null;
  status: ContributionStatus;
  date: string;
  created_at: string;
  reviewed_at?: string | null;
}

export interface PaymentRequestWithDetails extends PaymentRequest {
  loan: Loan;
  member: User;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  author_id: string;
  priority: AnnouncementPriority;
  scheduled_start?: string | null; // ISO Date string
  scheduled_end?: string | null;   // ISO Date string
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
  uploaded_by: string;
  created_at: string;
  is_archived?: boolean;
  archived_at?: string | null;
}

export interface PersonalAccount {
  id: string;
  user_id: string;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'savings';
  balance: number;
  color?: string;
}

export interface SavingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
}

export interface PersonalLedgerEntry {
  id: string;
  user_id: string;
  account_id?: string; // Linked Vault
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  is_recurring?: boolean;
  created_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
}

// Helper type for joining loan with borrower data
export interface LoanWithBorrower extends Loan {
  borrower: User;
}

// Helper type for joining contribution with member data
export interface ContributionWithMember extends Contribution {
  member: User;
}

// Helper type for joining withdrawal with member data
export interface WithdrawalWithMember extends Withdrawal {
  member: User;
}