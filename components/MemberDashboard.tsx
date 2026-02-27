
import React from 'react';
import { motion } from 'motion/react';
import { User, LoanWithBorrower, ContributionWithMember, SavingGoal } from '../types';
import { StatCard } from './StatCard';
import { Wallet, CreditCard, Calendar, Clock, AlertCircle, Plus, PiggyBank, Lock, TrendingDown, CheckCircle2, XCircle, ArrowRightLeft, Target } from 'lucide-react';

interface MemberDashboardProps {
  user: User;
  memberLoans: LoanWithBorrower[];
  memberContributions: ContributionWithMember[];
  memberSavingGoals: SavingGoal[];
  onApplyLoan: () => void;
  onAddContribution: () => void;
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
  onApplyLoan, 
  onAddContribution 
}) => {
  
  // Calculate total active balance (sum of all active loans)
  const activeLoans = memberLoans.filter(l => l.status === 'active');
  const totalLoanBalance = activeLoans.reduce((sum, l) => sum + l.remaining_principal, 0);
  
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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Personal Ledger</h1>
          <p className="text-slate-500 mt-2 font-serif italic">Overview of your equity and loan status.</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={onAddContribution}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-sm font-bold uppercase tracking-wide shadow-sm flex items-center justify-center space-x-2 border-b-4 border-emerald-800 active:translate-y-0.5 active:border-b-0 transition-all text-sm"
           >
              <Plus size={18} />
              <span>Deposit</span>
           </button>
           <button 
             onClick={hasPendingLoan ? undefined : onApplyLoan}
             disabled={hasPendingLoan}
             className={`px-6 py-3 rounded-sm font-bold uppercase tracking-wide shadow-sm flex items-center justify-center space-x-2 border-b-4 active:translate-y-0.5 active:border-b-0 transition-all text-sm ${
               hasPendingLoan 
                ? 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-800'
             }`}
             title={hasPendingLoan ? "You already have a pending loan request" : "Apply for a loan"}
           >
              {hasPendingLoan ? <Lock size={18} /> : <CreditCard size={18} />}
              <span>{hasPendingLoan ? 'Request Pending' : 'Loan'}</span>
           </button>
        </div>
      </motion.div>

      {/* Personal Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="My Equity" 
          value={`₱${user.equity.toLocaleString()}`} 
          icon={Wallet} 
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard 
          title="Total Loan Balance" 
          value={`₱${totalLoanBalance.toLocaleString()}`} 
          icon={CreditCard} 
          colorClass="bg-blue-50 text-blue-700 border-blue-200"
        />
        <StatCard 
          title="Next Due Date" 
          value={nextPaymentDate} 
          icon={Calendar} 
          colorClass="bg-purple-50 text-purple-700 border-purple-200"
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
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-blue-600" />
                Loan History & Principal Register
            </h2>
        </div>
        
        {historyLoans.length === 0 ? (
           <div className="bg-white p-12 text-center flex flex-col items-center justify-center rounded-sm border border-slate-200 border-dashed text-slate-400">
              <AlertCircle size={48} className="mb-3 opacity-20" strokeWidth={1} />
              <p className="font-serif italic text-lg">No active or past loan records found.</p>
           </div>
        ) : (
          <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-sans">Effective Date / Purpose</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-sans">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-sans">Total Principal</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-sans">Principal Paid</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-sans">Rem. Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoans.map((loan) => {
                    const principalPaid = loan.principal - loan.remaining_principal;
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-serif font-bold text-lg text-slate-900">{loan.purpose}</div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                            Ref: {loan.id.substring(0,8).toUpperCase()} • {loan.start_date ? new Date(loan.start_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(loan.status)}`}>
                            {getStatusIcon(loan.status)}
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-mono font-bold text-slate-700">₱{loan.principal.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{loan.interest_rate}% Fixed Rate</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-mono font-bold text-emerald-600">₱{principalPaid.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 font-sans italic">Excl. Interest</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`font-mono font-bold text-lg ${loan.remaining_principal > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                            ₱{loan.remaining_principal.toLocaleString()}
                          </div>
                          {loan.status === 'active' && (
                            <div className="text-[10px] text-blue-500 font-sans uppercase font-bold tracking-tighter">Current Debt</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* NEW: Savings Goals Summary Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <Target size={20} className="text-gold-600" />
                Wealth Milestones & Objectives
            </h2>
        </div>
        
        {memberSavingGoals.length === 0 ? (
           <div className="bg-white p-12 text-center flex flex-col items-center justify-center rounded-sm border border-slate-200 border-dashed text-slate-400">
              <PiggyBank size={48} className="mb-3 opacity-20" strokeWidth={1} />
              <p className="font-serif italic text-lg">No active savings objectives established.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberSavingGoals.map((goal) => {
               const progressPct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
               return (
                  <div key={goal.id} className="bg-white p-6 rounded-sm border-2 border-paper-200 shadow-card hover:border-gold-500/50 transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-serif font-bold text-xl text-slate-900 leading-tight">{goal.name}</h3>
                           {goal.deadline && (
                              <p className="text-[10px] font-mono text-slate-400 uppercase mt-1">Due: {new Date(goal.deadline).toLocaleDateString()}</p>
                           )}
                        </div>
                        <div className={`p-2 rounded-sm bg-gold-50 text-gold-600 group-hover:rotate-12 transition-transform`}>
                           <Target size={18} />
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Balance</p>
                              <p className="font-mono font-bold text-emerald-700 text-lg">₱{goal.current_amount.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Goal</p>
                              <p className="font-mono font-bold text-slate-900 text-lg">₱{goal.target_amount.toLocaleString()}</p>
                           </div>
                        </div>
                        
                        <div className="space-y-1">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{progressPct.toFixed(0)}% Completed</span>
                              <span className="text-[10px] font-mono text-slate-400">₱{(goal.target_amount - goal.current_amount).toLocaleString()} Remaining</span>
                           </div>
                           <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                 className="h-full bg-gold-500 transition-all duration-1000 shadow-[0_0_8px_rgba(197,160,40,0.3)]" 
                                 style={{ width: `${progressPct}%` }}
                              ></div>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
          </div>
        )}
      </motion.div>

      {/* Contribution History Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-serif font-bold text-slate-900">Equity Contribution Log</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified Transactions</span>
        </div>
        
        {memberContributions.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center text-slate-400">
              <PiggyBank size={48} className="mb-3 opacity-20" strokeWidth={1} />
              <p className="font-serif italic">No contributions recorded.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest font-serif">Date</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest font-serif">Type</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest font-serif">Amount</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest font-serif">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberContributions.map((contribution) => (
                  <tr key={contribution.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 text-sm font-mono">
                      {new Date(contribution.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900 capitalize font-serif font-medium">
                      {contribution.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700 font-mono text-lg">
                      +₱{contribution.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider border ${
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
        )}
      </motion.div>
    </motion.div>
  );
};
