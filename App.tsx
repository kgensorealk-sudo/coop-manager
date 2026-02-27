
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import LoanApprovalModal from './components/LoanApprovalModal';
import LoanApplicationForm from './components/LoanApplicationForm';
import LoanDetailsModal from './components/LoanDetailsModal';
import ContributionModal from './components/ContributionModal';
import CreateAnnouncementModal from './components/CreateAnnouncementModal';
import AnnouncementModal from './components/AnnouncementModal';
import { MemberDashboard } from './components/MemberDashboard';
import { TreasuryDashboard } from './components/TreasuryDashboard';
import { MemberDirectory } from './components/MemberDirectory';
import { DeveloperGuide } from './components/DeveloperGuide';
import { LoginScreen } from './components/LoginScreen';
import { AnnouncementHistory } from './components/AnnouncementHistory';
import { ScheduleView } from './components/ScheduleView';
import { GalleryView } from './components/GalleryView';
import { PersonalLedger } from './components/PersonalLedger';
import { dataService } from './services/dataService';
import { LoanWithBorrower, User, ContributionWithMember, ContributionStatus, Announcement, AnnouncementPriority, LoanStatus, Payment, SavingGoal } from './types';
import { 
  CreditCard, 
  Wallet, 
  Search, 
  Filter,
  TrendingUp, 
  Activity,
  RefreshCw,
  AlertTriangle,
  Megaphone,
  Loader2,
  Feather,
  ArrowRight,
  ClipboardCheck,
  Coins,
  CalendarDays
} from 'lucide-react';

