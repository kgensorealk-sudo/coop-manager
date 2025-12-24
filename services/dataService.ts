
import { Loan, User, LoanWithBorrower, Payment, ContributionWithMember, ContributionStatus, Announcement, AnnouncementPriority } from '../types';
import { DEFAULT_INTEREST_RATE } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

class DataService {
  
  // Helper to ensure database is connected before operations
  private checkConnection() {
    if (!isSupabaseConfigured() || !supabase) {
       throw new Error("Database not connected. Please configure your Supabase connection in settings.");
    }
    return supabase;
  }

  // ----------------------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------------------

  async login(email: string, password: string): Promise<User> {
    const db = this.checkConnection();
    
    // FIX: Proactively sign out to clear potentially stale refresh tokens from LocalStorage
    // This resolves "Invalid Refresh Token: Refresh Token Not Found" errors on re-login
    await db.auth.signOut(); 

    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      if (authError.message.includes("Email not confirmed")) {
        throw new Error("Email not confirmed. Please check your inbox or spam folder to verify your account.");
      }
      throw authError;
    }
    
    if (!authData.user) throw new Error("No user returned from Supabase");

    // Fetch Profile
    let { data: profile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();
    
    // Lazy Profile Creation: If profile doesn't exist (e.g. created via signup flow that didn't insert profile due to email confirm)
    if (profileError || !profile) {
       // Fallback 1: Check if profile exists by email (legacy/manual link) to avoid dupes
       const { data: legacyProfile } = await db.from('profiles').select('*').eq('email', email).single();
       if (legacyProfile) {
          // Link auth_id if missing
          if (!legacyProfile.auth_id) {
             await db.from('profiles').update({ auth_id: authData.user.id }).eq('id', legacyProfile.id);
          }
          return legacyProfile as User;
       }

       // Fallback 2: Create new profile now
       const fullName = authData.user.user_metadata?.full_name || email.split('@')[0];
       const newProfile = {
          auth_id: authData.user.id,
          email: email,
          full_name: fullName,
          role: 'member',
          is_coop_member: false,
          equity: 0,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
       };
       
       const { data: createdProfile, error: createError } = await db
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
       if (createError) {
           console.error("Failed to auto-create profile:", createError);
           throw new Error("User profile not found and could not be created. Please contact admin.");
       }
       
       profile = createdProfile;
    }

    return profile as User;
  }

  async signUp(email: string, password: string, fullName: string): Promise<User> {
    const db = this.checkConnection();

    // Clear stale session before sign up as well
    await db.auth.signOut();

    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (authError) throw authError;
    
    // Check if email confirmation is required (User created, but no Session)
    if (authData.user && !authData.session) {
       throw new Error("Registration successful! Please check your email to confirm your account before logging in.");
    }

    if (!authData.user) throw new Error("Signup failed");

    // Create Profile Record (Only if we have a session/auto-confirm is on)
    const newProfile = {
      auth_id: authData.user.id,
      email: email,
      full_name: fullName,
      role: 'member',
      is_coop_member: false, // Default to pending/non-member until approved
      equity: 0,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
    };

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (profileError) throw profileError;
    return profile as User;
  }

  async logout(): Promise<void> {
    const db = this.checkConnection();
    await db.auth.signOut();
  }

  // ----------------------------------------------------------------------
  // USERS
  // ----------------------------------------------------------------------
  
  async getUsers(): Promise<User[]> {
    const db = this.checkConnection();
    const { data, error } = await db.from('profiles').select('*');
    if (error) throw error;
    return data as User[];
  }

