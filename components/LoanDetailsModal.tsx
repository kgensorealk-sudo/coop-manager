
import React, { useState, useEffect } from 'react';
import { LoanWithBorrower, Payment } from '../types';
import { dataService } from '../services/dataService';
import { X, DollarSign, TrendingDown, History, CreditCard, Loader2, Calculator, Info } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && loan) {
      fetchHistory();
    }
  }, [isOpen, loan]);

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
    if (!loan || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await dataService.addPayment(loan.id, Number(amount));
      setAmount('');
      await fetchHistory(); // Refresh local history
      onPaymentSuccess(); // Refresh parent data (remaining principal update)
    } catch (error) {
      console.error(error);
      alert('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !loan) return null;

  // Calculate projected values
  const monthlyInterest = loan.principal * (loan.interest_rate / 100);
  const totalEstimatedInterest = monthlyInterest * loan.duration_months;
  const totalRepayment = loan.principal + totalEstimatedInterest;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl col-span-2 md:col-span-1">
              <div className="text-blue-600 mb-2"><DollarSign size={20} /></div>
              <p className="text-xs font-medium text-blue-400 uppercase">Remaining</p>
              <p className="text-xl font-bold text-blue-900">₱{loan.remaining_principal.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div className="text-slate-500 mb-2"><CreditCard size={20} /></div>
              <p className="text-xs font-medium text-slate-400 uppercase">Principal</p>
              <p className="text-lg font-bold text-slate-700">₱{loan.principal.toLocaleString()}</p>
            </div>
             <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div className="text-slate-500 mb-2"><TrendingDown size={20} /></div>
              <p className="text-xs font-medium text-slate-400 uppercase">Rate</p>
              <p className="text-lg font-bold text-slate-700">{loan.interest_rate}%</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
              <div className="text-purple-500 mb-2"><Calculator size={20} /></div>
              <p className="text-xs font-medium text-purple-400 uppercase">Est. Interest</p>
              <p className="text-lg font-bold text-purple-700">₱{totalEstimatedInterest.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Interest Breakdown Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
             <div className="flex items-center space-x-2">
                <Info size={16} className="text-slate-400"/>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Repayment Projection</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                   <span className="text-slate-500 block text-xs mb-1">Monthly Interest</span>
                   <span className="font-semibold text-slate-900">₱{monthlyInterest.toLocaleString()}</span>
                   <span className="text-xs text-slate-400 block mt-0.5">({loan.interest_rate}% of Principal)</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                   <span className="text-slate-500 block text-xs mb-1">Duration</span>
                   <span className="font-semibold text-slate-900">{loan.duration_months} Months</span>
                   <span className="text-xs text-slate-400 block mt-0.5">Fixed Term</span>
                </div>
                 <div className="bg-white p-3 rounded-lg border border-slate-100">
                   <span className="text-slate-500 block text-xs mb-1">Total Payback</span>
                   <span className="font-bold text-slate-900">₱{totalRepayment.toLocaleString()}</span>
                   <span className="text-xs text-slate-400 block mt-0.5">Principal + Interest</span>
                </div>
             </div>
          </div>

          {/* Add Payment Form */}
          {loan.status === 'active' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Record New Payment</h3>
              <form onSubmit={handleAddPayment} className="flex gap-4">
                 <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
                    <input 
                      type="number"
                      min="1" 
                      step="0.01"
                      placeholder="Enter amount..." 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                 </div>
                 <button 
                  type="submit" 
                  disabled={isSubmitting || !amount}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                 >
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Add Payment'}
                 </button>
              </form>
            </div>
          )}

          {/* Payment History */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <History size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Payment History</h3>
            </div>
            
            {loadingHistory ? (
               <div className="text-center py-8 text-slate-400">Loading history...</div>
            ) : payments.length === 0 ? (
               <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                 No payments recorded yet.
               </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Total Paid</th>
                      <th className="px-4 py-3 font-semibold text-slate-400">Interest</th>
                      <th className="px-4 py-3 font-semibold text-slate-400">Principal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          ₱{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          ₱{payment.interest_paid.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
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
