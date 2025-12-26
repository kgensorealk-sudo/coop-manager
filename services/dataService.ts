
import { Loan, User, LoanWithBorrower, Payment, ContributionWithMember, ContributionStatus, Announcement, AnnouncementPriority, GalleryItem } from '../types';
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

  async restoreSession(): Promise<User | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    const db = supabase;
    const { data: { session }, error } = await db.auth.getSession();
    if (error) {
       console.warn("Session restore error, clearing state:", error.message);
       await db.auth.signOut().catch(() => {});
       return null;
    }
    if (!session?.user) return null;

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();

    if (profileError || !profile) {
       await db.auth.signOut().catch(() => {});
       return null;
    }

    return profile as User;
  }

  async login(email: string, password: string): Promise<User> {
    const db = this.checkConnection();
    try {
      await db.auth.signOut(); 
    } catch (e) {}

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

    let { data: profile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();
    
    if (profileError || !profile) {
       const { data: legacyProfile } = await db.from('profiles').select('*').eq('email', email).single();
       if (legacyProfile) {
          if (!legacyProfile.auth_id) {
             await db.from('profiles').update({ auth_id: authData.user.id }).eq('id', legacyProfile.id);
          }
          return legacyProfile as User;
       }

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
          
       if (createError) throw new Error("User profile not found and could not be created.");
       profile = createdProfile;
    }

    return profile as User;
  }

  async signUp(email: string, password: string, fullName: string): Promise<User> {
    const db = this.checkConnection();
    try { await db.auth.signOut(); } catch (e) {}
    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (authError) throw authError;
    if (authData.user && !authData.session) throw new Error("Registration successful! Please confirm your email.");
    if (!authData.user) throw new Error("Signup failed");

    const newProfile = {
      auth_id: authData.user.id,
      email: email,
      full_name: fullName,
      role: 'member',
      is_coop_member: false,
      equity: 0,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
    };
    const { data: profile, error: profileError } = await db.from('profiles').insert(newProfile).select().single();
    if (profileError) throw profileError;
    return profile as User;
  }

  async logout(): Promise<void> {
    const db = this.checkConnection();
    await db.auth.signOut().catch((e) => console.warn("Logout error:", e));
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

  async inviteMember(email: string, fullName: string, role: string): Promise<void> {
    const db = this.checkConnection();
    const { data, error } = await db.functions.invoke('invite-user', {
      body: { email, full_name: fullName, role }
    });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
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

  // ----------------------------------------------------------------------
  // LOANS
  // ----------------------------------------------------------------------

  async getLoans(): Promise<LoanWithBorrower[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('loans')
      .select(`*, borrower:profiles(*)`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as LoanWithBorrower[];
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
    
    if (status === 'active') {
      const { data: loan, error: fetchError } = await db.from('loans').select('*').eq('id', loanId).single();
      if (fetchError || !loan) throw new Error("Loan not found for activation.");

      const rateToUse = customInterestRate !== undefined ? customInterestRate : loan.interest_rate;
      
      // Fixed Sum Calculation: Principal + (Monthly Interest * Duration)
      const monthlyInterestAmount = loan.principal * (rateToUse / 100);
      const totalTermInterest = monthlyInterestAmount * loan.duration_months;

      const { error } = await db.from('loans').update({
        status: 'active',
        interest_rate: rateToUse,
        start_date: new Date().toISOString(),
        interest_accrued: totalTermInterest, 
        remaining_principal: loan.principal,
        updated_at: new Date().toISOString()
      }).eq('id', loanId);

      if (error) throw error;
    } else {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (customInterestRate !== undefined) {
        updates.interest_rate = customInterestRate;
      }
      const { error } = await db.from('loans').update(updates).eq('id', loanId);
      if (error) throw error;
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

    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const totalDue = (loan.remaining_principal || 0) + (loan.interest_accrued || 0);
    
    if (amount > totalDue + 0.01) {
      throw new Error(`Payment exceeds total amount due (₱${totalDue.toLocaleString()}).`);
    }

    let remainingAmount = amount;
    let interestPaid = 0;
    let principalPaid = 0;

    if (loan.interest_accrued > 0) {
      interestPaid = Math.min(remainingAmount, loan.interest_accrued);
      remainingAmount -= interestPaid;
    }

    if (remainingAmount > 0) {
      principalPaid = Math.min(remainingAmount, loan.remaining_principal);
      remainingAmount -= principalPaid;
    }

    const newInterestAccrued = Math.max(0, loan.interest_accrued - interestPaid);
    const newRemainingPrincipal = Math.max(0, loan.remaining_principal - principalPaid);
    const newStatus = (newRemainingPrincipal === 0 && newInterestAccrued === 0) ? 'paid' : 'active';

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
        interest_accrued: newInterestAccrued,
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
    const { data: contribs, error: cError } = await db.from('contributions').select('amount').eq('status', 'approved');
    if (cError) throw cError;
    const totalContributions = contribs.reduce((sum, item) => sum + (item.amount || 0), 0);

    const { data: payments, error: pError } = await db.from('payments').select('amount, interest_paid, principal_paid');
    if (pError) throw pError;
    const totalPayments = payments.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalInterestCollected = payments.reduce((sum, item) => sum + (item.interest_paid || 0), 0);
    const totalPrincipalRepaid = payments.reduce((sum, item) => sum + (item.principal_paid || 0), 0);

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

  async getContributions(): Promise<ContributionWithMember[]> {
    const db = this.checkConnection();
    const { data, error } = await db
      .from('contributions')
      .select(`*, member:profiles(*)`)
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
    if (data.status === 'approved') await this._updateUserEquity(data.member_id, data.amount);
  }

  async updateContributionStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const db = this.checkConnection();
    const { data: contribution, error: fetchError } = await db.from('contributions').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (contribution.status === 'approved') throw new Error("Already approved");
    const { error } = await db.from('contributions').update({ status }).eq('id', id);
    if(error) throw error;
    if (status === 'approved') await this._updateUserEquity(contribution.member_id, contribution.amount);
  }

  private async _updateUserEquity(memberId: string, amountToAdd: number) {
    const db = this.checkConnection();
    const { data: profile, error: fetchError } = await db.from('profiles').select('equity').eq('id', memberId).single();
    if (fetchError) throw fetchError;
    const newEquity = (profile?.equity || 0) + amountToAdd;
    await db.from('profiles').update({ equity: newEquity, updated_at: new Date().toISOString() }).eq('id', memberId);
  }

  async getActiveLoanVolume(): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db.from('loans').select('remaining_principal').eq('status', 'active');
    if (error) throw error;
    return data.reduce((sum, item) => sum + (item.remaining_principal || 0), 0);
  }

  // ----------------------------------------------------------------------
  // ANNOUNCEMENTS
  // ----------------------------------------------------------------------
  async getAnnouncements(): Promise<Announcement[]> {
    const db = this.checkConnection();
    const { data, error } = await db.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data as Announcement[];
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const db = this.checkConnection();
    try {
      const { data: announcements, error } = await db.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) return [];
      const now = new Date();
      return announcements?.filter(a => {
         const start = a.scheduled_start ? new Date(a.scheduled_start) : null;
         const end = a.scheduled_end ? new Date(a.scheduled_end) : null;
         if (start && start > now) return false;
         if (end && end < now) return false;
         return true;
      }) || [];
    } catch (e) { return []; }
  }

  async createAnnouncement(title: string, message: string, authorId: string, priority: AnnouncementPriority = 'normal', scheduledStart: string | null = null, scheduledEnd: string | null = null): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('announcements').insert({ title, message, author_id: authorId, is_active: true, priority, scheduled_start: scheduledStart, scheduled_end: scheduledEnd, created_at: new Date().toISOString() });
    if (error) throw error;
  }
  
  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
     const db = this.checkConnection();
     const { error } = await db.from('announcements').update(updates).eq('id', id);
     if (error) throw error;
  }

  async updateAnnouncementStatus(id: string, isActive: boolean): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('announcements').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------
  // GALLERY
  // ----------------------------------------------------------------------
  async getGalleryItems(): Promise<GalleryItem[]> {
    const db = this.checkConnection();
    const { data, error } = await db.from('gallery_items').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data as GalleryItem[];
  }

  async uploadGalleryItem(file: File, caption: string, userId: string): Promise<void> {
    const db = this.checkConnection();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await db.storage.from('gallery').upload(fileName, file);
    if (uploadError) throw new Error(uploadError.message);
    const { data: urlData } = db.storage.from('gallery').getPublicUrl(fileName);
    const { error: insertError } = await db.from('gallery_items').insert({ image_url: urlData.publicUrl, caption, uploaded_by: userId, created_at: new Date().toISOString(), is_archived: false });
    if (insertError) throw insertError;
  }

  async updateGalleryItem(id: string, updates: { caption?: string }): Promise<void> {
    const db = this.checkConnection();
    const { error: fetchError } = await db.from('gallery_items').update(updates).eq('id', id);
    if (fetchError) throw fetchError;
  }

  async toggleGalleryArchive(id: string, isArchived: boolean): Promise<void> {
    const db = this.checkConnection();
    const { error } = await db.from('gallery_items').update({ is_archived: isArchived, archived_at: isArchived ? new Date().toISOString() : null }).eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------
  // SCHEDULES (Derived)
  // ----------------------------------------------------------------------
  async getUpcomingSchedules(): Promise<any[]> {
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
             borrower_id: loan.borrower_id, 
             amount: monthlyPayment,
             loan_id: loan.id
           });
        }
      }
    }
    return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getMonthlyGoal(): Promise<number> {
    const db = this.checkConnection();
    const { data, error } = await db.from('settings').select('value').eq('key', 'monthly_goal').single();
    if (error || !data) return 10000;
    return Number(data.value);
  }

  async updateMonthlyGoal(amount: number): Promise<void> {
    const db = this.checkConnection();
    await db.from('settings').upsert({ key: 'monthly_goal', value: amount.toString() }, { onConflict: 'key' });
  }
}

export const dataService = new DataService();
