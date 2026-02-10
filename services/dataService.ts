
import { supabase } from '../lib/supabaseClient';
import { 
  User, Loan, LoanWithBorrower, Contribution, ContributionWithMember, 
  Payment, Announcement, AnnouncementPriority, GalleryItem, PersonalLedgerEntry,
  LoanStatus, ContributionStatus, Role, CategoryBudget, PersonalAccount, SavingGoal
} from '../types';
import { 
  MOCK_USERS, MOCK_LOANS, MOCK_CONTRIBUTIONS, MOCK_PAYMENTS, 
  MOCK_ANNOUNCEMENTS, MOCK_PERSONAL_LEDGER 
} from '../constants';

class DataService {
  private supabase = supabase;

  private isMock() {
    return !this.supabase;
  }

  private async ensureProfileExists(authSessionUser: any): Promise<User> {
    if (!this.supabase) throw new Error("Supabase not initialized");
    let { data: profile } = await this.supabase.from('profiles').select('*').eq('auth_id', authSessionUser.id).single();
    if (!profile && authSessionUser.email) {
      const { data: profileByEmail } = await this.supabase.from('profiles').select('*').eq('email', authSessionUser.email).single();
      if (profileByEmail) {
        const { data: updatedProfile } = await this.supabase.from('profiles').update({ auth_id: authSessionUser.id }).eq('id', profileByEmail.id).select().single();
        profile = updatedProfile;
      }
    }
    if (!profile) {
      const { data: newProfile, error: createError } = await this.supabase.from('profiles').insert({
        auth_id: authSessionUser.id,
        email: authSessionUser.email,
        full_name: authSessionUser.user_metadata?.full_name || authSessionUser.user_metadata?.name || 'New Member',
        role: 'member',
        is_coop_member: true,
        equity: 0
      }).select().single();
      if (createError) throw createError;
      profile = newProfile;
    }
    return profile as User;
  }

  async restoreSession(): Promise<User | null> {
    if (this.isMock()) return MOCK_USERS[0];
    const { data: { session } } = await this.supabase!.auth.getSession();
    if (!session) return null;
    try { return await this.ensureProfileExists(session.user); } catch (e) { return null; }
  }

  async login(email: string, pass: string): Promise<User> {
    if (this.isMock()) {
      const user = MOCK_USERS.find(u => u.email === email);
      if (user) return user;
      throw new Error("Invalid mock credentials");
    }
    const { data, error } = await this.supabase!.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (data.user) return await this.ensureProfileExists(data.user);
    throw new Error("Critical: Authentication succeeded but user object missing.");
  }

  async signUp(email: string, pass: string, fullName: string): Promise<User> {
     if (this.isMock()) throw new Error("Signup not supported in mock mode");
     const { data, error } = await this.supabase!.auth.signUp({ email, password: pass, options: { data: { full_name: fullName } } });
     if (error) throw error;
     if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error("This email is already registered.");
     throw new Error("Registration successful. If you have email confirmation enabled, please check your inbox.");
  }

  async logout(): Promise<void> {
    if (this.isMock()) return;
    await this.supabase!.auth.signOut();
  }

  async getLoans(): Promise<LoanWithBorrower[]> {
    if (this.isMock()) return MOCK_LOANS.map(l => ({ ...l, borrower: MOCK_USERS.find(u => u.id === l.borrower_id) || MOCK_USERS[0] }));
    const { data, error } = await this.supabase!.from('loans').select(`*, borrower:profiles(*)`).order('created_at', { ascending: false });
    if (error) throw error;
    return data as LoanWithBorrower[];
  }

  async getTreasuryMetrics() {
     if (this.isMock()) return { balance: 50000, totalContributions: 75000, totalPayments: 5000, totalDisbursed: 30000, totalInterestCollected: 2500, totalPrincipalRepaid: 2500 };
     const [contribRes, paymentRes, loanRes] = await Promise.all([
        this.supabase!.from('contributions').select('amount').eq('status', 'approved'),
        this.supabase!.from('payments').select('amount, interest_paid, principal_paid'),
        this.supabase!.from('loans').select('principal').in('status', ['active', 'paid'])
     ]);
     const totalContributions = (contribRes.data || []).reduce((sum, c) => sum + c.amount, 0);
     const totalPayments = (paymentRes.data || []).reduce((sum, p) => sum + p.amount, 0);
     const totalInterestCollected = (paymentRes.data || []).reduce((sum, p) => sum + p.interest_paid, 0);
     const totalPrincipalRepaid = (paymentRes.data || []).reduce((sum, p) => sum + p.principal_paid, 0);
     const totalDisbursed = (loanRes.data || []).reduce((sum, l) => sum + l.principal, 0);
     const balance = (totalContributions + totalPayments) - totalDisbursed;
     return { balance, totalContributions, totalPayments, totalDisbursed, totalInterestCollected, totalPrincipalRepaid };
  }
  
