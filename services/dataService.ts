
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

  // AUTH
  async restoreSession(): Promise<User | null> {
    if (this.isMock()) return MOCK_USERS[0];
    
    const { data: { session } } = await this.supabase!.auth.getSession();
    if (!session) return null;
    
    const { data: profile } = await this.supabase!
      .from('profiles')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();
      
    return profile as User;
  }

  async login(email: string, pass: string): Promise<User> {
    if (this.isMock()) {
      const user = MOCK_USERS.find(u => u.email === email);
      if (user) return user;
      throw new Error("Invalid mock credentials");
    }

    const { data, error } = await this.supabase!.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    
    if (data.user) {
       const { data: profile } = await this.supabase!
        .from('profiles')
        .select('*')
        .eq('auth_id', data.user.id)
        .single();
       if (profile) return profile as User;
    }
    throw new Error("User profile not found");
  }

  async signUp(email: string, pass: string, fullName: string): Promise<User> {
     if (this.isMock()) throw new Error("Signup not supported in mock mode");
     
     const { data, error } = await this.supabase!.auth.signUp({
        email, 
        password: pass,
        options: { data: { full_name: fullName } }
     });
     if (error) throw error;
     
     if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("This email is already registered.");
     }
     
     throw new Error("Registration successful. Please check your email to confirm.");
  }

  async logout(): Promise<void> {
    if (this.isMock()) return;
    await this.supabase!.auth.signOut();
  }

  // DATA FETCHING (COOP)
  async getLoans(): Promise<LoanWithBorrower[]> {
    if (this.isMock()) {
       return MOCK_LOANS.map(l => {
          const borrower = MOCK_USERS.find(u => u.id === l.borrower_id) || MOCK_USERS[0];
          return { ...l, borrower };
       });
    }
    
    const { data, error } = await this.supabase!
      .from('loans')
      .select(`*, borrower:profiles(*)`)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as LoanWithBorrower[];
  }

  async getTreasuryMetrics() {
     if (this.isMock()) {
        return { 
           balance: 50000, 
           totalContributions: 75000, 
           totalPayments: 5000, 
           totalDisbursed: 30000,
           totalInterestCollected: 2500,
           totalPrincipalRepaid: 2500
        };
     }
     
     const { data: contribs } = await this.supabase!.from('contributions').select('amount').eq('status', 'approved');
     const { data: payments } = await this.supabase!.from('payments').select('amount, interest_paid, principal_paid');
     const { data: loans } = await this.supabase!.from('loans').select('principal').in('status', ['active', 'paid']);
     
     const totalContributions = contribs?.reduce((sum, c) => sum + c.amount, 0) || 0;
     const totalPayments = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
     const totalInterestCollected = payments?.reduce((sum, p) => sum + p.interest_paid, 0) || 0;
     const totalPrincipalRepaid = payments?.reduce((sum, p) => sum + p.principal_paid, 0) || 0;
     const totalDisbursed = loans?.reduce((sum, l) => sum + l.principal, 0) || 0;
     
     const balance = (totalContributions + totalPayments) - totalDisbursed;
     
     return {
        balance,
        totalContributions,
        totalPayments,
        totalDisbursed,
        totalInterestCollected,
        totalPrincipalRepaid
     };
  }
  
  async getActiveLoanVolume(): Promise<number> {
     if (this.isMock()) return 15000;
     const { data } = await this.supabase!.from('loans').select('remaining_principal').eq('status', 'active');
     return data?.reduce((sum, l) => sum + l.remaining_principal, 0) || 0;
  }
  
  async getTotalInterestGained(): Promise<number> {
     if (this.isMock()) return 2500;
     const { data } = await this.supabase!.from('payments').select('interest_paid');
     return data?.reduce((sum, p) => sum + p.interest_paid, 0) || 0;
  }
  
  async getUsers(): Promise<User[]> {
     if (this.isMock()) return MOCK_USERS;
     const { data, error } = await this.supabase!.from('profiles').select('*');
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
      .select(`*, member:profiles(*)`)
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
     const { data, error } = await this.supabase!
       .from('announcements')
       .select('*')
       .order('created_at', { ascending: false });
     if (error) throw error;
     return data as Announcement[];
  }

  // MUTATIONS (COOP)
  async createLoan(data: { borrower_id: string; principal: number; duration_months: number; purpose: string }): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('loans').insert({
        ...data,
        interest_rate: 10,
        status: 'pending',
        remaining_principal: data.principal,
        interest_accrued: 0
     });
     if (error) throw error;
  }
  
  async updateLoanStatus(loanId: string, status: LoanStatus, customRate?: number): Promise<void> {
     if (this.isMock()) return;
     const updates: any = { status };
     if (status === 'active') {
        updates.start_date = new Date().toISOString();
        if (customRate !== undefined) updates.interest_rate = customRate;
     }
     const { error = null } = await this.supabase!.from('loans').update(updates).eq('id', loanId);
     if (error) throw error;
  }
  
  async addContribution(data: { member_id: string; amount: number; type: string; status: ContributionStatus }): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('contributions').insert({
        ...data,
        date: new Date().toISOString()
     });
     if (error) throw error;
  }
  
  async updateContributionStatus(id: string, status: ContributionStatus): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('contributions').update({ status }).eq('id', id);
     if (error) throw error;
  }

  async getLoanPayments(loanId: string): Promise<Payment[]> {
     if (this.isMock()) return MOCK_PAYMENTS.filter(p => p.loan_id === loanId);
     const { data, error } = await this.supabase!.from('payments').select('*').eq('loan_id', loanId).order('date', { ascending: false });
     if (error) throw error;
     return data as Payment[];
  }
  
  async addPayment(loanId: string, amount: number): Promise<void> {
     if (this.isMock()) return;
     
     const { data: loan } = await this.supabase!.from('loans').select('*').eq('id', loanId).single();
     if (!loan) throw new Error("Loan not found");
     
     const interestDue = loan.interest_accrued || 0;
     let interestPaid = 0;
     let principalPaid = 0;
     
     if (amount <= interestDue) {
        interestPaid = amount;
     } else {
        interestPaid = interestDue;
        principalPaid = amount - interestDue;
     }
     
     const { error: payError } = await this.supabase!.from('payments').insert({
        loan_id: loanId,
        amount,
        interest_paid: interestPaid,
        principal_paid: principalPaid,
        date: new Date().toISOString()
     });
     if (payError) throw payError;
     
     const newInterestAccrued = interestDue - interestPaid;
     const newRemaining = loan.remaining_principal - principalPaid;
     const newStatus = newRemaining <= 0.1 ? 'paid' : 'active';
     
     await this.supabase!.from('loans').update({
        interest_accrued: newInterestAccrued,
        remaining_principal: Math.max(0, newRemaining),
        status: newStatus
     }).eq('id', loanId);
  }
  
  async inviteMember(email: string, fullName: string, role: Role): Promise<void> {
     if (this.isMock()) return;
     const { data, error } = await this.supabase!.functions.invoke('invite-user', {
        body: { email, full_name: fullName, role }
     });
     if (error) throw error;
     if (data?.error) throw new Error(data.error);
  }

  async updateMember(id: string, data: any): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('profiles').update(data).eq('id', id);
     if (error) throw error;
  }

  async createMember(data: any): Promise<void> {
    if (this.isMock()) {
       MOCK_USERS.push({
          id: `u${MOCK_USERS.length + 1}`,
          ...data,
          equity: 0
       });
       return;
    }
    const { error } = await this.supabase!.from('profiles').insert(data);
    if (error) throw error;
  }

  async createAnnouncement(title: string, message: string, authorId: string, priority: AnnouncementPriority, start: string | null, end: string | null): Promise<void> {
    if (this.isMock()) {
       MOCK_ANNOUNCEMENTS.push({
          id: `a${MOCK_ANNOUNCEMENTS.length + 1}`,
          title, message, author_id: authorId, priority,
          scheduled_start: start, scheduled_end: end,
          is_active: true, created_at: new Date().toISOString()
       });
       return;
    }
    const { error } = await this.supabase!.from('announcements').insert({
       title, message, author_id: authorId, priority,
       scheduled_start: start, scheduled_end: end
    });
    if (error) throw error;
  }

  async updateAnnouncement(id: string, updates: any): Promise<void> {
    if (this.isMock()) {
       const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
       if (index !== -1) MOCK_ANNOUNCEMENTS[index] = { ...MOCK_ANNOUNCEMENTS[index], ...updates };
       return;
    }
    const { error } = await this.supabase!.from('announcements').update(updates).eq('id', id);
    if (error) throw error;
  }

  async updateAnnouncementStatus(id: string, is_active: boolean): Promise<void> {
    if (this.isMock()) {
       const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
       if (index !== -1) MOCK_ANNOUNCEMENTS[index].is_active = is_active;
       return;
    }
    const { error } = await this.supabase!.from('announcements').update({ is_active }).eq('id', id);
    if (error) throw error;
  }

  // GALLERY
  async getGalleryItems(): Promise<GalleryItem[]> {
     if (this.isMock()) return [];
     const { data, error } = await this.supabase!
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });
     if (error) throw error;
     return data as GalleryItem[];
  }
  
  async uploadGalleryItem(file: File, caption: string, userId: string): Promise<void> {
     if (this.isMock()) return;
     const fileExt = file.name.split('.').pop();
     const fileName = `${Math.random()}.${fileExt}`;
     const { error: uploadError } = await this.supabase!.storage.from('gallery').upload(fileName, file);
     if (uploadError) throw uploadError;
     const { data: { publicUrl } } = this.supabase!.storage.from('gallery').getPublicUrl(fileName);
     const { error: dbError } = await this.supabase!.from('gallery_items').insert({
        image_url: publicUrl, caption, uploaded_by: userId
     });
     if (dbError) throw dbError;
  }

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('gallery_items').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleGalleryArchive(id: string, isArchived: boolean): Promise<void> {
    if (this.isMock()) return;
    const { error = null } = await this.supabase!.from('gallery_items').update({
       is_archived: isArchived, archived_at: isArchived ? new Date().toISOString() : null
    }).eq('id', id);
    if (error) throw error;
  }

  // PERSONAL ACCOUNTS (VAULTS)
  async getPersonalAccounts(userId: string): Promise<PersonalAccount[]> {
     if (this.isMock()) return [
        { id: 'acc1', user_id: userId, name: 'Cash Wallet', type: 'cash', balance: 5000, color: 'bg-emerald-500' },
        { id: 'acc2', user_id: userId, name: 'Main Bank', type: 'bank', balance: 45000, color: 'bg-blue-500' }
     ];
     const { data, error } = await this.supabase!.from('personal_accounts').select('*').eq('user_id', userId);
     if (error) throw error;
     return data as PersonalAccount[];
  }

  async addPersonalAccount(account: Omit<PersonalAccount, 'id'>): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('personal_accounts').insert(account);
     if (error) throw error;
  }

  // PERSONAL LEDGER
  async getPersonalEntries(userId: string): Promise<PersonalLedgerEntry[]> {
    if (this.isMock()) return MOCK_PERSONAL_LEDGER.filter(e => e.user_id === userId);
    const { data, error } = await this.supabase!
      .from('personal_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as PersonalLedgerEntry[];
  }

  async addPersonalEntry(entry: Omit<PersonalLedgerEntry, 'id' | 'created_at'>): Promise<void> {
    if (this.isMock()) return;
    
    const { error } = await this.supabase!.from('personal_ledger').insert(entry);
    if (error) throw error;

    // Update account balance
    if (entry.account_id) {
       const { data: acc } = await this.supabase!.from('personal_accounts').select('balance').eq('id', entry.account_id).single();
       if (acc) {
          const newBalance = entry.type === 'income' ? acc.balance + entry.amount : acc.balance - entry.amount;
          await this.supabase!.from('personal_accounts').update({ balance: newBalance }).eq('id', entry.account_id);
       }
    }
  }

  async updatePersonalEntry(id: string, updates: Partial<PersonalLedgerEntry>): Promise<void> {
    if (this.isMock()) return;
    const { error } = await this.supabase!.from('personal_ledger').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deletePersonalEntry(id: string): Promise<void> {
    if (this.isMock()) return;
    const { error = null } = await this.supabase!.from('personal_ledger').delete().eq('id', id);
    if (error) throw error;
  }

  // BUDGETS
  async getBudgets(userId: string): Promise<CategoryBudget[]> {
     if (this.isMock()) return [];
     const { data, error } = await this.supabase!.from('category_budgets').select('*').eq('user_id', userId);
     if (error) throw error;
     return data as CategoryBudget[];
  }

  async updateBudget(userId: string, category: string, limit: number): Promise<void> {
     if (this.isMock()) return;
     const { error } = await this.supabase!.from('category_budgets').upsert({
        user_id: userId, category, limit_amount: limit
     }, { onConflict: 'user_id,category' });
     if (error) throw error;
  }

  // SAVING GOALS
  async getSavingGoals(userId: string): Promise<SavingGoal[]> {
     if (this.isMock()) return [
        { id: 'g1', user_id: userId, name: 'Emergency Fund', target_amount: 50000, current_amount: 15000 },
        { id: 'g2', user_id: userId, name: 'New Laptop', target_amount: 80000, current_amount: 12000 }
     ];
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

  // SETTINGS & SCHEDULES
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
    
    // Process loans concurrently to determine payment coverage
    const loanRepaymentPromises = activeLoans.map(async (loan) => {
      const payments = await this.getLoanPayments(loan.id);
      const totalRepaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      const monthlyTotal = (loan.principal / loan.duration_months) + (loan.principal * (loan.interest_rate/100));
      const installmentAmount = monthlyTotal / 2;
      
      const baseDate = loan.start_date ? new Date(loan.start_date) : new Date(loan.created_at);
      let cumulativeTarget = 0;

      for (let i = 1; i <= loan.duration_months; i++) {
        const installmentMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        
        // 10th of Month
        cumulativeTarget += installmentAmount;
        schedules.push({
          date: new Date(installmentMonth.getFullYear(), installmentMonth.getMonth(), 10).toISOString(),
          title: `Payday Repayment (10th) - ${loan.purpose}`,
          amount: installmentAmount,
          borrower_id: loan.borrower_id,
          borrower_name: loan.borrower.full_name,
          is_payday: true,
          is_paid: totalRepaid >= (cumulativeTarget - 0.01) // Margin for float errors
        });
        
        // 25th of Month
        cumulativeTarget += installmentAmount;
        schedules.push({
          date: new Date(installmentMonth.getFullYear(), installmentMonth.getMonth(), 25).toISOString(),
          title: `Payday Repayment (25th) - ${loan.purpose}`,
          amount: installmentAmount,
          borrower_id: loan.borrower_id,
          borrower_name: loan.borrower.full_name,
          is_payday: true,
          is_paid: totalRepaid >= (cumulativeTarget - 0.01)
        });
      }
    });

    await Promise.all(loanRepaymentPromises);
    return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const dataService = new DataService();