const getErrorMessage = (err: any): string => {
  if (!err) return "Unknown error";
  if (typeof err === 'string') return err === '[object Object]' ? "An unexpected system error occurred." : err;
  if (err.message && typeof err.message === 'string') return err.message === '[object Object]' ? "System error" : err.message;
  if (err.error_description) return String(err.error_description);
  if (err.error && typeof err.error === 'string') return err.error;
  try {
    const stringified = JSON.stringify(err);
    return stringified === '{}' ? "An unspecified error occurred." : stringified;
  } catch {
    return "A critical error occurred.";
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading Ledger...');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanFilterStatus, setLoanFilterStatus] = useState<LoanStatus | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedLoan, setSelectedLoan] = useState<LoanWithBorrower | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [systemAnnouncements, setSystemAnnouncements] = useState<Announcement[]>([]);
  const [isSystemAnnouncementOpen, setIsSystemAnnouncementOpen] = useState(false);
  const [hasShownAnnouncement, setHasShownAnnouncement] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  
  const [treasuryStats, setTreasuryStats] = useState({ 
    balance: 0, 
    totalContributions: 0, 
    totalPayments: 0, 
    totalDisbursed: 0,
    totalInterestCollected: 0,
    totalPenaltyCollected: 0,
    totalPrincipalRepaid: 0
  });
  const [activeVolume, setActiveVolume] = useState(0);
  const [totalInterestGained, setTotalInterestGained] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const initSession = async () => {
      setLoadingText('Loading Ledger...');
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const [user] = await Promise.all([
           dataService.restoreSession(),
           minLoadTime
        ]);
        if (user) {
          setCurrentUser(user);
          setActiveTab(user.role === 'admin' ? 'dashboard' : 'my-dashboard');
        } else {
          setInitialLoading(false);
        }
      } catch (e) {
        setInitialLoading(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        await refreshData();
        setInitialLoading(false);
      }
    };
    loadData();
  }, [currentUser?.id]);

  const refreshData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedLoans, fetchedMetrics, fetchedVolume, fetchedInterest, fetchedUsers, fetchedContributions, fetchedAnnouncements, fetchedSavingGoals] = await Promise.all([
        dataService.getLoans(),
        dataService.getTreasuryMetrics(),
        dataService.getActiveLoanVolume(),
        dataService.getTotalInterestGained(),
        dataService.getUsers(),
        dataService.getContributions(),
        dataService.getActiveAnnouncements(),
        dataService.getSavingGoals(currentUser.id)
      ]);

      setLoans(fetchedLoans);
      setTreasuryStats(fetchedMetrics);
      setActiveVolume(fetchedVolume);
      setTotalInterestGained(fetchedInterest);
      setMembers(fetchedUsers);
      setContributions(fetchedContributions);
      setSavingGoals(fetchedSavingGoals);
      
      const { data: payments, error: payError } = await (dataService as any).supabase.from('payments').select('*');
      if (payError) throw payError;
      setAllPayments(payments || []);
      
      if (fetchedAnnouncements && fetchedAnnouncements.length > 0 && !hasShownAnnouncement) {
        setSystemAnnouncements(fetchedAnnouncements);
        setTimeout(() => {
           setIsSystemAnnouncementOpen(true);
           setHasShownAnnouncement(true);
        }, 800);
      }
      
      const updatedCurrentUser = fetchedUsers.find(u => u.id === currentUser.id);
      if (updatedCurrentUser) setCurrentUser(updatedCurrentUser);
      
      if (selectedLoan) {
         const updatedSelectedLoan = fetchedLoans.find(l => l.id === selectedLoan.id);
         if (updatedSelectedLoan) setSelectedLoan(updatedSelectedLoan);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, pass: string, isSignup?: boolean, fullName?: string) => {
    setLoadingText('Verifying Identity...');
    setInitialLoading(true); 
    setAuthError(null);
    setAuthSuccess(null);
    const minLoginTime = new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const loginAction = isSignup && fullName 
          ? dataService.signUp(email, pass, fullName)
          : dataService.login(email, pass);
      const [user] = await Promise.all([loginAction, minLoginTime]);
      setCurrentUser(user);
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'my-dashboard');
    } catch (err: any) {
      await minLoginTime;
      setInitialLoading(false);
      const message = getErrorMessage(err);
      if (message.includes("Registration successful")) {
        setAuthSuccess(message);
        setAuthError(null);
      } else {
        setAuthError(message);
        setAuthSuccess(null);
      }
    }
  };

  const handleLogout = async () => {
    setLoadingText('Closing Ledger...');
    setInitialLoading(true);
    const minLogoutTime = new Promise(resolve => setTimeout(resolve, 1500));
    try {
      await Promise.all([dataService.logout(), minLogoutTime]);
      setCurrentUser(null);
      setLoans([]);
      setMembers([]);
      setContributions([]);
      setSavingGoals([]);
      setHasShownAnnouncement(false);
      setSystemAnnouncements([]);
      setIsSystemAnnouncementOpen(false);
    } catch (e) {
    } finally {
      setInitialLoading(initialLoading);
      window.location.reload(); // Hard refresh to clear all states
    }
  };

  const handleReviewLoan = (loan: LoanWithBorrower) => {
    setSelectedLoan(loan);
    setIsApprovalModalOpen(true);
  };

  const handleViewLoanDetails = (loan: LoanWithBorrower) => {
    setSelectedLoan(loan);
    setIsDetailsModalOpen(true);
  };

  const handleApproveLoan = async (loanId: string, customRate: number) => {
    try {
      await dataService.updateLoanStatus(loanId, 'active', customRate);
      await refreshData();
      setIsApprovalModalOpen(false);
      setSelectedLoan(null);
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleRejectLoan = async (loanId: string) => {
    try {
      await dataService.updateLoanStatus(loanId, 'rejected');
      await refreshData();
      setIsApprovalModalOpen(false);
      setSelectedLoan(null);
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleCreateLoan = async (data: { borrower_id: string; principal: number; duration_months: number; purpose: string }) => {
    const hasPending = loans.some(l => l.borrower_id === data.borrower_id && l.status === 'pending');
    if (hasPending) throw new Error("This borrower already has a pending loan request.");
    try {
      await dataService.createLoan(data);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const handleAddContribution = async (data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }) => {
    try {
      await dataService.addContribution(data);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const handleApproveContribution = async (id: string) => {
    try {
      await dataService.updateContributionStatus(id, 'approved');
      await refreshData();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const handleRejectContribution = async (id: string) => {
    try {
      await dataService.updateContributionStatus(id, 'rejected');
      await refreshData();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };
  
  const handleSaveAnnouncement = async (title: string, message: string, priority: AnnouncementPriority, start: string | null, end: string | null) => {
    if (!currentUser) return;
    try {
      if (editingAnnouncement) {
        await dataService.updateAnnouncement(editingAnnouncement.id, { title, message, priority, scheduled_start: start, scheduled_end: end });
      } else {
        await dataService.createAnnouncement(title, message, currentUser.id, priority, start, end);
      }
      await refreshData(); 
      setEditingAnnouncement(null);
    } catch (e) {
      throw e;
    }
  };
  
  const handleOpenAnnouncementCreate = () => {
     setEditingAnnouncement(null);
     setIsAnnouncementModalOpen(true);
  };

  const handleOpenAnnouncementEdit = (announcement: Announcement) => {
     setEditingAnnouncement(announcement);
     setIsAnnouncementModalOpen(true);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-paper-100 flex flex-col items-center justify-center p-4">
         <div className="flex flex-col items-center animate-pulse">
            <div className="mx-auto bg-ink-900 w-12 h-12 rounded-sm flex items-center justify-center mb-4 shadow-lg rotate-45 border-2 border-paper-50">
              <Feather size={20} className="text-paper-50 -rotate-45" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">The 13th Page</h2>
            <div className="flex items-center gap-2 text-ink-500 text-sm font-mono uppercase tracking-widest">
               <Loader2 size={14} className="animate-spin" />
               <span>{loadingText}</span>
            </div>
         </div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} loading={false} error={authError} success={authSuccess} />;

  if (error) {
    return (
      <div className="min-h-screen bg-paper-100 flex flex-col items-center justify-center p-4">
        <div className="bg-paper-50 p-8 rounded-sm shadow-card max-w-md w-full text-center space-y-4 border border-paper-300">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-700 border border-red-100">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink-900">Database Connection Error</h2>
          <div className="text-sm text-ink-600 bg-red-50 p-4 rounded-sm border-l-4 border-wax-500 text-left font-mono break-words">{error}</div>
          <button onClick={refreshData} className="flex items-center gap-2 px-6 py-2.5 bg-ink-800 hover:bg-ink-900 text-white rounded-sm font-bold uppercase tracking-wide text-sm mx-auto mt-4 transition-colors">
             <RefreshCw size={16} />
             <span>Try Again</span>
           </button>
        </div>
      </div>
    );
  }

  const renderAdminDashboard = () => {
    const pendingLoans = loans.filter(l => l.status === 'pending');
    const pendingContributions = contributions.filter(c => c.status === 'pending');

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div></div>;

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-ink-900">Executive Summary</h1>
            <p className="text-ink-600 mt-2 font-serif italic text-2xl">Welcome to the Registry, Administrator {currentUser.full_name.split(' ')[0]}.</p>
          </div>
          <button 
            onClick={handleOpenAnnouncementCreate}
            className="flex items-center space-x-2 px-5 py-2.5 bg-paper-50 text-ink-800 hover:bg-paper-100 border border-paper-300 rounded-sm text-sm font-black uppercase tracking-[0.15em] transition-all shadow-sm"
          >
            <Megaphone size={16} />
            <span>Broadcast Notice</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard index={0} title="Treasury Balance" value={`₱${treasuryStats.balance.toLocaleString()}`} icon={Wallet} trend="Liquid Assets" trendUp={true} colorClass="text-emerald-700" />
          <StatCard index={1} title="Gains Realized" value={`₱${(treasuryStats.totalInterestCollected + treasuryStats.totalPenaltyCollected).toLocaleString()}`} icon={TrendingUp} trend="Interest + Penalties" trendUp={true} colorClass="text-purple-700" />
          <StatCard index={2} title="Total Receivables" value={`₱${activeVolume.toLocaleString()}`} icon={Coins} trend="Loan Book Value" trendUp={true} colorClass="text-blue-700" />
          <StatCard index={3} title="Assessments Due" value={`${pendingLoans.length + pendingContributions.length}`} icon={ClipboardCheck} colorClass={pendingLoans.length > 0 ? "text-wax-600" : "text-ink-600"} />
        </div>

        <div className="grid grid-cols-1 gap-8">
           <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-paper-300 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-ink-900 text-gold-500 rounded-sm shadow-md rotate-3">
                       <CreditCard size={20} />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-ink-900">Loan Request Inbox</h2>
                 </div>
                 <span className="bg-wax-50 text-wax-600 px-3 py-1 rounded-sm border border-wax-100 text-xs font-black uppercase tracking-widest">
                    {pendingLoans.length} Applications Waiting
                 </span>
              </div>

              {pendingLoans.length === 0 ? (
                 <div className="bg-paper-50/50 border-2 border-dashed border-paper-300 rounded-sm p-12 text-center">
                    <Activity size={48} className="mx-auto text-ink-200 mb-4" />
                    <p className="text-xl font-serif italic text-ink-400">All applications have been processed.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingLoans.map((loan) => {
                       const monthlyInterest = loan.principal * (loan.interest_rate / 100);
                       const totalInterest = monthlyInterest * loan.duration_months;
                       const totalResp = loan.principal + totalInterest;
                       return (
                          <div key={loan.id} className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card hover:border-ink-400 transition-all p-6 group relative overflow-hidden">
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-sm bg-white p-1 shadow-sm border border-paper-200">
                                   <img src={loan.borrower.avatar_url} className="w-full h-full object-cover grayscale" alt="" />
                                </div>
                                <div>
                                   <h3 className="text-xl font-serif font-bold text-ink-900">{loan.borrower.full_name}</h3>
                                   <span className="text-xs font-mono text-ink-400 uppercase">{loan.borrower.email}</span>
                                </div>
                             </div>
                             <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-2 gap-4 bg-paper-100 p-4 rounded-sm border border-paper-200">
                                   <div>
                                      <span className="text-[11px] font-black text-ink-400 uppercase tracking-widest block mb-1">Principal Requested</span>
                                      <span className="text-lg font-mono font-bold text-ink-900">₱{loan.principal.toLocaleString()}</span>
                                   </div>
                                   <div>
                                      <span className="text-[11px] font-black text-ink-400 uppercase tracking-widest block mb-1">Term Length</span>
                                      <span className="text-lg font-mono font-bold text-ink-900">{loan.duration_months} Mo.</span>
                                   </div>
                                </div>
                                <div className="flex justify-between items-end border-t border-dashed border-paper-300 pt-4">
                                   <div className="text-xs text-ink-500 italic">Expected Total:</div>
                                   <div className="text-lg font-mono font-black text-emerald-700">₱{totalResp.toLocaleString()}</div>
                                </div>
                             </div>
                             <button onClick={() => handleReviewLoan(loan)} className="w-full py-3 bg-ink-900 text-white rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]">
                                Perform Assessment <ArrowRight size={14} />
                             </button>
                          </div>
                       );
                    })}
                 </div>
              )}
           </div>

           <div className="mt-4">
              <div className="flex items-center justify-between border-b border-paper-300 pb-4 mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-paper-200 text-ink-900 rounded-sm border border-paper-300">
                       <ClipboardCheck size={20} />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-ink-900">Contribution Verification</h2>
                 </div>
              </div>
              <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-paper-100 border-b border-paper-200 text-sm font-bold text-ink-500 uppercase">
                       <tr>
                          <th className="px-6 py-4">Sender</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200">
                       {pendingContributions.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">No pending deposits.</td></tr>
                       ) : (
                          pendingContributions.map((c) => (
                             <tr key={c.id} className="hover:bg-paper-100/50 transition-colors">
                                <td className="px-6 py-4 font-serif font-bold text-ink-900 text-lg">{c.member.full_name}</td>
                                <td className="px-6 py-4"><span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">{c.type.replace('_', ' ')}</span></td>
                                <td className="px-6 py-4 font-mono font-bold text-emerald-700 text-lg">+₱{c.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                   <div className="flex justify-end gap-2">
                                      <button onClick={() => handleRejectContribution(c.id)} className="px-3 py-1.5 text-wax-600 hover:bg-wax-50 rounded-sm text-xs font-black uppercase transition-colors">Decline</button>
                                      <button onClick={() => handleApproveContribution(c.id)} className="px-4 py-1.5 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black transition-all">Confirm</button>
                                   </div>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderLoansTab = () => {
    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div></div>;
    
    const filteredLoans = loans.filter(l => {
      const matchesSearch = l.borrower.full_name.toLowerCase().includes(loanSearchTerm.toLowerCase()) || l.purpose.toLowerCase().includes(loanSearchTerm.toLowerCase());
      const matchesStatus = loanFilterStatus === 'all' || l.status === loanFilterStatus;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold text-ink-900">Loan Ledger</h1>
          <button onClick={() => setIsApplicationModalOpen(true)} className="bg-ink-800 hover:bg-ink-900 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-widest text-sm shadow-md transition-all active:scale-95 flex items-center space-x-2 border-b-2 border-black">
             <CreditCard size={18} />
             <span>New Entry</span>
          </button>
        </div>

        <div className="bg-paper-50 p-4 rounded-sm shadow-sm border border-paper-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
            <input type="text" placeholder="Search by name or purpose..." value={loanSearchTerm} onChange={(e) => setLoanSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none font-serif placeholder:text-ink-300 text-ink-800" />
          </div>

          <div className="relative" ref={filterDropdownRef}>
            <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className={`flex items-center space-x-2 px-4 py-2 border rounded-sm text-sm font-bold uppercase tracking-widest transition-all ${loanFilterStatus !== 'all' ? 'bg-ink-900 text-white border-ink-900 shadow-md' : 'border-paper-300 text-ink-600 hover:bg-paper-100'}`}>
              <Filter size={16} />
              <span>{loanFilterStatus === 'all' ? 'Filter' : `Status: ${loanFilterStatus}`}</span>
            </button>
            {isFilterDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-paper-300 shadow-float z-30 rounded-sm overflow-hidden animate-zoom-in">
                <div className="p-2 border-b border-paper-100 bg-paper-50 flex justify-between items-center text-[10px] font-black uppercase text-ink-400 px-2 tracking-widest">Criteria</div>
                <div className="py-1">
                  {['all', 'pending', 'active', 'paid', 'rejected'].map((f) => (
                    <button key={f} onClick={() => {setLoanFilterStatus(f as any); setIsFilterDropdownOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm font-serif transition-colors ${loanFilterStatus === f ? 'bg-paper-100 text-ink-900 font-bold' : 'text-ink-600 hover:bg-paper-50'}`}>
                      {f === 'all' ? 'All Entries' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map(loan => {
            const loanPayments = allPayments.filter(p => p.loan_id === loan.id);
            const liveInterestDue = dataService.calculateLiveInterest(loan, loanPayments);
            const debtDetails = dataService.calculateDetailedDebt(loan, loanPayments);
            const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);
            
            const nextDue = debtDetails.schedule.find((_, idx) => {
              const cumulativeRequired = debtDetails.installmentAmount * (idx + 1);
              return totalPaid < (cumulativeRequired - 0.1);
            });

            return (
              <div key={loan.id} onClick={() => loan.status !== 'pending' && handleViewLoanDetails(loan)} className={`bg-paper-50 rounded-sm border-2 shadow-card hover:shadow-float transition-all duration-300 p-6 flex flex-col relative overflow-hidden group ${loan.status !== 'pending' ? 'cursor-pointer border-paper-200 hover:border-ink-300' : 'border-amber-200 bg-amber-50/20'}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-paper-200 group-hover:bg-ink-400 transition-colors"></div>
                <div className="flex justify-between items-start mb-5 pl-3">
                   <div className="flex items-center space-x-3">
                      <img src={loan.borrower.avatar_url} className="w-10 h-10 rounded-sm object-cover border border-paper-300 grayscale" alt="" />
                      <div>
                         <h3 className="font-serif font-bold text-ink-900 text-lg leading-tight">{loan.borrower.full_name}</h3>
                         <p className="text-xs text-ink-500 font-mono mt-0.5">{loan.status === 'active' ? 'Active Account' : loan.status === 'pending' ? 'Pending Approval' : loan.status}</p>
                      </div>
                   </div>
                   <div className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-widest border ${loan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : loan.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : loan.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-paper-100 text-ink-500 border-paper-200'}`}>
                     {loan.status}
                   </div>
                </div>
                
                {/* Repayment Tracking Mini-Section for Active Loans */}
                {loan.status === 'active' && nextDue && (
                  <div className="mb-4 pl-3 flex gap-4">
                     <div className="bg-amber-50/50 border border-amber-200 rounded-sm p-2 flex-1">
                        <div className="text-[9px] font-black text-amber-700 uppercase tracking-tighter flex items-center gap-1">
                           <CalendarDays size={10} /> Next Due
                        </div>
                        <div className="text-sm font-mono font-bold text-ink-900">
                           {nextDue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                     </div>
                     <div className="bg-emerald-50/50 border border-emerald-200 rounded-sm p-2 flex-1">
                        <div className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter flex items-center gap-1">
                           <Coins size={10} /> Installment
                        </div>
                        <div className="text-sm font-mono font-bold text-ink-900">
                           ₱{debtDetails.installmentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                     </div>
                  </div>
                )}

                <div className="space-y-3 mb-6 pl-3 border-l border-dashed border-paper-300 ml-0.5 font-mono text-sm">
                   <div className="flex justify-between">
                     <span className="text-ink-500 font-serif italic">Principal Rem.</span>
                     <span className="font-bold text-ink-900">₱{loan.remaining_principal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-ink-500 font-serif italic">Live Interest</span>
                     <span className={`font-bold ${liveInterestDue > (loan.principal * (loan.interest_rate/100)) ? 'text-wax-600 animate-pulse' : 'text-amber-700'}`}>₱{liveInterestDue.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between border-t border-paper-200 pt-1">
                     <span className="text-ink-500 font-serif font-bold">Total Payoff</span>
                     <span className="font-bold text-ink-900">₱{(loan.remaining_principal + liveInterestDue).toLocaleString()}</span>
                   </div>
                </div>
                <div className="mt-auto pt-4 border-t border-paper-200 flex gap-2 pl-3">
                   {loan.status === 'pending' ? (
                     <button onClick={(e) => { e.stopPropagation(); handleReviewLoan(loan); }} className="w-full py-2 bg-ink-800 text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-ink-900 shadow-sm transition-colors">Review Request</button>
                   ) : (
                     <button className="w-full py-2 bg-transparent text-ink-600 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-paper-100 transition-colors border border-paper-300">Detailed Ledger</button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-paper-100 font-sans selection:bg-gold-500/30 selection:text-ink-900">
      <AnnouncementModal isOpen={isSystemAnnouncementOpen} onClose={() => setIsSystemAnnouncementOpen(false)} announcements={systemAnnouncements} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 lg:ml-72 min-h-screen p-8 md:p-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && renderAdminDashboard()}
              {activeTab === 'loans' && renderLoansTab()}
              {activeTab === 'my-dashboard' && <MemberDashboard user={currentUser} memberLoans={loans.filter(l => l.borrower_id === currentUser.id)} memberContributions={contributions.filter(c => c.member_id === currentUser.id)} memberSavingGoals={savingGoals} onApplyLoan={() => setIsApplicationModalOpen(true)} onAddContribution={() => setIsContributionModalOpen(true)} />}
              {activeTab === 'members' && <MemberDirectory members={members} loans={loans} onRefresh={refreshData} currentUserRole={currentUser.role} />}
              {activeTab === 'treasury' && <TreasuryDashboard treasuryStats={treasuryStats} contributions={contributions} loans={loans} allPayments={allPayments} activeLoanVolume={activeVolume} totalInterestGained={totalInterestGained} onAddContribution={() => setIsContributionModalOpen(true)} onApproveContribution={handleApproveContribution} onRejectContribution={handleRejectContribution} loading={loading} />}
              {activeTab === 'announcements' && <AnnouncementHistory onOpenCreate={handleOpenAnnouncementCreate} onEdit={handleOpenAnnouncementEdit} readOnly={currentUser.role === 'member'} />}
              {activeTab === 'gallery' && <GalleryView currentUser={currentUser} />}
              {activeTab === 'personal-ledger' && <PersonalLedger currentUser={currentUser} />}
              {activeTab === 'schedules' && <ScheduleView filterByUserId={currentUser.role === 'member' ? currentUser.id : undefined} />}
              {activeTab === 'dev-guide' && <DeveloperGuide />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {currentUser.role === 'admin' && <LoanApprovalModal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} loan={selectedLoan} onApprove={handleApproveLoan} onReject={handleRejectLoan} treasuryBalance={treasuryStats.balance} />}
      <LoanDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} loan={selectedLoan} onPaymentSuccess={refreshData} />
      <LoanApplicationForm isOpen={isApplicationModalOpen} onClose={() => setIsApplicationModalOpen(false)} onSubmit={handleCreateLoan} members={members} currentUser={currentUser} />
      <ContributionModal isOpen={isContributionModalOpen} onClose={() => setIsContributionModalOpen(false)} onSubmit={handleAddContribution} members={members} currentUser={currentUser} />
      <CreateAnnouncementModal isOpen={isAnnouncementModalOpen} onClose={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }} onSubmit={handleSaveAnnouncement} editingAnnouncement={editingAnnouncement} />
    </div>
  );
};

export default App;
