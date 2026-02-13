
import { supabase } from '../lib/supabaseClient';
import { 
  User, LoanWithBorrower, ContributionWithMember, 
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

  private async ensureProfileExists(authUser: any): Promise<User> {
    const { data } = await this.supabase!.from('profiles').select('*').eq('auth_id', authUser.id).single();
    if (data) return data as User;

    const newProfile = {
      auth_id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || 'Anonymous',
      role: 'member' as Role,
      is_coop_member: false,
      equity: 0
    };
    const { data: created, error: createError } = await this.supabase!.from('profiles').insert(newProfile).select().single();
    if (createError) throw createError;
    return created as User;
  }

  async restoreSession(): Promise<User | null> {
    if (this.isMock()) return MOCK_USERS[0];
    const { data: { session } } = await this.supabase!.auth.getSession();
    if (!session) return null;
    return this.ensureProfileExists(session.user);
  }

  async login(email: string, pass: string): Promise<User> {
    if (this.isMock()) {
      const user = MOCK_USERS.find(u => u.email === email);
      if (!user) throw new Error("User not found in mock data");
      return user;
    }
    const { data, error } = await this.supabase!.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return this.ensureProfileExists(data.user);
  }

  async signUp(email: string, pass: string, fullName: string): Promise<User> {
    if (this.isMock()) throw new Error("Signup not supported in mock mode");
    const { data, error } = await this.supabase!.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    if (!data.user) throw new Error("User registration failed");
    return this.ensureProfileExists(data.user);
  }

  async logout(): Promise<void> {
    if (this.isMock()) return;
    await this.supabase!.auth.signOut();
  }

  async getLoans(): Promise<LoanWithBorrower[]> {
    if (this.isMock()) {
      return MOCK_LOANS.map(l => ({
        ...l,
        borrower: MOCK_USERS.find(u => u.id === l.borrower_id)!
      }));
    }
    const { data, error } = await this.supabase!
      .from('loans')
      .select('*, borrower:profiles(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as LoanWithBorrower[];
  }

  async getTreasuryMetrics() {
    if (this.isMock()) {
      const totalContributions = MOCK_CONTRIBUTIONS.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
      const totalPayments = MOCK_PAYMENTS.reduce((s, p) => s + p.amount, 0);
      const totalDisbursed = MOCK_LOANS.filter(l => l.status === 'active' || l.status === 'paid').reduce((s, l) => s + l.principal, 0);
      const totalInterestCollected = MOCK_PAYMENTS.reduce((s, p) => s + p.interest_paid, 0);
      const totalPrincipalRepaid = MOCK_PAYMENTS.reduce((s, p) => s + p.principal_paid, 0);
      
      return {
        balance: totalContributions + totalPayments - totalDisbursed,
        totalContributions,
        totalPayments,
        totalDisbursed,
        totalInterestCollected,
        totalPrincipalRepaid
      };
    }
    
    try {
      const [loans, contributions, payments] = await Promise.all([
        this.getLoans(),
        this.getContributions(),
        this.getAllPayments()
      ]);

      const totalContributions = contributions.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
      const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
      const totalDisbursed = loans.filter(l => l.status === 'active' || l.status === 'paid').reduce((s, l) => s + l.principal, 0);
      const totalInterestCollected = payments.reduce((s, p) => s + p.interest_paid, 0);
      const totalPrincipalRepaid = payments.reduce((s, p) => s + p.principal_paid, 0);

      return {
        balance: totalContributions + totalPayments - totalDisbursed,
        totalContributions,
        totalPayments,
        totalDisbursed,
        totalInterestCollected,
        totalPrincipalRepaid
      };
    } catch (e) {
      return { balance: 0, totalContributions: 0, totalPayments: 0, totalDisbursed: 0, totalInterestCollected: 0, totalPrincipalRepaid: 0 };
    }
  }

  private async getAllPayments(): Promise<Payment[]> {
    if (this.isMock()) return MOCK_PAYMENTS;
    const { data, error } = await this.supabase!.from('payments').select('*');
    if (error) throw error;
    return data as Payment[];
  }

  async getActiveLoanVolume(): Promise<number> {
    if (this.isMock()) return MOCK_LOANS.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining_principal, 0);
    const { data, error } = await this.supabase!.from('loans').select('remaining_principal').eq('status', 'active');
    if (error) throw error;
    return (data || []).reduce((sum, l) => sum + l.remaining_principal, 0);
  }

  async getTotalInterestGained(): Promise<number> {
    if (this.isMock()) return MOCK_PAYMENTS.reduce((s, p) => s + p.interest_paid, 0);
    const { data, error } = await this.supabase!.from('payments').select('interest_paid');
    if (error) throw error;
    return (data || []).reduce((sum, p) => sum + p.interest_paid, 0);
  }

  async getUsers(): Promise<User[]> {
    if (this.isMock()) return MOCK_USERS;
    const { data, error } = await this.supabase!.from('profiles').select('*').order('full_name');
    if (error) throw error;
    return data as User[];
  }

  async getContributions(): Promise<ContributionWithMember[]> {
    if (this.isMock()) {
      return MOCK_CONTRIBUTIONS.map(c => ({
        ...c,
        member: MOCK_USERS.find(u => u.id === c.member_id)!
      }));
    }
    const { data, error } = await this.supabase!
      .from('contributions')
      .select('*, member:profiles(*)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data as ContributionWithMember[];
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    if (this.isMock()) return MOCK_ANNOUNCEMENTS.filter(a => a.is_active);
    const { data, error } = await this.supabase!
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
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
    if (this.isMock()) {
      MOCK_LOANS.push({
        id: `l${MOCK_LOANS.length + 1}`,
        borrower_id: data.borrower_id,
        principal: data.principal,
        interest_rate: 10,
        duration_months: data.duration_months,
        status: 'pending',
        purpose: data.purpose,
        remaining_principal: data.principal,
        interest_accrued: 0,
        created_at: new Date().toISOString()
      });
      return;
    }
    const { error } = await this.supabase!.from('loans').insert({
      ...data,
      remaining_principal: data.principal,
      interest_rate: 10,
      status: 'pending',
      interest_accrued: 0
    });
    if (error) throw error;
  }

  async updateLoanStatus(loanId: string, status: LoanStatus, customRate?: number): Promise<void> {
    if (this.isMock()) {
      const loan = MOCK_LOANS.find(l => l.id === loanId);
      if (loan) {
        loan.status = status;
        if (customRate !== undefined) loan.interest_rate = customRate;
        if (status === 'active') {
          loan.start_date = new Date().toISOString();
          // Calculate total term interest for the ledger
          const rate = customRate ?? loan.interest_rate;
          loan.interest_accrued = (loan.principal * (rate / 100)) * loan.duration_months;
        }
      }
      return;
    }

    const updates: any = { status };
    if (status === 'active') {
      // Fetch current loan to calculate interest accurately
      const { data: currentLoan } = await this.supabase!.from('loans').select('*').eq('id', loanId).single();
      if (currentLoan) {
        const rate = customRate ?? currentLoan.interest_rate;
        updates.interest_rate = rate;
        updates.interest_accrued = (currentLoan.principal * (rate / 100)) * currentLoan.duration_months;
        updates.start_date = new Date().toISOString();
      }
    } else if (customRate !== undefined) {
      updates.interest_rate = customRate;
    }
    
    const { error } = await this.supabase!.from('loans').update(updates).eq('id', loanId);
    if (error) throw error;
  }

  async addContribution(data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }): Promise<void> {
    if (this.isMock()) {
      MOCK_CONTRIBUTIONS.push({
        id: `c${MOCK_CONTRIBUTIONS.length + 1}`,
        ...data,
        date: new Date().toISOString().split('T')[0]
      });
      if (data.status === 'approved') {
        const user = MOCK_USERS.find(u => u.id === data.member_id);
        if (user) user.equity += data.amount;
      }
      return;
    }
    const { error } = await this.supabase!.from('contributions').insert({
      ...data,
      date: new Date().toISOString().split('T')[0]
    });
    if (error) throw error;
  }

  async updateContributionStatus(id: string, status: ContributionStatus): Promise<void> {
    if (this.isMock()) {
      const contrib = MOCK_CONTRIBUTIONS.find(c => c.id === id);
      if (contrib) {
        contrib.status = status;
        if (status === 'approved') {
          const user = MOCK_USERS.find(u => u.id === contrib.member_id);
          if (user) user.equity += contrib.amount;
        }
      }
      return;
    }
    const { error } = await this.supabase!.from('contributions').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async getLoanPayments(loanId: string): Promise<Payment[]> {
     if (this.isMock()) return MOCK_PAYMENTS.filter(p => p.loan_id === loanId);
     const { data, error } = await this.supabase!.from('payments').select('*').eq('loan_id', loanId).order('date', { ascending: false });
     if (error) throw error;
     return data as Payment[];
  }

  calculatePaymentSplit(totalAmount: number, currentPrincipal: number, monthlyRate: number) {
    const installmentInterestDue = (currentPrincipal * (monthlyRate / 100)) / 2;
    const interestPaid = Math.min(totalAmount, installmentInterestDue);
    const principalPaid = Math.max(0, totalAmount - interestPaid);

    return {
      interest_paid: parseFloat(interestPaid.toFixed(2)),
      principal_paid: parseFloat(principalPaid.toFixed(2))
    };
  }
  
  async addPayment(loanId: string, amount: number): Promise<void> {
     if (this.isMock()) {
        const loan = MOCK_LOANS.find(l => l.id === loanId);
        if (!loan) throw new Error("Loan not found");
        
        const split = this.calculatePaymentSplit(amount, loan.remaining_principal, loan.interest_rate);
        
        MOCK_PAYMENTS.push({ 
          id: `p${MOCK_PAYMENTS.length + 1}`, 
          loan_id: loanId, 
          amount, 
          interest_paid: split.interest_paid, 
          principal_paid: split.principal_paid, 
          date: new Date().toISOString() 
        });
        
        loan.remaining_principal -= split.principal_paid;
        loan.interest_accrued = Math.max(0, loan.interest_accrued - split.interest_paid);
        if (loan.remaining_principal <= 0.01) loan.status = 'paid';
        return;
     }

     const { data: loan, error: fetchError } = await this.supabase!.from('loans').select('*').eq('id', loanId).single();
     if (fetchError || !loan) throw new Error("Could not fetch loan details for payment processing.");

     const split = this.calculatePaymentSplit(amount, loan.remaining_principal, loan.interest_rate);

     const { error: payError } = await this.supabase!.from('payments').insert({ 
       loan_id: loanId, 
       amount: amount, 
       interest_paid: split.interest_paid, 
       principal_paid: split.principal_paid, 
       date: new Date().toISOString() 
     });
     
     if (payError) throw payError;

     // Reduce the interest_accrued balance in the main loan table
     await this.supabase!.from('loans').update({ 
       interest_accrued: Math.max(0, (loan.interest_accrued || 0) - split.interest_paid) 
     }).eq('id', loanId);

     if (loan.remaining_principal - split.principal_paid <= 0.01) {
        await this.supabase!.from('loans').update({ status: 'paid' }).eq('id', loanId);
     }
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

  async getUpcomingSchedules(): Promise<any[]> {
     const loans = await this.getLoans();
     const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'paid');
     const schedules: any[] = [];
     const now = new Date();
     
     for (const loan of activeLoans) {
        const payments = await this.getLoanPayments(loan.id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        // Semi-monthly calculation for projection
        const monthlyInterest = (loan.principal * (loan.interest_rate/100));
        const monthlyPrincipal = (loan.principal / loan.duration_months);
        const paydayAmount = (monthlyPrincipal + monthlyInterest) / 2;

        const loanStart = new Date(loan.start_date || loan.created_at);
        const startDay = loanStart.getDate();
        let firstMonthOffset = 1;
        let startOn10th = true;
        if (startDay <= 10) { startOn10th = true; } else if (startDay <= 25) { startOn10th = false; } else { startOn10th = true; firstMonthOffset = 2; }
        let currentYear = loanStart.getFullYear();
        let currentMonth = loanStart.getMonth() + firstMonthOffset;
        let is10th = startOn10th;
        const normalizeDate = () => { if (currentMonth > 11) { currentYear += Math.floor(currentMonth / 12); currentMonth %= 12; } };
        normalizeDate();
        const totalInstallmentsExpected = loan.duration_months * 2;
        let cumulativeRequired = 0;
        for (let i = 0; i < totalInstallmentsExpected; i++) {
           const targetDate = new Date(currentYear, currentMonth, is10th ? 10 : 25);
           cumulativeRequired += paydayAmount;
           let status: 'paid' | 'overdue' | 'upcoming' = 'upcoming';
           if (totalPaid >= (cumulativeRequired - 0.1)) { status = 'paid'; } else if (targetDate < now) { status = 'overdue'; }
           schedules.push({ loan_id: loan.id, date: targetDate.toISOString(), title: `Installment ${i + 1}/${totalInstallmentsExpected} - ${loan.purpose}`, amount: paydayAmount, borrower_id: loan.borrower_id, borrower_name: loan.borrower.full_name, status, is_payday: true });
           if (is10th) { is10th = false; } else { is10th = true; currentMonth++; normalizeDate(); }
        }
     }
     return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const dataService = new DataService();
