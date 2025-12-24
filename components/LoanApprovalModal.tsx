
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-leather-900/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Modal Container: Double Border effect for document feel */}
      <div className="bg-paper-50 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-4 border-double border-paper-300 relative">
        
        {/* Header */}
        <div className="bg-paper-100 border-b border-paper-200 p-8 flex justify-between items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500 mb-1">Confidential</div>
            <h2 className="text-2xl font-serif font-bold text-ink-900">Loan Review Assessment</h2>
            <p className="text-sm text-ink-500 mt-1 font-serif italic">Ref: {loan.id.substring(0,8).toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-8 bg-paper-50">
          
          {/* Insufficient Funds Warning */}
          {hasInsufficientFunds && (
            <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3 shadow-sm">
               <div className="text-wax-600 shrink-0">
                  <AlertTriangle size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-wax-600 font-serif">Insufficient Treasury Funds</h3>
                  <p className="text-sm text-ink-600 mt-1 font-mono">
                     Request: ₱{loan.principal.toLocaleString()} <br/>
                     Available: ₱{treasuryBalance.toLocaleString()}
                  </p>
               </div>
            </div>
          )}

          {/* Borrower Profile */}
          <div className="flex items-center space-x-4 border-b border-dashed border-paper-300 pb-6">
            <div className="relative w-16 h-16 rounded-sm bg-white p-1 shadow-sm border border-paper-200 rotate-2">
               <img 
                 src={loan.borrower.avatar_url} 
                 alt={loan.borrower.full_name} 
                 className="w-full h-full object-cover grayscale"
               />
            </div>
            <div>
              <h3 className="font-serif font-bold text-ink-900 text-xl">{loan.borrower.full_name}</h3>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <span className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-widest border ${isNonMember ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {isNonMember ? 'External' : 'Member'}
                </span>
                <span className="text-ink-500 font-mono text-sm">• Equity: ₱{loan.borrower.equity.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="relative p-2 border-l-2 border-ink-900 pl-4">
              <label className="text-xs font-bold text-ink-400 uppercase tracking-widest block mb-1">Principal</label>
              <div className="text-xl font-bold text-ink-900 font-mono">₱{loan.principal.toLocaleString()}</div>
            </div>
            <div className="relative p-2 border-l-2 border-ink-900 pl-4">
              <label className="text-xs font-bold text-ink-400 uppercase tracking-widest block mb-1">Term</label>
              <div className="text-xl font-bold text-ink-900 font-mono">{loan.duration_months} Months</div>
            </div>
            <div className="col-span-2 bg-paper-100 p-4 rounded-sm border border-paper-200">
              <label className="text-xs font-bold text-ink-400 uppercase tracking-widest block mb-2">Purpose of Request</label>
              <div className="text-base text-ink-800 font-serif italic leading-relaxed">"{loan.purpose}"</div>
            </div>
          </div>

          {/* Interest Rate Override */}
          <div className="bg-white border border-paper-200 rounded-sm p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-paper-200 pb-2 mb-2">
              <label className="flex items-center space-x-2 text-sm font-bold text-ink-800 uppercase tracking-wide">
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
                  className="w-full pl-0 pr-12 py-2 bg-transparent border-b-2 border-ink-200 focus:border-ink-800 outline-none transition-all font-mono text-3xl font-bold text-ink-900"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-300 font-serif italic text-xl">%</span>
              </div>
            </div>

            {/* Projections */}
            <div className="space-y-2 pt-2">
               <div className="flex justify-between text-sm font-mono">
                  <span className="text-ink-500">Monthly Interest:</span>
                  <span className="font-bold text-ink-900">₱{monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between text-sm font-mono border-t border-paper-200 pt-2 mt-2">
                  <span className="text-ink-500">Total Repayment:</span>
                  <span className="font-bold text-ink-900">~₱{estimatedTotalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
        <div className="bg-paper-100 p-6 border-t border-paper-200 flex items-center justify-end space-x-4">
          <button
            onClick={() => onReject(loan.id)}
            className="px-6 py-2.5 text-ink-600 font-bold uppercase text-xs tracking-widest hover:text-wax-600 transition-colors"
          >
            Reject Application
          </button>
          <button
            onClick={() => onApprove(loan.id, interestRate)}
            disabled={hasInsufficientFunds}
            className={`flex items-center space-x-2 px-8 py-3 font-bold uppercase text-xs tracking-widest rounded-sm shadow-md transition-all active:translate-y-0.5 border-b-2 ${
               hasInsufficientFunds 
               ? 'bg-paper-300 text-ink-400 border-paper-400 cursor-not-allowed shadow-none' 
               : 'bg-ink-900 hover:bg-black text-white border-ink-700'
            }`}
          >
            <CheckCircle size={14} />
            <span>Approve & Sign</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanApprovalModal;
