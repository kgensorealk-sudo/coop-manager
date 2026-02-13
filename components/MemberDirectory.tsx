
import React, { useState, useMemo } from 'react';
import { User, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { 
  Search, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Edit2, 
  Plus, 
  CreditCard, 
  PiggyBank, 
  Filter, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  ChevronDown,
  Activity,
  CheckCircle2
} from 'lucide-react';
import MemberModal from './MemberModal';
import { StatCard } from './StatCard';

interface MemberDirectoryProps {
  members: User[];
  loans: LoanWithBorrower[];
  onRefresh: () => void;
  currentUserRole?: string;
}

type MemberFilter = 'all' | 'active-loans' | 'admins' | 'external' | 'arrears';

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({ 
  members, 
  loans, 
  onRefresh, 
  currentUserRole = 'admin' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<MemberFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  // Helper: Detect if a member is in arrears based on bi-monthly schedule
  const checkArrears = (memberId: string) => {
    const activeLoan = loans.find(l => l.borrower_id === memberId && l.status === 'active');
    if (!activeLoan) return false;

    // Calculate expected installments that should have been paid by now
    const anchorDate = new Date(activeLoan.start_date || activeLoan.created_at);
    
    // First payment is 1 month grace + snap to 10th/25th
    let targetMonthDate = new Date(anchorDate);
    targetMonthDate.setMonth(targetMonthDate.getMonth() + 1);
    
    let firstYear = targetMonthDate.getFullYear();
    let firstMonth = targetMonthDate.getMonth();
    let is10th = targetMonthDate.getDate() <= 10;
    if (targetMonthDate.getDate() > 25) {
      is10th = true;
      firstMonth++;
    } else if (targetMonthDate.getDate() > 10) {
      is10th = false;
    }

    let firstPayday = new Date(firstYear, firstMonth, is10th ? 10 : 25);
    const now = new Date();
    if (now < firstPayday) return false;

    // Count paydays between firstPayday and now
    let paydaysPassed = 0;
    let tempDate = new Date(firstPayday);
    let temp10th = is10th;

    while (tempDate <= now) {
      paydaysPassed++;
      if (temp10th) {
        temp10th = false;
      } else {
        temp10th = true;
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      tempDate.setDate(temp10th ? 10 : 25);
    }

    const totalInstallments = activeLoan.duration_months * 2;
    const installmentPrincipal = activeLoan.principal / totalInstallments;
    const expectedPrincipalRepaid = Math.min(paydaysPassed * installmentPrincipal, activeLoan.principal);
    const actualPrincipalRepaid = activeLoan.principal - activeLoan.remaining_principal;

    // If they've paid less principal than expected for the current date, they are in arrears
    return actualPrincipalRepaid < (expectedPrincipalRepaid - 0.1);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'active-loans':
          return loans.some(l => l.borrower_id === member.id && l.status === 'active');
        case 'admins':
          return member.role === 'admin';
        case 'external':
          return !member.is_coop_member;
        case 'arrears':
          return checkArrears(member.id);
        default:
          return true;
      }
    });
  }, [members, loans, searchTerm, activeFilter]);

  // Summary Stats
  const summaryStats = useMemo(() => {
    const totalGroupEquity = members.reduce((sum, m) => sum + (m.equity || 0), 0);
    const totalActiveLoans = loans.filter(l => l.status === 'active').length;
    const totalArrearsCount = members.filter(m => checkArrears(m.id)).length;

    return {
      totalMembers: members.length,
      totalGroupEquity,
      totalActiveLoans,
      totalArrearsCount
    };
  }, [members, loans]);

  const handleAddMember = async (data: any) => {
    await dataService.createMember(data);
    onRefresh();
  };

  const handleUpdateMember = async (data: any) => {
    if (editingMember) {
      await dataService.updateMember(editingMember.id, data);
      onRefresh();
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-300 pb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-ink-900">Membership Registry</h1>
          <p className="text-ink-500 mt-2 font-serif italic text-xl">Directory of shareholders and borrowers.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={openAddModal}
            className="bg-ink-900 hover:bg-black text-white px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-sm shadow-lg transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-ink-950"
          >
            <Plus size={18} />
            <span>Add Shareholder</span>
          </button>
        )}
      </div>

      {/* Summary Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Registered Members" 
          value={summaryStats.totalMembers.toString()} 
          icon={Users} 
          trend="Total Registry" 
          colorClass="text-ink-900"
        />
        <StatCard 
          title="Total Group Equity" 
          value={`₱${summaryStats.totalGroupEquity.toLocaleString()}`} 
          icon={PiggyBank} 
          trend="Cooperative Pool" 
          trendUp={true}
          colorClass="text-emerald-700"
        />
        <StatCard 
          title="Active Loans" 
          value={summaryStats.totalActiveLoans.toString()} 
          icon={CreditCard} 
          trend="Deployed Assets" 
          colorClass="text-blue-700"
        />
        <StatCard 
          title="Arrears Notice" 
          value={summaryStats.totalArrearsCount.toString()} 
          icon={AlertTriangle} 
          trend={summaryStats.totalArrearsCount > 0 ? "Review Required" : "Clean Books"}
          trendUp={summaryStats.totalArrearsCount === 0}
          colorClass={summaryStats.totalArrearsCount > 0 ? "text-wax-600" : "text-ink-400"}
        />
      </div>

      {/* Controls Bar */}
      <div className="bg-paper-50 p-4 rounded-sm shadow-sm border border-paper-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-ink-900 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none font-serif placeholder:italic text-ink-800" 
          />
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-sm text-xs font-black uppercase tracking-widest transition-all ${
              activeFilter !== 'all' 
                ? 'bg-ink-900 text-white border-ink-900 shadow-md' 
                : 'border-paper-300 text-ink-600 hover:bg-paper-100'
            }`}
          >
            <Filter size={14} />
            <span>Filter: {activeFilter.replace('-', ' ')}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-paper-300 shadow-float z-30 rounded-sm overflow-hidden animate-zoom-in">
              <div className="p-2 border-b border-paper-100 bg-paper-50 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest px-2">Criteria</span>
                {activeFilter !== 'all' && (
                  <button 
                    onClick={() => {setActiveFilter('all'); setIsFilterOpen(false);}}
                    className="text-[10px] font-bold text-wax-600 hover:underline uppercase"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="py-1">
                {(['all', 'active-loans', 'admins', 'external', 'arrears'] as MemberFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setActiveFilter(f);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-serif transition-colors flex items-center justify-between ${
                      activeFilter === f 
                        ? 'bg-paper-100 text-ink-900 font-bold' 
                        : 'text-ink-600 hover:bg-paper-50'
                    }`}
                  >
                    <span className="capitalize">{f.replace('-', ' ')}</span>
                    {activeFilter === f && <CheckCircle2 size={12} className="text-gold-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMembers.map(member => {
          const activeLoan = loans.find(l => l.borrower_id === member.id && l.status === 'active');
          const isArrears = checkArrears(member.id);

          return (
            <div key={member.id} className="bg-paper-50 rounded-sm border-2 border-paper-200 p-8 flex flex-col items-center text-center shadow-card hover:shadow-float transition-all duration-300 group relative overflow-hidden">
              
              {/* Arrears Indicator Tag */}
              {isArrears && (
                <div className="absolute top-0 right-0 bg-wax-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse z-10">
                  <AlertTriangle size={12} />
                  Arrears
                </div>
              )}

              {/* Admin/User Role Indicators */}
              <div className="absolute top-4 left-4">
                 {member.role === 'admin' ? (
                   <div className="bg-ink-900 text-gold-500 p-1.5 rounded-sm shadow-md rotate-3 border border-gold-500/20" title="System Administrator">
                     <Shield size={14} />
                   </div>
                 ) : (
                   <div className="bg-paper-200 text-ink-400 p-1.5 rounded-sm" title="Member">
                     <UserIcon size={14} />
                   </div>
                 )}
              </div>

              {isAdmin && (
                <button 
                  onClick={() => openEditModal(member)}
                  className="absolute top-4 right-4 p-2 text-ink-300 hover:text-ink-900 hover:bg-paper-100 rounded-sm transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-paper-300"
                >
                  <Edit2 size={16} />
                </button>
              )}

              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-sm bg-white p-1 border-2 border-paper-300 shadow-float rotate-2 group-hover:rotate-0 transition-transform duration-500 overflow-hidden">
                  <img 
                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`} 
                    alt={member.full_name}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                {!member.is_coop_member && (
                  <span className="absolute -bottom-2 -right-2 bg-paper-100 text-ink-400 text-[9px] font-black px-2 py-0.5 border border-paper-300 uppercase tracking-tighter">External</span>
                )}
              </div>
              
              <div className="mb-6 w-full">
                <h3 className="text-2xl font-serif font-bold text-ink-900 leading-tight">{member.full_name}</h3>
                <div className="flex items-center justify-center gap-1.5 text-sm text-ink-400 font-serif italic mt-1">
                  <Mail size={12} />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>

              <div className="w-full bg-paper-100/50 rounded-sm p-4 mb-6 border border-paper-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-[10px] font-black uppercase text-ink-400 tracking-widest mb-1 flex items-center justify-center gap-1">
                      <PiggyBank size={12} className="text-emerald-600" />
                      <span>Net Equity</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-emerald-700">
                      ₱{member.equity.toLocaleString()}
                    </div>
                  </div>
                </div>

                {activeLoan && (
                  <div className="pt-3 border-t border-paper-200">
                     <div className="text-[10px] font-black uppercase text-ink-400 tracking-widest mb-1 flex items-center justify-center gap-1">
                        <CreditCard size={12} className="text-blue-600" />
                        <span>Active Portfolio</span>
                     </div>
                     <div className="flex flex-col items-center">
                        <div className="text-lg font-mono font-bold text-blue-800">₱{activeLoan.remaining_principal.toLocaleString()}</div>
                        <div className="text-[10px] font-mono text-ink-400 uppercase tracking-tighter">Remaining Principal</div>
                     </div>
                  </div>
                )}
              </div>
              
              <div className="w-full pt-4 border-t border-dashed border-paper-300">
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border ${member.is_coop_member ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-paper-100 text-ink-400 border-paper-200'}`}>
                    {member.is_coop_member ? 'Coop Shareholder' : 'Associate User'}
                  </span>
                  {activeLoan && (
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isArrears ? 'text-wax-600' : 'text-emerald-600'}`}>
                       {isArrears ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
                       {isArrears ? 'Past Due' : 'Performing'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="col-span-full py-20 text-center text-ink-300 flex flex-col items-center bg-paper-50 border-2 border-dashed border-paper-200 rounded-sm">
            <Activity size={48} className="opacity-10 mb-4" />
            <p className="text-xl font-serif italic">No registry entries found matching your search or filters.</p>
            {activeFilter !== 'all' && (
              <button 
                onClick={() => setActiveFilter('all')}
                className="mt-4 text-xs font-black uppercase text-blue-600 hover:underline tracking-widest"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      <MemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={editingMember ? handleUpdateMember : handleAddMember}
        editingMember={editingMember}
      />
    </div>
  );
};
