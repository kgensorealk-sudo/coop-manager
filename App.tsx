
import React, { useState, useEffect, useRef } from 'react';
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
import { dataService } from './services/dataService';
import { LoanWithBorrower, User, ContributionWithMember, ContributionStatus, Announcement, AnnouncementPriority, LoanStatus } from './types';
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
  X
} from 'lucide-react';

// Helper to extract clean error message
const getErrorMessage = (err: any): string => {
  if (!err) return "Unknown error";
  if (typeof err === 'string') return err === '[object Object]' ? "An unexpected error occurred." : err;
  if (err instanceof Error) {
     if (err.message === '[object Object]') return "An unexpected error occurred.";
     return err.message;
  }
  if (typeof err === 'object') {
     if (err.message) {
       const msg = getErrorMessage(err.message);
       if (msg !== "An unexpected error occurred.") return msg;
     }
     if (err.error_description) return getErrorMessage(err.error_description);
     if (err.error) return getErrorMessage(err.error);
     if (Array.isArray(err)) return err.map(e => getErrorMessage(e)).join(', ');
     try {
       const json = JSON.stringify(err);
       return json === '{}' ? "An unexpected error occurred." : json;
     } catch {
       return "An error occurred.";
     }
  }
  return String(err);
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading Ledger...');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  
  // Search and Filter state for Loan Ledger
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
  // Removed unused authLoading state as initialLoading covers the login transition
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  
  const [treasuryStats, setTreasuryStats] = useState({ 
    balance: 0, 
    totalContributions: 0, 
    totalPayments: 0, 
    totalDisbursed: 0,
    totalInterestCollected: 0,
    totalPrincipalRepaid: 0
  });
  const [activeVolume, setActiveVolume] = useState(0);
  const [totalInterestGained, setTotalInterestGained] = useState(0);

  // Close dropdown when clicking outside
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
      const [fetchedLoans, fetchedMetrics, fetchedVolume, fetchedInterest, fetchedUsers, fetchedContributions, fetchedAnnouncements] = await Promise.all([
        dataService.getLoans(),
        dataService.getTreasuryMetrics(),
        dataService.getActiveLoanVolume(),
        dataService.getTotalInterestGained(),
        dataService.getUsers(),
        dataService.getContributions(),
        dataService.getActiveAnnouncements()
      ]);

      setLoans(fetchedLoans);
      setTreasuryStats(fetchedMetrics);
      setActiveVolume(fetchedVolume);
      setTotalInterestGained(fetchedInterest);
      setMembers(fetchedUsers);
      setContributions(fetchedContributions);
      
      if (fetchedAnnouncements && fetchedAnnouncements.length > 0 && !hasShownAnnouncement) {
        setSystemAnnouncements(fetchedAnnouncements);
        setTimeout(() => {
           setIsSystemAnnouncementOpen(true);
           setHasShownAnnouncement(true);
        }, 800);
      }
      
      const updatedCurrentUser = fetchedUsers.find(u => u.id === currentUser.id);
      if (updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedCurrentUser);
      }
      
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
      let user: User;
      const loginAction = isSignup && fullName 
          ? dataService.signUp(email, pass, fullName)
          : dataService.login(email, pass);
      const [result] = await Promise.all([loginAction, minLoginTime]);
      user = result;
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
      setHasShownAnnouncement(false);
      setSystemAnnouncements([]);
      setIsSystemAnnouncementOpen(false);
    } catch (e) {
    } finally {
      setInitialLoading(false);
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
      await refreshData(); // Refresh to ensure synchronization
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

  if (!currentUser) {
    return (
      <LoginScreen onLogin={handleLogin} loading={false} error={authError} success={authSuccess} />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper-100 flex flex-col items-center justify-center p-4">
        <div className="bg-paper-50 p-8 rounded-sm shadow-card max-w-md w-full text-center space-y-4 border border-paper-300">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-700 border border-red-100">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink-900">Connection Failed</h2>
          <div className="text-sm text-ink-600 bg-red-50 p-4 rounded-sm border-l-4 border-wax-500 text-left font-mono">{error}</div>
          <p className="text-ink-500 text-sm">Ensure SQL setup is complete.</p>
          <button onClick={refreshData} className="flex items-center gap-2 px-6 py-2.5 bg-ink-800 hover:bg-ink-900 text-white rounded-sm font-bold uppercase tracking-wide text-sm mx-auto mt-4 transition-colors">
             <RefreshCw size={16} />
             <span>Retry Connection</span>
           </button>
        </div>
      </div>
    );
  }

  const renderAdminDashboard = () => {
    const pendingLoans = loans.filter(l => l.status === 'pending');
    const pendingContributions = contributions.filter(c => c.status === 'pending');

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-ink-900">Executive Summary</h1>
            <p className="text-ink-600 mt-2 font-serif italic text-2xl">Welcome to the Registry, Administrator {currentUser.full_name.split(' ')[0]}.</p>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={handleOpenAnnouncementCreate}
               className="flex items-center space-x-2 px-5 py-2.5 bg-paper-50 text-ink-800 hover:bg-paper-100 border border-paper-300 rounded-sm text-sm font-black uppercase tracking-[0.15em] transition-all shadow-sm"
             >
               <Megaphone size={16} />
               <span>Broadcast Notice</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Treasury Balance" value={`₱${treasuryStats.balance.toLocaleString()}`} icon={Wallet} trend="Liquid Assets" trendUp={true} colorClass="text-emerald-700" />
          <StatCard title="Interest Income" value={`₱${totalInterestGained.toLocaleString()}`} icon={TrendingUp} trend="Gross Earnings" trendUp={true} colorClass="text-purple-700" />
          <StatCard title="Loan Volume" value={`₱${activeVolume.toLocaleString()}`} icon={Coins} trend="Deployed Capital" trendUp={true} colorClass="text-blue-700" />
          <StatCard title="Assessments Due" value={`${pendingLoans.length + pendingContributions.length}`} icon={ClipboardCheck} colorClass={pendingLoans.length > 0 ? "text-wax-600" : "text-ink-600"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
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
                    <p className="text-xl font-serif italic text-ink-400">All applications have been processed. The inbox is clear.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingLoans.map((loan) => {
                       const monthlyInterest = loan.principal * (loan.interest_rate / 100);
                       const totalInterest = monthlyInterest * loan.duration_months;
                       const totalResp = loan.principal + totalInterest;

                       return (
                          <div key={loan.id} className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card hover:border-ink-400 transition-all p-6 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 px-3 py-1 bg-ink-900 text-gold-500 text-[10px] font-black uppercase tracking-widest rotate-0">New Request</div>
                             
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-sm bg-white p-1 shadow-sm border border-paper-200">
                                   <img src={loan.borrower.avatar_url} className="w-full h-full object-cover grayscale" alt="" />
                                </div>
                                <div>
                                   <h3 className="text-xl font-serif font-bold text-ink-900">{loan.borrower.full_name}</h3>
                                   <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-ink-400 uppercase">{loan.borrower.email}</span>
                                   </div>
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

                                <div className="border-t border-dashed border-paper-300 pt-4">
                                   <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-serif italic text-ink-500">Responsibility Calculation:</span>
                                      <span className="text-xs font-mono text-ink-400">P + (I × T)</span>
                                   </div>
                                   <div className="flex justify-between items-end">
                                      <div className="text-xs text-ink-500">
                                         ₱{loan.principal.toLocaleString()} + (₱{monthlyInterest.toLocaleString()} × {loan.duration_months})
                                      </div>
                                      <div className="text-lg font-mono font-black text-emerald-700">
                                         = ₱{totalResp.toLocaleString()}
                                      </div>
                                   </div>
                                </div>
                             </div>

                             <div className="flex gap-3">
                                <button 
                                   onClick={() => handleReviewLoan(loan)}
                                   className="flex-1 py-3 bg-ink-900 text-white rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                >
                                   Perform Assessment <ArrowRight size={14} />
                                </button>
                             </div>
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
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-paper-100 border-b border-paper-200 text-sm font-bold text-ink-500 uppercase tracking-[0.1em]">
                          <tr>
                             <th className="px-6 py-4">Sender</th>
                             <th className="px-6 py-4">Deposit Type</th>
                             <th className="px-6 py-4">Amount</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-paper-200">
                          {pendingContributions.length === 0 ? (
                             <tr><td colSpan={4} className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">No pending deposits to verify.</td></tr>
                          ) : (
                             pendingContributions.map((c) => (
                                <tr key={c.id} className="hover:bg-paper-100/50 transition-colors group">
                                   <td className="px-6 py-4">
                                      <div className="font-serif font-bold text-ink-900 text-lg">{c.member.full_name}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">
                                         {c.type.replace('_', ' ')}
                                      </span>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="font-mono font-bold text-emerald-700 text-lg">+₱{c.amount.toLocaleString()}</div>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                         <button 
                                            onClick={() => handleRejectContribution(c.id)}
                                            className="px-3 py-1.5 text-wax-600 hover:bg-wax-50 rounded-sm text-xs font-black uppercase tracking-widest transition-colors border border-transparent hover:border-wax-200"
                                         >
                                            Decline
                                         </button>
                                         <button 
                                            onClick={() => handleApproveContribution(c.id)}
                                            className="px-4 py-1.5 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                         >
                                            Confirm
                                         </button>
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
      </div>
    );
  };

  const renderLoansTab = () => {
    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div></div>;
    
    // Updated: Multi-criteria filtering logic
    const filteredLoans = loans.filter(l => {
      const matchesSearch = l.borrower.full_name.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
                          l.purpose.toLowerCase().includes(loanSearchTerm.toLowerCase());
      const matchesStatus = loanFilterStatus === 'all' || l.status === loanFilterStatus;
      return matchesSearch && matchesStatus;
    });

    const statusFilters: { id: LoanStatus | 'all', label: string }[] = [
      { id: 'all', label: 'All Entries' },
      { id: 'pending', label: 'Pending' },
      { id: 'active', label: 'Active' },
      { id: 'paid', label: 'Settled' },
      { id: 'rejected', label: 'Rejected' },
    ];

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
            <input 
              type="text" 
              placeholder="Search by name or purpose..." 
              value={loanSearchTerm}
              onChange={(e) => setLoanSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none font-serif placeholder:text-ink-300 text-ink-800" 
            />
          </div>

          <div className="relative" ref={filterDropdownRef}>
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-sm text-sm font-bold uppercase tracking-widest transition-all ${
                loanFilterStatus !== 'all' 
                  ? 'bg-ink-900 text-white border-ink-900 shadow-md' 
                  : 'border-paper-300 text-ink-600 hover:bg-paper-100'
              }`}
            >
              <Filter size={16} />
              <span>{loanFilterStatus === 'all' ? 'Filter' : `Status: ${loanFilterStatus}`}</span>
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-paper-300 shadow-float z-30 rounded-sm overflow-hidden animate-zoom-in">
                <div className="p-2 border-b border-paper-100 bg-paper-50 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest px-2">Categorize By</span>
                  {loanFilterStatus !== 'all' && (
                    <button 
                      onClick={() => {setLoanFilterStatus('all'); setIsFilterDropdownOpen(false);}}
                      className="text-[10px] font-bold text-wax-600 hover:underline uppercase"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="py-1">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setLoanFilterStatus(filter.id);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-serif transition-colors flex items-center justify-between ${
                        loanFilterStatus === filter.id 
                          ? 'bg-paper-100 text-ink-900 font-bold' 
                          : 'text-ink-600 hover:bg-paper-50'
                      }`}
                    >
                      <span>{filter.label}</span>
                      {loanFilterStatus === filter.id && <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Badge */}
        {loanFilterStatus !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Active Constraint:</span>
            <div className="bg-ink-900 text-gold-500 px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              Status: {loanFilterStatus}
              <X 
                size={10} 
                className="cursor-pointer hover:text-white" 
                onClick={() => setLoanFilterStatus('all')}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map(loan => (
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
              <div className="space-y-3 mb-6 pl-3 border-l border-dashed border-paper-300 ml-0.5 font-mono text-sm">
                 <div className="flex justify-between">
                   <span className="text-ink-500 font-serif italic">Principal Due</span>
                   <span className="font-bold text-ink-900">₱{loan.remaining_principal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-ink-500 font-serif italic">Interest Due</span>
                   <span className="font-bold text-amber-700">₱{(loan.interest_accrued || 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between border-t border-paper-200 pt-1">
                   <span className="text-ink-500 font-serif font-bold">Total Payoff</span>
                   <span className="font-bold text-ink-900">₱{((loan.remaining_principal || 0) + (loan.interest_accrued || 0)).toLocaleString()}</span>
                 </div>
              </div>
              <div className="mt-auto pt-4 border-t border-paper-200 flex gap-2 pl-3">
                 {loan.status === 'pending' ? (
                   <button onClick={(e) => { e.stopPropagation(); handleReviewLoan(loan); }} className="w-full py-2 bg-ink-800 text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-ink-900 shadow-sm transition-colors">Review Request</button>
                 ) : (
                   <button className="w-full py-2 bg-transparent text-ink-600 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-paper-100 transition-colors border border-paper-300">View Details</button>
                 )}
              </div>
            </div>
          ))}
          {filteredLoans.length === 0 && (
            <div className="col-span-full py-16 text-center text-ink-400 flex flex-col items-center bg-paper-50 border-2 border-dashed border-paper-300 rounded-sm">
              <Activity size={48} className="opacity-20 mb-4" />
              <p className="text-lg font-serif font-bold text-ink-600">No records found matching your selection.</p>
              {(loanSearchTerm || loanFilterStatus !== 'all') && (
                <button 
                  onClick={() => {setLoanSearchTerm(''); setLoanFilterStatus('all');}}
                  className="mt-4 text-xs font-black uppercase text-blue-600 hover:underline tracking-widest"
                >
                  Clear all search parameters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-paper-100 font-sans selection:bg-gold-500/30 selection:text-ink-900">
      <AnnouncementModal isOpen={isSystemAnnouncementOpen} onClose={() => setIsSystemAnnouncementOpen(false)} announcements={systemAnnouncements} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 lg:ml-72 min-h-screen relative p-8 md:p-12">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderAdminDashboard()}
          {activeTab === 'loans' && renderLoansTab()}
          {activeTab === 'my-dashboard' && <MemberDashboard user={currentUser} memberLoans={loans.filter(l => l.borrower_id === currentUser.id)} memberContributions={contributions.filter(c => c.member_id === currentUser.id)} onApplyLoan={() => setIsApplicationModalOpen(true)} onAddContribution={() => setIsContributionModalOpen(true)} />}
          {activeTab === 'members' && <MemberDirectory members={members} loans={loans} onRefresh={refreshData} currentUserRole={currentUser.role} />}
          {activeTab === 'treasury' && <TreasuryDashboard treasuryStats={treasuryStats} contributions={contributions} loans={loans} activeLoanVolume={activeVolume} totalInterestGained={totalInterestGained} onAddContribution={() => setIsContributionModalOpen(true)} onApproveContribution={handleApproveContribution} onRejectContribution={handleRejectContribution} loading={loading} />}
          {activeTab === 'announcements' && <AnnouncementHistory onOpenCreate={handleOpenAnnouncementCreate} onEdit={handleOpenAnnouncementEdit} readOnly={currentUser.role === 'member'} />}
          {activeTab === 'gallery' && <GalleryView currentUser={currentUser} />}
          {activeTab === 'schedules' && <ScheduleView filterByUserId={currentUser.role === 'member' ? currentUser.id : undefined} />}
          {activeTab === 'dev-guide' && <DeveloperGuide />}
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
