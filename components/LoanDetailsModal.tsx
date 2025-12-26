
import React, { useState, useEffect } from 'react';
import { LoanWithBorrower, Payment } from '../types';
import { dataService } from '../services/dataService';
import { X, DollarSign, TrendingDown, History, CreditCard, Loader2, Calculator, Info, AlertCircle } from 'lucide-react';

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithBorrower | null;
  onPaymentSuccess: () => void; // Trigger refresh in parent
}

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  loan,
  onPaymentSuccess
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation state
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      setIsClosing(false);
      fetchHistory();
      setAmount('');
      setError(null);
    }
  }, [isOpen, loan]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const fetchHistory = async () => {
    if (!loan) return;
    setLoadingHistory(true);
    try {
      const history = await dataService.getLoanPayments(loan.id);
      setPayments(history);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loan) return;
    const paymentAmount = Number(amount);
    const totalDue = (loan.remaining_principal || 0) + (loan.interest_accrued || 0);

    // Validation
    if (!amount || paymentAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (paymentAmount > totalDue + 0.01) {
      setError(`Payment cannot exceed the total amount due of ₱${totalDue.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.addPayment(loan.id, paymentAmount);
      setAmount('');
      await fetchHistory(); 
      onPaymentSuccess(); 
    } catch (error: any) {
      console.error(error);
      setError(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !loan) return null;

  // Calculate projected values for display
  const monthlyInterestRate = loan.interest_rate / 100;
  const projectedMonthlyInterest = loan.principal * monthlyInterestRate;
  const totalBalance = (loan.remaining_principal || 0) + (loan.interest_accrued || 0);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div>
             <div className="flex items-center space-x-3 mb-1">
                <h2 className="text-xl font-bold text-slate-800">Loan Details</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                   loan.status === 'active' ? 'bg-green-100 text-green-700' :
                   loan.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                   {loan.status}
                </span>
             </div>
            <p className="text-sm text-slate-500">Borrower: {loan.borrower.full_name}</p>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-900 text-white p-4 rounded-xl col-span-2 md:col-span-1 shadow-md">
              <div className="text-blue-300 mb-2"><DollarSign size={20} /></div>
              <p className="text-xs font-medium text-blue-200 uppercase tracking-widest">Total Payoff</p>
              <p className="text-xl font-bold">₱{totalBalance.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="text-slate-500 mb-2"><CreditCard size={20} /></div>
              <p className="text-xs font-medium text-slate-400 uppercase">Principal</p>
              <p className="text-lg font-bold text-slate-700">₱{loan.remaining_principal.toLocaleString()}</p>
            </div>
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <div className="text-amber-600 mb-2"><TrendingDown size={20} /></div>
              <p className="text-xs font-medium text-amber-500 uppercase">Interest Due</p>
              <p className="text-lg font-bold text-amber-700">₱{(loan.interest_accrued || 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="text-slate-500 mb-2"><Calculator size={20} /></div>
              <p className="text-xs font-medium text-slate-400 uppercase">Rate</p>
              <p className="text-lg font-bold text-slate-700">{loan.interest_rate}%</p>
            </div>
          </div>
          
          {/* Interest Breakdown Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
             <div className="flex items-center space-x-2">
                <Info size={16} className="text-slate-400"/>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Repayment Policy</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                   <span className="text-slate-500 block text-xs mb-1">Monthly Interest Charge</span>
                   <span className="font-semibold text-slate-900">₱{projectedMonthlyInterest.toLocaleString()}</span>
                   <span className="text-xs text-slate-400 block mt-0.5">Calculated on current remaining principal.</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                   <span className="text-slate-500 block text-xs mb-1">Priority Hierarchy</span>
                   <span className="font-semibold text-slate-900">Interest > Principal</span>
                   <span className="text-xs text-slate-400 block mt-0.5">Payments clear interest before principal.</span>
                </div>
             </div>
          </div>

          {/* Add Payment Form */}
          {loan.status === 'active' && (
            <div className="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-paper">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Post Transaction</h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddPayment} className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                    <input 
                      type="number"
                      min="0.01"
                      max={totalBalance}
                      step="0.01"
                      placeholder={`Max Payoff: ${totalBalance.toFixed(2)}`}
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value ? Number(e.target.value) : '');
                        setError(null); 
                      }}
                      className="w-full pl-8 pr-4 py-3 bg-paper-50 border-2 border-paper-200 rounded-lg focus:border-ink-900 focus:outline-none transition-colors text-lg font-mono"
                    />
                 </div>
                 <button 
                  type="submit" 
                  disabled={isSubmitting || !amount}
                  className="bg-ink-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                 >
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Payment'}
                 </button>
              </form>
              <div className="mt-4 p-3 bg-paper-100 rounded-lg border border-paper-200">
                <p className="text-base text-slate-700 font-serif italic text-center flex items-center justify-center gap-2">
                  <Info size={18} className="text-ink-600" />
                  Payment will be applied to ₱{(loan.interest_accrued || 0).toLocaleString()} interest first, then remaining principal.
                </p>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-2">
                 <History size={18} className="text-slate-400" />
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Transaction Journal</h3>
               </div>
               <span className="text-[10px] font-mono text-slate-400 uppercase">Recent First</span>
            </div>
            
            {loadingHistory ? (
               <div className="text-center py-8 text-slate-400">Fetching audit trail...</div>
            ) : payments.length === 0 ? (
               <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 italic font-serif">
                 No payments found for this ledger entry.
               </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-4 font-bold">Entry Date</th>
                      <th className="px-5 py-4 font-bold">Total Payout</th>
                      <th className="px-5 py-4 font-bold">Interest Component</th>
                      <th className="px-5 py-4 font-bold">Principal Reduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono text-xs">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-slate-500">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-700">
                          ₱{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-amber-600">
                          ₱{payment.interest_paid.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          ₱{payment.principal_paid.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoanDetailsModal;