  async getActiveLoanVolume(): Promise<number> {
     if (this.isMock()) return 15000;
     const { data, error } = await this.supabase!.from('loans').select('remaining_principal').eq('status', 'active');
     return error ? 0 : data?.reduce((sum, l) => sum + l.remaining_principal, 0) || 0;
  }
  
  async getTotalInterestGained(): Promise<number> {
     if (this.isMock()) return 2500;
     const { data, error } = await this.supabase!.from('payments').select('interest_paid');
     return error ? 0 : data?.reduce((sum, p) => sum + p.interest_paid, 0) || 0;
  }
  
  async getUsers(): Promise<User[]> {
     if (this.isMock()) return MOCK_USERS;
     const { data, error } = await this.supabase!.from('profiles').select('*');
     if (error) throw error;
     return data as User[];
  }
  
  async getContributions(): Promise<ContributionWithMember[]> {
     if (this.isMock()) return MOCK_CONTRIBUTIONS.map(c => ({ ...c, member: MOCK_USERS.find(u => u.id === c.member_id)! }));
     const { data, error } = await this.supabase!.from('contributions').select(`*, member:profiles(*)`).order('date', { ascending: false });
     if (error) throw error;
     return data as ContributionWithMember[];
  }
  
  async getActiveAnnouncements(): Promise<Announcement[]> {
     if (this.isMock()) return MOCK_ANNOUNCEMENTS.filter(a => a.is_active);
     const { data, error } = await this.supabase!.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
     if (error) throw error;
     return data as Announcement[];
  }
  
  async getAnnouncements(): Promise<Announcement[]> {
     if (this.isMock()) return MOCK_ANNOUNCEMENTS;
     const { data, error } = await this.supabase!.from('announcements').select('*').order('created_at', { ascending: false });
     if (error) throw error;
     return data as Announcement[];
  }

  async createLoan(data: { borrower_id: string; principal: number; duration_months: number; purpose: string }): Promise<void> {
     if (this.isMock()) { MOCK_LOANS.push({ id: `l${MOCK_LOANS.length + 1}`, borrower_id: data.borrower_id, principal: data.principal, interest_rate: 10, duration_months: data.duration_months, status: 'pending', purpose: data.purpose, remaining_principal: data.principal, interest_accrued: 0, created_at: new Date().toISOString() }); return; }
     const { error } = await this.supabase!.from('loans').insert({ ...data, interest_rate: 10, status: 'pending', remaining_principal: data.principal, interest_accrued: 0 });
     if (error) throw error;
  }
  
  async updateLoanStatus(loanId: string, status: LoanStatus, customRate?: number): Promise<void> {
     if (this.isMock()) {
        const loan = MOCK_LOANS.find(l => l.id === loanId);
        if (loan) { loan.status = status; if (status === 'active') { loan.start_date = new Date().toISOString(); if (customRate !== undefined) loan.interest_rate = customRate; } }
        return;
     }
     const updates: any = { status };
     if (status === 'active') { updates.start_date = new Date().toISOString(); if (customRate !== undefined) updates.interest_rate = customRate; }
     const { error } = await this.supabase!.from('loans').update(updates).eq('id', loanId);
     if (error) throw error;
  }
  
