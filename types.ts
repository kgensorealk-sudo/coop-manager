
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
}

export interface Contribution {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  type: 'monthly_deposit' | 'one_time';
  status: ContributionStatus;
}

export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  date: string;
  interest_paid: number;
  principal_paid: number;
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

// Helper type for joining loan with borrower data
export interface LoanWithBorrower extends Loan {
  borrower: User;
}

// Helper type for joining contribution with member data
export interface ContributionWithMember extends Contribution {
  member: User;
}
