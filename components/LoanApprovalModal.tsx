
import React, { useState, useEffect } from 'react';
import { LoanWithBorrower } from '../types';
import { X, AlertCircle, CheckCircle, Percent, AlertTriangle } from 'lucide-react';

interface LoanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithBorrower | null;
  onApprove: (loanId: string, interestRate: number) => void;
  onReject: (loanId: string) => void;
  treasuryBalance: number;
}

const LoanApprovalModal: React.FC<LoanApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  loan, 
  onApprove,
  onReject,
  treasuryBalance
}) => {
  const [interestRate, setInterestRate] = useState<number>(10);

  useEffect(() => {
    if (loan) {
      setInterestRate(loan.interest_rate);
    }
  }, [loan]);

  if (!isOpen || !loan) return null;

  const isNonMember = !loan.borrower.is_coop_member;
  
  const monthlyInterest = (loan.principal * (interestRate / 100));
  const estimatedTotalRepayment = loan.principal + (monthlyInterest * loan.duration_months);
  
  const hasInsufficientFunds = loan.principal > treasuryBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 relative">
        
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800"></div>

        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900">Loan Review</h2>
            <p className="text-sm text-slate-500 mt-1 font-serif italic">Official assessment document.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white">
          
          {/* Insufficient Funds Warning */}
          {hasInsufficientFunds && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 flex items-start gap-3 shadow-sm">
               <div className="text-red-700 shrink-0">
                  <AlertTriangle size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-red-900 font-serif">Insufficient Treasury Funds</h3>
                  <p className="text-sm text-red-800 mt-1 font-serif">
                     Request: ₱{loan.principal.toLocaleString()} <br/>
                     Available: ₱{treasuryBalance.toLocaleString()}
                  </p>
               </div>
            </div>
          )}

          {/* Borrower Profile */}
          <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-sm border border-slate-200 border-dashed">
            <img 
              src={loan.borrower.avatar_url} 
              alt={loan.borrower.full_name} 
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 grayscale"
            />
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-lg">{loan.borrower.full_name}</h3>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${isNonMember ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {isNonMember ? 'External' : 'Member'}
                </span>
                <span className="text-slate-500 font-mono text-xs">• Equity: ₱{loan.borrower.equity.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-300 p-3 rounded-sm relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute top-2 left-3">Principal</label>
              <div className="text-lg font-bold text-slate-900 font-mono mt-4 pt-1">₱{loan.principal.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-slate-300 p-3 rounded-sm relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute top-2 left-3">Term</label>
              <div className="text-lg font-bold text-slate-900 font-mono mt-4 pt-1">{loan.duration_months} Months</div>
            </div>
            <div className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-sm">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Purpose</label>
              <div className="text-sm text-slate-800 font-serif italic leading-relaxed">"{loan.purpose}"</div>
            </div>
          </div>

          {/* Interest Rate Override */}
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-2">
              <label className="flex items-center space-x-2 text-sm font-bold text-blue-900 uppercase tracking-wide">
                <Percent size={14} />
                <span>Rate Adjustment</span>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-4 pr-12 py-3 bg-white border-2 border-blue-200 rounded-sm focus:border-blue-600 outline-none transition-all font-mono text-2xl font-bold text-blue-900"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-serif italic text-lg">%</span>
              </div>
            </div>

            {/* Projections */}
            <div className="space-y-2 pt-2">
               <div className="flex justify-between text-sm font-mono">
                  <span className="text-slate-600">Monthly Interest:</span>
                  <span className="font-bold text-slate-900">₱{monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between text-sm font-mono border-t border-blue-200 pt-2 mt-2">
                  <span className="text-slate-600">Total Repayment:</span>
                  <span className="font-bold text-blue-900">~₱{estimatedTotalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
            </div>
          </div>

          {/* Warning for High Rates */}
          {interestRate > 15 && (
            <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-900 text-sm font-serif italic">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>High interest rate warning. Please confirm borrower acknowledgement.</p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={() => onReject(loan.id)}
            className="px-5 py-2.5 text-slate-600 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 hover:text-slate-900 rounded-sm transition-colors border border-transparent"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(loan.id, interestRate)}
            disabled={hasInsufficientFunds}
            className={`flex items-center space-x-2 px-6 py-2.5 font-bold uppercase text-xs tracking-widest rounded-sm shadow-md transition-all active:translate-y-0.5 border-b-4 ${
               hasInsufficientFunds 
               ? 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed shadow-none' 
               : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-800'
            }`}
          >
            <CheckCircle size={16} />
            <span>Approve & Sign</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanApprovalModal;
