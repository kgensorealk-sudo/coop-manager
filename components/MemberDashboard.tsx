
import React from 'react';
import { User, LoanWithBorrower, ContributionWithMember } from '../types';
import { StatCard } from './StatCard';
import { Wallet, CreditCard, Calendar, Clock, AlertCircle, Plus, PiggyBank, Lock } from 'lucide-react';

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
  
  const activeLoan = memberLoans.find(l => l.status === 'active');
  const pendingLoans = memberLoans.filter(l => l.status === 'pending');
  const hasPendingLoan = pendingLoans.length > 0;
  const historyLoans = memberLoans.filter(l => l.status !== 'pending');
  const pendingContributions = memberContributions.filter(c => c.status === 'pending');
  
  const nextPaymentDate = activeLoan ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString() : 'N/A';

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
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-sm font-bold uppercase tracking-wide shadow-sm flex items-center justify-center space-x-2 border-b-4 border-emerald-800 active:translate-y-0.5 active:border-b-0 transition-all"
           >
              <Plus size={18} />
              <span>Deposit</span>
           </button>
           <button 
             onClick={hasPendingLoan ? undefined : onApplyLoan}
             disabled={hasPendingLoan}
             className={`px-6 py-3 rounded-sm font-bold uppercase tracking-wide shadow-sm flex items-center justify-center space-x-2 border-b-4 active:translate-y-0.5 active:border-b-0 transition-all ${
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
          title="Loan Balance" 
          value={`₱${(activeLoan?.remaining_principal || 0).toLocaleString()}`} 
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
                       <span className="shrink-0 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm border border-amber-200">Loan Request</span>
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
                       <span className="shrink-0 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm border border-amber-200">Deposit Review</span>
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

      {/* Loan History Table (Non-Pending) */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-serif font-bold text-slate-900">Loan History</h2>
        </div>
        
        {historyLoans.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center text-slate-400">
              <AlertCircle size={48} className="mb-3 opacity-20" strokeWidth={1} />
              <p className="font-serif italic">No loan records found.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Start Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Purpose</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Principal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Balance</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 text-sm font-mono">
                      {loan.start_date ? new Date(loan.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-serif">
                      {loan.purpose}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-mono">
                      ₱{loan.principal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold font-mono">
                       {loan.status === 'rejected' ? (
                          <span className="text-slate-300">-</span>
                       ) : (
                          `₱${loan.remaining_principal.toLocaleString()}`
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider border ${
                        loan.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        loan.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        loan.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contribution History Table */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Status</th>
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
