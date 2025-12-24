
import React, { useState, useEffect } from 'react';
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
import { dataService } from './services/dataService';
import { LoanWithBorrower, User, ContributionWithMember, ContributionStatus, Announcement, AnnouncementPriority } from './types';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  Search, 
  Filter,
  TrendingUp, 
  Activity,
  Database,
  RefreshCw,
  AlertTriangle,
  Megaphone
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

// Main App Component
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  
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
  const [authLoading, setAuthLoading] = useState(false);
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

  // Dynamic Title Management
  useEffect(() => {
    if (!currentUser) {
      document.title = "The 13th Page - Registry Access";
    } else if (currentUser.role === 'admin') {
      document.title = "The 13th Page - Admin Dashboard";
    } else {
      document.title = "The 13th Page - Member Ledger";
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setIsSystemAnnouncementOpen(true);
        setHasShownAnnouncement(true);
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
      console.error("Failed to fetch data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, pass: string, isSignup?: boolean, fullName?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      let user: User;
      if (isSignup && fullName) {
        user = await dataService.signUp(email, pass, fullName);
      } else {
        user = await dataService.login(email, pass);
      }
      setCurrentUser(user);
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'my-dashboard');
    } catch (err: any) {
      const message = getErrorMessage(err);
      if (message.includes("Registration successful")) {
        setAuthSuccess(message);
        setAuthError(null);
      } else {
        console.error("Auth error:", err);
        setAuthError(message);
        setAuthSuccess(null);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await dataService.logout();
    setCurrentUser(null);
    setLoans([]);
    setMembers([]);
    setContributions([]);
    setHasShownAnnouncement(false);
    setSystemAnnouncements([]);
    setIsSystemAnnouncementOpen(false);
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
      console.error(error);
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
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  const handleCreateLoan = async (data: { borrower_id: string; principal: number; duration_months: number; purpose: string }) => {
    const hasPending = loans.some(l => l.borrower_id === data.borrower_id && l.status === 'pending');
    if (hasPending) {
       throw new Error("This borrower already has a pending loan request.");
    }
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
      console.error(e);
      alert(getErrorMessage(e));
    }
  };

  const handleRejectContribution = async (id: string) => {
    try {
      await dataService.updateContributionStatus(id, 'rejected');
      await refreshData();
    } catch (e) {
      console.error(e);
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
      setEditingAnnouncement(null);
    } catch (e) {
      console.error(e);
      alert(getErrorMessage(e));
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

  if (!currentUser) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        loading={authLoading} 
        error={authError} 
        success={authSuccess}
      />
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
          <div className="text-sm text-ink-600 bg-red-50 p-4 rounded-sm border-l-4 border-wax-500 text-left font-mono">
            {error.includes("fetch") ? "Could not connect to Supabase. Please check your URL/Key." : error}
          </div>
          <p className="text-ink-500 text-sm">Ensure SQL setup is complete.</p>
          <button 
             onClick={refreshData}
             className="flex items-center gap-2 px-6 py-2.5 bg-ink-800 hover:bg-ink-900 text-white rounded-sm font-bold uppercase tracking-wide text-sm mx-auto mt-4 transition-colors"
           >
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
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-ink-900">Dashboard Overview</h1>
            <p className="text-ink-500 mt-2 font-serif italic text-xl">Welcome back, {currentUser.full_name}.</p>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={handleOpenAnnouncementCreate}
               className="flex items-center space-x-2 px-4 py-2 bg-paper-50 text-ink-700 hover:bg-paper-100 border border-paper-300 rounded-sm text-sm font-bold uppercase tracking-widest transition-colors shadow-sm"
             >
               <Megaphone size={16} />
               <span>Post Notice</span>
             </button>

             <div 
               className={`flex items-center space-x-2 px-3 py-1.5 rounded-sm text-sm font-bold uppercase tracking-widest h-fit border ${
               isSupabaseConfigured() 
                 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                 : 'bg-red-50 text-red-800 border-red-200'
             }`}>
               <Database size={14} />
               <span>{isSupabaseConfigured() ? 'Online' : 'Offline'}</span>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Treasury Balance" 
            value={`₱${treasuryStats.balance.toLocaleString()}`} 
            icon={Wallet} 
            trend="Available Funds" 
            trendUp={true}
            colorClass="text-emerald-700"
          />
          <StatCard 
            title="Interest Earnings" 
            value={`₱${totalInterestGained.toLocaleString()}`} 
            icon={TrendingUp} 
            trend="Lifetime" 
            trendUp={true}
            colorClass="text-purple-700"
        />
          <StatCard 
            title="Active Volume" 
            value={`₱${activeVolume.toLocaleString()}`} 
            icon={CreditCard} 
            trend="+5%" 
            trendUp={true}
            colorClass="text-blue-700"
          />
          <StatCard 
            title="Pending Actions" 
            value={`${pendingLoans.length + pendingContributions.length}`} 
            icon={AlertCircle} 
            colorClass={pendingLoans.length > 0 ? "text-wax-600" : "text-ink-600"}
          />
        </div>

        {/* Recent Pending Loans Table */}
        <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
          <div className="p-6 border-b border-paper-200 flex justify-between items-center bg-paper-100/50">
            <h2 className="text-xl font-serif font-bold text-ink-900">Pending Requests</h2>
            <button 
              onClick={() => setActiveTab('loans')}
              className="text-xs font-bold uppercase tracking-wider text-ink-600 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all"
            >
              View Full Ledger
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-paper-100 border-b border-paper-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-ink-400 uppercase tracking-[0.1em] font-sans">Member</th>
                  <th className="px-6 py-4 text-sm font-bold text-ink-400 uppercase tracking-[0.1em] font-sans">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-ink-400 uppercase tracking-[0.1em] font-sans">Amount</th>
                  <th className="px-6 py-4 text-sm font-bold text-ink-400 uppercase tracking-[0.1em] font-sans">Term</th>
                  <th className="px-6 py-4 text-sm font-bold text-ink-400 uppercase tracking-[0.1em] font-sans text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {pendingLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-ink-400 font-serif italic text-lg">
                      No pending requests found in the ledger.
                    </td>
                  </tr>
                ) : (
                  pendingLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-paper-100 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={loan.borrower.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.borrower.full_name)}&background=random`} 
                            alt="" 
                            className="w-10 h-10 rounded-sm bg-paper-200 object-cover border border-paper-300 grayscale"
                          />
                          <div>
                            <div className="font-serif font-bold text-ink-900 text-lg">{loan.borrower.full_name}</div>
                            <div className="text-xs text-ink-500 font-mono">{loan.borrower.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
                          loan.borrower.is_coop_member 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {loan.borrower.is_coop_member ? 'Member' : 'External'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-ink-900 text-base">₱{loan.principal.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-ink-600 font-mono text-sm">
                        {loan.duration_months} mo
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleReviewLoan(loan)}
                          className="text-xs font-bold uppercase tracking-widest text-ink-700 hover:bg-paper-200 px-4 py-2 rounded-sm border border-paper-300 transition-all"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderLoansTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold text-ink-900">Loan Ledger</h1>
          <button 
            onClick={() => setIsApplicationModalOpen(true)}
            className="bg-ink-800 hover:bg-ink-900 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-widest text-sm shadow-md transition-all active:scale-95 flex items-center space-x-2 border-b-2 border-black"
          >
             <CreditCard size={18} />
             <span>New Entry</span>
          </button>
        </div>

        <div className="bg-paper-50 p-4 rounded-sm shadow-sm border border-paper-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
            <input 
              type="text" 
              placeholder="Search ledger..." 
              className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none transition-colors font-serif placeholder:text-ink-300 text-ink-800"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button className="flex items-center space-x-2 px-4 py-2 bg-transparent border border-paper-300 rounded-sm text-ink-600 hover:bg-paper-100 text-sm font-bold uppercase tracking-widest">
               <Filter size={16} />
               <span>Filter</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map(loan => (
            <div 
              key={loan.id} 
              onClick={() => loan.status !== 'pending' && handleViewLoanDetails(loan)}
              className={`bg-paper-50 rounded-sm border-2 shadow-card hover:shadow-float transition-all duration-300 p-6 flex flex-col relative overflow-hidden group ${loan.status !== 'pending' ? 'cursor-pointer border-paper-200 hover:border-ink-300' : 'border-amber-200 bg-amber-50/20'}`}
            >
              {/* Paper line decoration */}
              <div className="absolute top-0 left-0 w-1 h-full bg-paper-200 group-hover:bg-ink-400 transition-colors"></div>

              <div className="flex justify-between items-start mb-5 pl-3">
                 <div className="flex items-center space-x-3">
                    <img src={loan.borrower.avatar_url} className="w-10 h-10 rounded-sm object-cover border border-paper-300 grayscale" alt="" />
                    <div>
                       <h3 className="font-serif font-bold text-ink-900 text-lg leading-tight">{loan.borrower.full_name}</h3>
                       <p className="text-xs text-ink-500 font-mono mt-0.5">{loan.status === 'active' ? 'Active Account' : loan.status === 'pending' ? 'Pending Approval' : loan.status}</p>
                    </div>
                 </div>
                 <div className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-widest border ${
                   loan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                   loan.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                   'bg-paper-100 text-ink-500 border-paper-200'
                 }`}>
                   {loan.status}
                 </div>
              </div>

              <div className="space-y-3 mb-6 pl-3 border-l border-dashed border-paper-300 ml-0.5">
                 <div className="flex justify-between text-base">
                   <span className="text-ink-500 font-serif italic">Principal</span>
                   <span className="font-bold text-ink-900 font-mono">₱{loan.principal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-base">
                   <span className="text-ink-500 font-serif italic">Rate</span>
                   <span className="font-bold text-ink-900 font-mono">{loan.interest_rate}%</span>
                 </div>
                 <div className="flex justify-between text-base">
                   <span className="text-ink-500 font-serif italic">Balance</span>
                   <span className="font-bold text-ink-900 font-mono">₱{loan.remaining_principal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-auto pt-4 border-t border-paper-200 flex gap-2 pl-3">
                 {loan.status === 'pending' ? (
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReviewLoan(loan);
                    }}
                    className="w-full py-2 bg-ink-800 text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-ink-900 transition-colors shadow-sm"
                   >
                     Review Request
                   </button>
                 ) : (
                   <button 
                    className="w-full py-2 bg-transparent text-ink-600 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-paper-100 transition-colors border border-paper-300"
                   >
                     View Details
                   </button>
                 )}
              </div>
            </div>
          ))}
          
          {loans.length === 0 && (
            <div className="col-span-full py-16 text-center text-ink-400 flex flex-col items-center bg-paper-50 border-2 border-dashed border-paper-300 rounded-sm">
              <Activity size={48} className="opacity-20 mb-4" strokeWidth={1} />
              <p className="text-lg font-serif font-bold text-ink-600">The ledger is empty</p>
              <p className="text-sm font-serif italic mt-1">Submit a new application to begin.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-paper-100 font-sans selection:bg-gold-500/30 selection:text-ink-900">
      <AnnouncementModal 
        isOpen={isSystemAnnouncementOpen} 
        onClose={() => setIsSystemAnnouncementOpen(false)} 
        announcements={systemAnnouncements} 
      />

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 lg:ml-72 min-h-screen relative">
        <div className="max-w-7xl mx-auto p-8 md:p-12">
          {activeTab === 'dashboard' && renderAdminDashboard()}
          {activeTab === 'loans' && renderLoansTab()}
          {activeTab === 'my-dashboard' && (
            <MemberDashboard 
              user={currentUser}
              memberLoans={loans.filter(l => l.borrower_id === currentUser.id)}
              memberContributions={contributions.filter(c => c.member_id === currentUser.id)}
              onApplyLoan={() => setIsApplicationModalOpen(true)}
              onAddContribution={() => setIsContributionModalOpen(true)}
            />
          )}
          {activeTab === 'members' && (
            <MemberDirectory 
              members={members} 
              onRefresh={refreshData}
              currentUserRole={currentUser.role}
            />
          )}
          {activeTab === 'treasury' && (
            <TreasuryDashboard 
              treasuryStats={treasuryStats}
              contributions={contributions}
              loans={loans}
              activeLoanVolume={activeVolume}
              totalInterestGained={totalInterestGained}
              onAddContribution={() => setIsContributionModalOpen(true)}
              onApproveContribution={handleApproveContribution}
              onRejectContribution={handleRejectContribution}
              loading={loading}
            />
          )}
          {activeTab === 'announcements' && (
             <AnnouncementHistory 
                onOpenCreate={handleOpenAnnouncementCreate} 
                onEdit={handleOpenAnnouncementEdit}
                readOnly={currentUser.role === 'member'} // Enable read-only for members
             />
          )}
          {activeTab === 'schedules' && (
             <ScheduleView 
                filterByUserId={currentUser.role === 'member' ? currentUser.id : undefined} // Filter for members
             />
          )}
          {activeTab === 'dev-guide' && <DeveloperGuide />}
        </div>
      </main>

      {currentUser.role === 'admin' && (
        <LoanApprovalModal 
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          loan={selectedLoan}
          onApprove={handleApproveLoan}
          onReject={handleRejectLoan}
          treasuryBalance={treasuryStats.balance}
        />
      )}
      
      <LoanDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        loan={selectedLoan}
        onPaymentSuccess={refreshData}
      />

      <LoanApplicationForm
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        onSubmit={handleCreateLoan}
        members={members}
        currentUser={currentUser}
      />

      <ContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        onSubmit={handleAddContribution}
        members={members}
        currentUser={currentUser}
      />

      <CreateAnnouncementModal 
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
           setIsAnnouncementModalOpen(false);
           setEditingAnnouncement(null);
        }}
        onSubmit={handleSaveAnnouncement}
        editingAnnouncement={editingAnnouncement}
      />
    </div>
  );
};

export default App;
