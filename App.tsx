
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { StatCard } from './components/StatCard';
import LoanApprovalModal from './components/LoanApprovalModal';
import LoanAgreementModal from './components/LoanAgreementModal';
import LoanApplicationForm from './components/LoanApplicationForm';
import LoanDetailsModal from './components/LoanDetailsModal';
import ContributionModal from './components/ContributionModal';
import WithdrawalModal from './components/WithdrawalModal';
import PaymentRequestModal from './components/PaymentRequestModal';
import DistributionReport from './components/DistributionReport';
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
import { LoanWithBorrower, User, ContributionWithMember, WithdrawalWithMember, PaymentRequestWithDetails, ContributionStatus, Announcement, AnnouncementPriority, LoanStatus, Payment, SavingGoal } from './types';
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
  CalendarDays,
  Download,
  Banknote,
  ShieldAlert
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
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithMember[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestWithDetails[]>([]);
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
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [loanForPaymentRequest, setLoanForPaymentRequest] = useState<LoanWithBorrower | null>(null);
  
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
    totalPrincipalRepaid: 0,
    totalWithdrawn: 0
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
      } catch {
        setInitialLoading(false);
      }
    };
    initSession();
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedLoans, fetchedMetrics, fetchedVolume, fetchedInterest, fetchedUsers, fetchedContributions, fetchedWithdrawals, fetchedPaymentRequests, fetchedAnnouncements, fetchedSavingGoals, fetchedPayments] = await Promise.all([
        dataService.getLoans(),
        dataService.getTreasuryMetrics(),
        dataService.getActiveLoanVolume(),
        dataService.getTotalInterestGained(),
        dataService.getUsers(),
        dataService.getContributions(),
        dataService.getWithdrawals(),
        dataService.getPaymentRequests(),
        dataService.getActiveAnnouncements(),
        dataService.getSavingGoals(currentUser.id),
        dataService.getAllPayments()
      ]);

      setLoans(fetchedLoans);
      setTreasuryStats(fetchedMetrics);
      setActiveVolume(fetchedVolume);
      setTotalInterestGained(fetchedInterest);
      setMembers(fetchedUsers);
      setContributions(fetchedContributions);
      setWithdrawals(fetchedWithdrawals);
      setPaymentRequests(fetchedPaymentRequests);
      setSavingGoals(fetchedSavingGoals);
      setAllPayments(fetchedPayments);
      
      if (fetchedAnnouncements && fetchedAnnouncements.length > 0 && !hasShownAnnouncement) {
        setSystemAnnouncements(fetchedAnnouncements);
        setTimeout(() => {
           setIsSystemAnnouncementOpen(true);
           setHasShownAnnouncement(true);
        }, 800);
      }
      
      const updatedCurrentUser = fetchedUsers.find(u => u.id === currentUser.id);
      if (updatedCurrentUser) {
        // Only update if equity or role changed to avoid unnecessary re-renders
        setCurrentUser(prev => {
          if (!prev) return updatedCurrentUser;
          if (prev.equity !== updatedCurrentUser.equity || prev.role !== updatedCurrentUser.role || prev.full_name !== updatedCurrentUser.full_name) {
            return updatedCurrentUser;
          }
          return prev;
        });
      }
      
      setSelectedLoan(prev => {
        if (!prev) return null;
        const updatedSelectedLoan = fetchedLoans.find(l => l.id === prev.id);
        if (updatedSelectedLoan) {
          // Simple check to avoid infinite loop if object is same data but new reference
          if (JSON.stringify(prev) !== JSON.stringify(updatedSelectedLoan)) {
            return updatedSelectedLoan;
          }
        }
        return prev;
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, hasShownAnnouncement]); // Removed selectedLoan?.id dependency by using functional update for setSelectedLoan

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        await refreshData();
        setInitialLoading(false);
      }
    };
    loadData();
  }, [currentUser, refreshData]);

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
      setWithdrawals([]);
      setPaymentRequests([]);
      setSavingGoals([]);
      setHasShownAnnouncement(false);
      setSystemAnnouncements([]);
      setIsSystemAnnouncementOpen(false);
    } catch {
      // Ignore
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

  const handleApproveLoan = async (loanId: string, customRate: number, startDate?: Date) => {
    try {
      await dataService.updateLoanStatus(loanId, 'active', customRate, startDate);
      
      // Find the loan before refreshing to show in the agreement modal
      const approvedLoan = loans.find(l => l.id === loanId);
      if (approvedLoan) {
        // Create a copy with updated values for the modal
        const updatedLoan: LoanWithBorrower = {
          ...approvedLoan,
          status: 'active',
          interest_rate: customRate,
          created_at: startDate ? startDate.toISOString() : approvedLoan.created_at
        };
        setSelectedLoan(updatedLoan);
        setIsAgreementModalOpen(true);
      }
      
      await refreshData();
      setIsApprovalModalOpen(false);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleRejectLoan = async (loanId: string) => {
    try {
      await dataService.updateLoanStatus(loanId, 'rejected');
      await refreshData();
      setIsApprovalModalOpen(false);
      setSelectedLoan(null);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleCreateLoan = async (data: { borrower_id: string; principal: number; duration_months: number; purpose: string }) => {
    const hasPending = loans.some(l => l.borrower_id === data.borrower_id && l.status === 'pending');
    if (hasPending) throw new Error("This borrower already has a pending loan request.");
    await dataService.createLoan(data);
    await refreshData();
  };

  const handleAddContribution = async (data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }) => {
    await dataService.addContribution(data);
    await refreshData();
  };

  const handleApproveContribution = async (id: string) => {
    try {
      await dataService.updateContributionStatus(id, 'approved');
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleRejectContribution = async (id: string) => {
    try {
      await dataService.updateContributionStatus(id, 'rejected');
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleRequestWithdrawal = async (data: { member_id: string; amount: number; is_full_withdrawal: boolean }) => {
    await dataService.requestWithdrawal(data);
    await refreshData();
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await dataService.updateWithdrawalStatus(id, 'approved');
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await dataService.updateWithdrawalStatus(id, 'rejected');
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleOpenPaymentRequest = (loan: LoanWithBorrower) => {
    setLoanForPaymentRequest(loan);
    setIsPaymentRequestModalOpen(true);
  };

  const handleSubmitPaymentRequest = async (data: { loan_id: string; member_id: string; amount: number; note?: string }) => {
    await dataService.requestPayment(data);
    await refreshData();
  };

  const handleApprovePaymentRequest = async (request: PaymentRequestWithDetails) => {
    try {
      await dataService.approvePaymentRequest(request);
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleRejectPaymentRequest = async (id: string) => {
    try {
      await dataService.rejectPaymentRequest(id);
      await refreshData();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };
  
  const handleSaveAnnouncement = async (title: string, message: string, priority: AnnouncementPriority, start: string | null, end: string | null) => {
    if (!currentUser) return;
    if (editingAnnouncement) {
      await dataService.updateAnnouncement(editingAnnouncement.id, { title, message, priority, scheduled_start: start, scheduled_end: end });
    } else {
      await dataService.createAnnouncement(title, message, currentUser.id, priority, start, end);
    }
    await refreshData(); 
    setEditingAnnouncement(null);
  };
  
  const handleOpenAnnouncementCreate = () => {
     setEditingAnnouncement(null);
     setIsAnnouncementModalOpen(true);
  };

  const handleOpenAnnouncementEdit = (announcement: Announcement) => {
     setEditingAnnouncement(announcement);
     setIsAnnouncementModalOpen(true);
  };

  // Aggregates the last 6 months of approved contributions vs. loan disbursements
  // so the Executive Summary can show cash-flow direction at a glance, not just totals.
  // Must live before any early `return` below - Hooks can't be called conditionally.
  const dashboardTrendData = useMemo(() => {
    const months: { key: string; label: string; inflow: number; outflow: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        inflow: 0,
        outflow: 0,
      });
    }
    const bucket = new Map(months.map(m => [m.key, m]));

    contributions.forEach(c => {
      if (c.status !== 'approved' || !c.date) return;
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = bucket.get(key);
      if (m) m.inflow += c.amount;
    });

    loans.forEach(l => {
      if (l.status === 'pending' || l.status === 'rejected' || !l.created_at) return;
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = bucket.get(key);
      if (m) m.outflow += l.principal;
    });

    return months;
  }, [contributions, loans]);

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

  const renderDashboardSkeleton = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-3">
          <div className="h-9 w-64 bg-paper-200 rounded-sm animate-pulse" />
          <div className="h-5 w-80 bg-paper-100 rounded-sm animate-pulse" />
        </div>
        <div className="h-10 w-44 bg-paper-100 rounded-sm animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-paper-50 border-2 border-paper-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-2.5 w-20 bg-paper-200 rounded-sm animate-pulse" />
                <div className="h-7 w-28 bg-paper-200 rounded-sm animate-pulse" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-paper-100 animate-pulse" />
            </div>
            <div className="h-3 w-24 bg-paper-100 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white p-8 rounded-sm border-2 border-paper-200 h-[320px] animate-pulse" />
    </div>
  );

  const renderAdminDashboard = () => {
    const pendingLoans = loans.filter(l => l.status === 'pending');
    const pendingContributions = contributions.filter(c => c.status === 'pending');
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

    if (loading) return renderDashboardSkeleton();

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard index={0} title="Treasury Balance" value={`₱${treasuryStats.balance.toLocaleString()}`} icon={Wallet} trend="Liquid Assets" trendUp={true} colorClass="text-emerald-700" />
          <StatCard index={1} title="Gains Realized" value={`₱${(treasuryStats.totalInterestCollected + treasuryStats.totalPenaltyCollected).toLocaleString()}`} icon={TrendingUp} trend="Interest + Penalties" trendUp={true} colorClass="text-purple-700" />
          <StatCard index={2} title="Total Receivables" value={`₱${activeVolume.toLocaleString()}`} icon={Coins} trend="Loan Book Value" trendUp={true} colorClass="text-blue-700" />
          <StatCard index={3} title="Assessments Due" value={`${pendingLoans.length + pendingContributions.length + pendingWithdrawals.length}`} icon={ClipboardCheck} colorClass={pendingLoans.length > 0 ? "text-wax-600" : "text-ink-600"} />
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-sm border-2 border-paper-200 shadow-card">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ink-900 text-gold-500 rounded-sm shadow-md -rotate-3">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-ink-900">Treasury Trend</h2>
                <p className="text-xs text-ink-400 uppercase tracking-widest font-black">Last 6 Months, Inflows vs. Disbursed</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-xs font-serif italic text-ink-600">Contributions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-wax-500" />
                <span className="text-xs font-serif italic text-ink-600">Disbursed</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardTrendData}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#065F46" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#065F46" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#B45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E3E0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#8A8579' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#8A8579' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#F5F2ED', border: '1px solid #DED9D1', fontFamily: 'serif', borderRadius: 2 }}
                  formatter={(value, name) => [`₱${Number(value ?? 0).toLocaleString()}`, String(name)]}
                />
                <Area type="monotone" dataKey="inflow" name="Contributions" stroke="#065F46" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
                <Area type="monotone" dataKey="outflow" name="Disbursed" stroke="#B45309" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
                 {/* Desktop Table */}
                 <div className="hidden md:block overflow-x-auto">
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

                 {/* Mobile Card List */}
                 <div className="md:hidden divide-y divide-paper-200">
                    {pendingContributions.length === 0 ? (
                       <div className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">No pending deposits.</div>
                    ) : (
                       pendingContributions.map((c) => (
                          <div key={c.id} className="p-4 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <div className="font-serif font-bold text-ink-900 text-lg">{c.member.full_name}</div>
                                   <div className="mt-1">
                                      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">{c.type.replace('_', ' ')}</span>
                                   </div>
                                </div>
                                <div className="font-mono font-bold text-emerald-700 text-lg">+₱{c.amount.toLocaleString()}</div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleRejectContribution(c.id)} className="flex-1 py-2 text-wax-600 bg-wax-50 rounded-sm text-xs font-black uppercase transition-colors border border-wax-200">Decline</button>
                                <button onClick={() => handleApproveContribution(c.id)} className="flex-1 py-2 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black uppercase transition-all">Confirm</button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>

           <div className="mt-4">
              <div className="flex items-center justify-between border-b border-paper-300 pb-4 mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-wax-50 text-wax-600 rounded-sm border border-wax-100">
                       <Banknote size={20} />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-ink-900">Withdrawal Requests</h2>
                 </div>
              </div>
              <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
                 {/* Desktop Table */}
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-paper-100 border-b border-paper-200 text-sm font-bold text-ink-500 uppercase">
                          <tr>
                             <th className="px-6 py-4">Member</th>
                             <th className="px-6 py-4">Type</th>
                             <th className="px-6 py-4">Amount</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-paper-200">
                          {pendingWithdrawals.length === 0 ? (
                             <tr><td colSpan={4} className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">No pending withdrawal requests.</td></tr>
                          ) : (
                             pendingWithdrawals.map((w) => (
                                <tr key={w.id} className="hover:bg-paper-100/50 transition-colors">
                                   <td className="px-6 py-4 font-serif font-bold text-ink-900 text-lg">{w.member.full_name}</td>
                                   <td className="px-6 py-4">
                                      {w.is_full_withdrawal ? (
                                         <span className="text-xs font-black uppercase text-wax-700 bg-wax-50 px-2 py-0.5 rounded-sm border border-wax-200 flex items-center gap-1 w-fit"><ShieldAlert size={12} /> Full Exit</span>
                                      ) : (
                                         <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">Partial</span>
                                      )}
                                   </td>
                                   <td className="px-6 py-4 font-mono font-bold text-wax-700 text-lg">-₱{w.amount.toLocaleString()}</td>
                                   <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                         <button onClick={() => handleRejectWithdrawal(w.id)} className="px-3 py-1.5 text-wax-600 hover:bg-wax-50 rounded-sm text-xs font-black uppercase transition-colors">Decline</button>
                                         <button onClick={() => handleApproveWithdrawal(w.id)} className="px-4 py-1.5 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black transition-all">Confirm</button>
                                      </div>
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* Mobile Card List */}
                 <div className="md:hidden divide-y divide-paper-200">
                    {pendingWithdrawals.length === 0 ? (
                       <div className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">No pending withdrawal requests.</div>
                    ) : (
                       pendingWithdrawals.map((w) => (
                          <div key={w.id} className="p-4 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <div className="font-serif font-bold text-ink-900 text-lg">{w.member.full_name}</div>
                                   <div className="mt-1">
                                      {w.is_full_withdrawal ? (
                                         <span className="text-[10px] font-black uppercase text-wax-700 bg-wax-50 px-2 py-0.5 rounded-sm border border-wax-200">Full Exit</span>
                                      ) : (
                                         <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">Partial</span>
                                      )}
                                   </div>
                                </div>
                                <div className="font-mono font-bold text-wax-700 text-lg">-₱{w.amount.toLocaleString()}</div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleRejectWithdrawal(w.id)} className="flex-1 py-2 text-wax-600 bg-wax-50 rounded-sm text-xs font-black uppercase transition-colors border border-wax-200">Decline</button>
                                <button onClick={() => handleApproveWithdrawal(w.id)} className="flex-1 py-2 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black uppercase transition-all">Confirm</button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderLoansTab = () => {
    if (loading) return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="h-9 w-48 bg-paper-200 rounded-sm animate-pulse" />
          <div className="h-11 w-32 bg-paper-200 rounded-sm animate-pulse" />
        </div>
        <div className="bg-paper-50 p-4 rounded-sm shadow-sm border border-paper-200 h-[68px] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-paper-50 rounded-sm border-2 border-paper-200 p-6 space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-sm bg-paper-200 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-28 bg-paper-200 rounded-sm animate-pulse" />
                  <div className="h-2.5 w-20 bg-paper-100 rounded-sm animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-32 bg-paper-200 rounded-sm animate-pulse" />
              <div className="h-2 w-full bg-paper-100 rounded-sm animate-pulse" />
              <div className="h-2.5 w-24 bg-paper-100 rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
    
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

        {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-paper-50 rounded-sm border-2 border-emerald-200 shadow-card overflow-hidden">
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-sm -rotate-3">
                <Banknote size={18} />
              </div>
              <h2 className="text-lg font-serif font-bold text-ink-900">Repayment Requests Awaiting Confirmation</h2>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-paper-100 border-b border-paper-200 text-xs font-bold text-ink-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Loan</th>
                    <th className="px-6 py-3">Amount Claimed</th>
                    <th className="px-6 py-3">Note</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {paymentRequests.filter(r => r.status === 'pending').map(r => (
                    <tr key={r.id} className="hover:bg-paper-100/50 transition-colors">
                      <td className="px-6 py-4 font-serif font-bold text-ink-900">{r.member.full_name}</td>
                      <td className="px-6 py-4 text-ink-500 text-sm">{r.loan.purpose}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700">₱{r.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-ink-400 text-xs font-serif italic">{r.note || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleRejectPaymentRequest(r.id)} className="px-3 py-1.5 text-wax-600 hover:bg-wax-50 rounded-sm text-xs font-black uppercase transition-colors">Decline</button>
                          <button onClick={() => handleApprovePaymentRequest(r)} className="px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-sm text-xs font-black transition-all">Confirm & Record</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-paper-200">
              {paymentRequests.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-serif font-bold text-ink-900">{r.member.full_name}</div>
                      <div className="text-xs text-ink-400">{r.loan.purpose}</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-700">₱{r.amount.toLocaleString()}</div>
                  </div>
                  {r.note && <div className="text-xs text-ink-400 font-serif italic">"{r.note}"</div>}
                  <div className="flex gap-2">
                    <button onClick={() => handleRejectPaymentRequest(r.id)} className="flex-1 py-2 text-wax-600 bg-wax-50 rounded-sm text-xs font-black uppercase border border-wax-200">Decline</button>
                    <button onClick={() => handleApprovePaymentRequest(r)} className="flex-1 py-2 bg-emerald-600 text-white rounded-sm text-xs font-black uppercase">Confirm</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map(loan => {
            const loanPayments = allPayments.filter(p => p.loan_id === loan.id);
            const liveInterestDue = dataService.calculateLiveInterest(loan, loanPayments);
            const debtDetails = dataService.calculateDetailedDebt(loan, loanPayments);
            const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);
            
            const isEffectivelyPaid = loan.status === 'active' && debtDetails.liveTotalDue <= 0.01;
            const displayStatus = isEffectivelyPaid ? 'paid' : loan.status;

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
                         <p className="text-xs text-ink-500 font-mono mt-0.5">{displayStatus === 'active' ? 'Active Account' : displayStatus === 'pending' ? 'Pending Approval' : displayStatus === 'paid' ? 'Settled Account' : displayStatus}</p>
                      </div>
                   </div>
                   <div className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-widest border ${displayStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : displayStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : displayStatus === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-paper-100 text-ink-500 border-paper-200'}`}>
                     {displayStatus}
                   </div>
                </div>
                
                {/* Repayment Tracking Mini-Section for Active Loans */}
                {displayStatus === 'active' && nextDue && (
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
                     <>
                       <button className="flex-1 py-2 bg-transparent text-ink-600 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-paper-100 transition-colors border border-paper-300">Detailed Ledger</button>
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoan(loan);
                          setIsAgreementModalOpen(true);
                        }}
                        className="px-3 py-2 bg-paper-100 text-ink-600 rounded-sm hover:bg-paper-200 transition-colors border border-paper-300 flex items-center justify-center"
                        title="Download Agreement"
                       >
                        <Download size={14} />
                       </button>
                     </>
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
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 lg:ml-72 min-h-screen p-6 md:p-12 pt-28 md:pt-32 lg:pt-12">
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
              {activeTab === 'my-dashboard' && (
                <MemberDashboard 
                  user={currentUser} 
                  memberLoans={loans.filter(l => l.borrower_id === currentUser.id)} 
                  memberContributions={contributions.filter(c => c.member_id === currentUser.id)} 
                  memberSavingGoals={savingGoals} 
                  allPayments={allPayments} 
                  onApplyLoan={() => setIsApplicationModalOpen(true)} 
                  onAddContribution={() => setIsContributionModalOpen(true)} 
                  onRequestWithdrawal={() => setIsWithdrawalModalOpen(true)}
                  onRequestPayment={handleOpenPaymentRequest}
                  onViewAgreement={(loan) => {
                    setSelectedLoan(loan);
                    setIsAgreementModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'members' && <MemberDirectory members={members} loans={loans} onRefresh={refreshData} currentUserRole={currentUser.role} loading={loading} />}
              {activeTab === 'treasury' && <TreasuryDashboard treasuryStats={treasuryStats} contributions={contributions} loans={loans} allPayments={allPayments} activeLoanVolume={activeVolume} totalInterestGained={totalInterestGained} onAddContribution={() => setIsContributionModalOpen(true)} onApproveContribution={handleApproveContribution} onRejectContribution={handleRejectContribution} loading={loading} />}
              {activeTab === 'distribution' && <DistributionReport members={members} contributions={contributions} loans={loans} allPayments={allPayments} treasuryBalance={treasuryStats.balance} />}
              {activeTab === 'announcements' && <AnnouncementHistory onOpenCreate={handleOpenAnnouncementCreate} onEdit={handleOpenAnnouncementEdit} readOnly={currentUser.role !== 'admin'} />}
              {activeTab === 'gallery' && <GalleryView currentUser={currentUser} />}
              {activeTab === 'personal-ledger' && <PersonalLedger currentUser={currentUser} />}
              {activeTab === 'schedules' && <ScheduleView filterByUserId={currentUser.role !== 'admin' ? currentUser.id : undefined} />}
              {activeTab === 'dev-guide' && <DeveloperGuide />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {currentUser.role === 'admin' && <LoanApprovalModal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} loan={selectedLoan} onApprove={handleApproveLoan} onReject={handleRejectLoan} treasuryBalance={treasuryStats.balance} />}
      <LoanDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        loan={selectedLoan} 
        onPaymentSuccess={refreshData} 
        isAdmin={currentUser?.role === 'admin'}
        onViewAgreement={() => {
          setIsDetailsModalOpen(false);
          setIsAgreementModalOpen(true);
        }}
      />
      <LoanAgreementModal 
        isOpen={isAgreementModalOpen} 
        onClose={() => {
          setIsAgreementModalOpen(false);
          setSelectedLoan(null);
        }} 
        loan={selectedLoan} 
      />
      <LoanApplicationForm isOpen={isApplicationModalOpen} onClose={() => setIsApplicationModalOpen(false)} onSubmit={handleCreateLoan} members={members} currentUser={currentUser} />
      <ContributionModal isOpen={isContributionModalOpen} onClose={() => setIsContributionModalOpen(false)} onSubmit={handleAddContribution} members={members} currentUser={currentUser} />
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        onSubmit={handleRequestWithdrawal}
        currentUser={currentUser}
        hasActiveLoan={loans.some(l => l.borrower_id === currentUser.id && l.status === 'active')}
      />
      <PaymentRequestModal
        isOpen={isPaymentRequestModalOpen}
        onClose={() => { setIsPaymentRequestModalOpen(false); setLoanForPaymentRequest(null); }}
        onSubmit={handleSubmitPaymentRequest}
        loan={loanForPaymentRequest}
        currentUser={currentUser}
      />
      <CreateAnnouncementModal isOpen={isAnnouncementModalOpen} onClose={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }} onSubmit={handleSaveAnnouncement} editingAnnouncement={editingAnnouncement} />
    </div>
  );
};

export default App;
