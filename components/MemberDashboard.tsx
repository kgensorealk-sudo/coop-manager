
import React from 'react';
import { motion } from 'motion/react';
import { User, LoanWithBorrower, ContributionWithMember, SavingGoal, Payment } from '../types';
import { StatCard } from './StatCard';
import { dataService } from '../services/dataService';
import { Wallet, CreditCard, Calendar, Clock, AlertCircle, Plus, PiggyBank, Lock, TrendingDown, CheckCircle2, XCircle, ArrowRightLeft, Target, Download } from 'lucide-react';

interface MemberDashboardProps {
  user: User;
  memberLoans: LoanWithBorrower[];
  memberContributions: ContributionWithMember[];
  memberSavingGoals: SavingGoal[];
  allPayments: Payment[];
  onApplyLoan: () => void;
  onAddContribution: () => void;
  onViewAgreement?: (loan: LoanWithBorrower) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ 
  user, 
  memberLoans, 
  memberContributions,
  memberSavingGoals,
  allPayments,
  onApplyLoan, 
  onAddContribution,
  onViewAgreement
}) => {
  
  // Calculate total active balance (sum of all active loans)
  const activeLoans = memberLoans.filter(l => {
    if (l.status !== 'active') return false;
    const loanPayments = allPayments.filter(p => p.loan_id === l.id);
    const debt = dataService.calculateDetailedDebt(l, loanPayments);
    return debt.liveTotalDue > 0.01;
  });
  const totalLoanBalance = activeLoans.reduce((sum, l) => {
    const loanPayments = allPayments.filter(p => p.loan_id === l.id);
    const debt = dataService.calculateDetailedDebt(l, loanPayments);
    return sum + debt.liveTotalDue;
  }, 0);
  
  const pendingLoans = memberLoans.filter(l => l.status === 'pending');
  const hasPendingLoan = pendingLoans.length > 0;
  
  // History includes everything not pending
  const historyLoans = memberLoans.filter(l => l.status !== 'pending');
  
  const pendingContributions = memberContributions.filter(c => c.status === 'pending');
  
  // Get next payment date from the most recent active loan
  const latestActiveLoan = activeLoans[0];
  const nextPaymentDate = latestActiveLoan 
    ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString() 
    : 'N/A';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paid': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <TrendingDown size={14} className="mr-1" />;
      case 'paid': return <CheckCircle2 size={14} className="mr-1" />;
      case 'rejected': return <XCircle size={14} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 animate-fade-in"
    >
      
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-paper-200 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-ink-900 tracking-tight">Personal Ledger</h1>
          <p className="text-ink-500 mt-2 font-serif italic text-lg opacity-80">Overview of your equity and loan status.</p>
        </div>
        <div className="flex gap-4">
           <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={onAddContribution}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg flex items-center justify-center space-x-3 border-b-4 border-emerald-800 transition-all text-xs group"
           >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              <span>Deposit Funds</span>
           </motion.button>
           <motion.button 
             whileHover={hasPendingLoan ? {} : { scale: 1.02 }}
             whileTap={hasPendingLoan ? {} : { scale: 0.98 }}
             onClick={hasPendingLoan ? undefined : onApplyLoan}
             disabled={hasPendingLoan}
             className={`px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg flex items-center justify-center space-x-3 border-b-4 transition-all text-xs ${
               hasPendingLoan 
                ? 'bg-paper-200 text-paper-400 border-paper-300 cursor-not-allowed shadow-none' 
                : 'bg-ink-900 hover:bg-ink-950 text-white border-black'
             }`}
             title={hasPendingLoan ? "You already have a pending loan request" : "Apply for a loan"}
           >
              {hasPendingLoan ? <Lock size={20} /> : <CreditCard size={20} />}
              <span>{hasPendingLoan ? 'Request Pending' : 'Request Loan'}</span>
           </motion.button>
        </div>
      </motion.div>

      {/* Personal Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          title="My Total Equity" 
          value={`₱${user.equity.toLocaleString()}`} 
          icon={Wallet} 
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
          index={0}
        />
        <StatCard 
          title="Active Debt Volume" 
          value={`₱${totalLoanBalance.toLocaleString()}`} 
          icon={CreditCard} 
          colorClass="bg-blue-50 text-blue-700 border-blue-200"
          index={1}
        />
        <StatCard 
          title="Next Payment Due" 
          value={nextPaymentDate} 
          icon={Calendar} 
          colorClass="bg-purple-50 text-purple-700 border-purple-200"
          index={2}
        />
      </motion.div>

      {/* Pending Items (Loans & Deposits) */}
      {(pendingLoans.length > 0 || pendingContributions.length > 0) && (
        <motion.div variants={itemVariants} className="bg-amber-50 rounded-sm border border-amber-200 p-6 relative overflow-hidden">
           {/* Striped tape effect */}
           <div className="absolute top-0 left-0 w-full h-1 bg-amber-200 repeating-linear-gradient(45deg,transparent,transparent 10px,#f59e0b 10px,#f59e0b 20px)"></div>
           
           <div className="flex items-center space-x-2 mb-4 text-amber-900 mt-2">
              <Clock size={20} />
              <h3 className="text-lg font-serif font-bold">Pending Approval</h3>
           </div>
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingLoans.map(loan => (
                 <div key={loan.id} className="bg-white p-4 rounded-sm shadow-sm border border-amber-200">
                    <div className="flex justify-between items-start mb-3">
                       <span className="font-serif font-bold text-slate-900 truncate pr-2 text-lg">{loan.purpose}</span>
                       <span className="shrink-0 text-xs uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm border border-amber-200">Loan Request</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 font-mono">
                       <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-bold text-slate-900">₱{loan.principal.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              ))}
              {pendingContributions.map(c => (
                 <div key={c.id} className="bg-white p-4 rounded-sm shadow-sm border border-amber-200">
                    <div className="flex justify-between items-start mb-3">
                       <span className="font-serif font-bold text-slate-900 truncate pr-2 text-lg capitalize">{c.type.replace('_', ' ')}</span>
                       <span className="shrink-0 text-xs uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm border border-amber-200">Deposit Review</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 font-mono">
                       <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-bold text-slate-900">₱{c.amount.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span>Date:</span>
                          <span className="font-bold text-slate-900">{new Date(c.date).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </motion.div>
      )}

      {/* Loan Applications Summary - ENHANCED Historical Register Table */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between border-b border-paper-200 pb-4">
            <h2 className="text-2xl font-serif font-bold text-ink-900 flex items-center gap-3">
                <ArrowRightLeft size={24} className="text-blue-600" />
                Loan History & Principal Register
            </h2>
            <div className="text-[10px] font-black text-ink-400 uppercase tracking-[0.3em]">Official Audit Log</div>
        </div>
        
        {historyLoans.length === 0 ? (
           <div className="bg-white p-16 text-center flex flex-col items-center justify-center rounded-2xl border-2 border-paper-200 border-dashed text-ink-400 group hover:border-blue-300 transition-colors">
              <div className="p-6 bg-paper-50 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                <AlertCircle size={64} className="opacity-20" strokeWidth={1} />
              </div>
              <p className="font-serif italic text-xl">No active or past loan records found.</p>
           </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-paper-200 shadow-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-paper-100/80 border-b border-paper-200">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Effective Date / Purpose</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Total Principal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Principal Paid</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Rem. Balance</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-100">
                  {historyLoans.map((loan) => {
                    const loanPayments = allPayments.filter(p => p.loan_id === loan.id);
                    const debt = dataService.calculateDetailedDebt(loan, loanPayments);
                    const isEffectivelyPaid = loan.status === 'active' && debt.liveTotalDue <= 0.01;
                    const displayStatus = isEffectivelyPaid ? 'paid' : loan.status;
                    const principalPaid = loan.principal - loan.remaining_principal;

                    return (
                      <tr key={loan.id} className="hover:bg-paper-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-serif font-bold text-xl text-ink-900 group-hover:text-blue-900 transition-colors">{loan.purpose}</div>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="text-[10px] font-mono text-ink-400 uppercase tracking-tighter bg-paper-100 px-2 py-0.5 rounded border border-paper-200">
                               Ref: {loan.id.substring(0,8).toUpperCase()}
                             </div>
                             <div className="text-[10px] font-mono text-ink-400 uppercase tracking-tighter bg-paper-100 px-2 py-0.5 rounded border border-paper-200">
                               {loan.start_date ? new Date(loan.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${getStatusColor(displayStatus)}`}>
                            {getStatusIcon(displayStatus)}
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="font-mono font-bold text-ink-700 text-lg tracking-tighter">₱{loan.principal.toLocaleString()}</div>
                          <div className="text-[10px] text-ink-400 font-black uppercase tracking-widest mt-1">{loan.interest_rate}% Fixed Rate</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="font-mono font-bold text-emerald-600 text-lg tracking-tighter">₱{principalPaid.toLocaleString()}</div>
                          <div className="text-[10px] text-ink-400 font-serif italic mt-1">Excl. Interest</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`font-mono font-bold text-2xl tracking-tighter ${debt.liveTotalDue > 0.01 ? 'text-blue-700' : 'text-ink-300'}`}>
                            ₱{debt.liveTotalDue.toLocaleString()}
                          </div>
                          {displayStatus === 'active' && (
                            <div className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">Current Debt</div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          {onViewAgreement && displayStatus !== 'pending' && (
                            <motion.button 
                              whileHover={{ scale: 1.1, backgroundColor: '#eff6ff' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onViewAgreement(loan)}
                              className="p-3 text-ink-400 hover:text-blue-600 rounded-2xl transition-all border border-transparent hover:border-blue-100 shadow-sm"
                              title="Download Agreement"
                            >
                              <Download size={20} />
                            </motion.button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {historyLoans.map((loan) => {
                const loanPayments = allPayments.filter(p => p.loan_id === loan.id);
                const debt = dataService.calculateDetailedDebt(loan, loanPayments);
                const isEffectivelyPaid = loan.status === 'active' && debt.liveTotalDue <= 0.01;
                const displayStatus = isEffectivelyPaid ? 'paid' : loan.status;
                const principalPaid = loan.principal - loan.remaining_principal;

                return (
                  <div key={loan.id} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-serif font-bold text-lg text-slate-900">{loan.purpose}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                          Ref: {loan.id.substring(0,8).toUpperCase()} • {loan.start_date ? new Date(loan.start_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(displayStatus)}`}>
                        {getStatusIcon(displayStatus)}
                        {displayStatus}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Total Principal</div>
                        <div className="font-mono font-bold text-slate-700">₱{loan.principal.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{loan.interest_rate}% Fixed</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Principal Paid</div>
                        <div className="font-mono font-bold text-emerald-600">₱{principalPaid.toLocaleString()}</div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-50">
                        <div className="flex justify-between items-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Remaining Balance</div>
                          <div className={`font-mono font-bold text-xl ${debt.liveTotalDue > 0.01 ? 'text-blue-700' : 'text-slate-300'}`}>
                            ₱{debt.liveTotalDue.toLocaleString()}
                          </div>
                        </div>
                        {displayStatus === 'active' && (
                          <div className="text-[10px] text-blue-500 font-sans uppercase font-bold tracking-tighter text-right">Current Debt</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* NEW: Savings Goals Summary Section */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between border-b border-paper-200 pb-4">
            <h2 className="text-2xl font-serif font-bold text-ink-900 flex items-center gap-3">
                <Target size={24} className="text-gold-600" />
                Wealth Milestones & Objectives
            </h2>
            <div className="text-[10px] font-black text-ink-400 uppercase tracking-[0.3em]">Financial Roadmap</div>
        </div>
        
        {memberSavingGoals.length === 0 ? (
           <div className="bg-white p-16 text-center flex flex-col items-center justify-center rounded-2xl border-2 border-paper-200 border-dashed text-ink-400 group hover:border-gold-300 transition-colors">
              <div className="p-6 bg-paper-50 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                <PiggyBank size={64} className="opacity-20" strokeWidth={1} />
              </div>
              <p className="font-serif italic text-xl">No active savings objectives established.</p>
              <p className="text-xs font-sans uppercase tracking-widest mt-2 opacity-60">Set a goal to track your progress towards financial freedom.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {memberSavingGoals.map((goal) => {
               const progressPct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
               return (
                  <motion.div 
                    key={goal.id} 
                    whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                    className="bg-white p-8 rounded-2xl border-2 border-paper-200 shadow-lg hover:border-gold-500/50 transition-all group relative overflow-hidden"
                  >
                     {/* Subtle background accent */}
                     <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12">
                        <Target size={120} />
                     </div>

                     <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                           <h3 className="font-serif font-bold text-2xl text-ink-900 leading-tight tracking-tight">{goal.name}</h3>
                           {goal.deadline && (
                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-400 uppercase mt-2 bg-paper-50 px-2 py-0.5 rounded-full border border-paper-100 w-fit">
                                 <Calendar size={10} />
                                 Target: {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                           )}
                        </div>
                        <div className={`p-3 rounded-2xl bg-gold-50 text-gold-600 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-sm border border-gold-100`}>
                           <Target size={22} />
                        </div>
                     </div>
                     
                     <div className="space-y-6 relative z-10">
                        <div className="flex justify-between text-sm">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-ink-400 uppercase tracking-[0.2em]">Current Balance</p>
                              <p className="font-mono font-bold text-emerald-700 text-2xl tracking-tighter">₱{goal.current_amount.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-ink-400 uppercase tracking-[0.2em]">Target Goal</p>
                              <p className="font-mono font-bold text-ink-900 text-2xl tracking-tighter">₱{goal.target_amount.toLocaleString()}</p>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black text-ink-800 uppercase tracking-widest flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(197,160,40,0.5)]"></div>
                                 {progressPct.toFixed(0)}% Completed
                              </span>
                              <span className="text-[10px] font-mono text-ink-400 font-bold">₱{(goal.target_amount - goal.current_amount).toLocaleString()} Remaining</span>
                           </div>
                           <div className="h-3 w-full bg-paper-100 rounded-full overflow-hidden border border-paper-200 shadow-inner p-0.5">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progressPct}%` }}
                                 transition={{ duration: 1.5, ease: "easeOut" }}
                                 className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full shadow-[0_0_12px_rgba(197,160,40,0.4)] relative" 
                              >
                                 <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                              </motion.div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               );
            })}
          </div>
        )}
      </motion.div>

      {/* Contribution History Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border-2 border-paper-200 shadow-xl overflow-hidden mt-12 group">
        <div className="p-8 border-b border-paper-200 bg-paper-100/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-ink-900 text-gold-500 rounded-2xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <PiggyBank size={20} />
             </div>
             <div>
                <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Equity Contribution Log</h2>
                <p className="text-[10px] text-ink-400 font-sans font-black uppercase tracking-[0.2em]">Verified Capital Transactions</p>
             </div>
          </div>
          <div className="text-[10px] font-black text-ink-300 uppercase tracking-[0.3em] border border-paper-200 px-3 py-1 rounded-full">Audit Verified</div>
        </div>
        
        {memberContributions.length === 0 ? (
           <div className="p-20 text-center flex flex-col items-center text-ink-400">
              <div className="p-6 bg-paper-50 rounded-full mb-6">
                <PiggyBank size={64} className="opacity-20" strokeWidth={1} />
              </div>
              <p className="font-serif italic text-xl">No contributions recorded.</p>
           </div>
        ) : (
          <div className="bg-white overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-paper-100/80 border-b border-paper-200">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Transaction Date</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Capital Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-ink-500 uppercase tracking-[0.3em] font-sans">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-100">
                  {memberContributions.map((contribution) => (
                    <tr key={contribution.id} className="hover:bg-paper-50/50 transition-colors group">
                      <td className="px-8 py-6 text-ink-600 text-sm font-mono">
                        {new Date(contribution.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-ink-900 capitalize font-serif font-bold text-lg">{contribution.type.replace('_', ' ')}</div>
                        <div className="text-[10px] font-mono text-ink-400 uppercase tracking-tighter mt-1">Ref: {contribution.id.substring(0,8).toUpperCase()}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-mono font-bold text-emerald-700 text-2xl tracking-tighter">+₱{contribution.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-ink-400 font-black uppercase tracking-widest mt-1">Capital Credit</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                          contribution.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          contribution.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {contribution.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {memberContributions.map((contribution) => (
                <div key={contribution.id} className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-slate-900 capitalize font-serif font-bold">
                      {contribution.type.replace('_', ' ')}
                    </div>
                    <div className="text-slate-500 text-xs font-mono">
                      {new Date(contribution.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-bold text-emerald-700 font-mono">
                      +₱{contribution.amount.toLocaleString()}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${
                      contribution.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      contribution.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {contribution.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
