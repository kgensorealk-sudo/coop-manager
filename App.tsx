
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
  const [systemAnnouncement, setSystemAnnouncement] = useState<Announcement | null>(null);
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
      const [fetchedLoans, fetchedMetrics, fetchedVolume, fetchedInterest, fetchedUsers, fetchedContributions, fetchedAnnouncement] = await Promise.all([
        dataService.getLoans(),
        dataService.getTreasuryMetrics(),
        dataService.getActiveLoanVolume(),
        dataService.getTotalInterestGained(),
        dataService.getUsers(),
        dataService.getContributions(),
        dataService.getActiveAnnouncement()
      ]);

      setLoans(fetchedLoans);
      setTreasuryStats(fetchedMetrics);
      setActiveVolume(fetchedVolume);
      setTotalInterestGained(fetchedInterest);
      setMembers(fetchedUsers);
      setContributions(fetchedContributions);
      
      if (fetchedAnnouncement && !hasShownAnnouncement) {
        setSystemAnnouncement(fetchedAnnouncement);
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
    setSystemAnnouncement(null);
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-sm shadow-paper max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-700 border border-red-100">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Connection Failed</h2>
          <div className="text-sm text-slate-600 bg-red-50 p-4 rounded-sm border-l-4 border-red-500 text-left font-mono">
            {error.includes("fetch") ? "Could not connect to Supabase. Please check your URL/Key." : error}
          </div>
          <p className="text-slate-500 text-sm">Ensure SQL setup is complete.</p>
          <button 
             onClick={refreshData}
             className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-bold uppercase tracking-wide text-sm mx-auto mt-4"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500 mt-2 font-serif italic text-lg">Welcome back, {currentUser.full_name}.</p>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={handleOpenAnnouncementCreate}
               className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-sm text-sm font-bold uppercase tracking-wide transition-colors"
             >
               <Megaphone size={16} />
               <span>Post Notice</span>
             </button>

             <div 
               className={`flex items-center space-x-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest h-fit border ${
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
            colorClass="bg-emerald-50 text-emerald-700 border-emerald-100"
          />
          <StatCard 
            title="Interest Earnings" 
            value={`₱${totalInterestGained.toLocaleString()}`} 
            icon={TrendingUp} 
            trend="Lifetime" 
            trendUp={true}
            colorClass="bg-purple-50 text-purple-700 border-purple-100"
        />
          <StatCard 
            title="Active Volume" 
            value={`₱${activeVolume.toLocaleString()}`} 
            icon={CreditCard} 
            trend="+5%" 
            trendUp={true}
            colorClass="bg-blue-50 text-blue-700 border-blue-100"
          />
          <StatCard 
            title="Pending Actions" 
            value={`${pendingLoans.length + pendingContributions.length}`} 
            icon={AlertCircle} 
            colorClass={pendingLoans.length > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-200"}
          />
        </div>

        {/* Recent Pending Loans Table */}
        <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-serif font-bold text-slate-900">Pending Requests</h2>
            <button 
              onClick={() => setActiveTab('loans')}
              className="text-xs font-bold uppercase tracking-wide text-blue-600 hover:text-blue-800 border-b border-blue-200 hover:border-blue-600 pb-0.5 transition-all"
            >
              View Full Ledger
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Term</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-serif italic">
                      No pending requests found in the ledger.
                    </td>
                  </tr>
                ) : (
                  pendingLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={loan.borrower.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.borrower.full_name)}&background=random`} 
                            alt="" 
                            className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-200 grayscale"
                          />
                          <div>
                            <div className="font-serif font-bold text-slate-900 text-lg">{loan.borrower.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{loan.borrower.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${
                          loan.borrower.is_coop_member 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {loan.borrower.is_coop_member ? 'Member' : 'External'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-serif font-bold text-slate-900 text-lg">₱{loan.principal.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-sm">
                        {loan.duration_months} mo
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleReviewLoan(loan)}
                          className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-sm border border-blue-200 hover:border-blue-400 transition-all"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold text-slate-900">Loan Ledger</h1>
          <button 
            onClick={() => setIsApplicationModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-wide shadow-sm transition-transform active:scale-95 flex items-center space-x-2 border-b-4 border-blue-800"
          >
             <CreditCard size={18} />
             <span>New Entry</span>
          </button>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search ledger..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-b-2 border-slate-200 focus:border-blue-600 outline-none transition-colors font-serif placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-sm text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wide">
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
              className={`bg-white rounded-sm border shadow-paper hover:shadow-paper-hover transition-all duration-300 p-6 flex flex-col relative overflow-hidden group ${loan.status !== 'pending' ? 'cursor-pointer border-slate-200 hover:border-blue-300' : 'border-amber-200 bg-amber-50/30'}`}
            >
              {/* Paper line decoration */}
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>

              <div className="flex justify-between items-start mb-5 pl-3">
                 <div className="flex items-center space-x-3">
                    <img src={loan.borrower.avatar_url} className="w-10 h-10 rounded-full object-cover border border-slate-200 grayscale" alt="" />
                    <div>
                       <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">{loan.borrower.full_name}</h3>
                       <p className="text-xs text-slate-500 font-mono mt-0.5">{loan.status === 'active' ? 'Active Account' : loan.status === 'pending' ? 'Pending Approval' : loan.status}</p>
                    </div>
                 </div>
                 <div className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${
                   loan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                   loan.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                   'bg-slate-50 text-slate-600 border-slate-200'
                 }`}>
                   {loan.status}
                 </div>
              </div>

              <div className="space-y-3 mb-6 pl-3 border-l-2 border-slate-100 ml-0.5">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500 font-serif italic">Principal</span>
                   <span className="font-bold text-slate-900 font-mono">₱{loan.principal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500 font-serif italic">Rate</span>
                   <span className="font-bold text-slate-900 font-mono">{loan.interest_rate}%</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-500 font-serif italic">Balance</span>
                   <span className="font-bold text-slate-900 font-mono">₱{loan.remaining_principal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2 pl-3">
                 {loan.status === 'pending' ? (
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReviewLoan(loan);
                    }}
                    className="w-full py-2 bg-blue-600 text-white rounded-sm text-xs font-bold uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-sm"
                   >
                     Review Request
                   </button>
                 ) : (
                   <button 
                    className="w-full py-2 bg-slate-50 text-slate-600 rounded-sm text-xs font-bold uppercase tracking-wide hover:bg-slate-100 transition-colors border border-slate-200"
                   >
                     View Details
                   </button>
                 )}
              </div>
            </div>
          ))}
          
          {loans.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center bg-white border border-dashed border-slate-300 rounded-sm">
              <Activity size={48} className="opacity-20 mb-4" strokeWidth={1} />
              <p className="text-lg font-serif font-bold text-slate-600">The ledger is empty</p>
              <p className="text-sm font-serif italic mt-1">Submit a new application to begin.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F9F7F1] font-sans selection:bg-blue-100 selection:text-blue-900">
      <AnnouncementModal 
        isOpen={isSystemAnnouncementOpen} 
        onClose={() => setIsSystemAnnouncementOpen(false)} 
        announcement={systemAnnouncement} 
      />

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen relative">
        {/* Subtle top border for the content area */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-transparent opacity-50"></div>
        
        <div className="max-w-7xl mx-auto p-6 md:p-10">
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
             />
          )}
          {activeTab === 'schedules' && <ScheduleView />}
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