  async addContribution(data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }): Promise<void> {
     if (this.isMock()) {
        MOCK_CONTRIBUTIONS.push({ id: `c${MOCK_CONTRIBUTIONS.length + 1}`, member_id: data.member_id, amount: data.amount, date: new Date().toISOString(), type: data.type, status: data.status });
        if (data.status === 'approved') { const user = MOCK_USERS.find(u => u.id === data.member_id); if (user) user.equity = (user.equity || 0) + data.amount; }
        return;
     }
     const { error } = await this.supabase!.from('contributions').insert({ ...data, date: new Date().toISOString() });
     if (error) throw error;
     if (data.status === 'approved') {
        const { data: profile } = await this.supabase!.from('profiles').select('equity').eq('id', data.member_id).single();
        if (profile) await this.supabase!.from('profiles').update({ equity: (profile.equity || 0) + data.amount }).eq('id', data.member_id);
     }
  }
  
  async updateContributionStatus(id: string, status: ContributionStatus): Promise<void> {
     if (this.isMock()) {
        const contrib = MOCK_CONTRIBUTIONS.find(c => c.id === id);
        if (contrib) { contrib.status = status; if (status === 'approved') { const user = MOCK_USERS.find(u => u.id === contrib.member_id); if (user) user.equity = (user.equity || 0) + contrib.amount; } }
        return;
     }
     const { error } = await this.supabase!.from('contributions').update({ status }).eq('id', id);
     if (error) throw error;
     if (status === 'approved') {
        const { data: contrib } = await this.supabase!.from('contributions').select('*').eq('id', id).single();
        if (contrib) {
           const { data: profile } = await this.supabase!.from('profiles').select('equity').eq('id', contrib.member_id).single();
           if (profile) await this.supabase!.from('profiles').update({ equity: (profile.equity || 0) + contrib.amount }).eq('id', contrib.member_id);
        }
     }
  }

  async getLoanPayments(loanId: string): Promise<Payment[]> {
     if (this.isMock()) return MOCK_PAYMENTS.filter(p => p.loan_id === loanId);
     const { data, error } = await this.supabase!.from('payments').select('*').eq('loan_id', loanId).order('date', { ascending: false });
     if (error) throw error;
     return data as Payment[];
  }
  
  async addPayment(loanId: string, amount: number): Promise<void> {
     if (this.isMock()) {
        const loan = MOCK_LOANS.find(l => l.id === loanId);
        if (!loan) throw new Error("Loan not found");
        const interestDue = loan.interest_accrued || 0;
        let interestPaid = Math.min(amount, interestDue);
        let principalPaid = Math.max(0, amount - interestPaid);
        MOCK_PAYMENTS.push({ id: `p${MOCK_PAYMENTS.length + 1}`, loan_id: loanId, amount, interest_paid: interestPaid, principal_paid: principalPaid, date: new Date().toISOString() });
        loan.interest_accrued -= interestPaid;
        loan.remaining_principal -= principalPaid;
        if (loan.remaining_principal <= 0) loan.status = 'paid';
        return;
     }
     const { data: loan } = await this.supabase!.from('loans').select('*').eq('id', loanId).single();
     if (!loan) throw new Error("Loan not found");
     const interestDue = loan.interest_accrued || 0;
     let interestPaid = amount <= interestDue ? amount : interestDue;
     let principalPaid = amount <= interestDue ? 0 : amount - interestDue;
     const { error: payError } = await this.supabase!.from('payments').insert({ loan_id: loanId, amount, interest_paid: interestPaid, principal_paid: principalPaid, date: new Date().toISOString() });
     if (payError) throw payError;
     await this.supabase!.from('loans').update({ interest_accrued: interestDue - interestPaid, remaining_principal: Math.max(0, loan.remaining_principal - principalPaid), status: (loan.remaining_principal - principalPaid) <= 0.1 ? 'paid' : 'active' }).eq('id', loanId);
  }
  
  async inviteMember(email: string, fullName: string, role: Role): Promise<void> {
     if (this.isMock()) return;
     const { data, error } = await this.supabase!.functions.invoke('invite-user', { body: { email, full_name: fullName, role } });
     if (error) throw error;
     if (data?.error) throw new Error(data.error);
  }

  async updateMember(id: string, data: any): Promise<void> {
     if (this.isMock()) { const user = MOCK_USERS.find(u => u.id === id); if (user) Object.assign(user, data); return; }
     const { error } = await this.supabase!.from('profiles').update(data).eq('id', id);
     if (error) throw error;
  }

  async createMember(data: any): Promise<void> {
    if (this.isMock()) { MOCK_USERS.push({ id: `u${MOCK_USERS.length + 1}`, ...data, equity: 0 }); return; }
    const { error } = await this.supabase!.from('profiles').insert(data);
    if (error) throw error;
  }

  async createAnnouncement(title: string, message: string, authorId: string, priority: AnnouncementPriority, start: string | null, end: string | null): Promise<void> {
    if (this.isMock()) { MOCK_ANNOUNCEMENTS.push({ id: `a${MOCK_ANNOUNCEMENTS.length + 1}`, title, message, author_id: authorId, priority, scheduled_start: start, scheduled_end: end, is_active: true, created_at: new Date().toISOString() }); return; }
    const { error } = await this.supabase!.from('announcements').insert({ title, message, author_id: authorId, priority, scheduled_start: start, scheduled_end: end });
    if (error) throw error;
  }

  async updateAnnouncement(id: string, updates: any): Promise<void> {
    if (this.isMock()) { const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id); if (index !== -1) MOCK_ANNOUNCEMENTS[index] = { ...MOCK_ANNOUNCEMENTS[index], ...updates }; return; }
    const { error } = await this.supabase!.from('announcements').update(updates).eq('id', id);
    if (error) throw error;
  }

  async updateAnnouncementStatus(id: string, is_active: boolean): Promise<void> {
    if (this.isMock()) { const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id); if (index !== -1) MOCK_ANNOUNCEMENTS[index].is_active = is_active; return; }
    const { error } = await this.supabase!.from('announcements').update({ is_active }).eq('id', id);
    if (error) throw error;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
     if (this.isMock()) return [];
     const { data, error } = await this.supabase!.from('gallery_items').select('*').order('created_at', { ascending: false });
     if (error) throw error;
     return data as GalleryItem[];
  }
  
  async uploadGalleryItem(file: File, caption: string, userId: string): Promise<void> {
     if (this.isMock()) return;
     const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
     const { error: uploadError } = await this.supabase!.storage.from('gallery').upload(fileName, file);
     if (uploadError) throw uploadError;
     const { data: { publicUrl } } = this.supabase!.storage.from('gallery').getPublicUrl(fileName);
     const { error: dbError } = await this.supabase!.from('gallery_items').insert({ image_url: publicUrl, caption, uploaded_by: userId });
     if (dbError) throw dbError;
  }

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('gallery_items').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleGalleryArchive(id: string, isArchived: boolean): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('gallery_items').update({ is_archived: isArchived, archived_at: isArchived ? new Date().toISOString() : null }).eq('id', id);
    if (error) throw error;
  }

  async getPersonalAccounts(userId: string): Promise<PersonalAccount[]> {
     if (this.isMock()) return [{ id: 'acc1', user_id: userId, name: 'Cash Wallet', type: 'cash', balance: 5000, color: 'bg-emerald-500' }, { id: 'acc2', user_id: userId, name: 'Main Bank', type: 'bank', balance: 45000, color: 'bg-blue-500' }];
     const { data, error } = await this.supabase!.from('personal_accounts').select('*').eq('user_id', userId);
     if (error) throw error;
     return data as PersonalAccount[];
  }

  async addPersonalAccount(account: Omit<PersonalAccount, 'id'>): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('personal_accounts').insert(account);
     if (error) throw error;
  }

  async getPersonalEntries(userId: string): Promise<PersonalLedgerEntry[]> {
    if (this.isMock()) return MOCK_PERSONAL_LEDGER.filter(e => e.user_id === userId);
    const { data, error } = await this.supabase!.from('personal_ledger').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (error) throw error;
    return data as PersonalLedgerEntry[];
  }

  async addPersonalEntry(entry: Omit<PersonalLedgerEntry, 'id' | 'created_at'>): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('personal_ledger').insert(entry);
    if (error) throw error;
    if (entry.account_id) {
       const { data: acc } = await this.supabase!.from('personal_accounts').select('balance').eq('id', entry.account_id).single();
       if (acc) await this.supabase!.from('personal_accounts').update({ balance: entry.type === 'income' ? acc.balance + entry.amount : acc.balance - entry.amount }).eq('id', entry.account_id);
    }
  }

  async updatePersonalEntry(id: string, updates: Partial<PersonalLedgerEntry>): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('personal_ledger').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deletePersonalEntry(id: string): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('personal_ledger').delete().eq('id', id);
    if (error) throw error;
  }

  async getBudgets(userId: string): Promise<CategoryBudget[]> {
     if (this.isMock()) return [];
     const { data, error } = await this.supabase!.from('category_budgets').select('*').eq('user_id', userId);
     if (error) throw error;
     return data as CategoryBudget[];
  }

  async updateBudget(userId: string, category: string, limit: number): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('category_budgets').upsert({ user_id: userId, category, limit_amount: limit }, { onConflict: 'user_id,category' });
     if (error) throw error;
  }

  async getSavingGoals(userId: string): Promise<SavingGoal[]> {
     if (this.isMock()) return [{ id: 'g1', user_id: userId, name: 'Emergency Fund', target_amount: 50000, current_amount: 15000 }, { id: 'g2', user_id: userId, name: 'New Laptop', target_amount: 80000, current_amount: 12000 }];
     const { data, error } = await this.supabase!.from('saving_goals').select('*').eq('user_id', userId);
     if (error) throw error;
     return data as SavingGoal[];
  }

  async addSavingGoal(goal: Omit<SavingGoal, 'id'>): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('saving_goals').insert(goal);
     if (error) throw error;
  }

  async updateSavingGoal(id: string, updates: Partial<SavingGoal>): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('saving_goals').update(updates).eq('id', id);
     if (error) throw error;
  }

  async getMonthlyGoal(): Promise<number> {
     if (this.isMock()) return 10000;
     const { data } = await this.supabase!.from('settings').select('value').eq('key', 'monthly_goal').single();
     return data ? Number(data.value) : 10000;
  }
  
  async updateMonthlyGoal(amount: number): Promise<void> {
     if (this.isMock()) return;
     await this.supabase!.from('settings').upsert({ key: 'monthly_goal', value: amount.toString() });
  }

  /**
   * REFACTORED: Intelligent & Sequenced Schedule Generation
   * Follows: 1-month deferred start, Semi-monthly (10th/25th) sequence.
   */
  async getUpcomingSchedules(): Promise<any[]> {
     const loans = await this.getLoans();
     const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'paid');
     const schedules: any[] = [];
     const now = new Date();
     
     for (const loan of activeLoans) {
        const payments = await this.getLoanPayments(loan.id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate monthly total: (Principal / Term) + (Principal * Monthly Interest)
        const monthlyTotal = (loan.principal / loan.duration_months) + (loan.principal * (loan.interest_rate/100));
        const paydayAmount = monthlyTotal / 2;
        const loanStart = new Date(loan.start_date || loan.created_at);
        
        // Determination of FIRST repayment date (exactly 1 month deferred alignment)
        // Rule: Jan 10 -> Feb 10. Jan 25 -> Feb 25.
        // If borrowed between 11-24, first is 25th of next month.
        // If borrowed on 25+, first is 10th of second month from now (skipped rest of current).
        
        const startDay = loanStart.getDate();
        let firstMonthOffset = 1;
        let startOn10th = true;

        if (startDay <= 10) {
           startOn10th = true;
        } else if (startDay <= 25) {
           startOn10th = false;
        } else {
           startOn10th = true;
           firstMonthOffset = 2; // Jump to 10th of next-next month
        }

        let currentYear = loanStart.getFullYear();
        let currentMonth = loanStart.getMonth() + firstMonthOffset;
        let is10th = startOn10th;

        // Normalizing month/year overflows
        const normalizeDate = () => {
           if (currentMonth > 11) {
              currentYear += Math.floor(currentMonth / 12);
              currentMonth %= 12;
           }
        };
        normalizeDate();

        const totalInstallmentsExpected = loan.duration_months * 2;
        let cumulativeRequired = 0;

        for (let i = 0; i < totalInstallmentsExpected; i++) {
           const targetDate = new Date(currentYear, currentMonth, is10th ? 10 : 25);
           cumulativeRequired += paydayAmount;

           let status: 'paid' | 'overdue' | 'upcoming' = 'upcoming';
           // Tolerance of 0.1 for float precision in summation
           if (totalPaid >= (cumulativeRequired - 0.1)) {
              status = 'paid';
           } else if (targetDate < now) {
              status = 'overdue';
           }

           schedules.push({
              loan_id: loan.id,
              date: targetDate.toISOString(),
              title: `Installment ${i + 1}/${totalInstallmentsExpected} - ${loan.purpose}`,
              amount: paydayAmount,
              borrower_id: loan.borrower_id,
              borrower_name: loan.borrower.full_name,
              status,
              is_payday: true
           });

           // Move to next anchor in the semi-monthly sequence
           if (is10th) {
              is10th = false; // Move to 25th of same month
           } else {
              is10th = true; // Move to 10th of next month
              currentMonth++;
              normalizeDate();
           }
        }
     }
     return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const dataService = new DataService();
