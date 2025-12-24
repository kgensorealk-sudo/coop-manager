
import React from 'react';
import { User, LoanWithBorrower, ContributionWithMember } from '../types';
import { StatCard } from './StatCard';
import { Wallet, CreditCard, Calendar, Clock, AlertCircle, Plus, PiggyBank, Lock, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';

interface MemberDashboardProps {
  user: User;
  memberLoans: LoanWithBorrower[];
  memberContributions: ContributionWithMember[];
  onApplyLoan: () => void;
  onAddContribution: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ 
  user, 
  memberLoans, 
  memberContributions, 
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
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Pending Items (Loans & Deposits) */}
      {(pendingLoans.length > 0 || pendingContributions.length > 0) && (
        <div className="bg-amber-50 rounded-sm border border-amber-200 p-6 relative overflow-hidden">
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
        </div>
      )}

      {/* Loan Applications Summary (Non-Pending) - Replaces previous Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-slate-900 border-b border-slate-200 pb-2">Loan Applications Summary</h2>
        
        {historyLoans.length === 0 ? (
           <div className="bg-white p-12 text-center flex flex-col items-center justify-center rounded-sm border border-slate-200 border-dashed text-slate-400">
              <AlertCircle size={48} className="mb-3 opacity-20" strokeWidth={1} />
              <p className="font-serif italic text-lg">No active or past loan records found.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {historyLoans.map((loan) => (
              <div 
                key={loan.id} 
                className={`bg-white rounded-sm border shadow-sm p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-md ${loan.status === 'active' ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-slate-200'}`}
              >
                {/* Decorative Side Bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${loan.status === 'active' ? 'bg-emerald-500' : loan.status === 'paid' ? 'bg-blue-500' : 'bg-red-500'}`}></div>

                <div className="flex justify-between items-start mb-6 pl-3">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-slate-900">{loan.purpose}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-slate-500">
                        {loan.start_date ? new Date(loan.start_date).toLocaleDateString() : 'N/A'}
                      </span>
                      {loan.status === 'active' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                           Due: {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getStatusColor(loan.status)}`}>
                    {getStatusIcon(loan.status)}
                    {loan.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-3 border-l border-dashed border-slate-200 ml-0.5">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Principal</span>
                    <span className="text-lg font-mono text-slate-700 font-bold">₱{loan.principal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Remaining Balance</span>
                    <span className={`text-lg font-mono font-bold ${loan.remaining_principal > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      ₱{loan.remaining_principal.toLocaleString()}
                    </span>
                  </div>
                   <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Interest Rate</span>
                    <span className="text-sm font-mono text-slate-600 font-medium">{loan.interest_rate}% / mo</span>
                  </div>
                   <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Duration</span>
                    <span className="text-sm font-mono text-slate-600 font-medium">{loan.duration_months} Months</span>
                  </div>
                </div>

                {loan.status === 'rejected' && (
                  <div className="mt-4 pl-3 text-xs text-red-500 italic">
                    This application was not approved. Please contact admin for details.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contribution History Table */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-serif font-bold text-slate-900">Contribution Log</h2>
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
                    <td className="px-6 py-4 font-bold text-emerald-700 font-mono">
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
      </div>
    </div>
  );
};