  async createMember(userData: Omit<User, 'id' | 'equity' | 'avatar_url'>): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('profiles').insert({
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      is_coop_member: userData.is_coop_member,
      equity: 0
    });
    if (error) throw error;
  }

  async updateMember(id: string, updates: Partial<User>): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteMember(id: string): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------
  // LOANS
  // ----------------------------------------------------------------------

  async getLoans(): Promise<LoanWithBorrower[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('loans')
      .select(`
        *,
        borrower:profiles(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as LoanWithBorrower[];
  }

  async getMemberLoans(memberId: string): Promise<LoanWithBorrower[]> {
    const allLoans = await this.getLoans();
    return allLoans.filter(l => l.borrower_id === memberId);
  }

  async createLoan(data: { borrower_id: string; principal: number; duration_months: number; purpose: string }): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db
      .from('loans')
      .insert({
        borrower_id: data.borrower_id,
        principal: data.principal,
        duration_months: data.duration_months,
        purpose: data.purpose,
        interest_rate: DEFAULT_INTEREST_RATE,
        status: 'pending',
        remaining_principal: data.principal,
        interest_accrued: 0
      });

    if (error) throw error;
  }

  async updateLoanStatus(loanId: string, status: Loan['status'], customInterestRate?: number): Promise<void> {
    const db = this.checkConnection();
    const updates: any = { status, updated_at: new Date().toISOString() };
    
    if (status === 'active') {
      updates.start_date = new Date().toISOString();
    }
    
    if (customInterestRate !== undefined) {
      updates.interest_rate = customInterestRate;
    }

    const { error } = await db
      .from('loans')
      .update(updates)
      .eq('id', loanId);

    if (error) throw error;
  }

  async recalculateInterestAccruals(): Promise<void> {
    const db = this.checkConnection();
    const loans = await this.getLoans();
    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'paid');

    for (const loan of activeLoans) {
      if (!loan.start_date) continue;

      const startDate = new Date(loan.start_date);
      const currentDate = new Date();
      
      const yearsDiff = currentDate.getFullYear() - startDate.getFullYear();
      const monthsDiff = currentDate.getMonth() - startDate.getMonth();
      const totalMonthsPassed = Math.max(1, (yearsDiff * 12) + monthsDiff);
      
      const monthlyInterest = loan.principal * (loan.interest_rate / 100);
      const totalInterestExpected = monthlyInterest * totalMonthsPassed;

      const payments = await this.getLoanPayments(loan.id);
      const totalInterestPaid = payments.reduce((sum, p) => sum + p.interest_paid, 0);

      const accrued = Math.max(0, totalInterestExpected - totalInterestPaid);

      await db
        .from('loans')
        .update({ interest_accrued: accrued })
        .eq('id', loan.id);
    }
  }

  // ----------------------------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------------------------

  async getLoanPayments(loanId: string): Promise<Payment[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data as Payment[];
  }

  async addPayment(loanId: string, amount: number): Promise<void> {
    const db = this.checkConnection();
    
    const { data: loan } = await db.from('loans').select('*').eq('id', loanId).single();
    if (!loan) throw new Error("Loan not found");

    const interestAccrued = loan.principal * (loan.interest_rate / 100);
    const interestPaid = Math.min(amount, interestAccrued);
    const principalPaid = Math.max(0, amount - interestPaid);
    
    const newRemainingPrincipal = Math.max(0, loan.remaining_principal - principalPaid);
    const newStatus = newRemainingPrincipal === 0 ? 'paid' : 'active';

    const { error: paymentError } = await db.from('payments').insert({
      loan_id: loanId,
      amount,
      interest_paid: interestPaid,
      principal_paid: principalPaid,
      date: new Date().toISOString()
    });
    if (paymentError) throw paymentError;

    const { error: loanError } = await db
      .from('loans')
      .update({ 
        remaining_principal: newRemainingPrincipal,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);
    if (loanError) throw loanError;
  }

  async getTotalInterestGained(): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db.from('payments').select('interest_paid');
    if (error) throw error;
    return data.reduce((sum, item) => sum + (item.interest_paid || 0), 0);
  }

  // ----------------------------------------------------------------------
  // TREASURY / CONTRIBUTIONS
  // ----------------------------------------------------------------------

  async getTreasuryMetrics(): Promise<{ 
    balance: number, 
    totalContributions: number, 
    totalPayments: number, 
    totalDisbursed: number,
    totalInterestCollected: number,
    totalPrincipalRepaid: number
  }> {
    const db = this.checkConnection();

    // 1. Contributions (Cash In)
    const { data: contribs, error: cError } = await db.from('contributions').select('amount').eq('status', 'approved');
    if (cError) throw cError;
    const totalContributions = contribs.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 2. Payments (Cash In - Principal + Interest)
    const { data: payments, error: pError } = await db.from('payments').select('amount, interest_paid, principal_paid');
    if (pError) throw pError;
    
    const totalPayments = payments.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalInterestCollected = payments.reduce((sum, item) => sum + (item.interest_paid || 0), 0);
    const totalPrincipalRepaid = payments.reduce((sum, item) => sum + (item.principal_paid || 0), 0);

    // 3. Disbursed Loans (Cash Out)
    const { data: loans, error: lError } = await db.from('loans').select('principal').in('status', ['active', 'paid']);
    if (lError) throw lError;
    const totalDisbursed = loans.reduce((sum, item) => sum + (item.principal || 0), 0);

    return {
      balance: totalContributions + totalPayments - totalDisbursed,
      totalContributions,
      totalPayments,
      totalDisbursed,
      totalInterestCollected,
      totalPrincipalRepaid
    };
  }

  async getTotalTreasury(): Promise<number> {
     const metrics = await this.getTreasuryMetrics();
     return metrics.balance;
  }

  async getContributions(): Promise<ContributionWithMember[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('contributions')
      .select(`
        *,
        member:profiles(*)
      `)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as ContributionWithMember[];
  }

  async addContribution(data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }): Promise<void> {
    const db = this.checkConnection();
    const { error: insertError } = await db.from('contributions').insert({
      member_id: data.member_id,
      amount: data.amount,
      type: data.type,
      status: data.status,
      date: new Date().toISOString()
    });
    if (insertError) throw insertError;

    if (data.status === 'approved') {
       await this._updateUserEquity(data.member_id, data.amount);
    }
  }

  async updateContributionStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const db = this.checkConnection();
    const { data: contribution, error: fetchError } = await db.from('contributions').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (contribution.status === 'approved') throw new Error("Already approved");

    const { error } = await db
      .from('contributions')
      .update({ status })
      .eq('id', id);
    if(error) throw error;

    if (status === 'approved') {
      await this._updateUserEquity(contribution.member_id, contribution.amount);
    }
  }

  private async _updateUserEquity(memberId: string, amountToAdd: number) {
    const db = this.checkConnection();
    const { data: profile, error: fetchError } = await db
      .from('profiles')
      .select('equity')
      .eq('id', memberId)
      .single();
      
    if (fetchError) throw fetchError;

    const currentEquity = profile?.equity || 0;
    const newEquity = currentEquity + amountToAdd;

    const { error: updateError } = await db
      .from('profiles')
      .update({ 
        equity: newEquity,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (updateError) throw updateError;
  }

  async getMemberEquity(memberId: string): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('contributions')
      .select('amount')
      .eq('member_id', memberId)
      .eq('status', 'approved');
    if (error) throw error;
    return data.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  async getActiveLoanVolume(): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('loans')
      .select('remaining_principal')
      .eq('status', 'active');
      
    if (error) throw error;
    return data.reduce((sum, item) => sum + (item.remaining_principal || 0), 0);
  }

  // ----------------------------------------------------------------------
  // ANNOUNCEMENTS
  // ----------------------------------------------------------------------
  async getAnnouncements(): Promise<Announcement[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
       if (error.code === 'PGRST116') return [];
       console.warn("Announcement fetch warning:", error.message);
       return [];
    }
    return data as Announcement[];
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const db = this.checkConnection();
    try {
      const { data: announcements, error } = await db
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }); // Newest first
      
      if (error) {
         console.warn("Announcement fetch warning:", error.message);
         return [];
      }
      
      const now = new Date();
      const activeList = announcements?.filter(a => {
         const start = a.scheduled_start ? new Date(a.scheduled_start) : null;
         const end = a.scheduled_end ? new Date(a.scheduled_end) : null;
         
         if (start && start > now) return false;
         if (end && end < now) return false;
         return true;
      }) || [];

      return activeList;
    } catch (e) {
      console.warn("Unexpected error fetching announcement:", e);
      return [];
    }
  }

  async getActiveAnnouncement(): Promise<Announcement | null> {
    const all = await this.getActiveAnnouncements();
    return all.length > 0 ? all[0] : null;
  }

  async createAnnouncement(
     title: string, 
     message: string, 
     authorId: string, 
     priority: AnnouncementPriority = 'normal',
     scheduledStart: string | null = null,
     scheduledEnd: string | null = null
  ): Promise<void> {
    const db = this.checkConnection();
    const newAnnouncement = {
      title,
      message,
      author_id: authorId,
      is_active: true,
      priority,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      created_at: new Date().toISOString()
    };

    const { error } = await db.from('announcements').insert(newAnnouncement);
    if (error) throw error;
  }
  
  async updateAnnouncement(
     id: string,
     updates: Partial<Announcement>
  ): Promise<void> {
     const db = this.checkConnection();
     const { error } = await db.from('announcements').update(updates).eq('id', id);
     if (error) throw error;
  }

  async updateAnnouncementStatus(id: string, isActive: boolean): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('announcements').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('announcements').delete().eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------
  // SCHEDULES (Derived)
  // ----------------------------------------------------------------------
  async getUpcomingSchedules(): Promise<{
    date: string;
    title: string;
    borrower_name: string;
    amount: number;
    loan_id: string;
  }[]> {
    const loans = await this.getLoans();
    const activeLoans = loans.filter(l => l.status === 'active' && l.start_date);
    const schedules: any[] = [];
    const today = new Date();

    for (const loan of activeLoans) {
      if (!loan.start_date) continue;
      const startDate = new Date(loan.start_date);
      for (let i = 1; i <= loan.duration_months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        
        if (dueDate > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
           const monthlyPayment = (loan.principal / loan.duration_months) + (loan.principal * (loan.interest_rate / 100));
           schedules.push({
             date: dueDate.toISOString(),
             title: `Loan Repayment (${i}/${loan.duration_months})`,
             borrower_name: loan.borrower.full_name,
             amount: monthlyPayment,
             loan_id: loan.id
           });
        }
      }
    }

    return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // ----------------------------------------------------------------------
  // SETTINGS (Goals)
  // ----------------------------------------------------------------------
  async getMonthlyGoal(): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('settings')
      .select('value')
      .eq('key', 'monthly_goal')
      .single();
    
    if (error || !data) return 10000;
    return Number(data.value);
  }

  async updateMonthlyGoal(amount: number): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db
      .from('settings')
      .upsert({ key: 'monthly_goal', value: amount.toString() }, { onConflict: 'key' });
      
    if (error) throw error;
  }
}

export const dataService = new DataService();
