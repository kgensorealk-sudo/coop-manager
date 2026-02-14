
import React, { useState, useEffect, useMemo } from 'react';
import { LoanWithBorrower, Payment } from '../types';
import { dataService } from '../services/dataService';
import { 
  X, 
  TrendingDown, 
  CreditCard, 
  Loader2, 
  Calculator, 
  Info, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  Scale,
  History,
  AlertTriangle
} from 'lucide-react';

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithBorrower | null;
  onPaymentSuccess: () => void;
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'schedule'>('history');

  // Animation state
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      setIsClosing(false);
      fetchHistory();
      setAmount('');
      setError(null);
      setActiveTab('history');
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
    try {
      const history = await dataService.getLoanPayments(loan.id);
      setPayments(history);
    } catch (error) {
      console.error(error);
    }
  };

  const debt = useMemo(() => {
    if (!loan) return null;
    return dataService.calculateDetailedDebt(loan, payments);
  }, [loan, payments]);

  const amortizationSchedule = useMemo(() => {
    if (!loan || !debt) return [];
    
    const installmentInterest = (loan.principal * 0.05); // 5% per cycle (Total 20%)
    const installmentPrincipal = loan.principal / 4;
    
    const loanStart = new Date(loan.start_date || loan.created_at);
    const scheduleDates = dataService.getInstallmentDates(loanStart);

    const historyTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    let cumulativeRequired = 0;
    const now = new Date();

    return scheduleDates.map((paydayDate, index) => {
        cumulativeRequired += debt.installmentAmount;
        
        const isSettled = historyTotalPaid >= (cumulativeRequired - 0.1);
        const isPast = paydayDate < now;

        return {
            number: index + 1,
            date: paydayDate,
            interest: installmentInterest,
            principal: installmentPrincipal,
            total: debt.installmentAmount,
            status: isSettled ? 'paid' : (isPast ? 'overdue' : 'upcoming')
        };
    });
  }, [loan, payments, debt]);

  const nextDue = useMemo(() => {
    return amortizationSchedule.find(i => i.status !== 'paid');
  }, [amortizationSchedule]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loan || !amount || Number(amount) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.addPayment(loan.id, Number(amount));
      setAmount('');
      await fetchHistory(); 
      onPaymentSuccess(); 
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !loan || !debt) return null;

  const totalPaidOverall = payments.reduce((sum, p) => sum + p.amount, 0);
  const progressPercent = Math.min((totalPaidOverall / (debt.totalTermDebt + debt.penaltyTotal)) * 100, 100);
  const principalProgress = Math.min(((loan.principal - debt.remainingPrincipal) / loan.principal) * 100, 100);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-leather-900/70 backdrop-blur-md p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-paper-50 rounded-sm shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border-4 border-double border-paper-300 relative ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        <div className={`p-8 relative overflow-hidden shrink-0 min-h-[300px] transition-colors duration-500 ${debt.isPostTerm ? 'bg-wax-950 text-paper-50' : 'bg-[#0f172a] text-paper-50'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none rotate-12">
             <Receipt size={180} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
             <div>
                <div className="flex items-center gap-3 mb-1">
                   <h2 className="text-3xl font-serif font-bold tracking-tight text-paper-50">Sovereign Ledger</h2>
                   <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] border ${
                      debt.isPostTerm ? 'bg-wax-500/20 text-wax-400 border-wax-500/30 animate-pulse' :
                      loan.status === 'active' ? 'bg-[#059669]/20 text-[#10b981] border-[#059669]/30' :
                      loan.status === 'paid' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/10 text-white/40'
                   }`}>
                      {debt.isPostTerm ? 'PENALTY PHASE' : loan.status}
                   </span>
                </div>
                <p className="text-paper-400 font-serif italic text-lg">{loan.borrower.full_name} • {loan.purpose}</p>
             </div>
             <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-paper-400 hover:text-white">
                <X size={24} />
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 border-t border-white/10 pt-8">
             <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A028] flex items-center gap-2">
                   <Scale size={12} /> Live Interest & Penalties
                </div>
                <div className="text-3xl font-mono font-bold">₱{(debt.remainingTermInterest + debt.penaltyTotal).toLocaleString()}</div>
                <div className="text-xs text-paper-500 font-serif italic">
                   {debt.isPostTerm ? `Includes ₱${debt.penaltyTotal.toLocaleString()} Late Fees` : 'Fixed Term Interest'}
                </div>
             </div>

             <div className="space-y-1 border-l border-white/10 md:pl-8">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#059669] flex items-center gap-2">
                   <TrendingDown size={12} /> Total Recovery
                </div>
                <div className="text-3xl font-mono font-bold text-[#059669]">{progressPercent.toFixed(1)}%</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-[#059669] transition-all duration-1000 shadow-[0_0_8px_rgba(5,150,105,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                </div>
             </div>

             <div className="space-y-1 border-l border-white/10 md:pl-8">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d97706] flex items-center gap-2">
                   <Calendar size={12} /> Current Installment Due
                </div>
                {nextDue ? (
                   <>
                      <div className="text-3xl font-mono font-bold text-[#d97706]">₱{debt.installmentAmount.toLocaleString()}</div>
                      <div className="text-xs text-paper-400 font-serif italic uppercase tracking-wider">
                         Plan: {nextDue.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                   </>
                ) : (
                   <div className="text-xl font-serif italic text-paper-500 mt-2">Term Completed</div>
                )}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth min-h-0">
          
          {debt.isPostTerm && (
             <div className="bg-wax-50 border-2 border-wax-600 rounded-sm p-6 shadow-sm">
                <div className="flex items-start gap-4">
                   <div className="p-3 bg-wax-600 text-white rounded-sm">
                      <AlertTriangle size={24}/>
                   </div>
                   <div className="flex-1">
                      <h3 className="text-xl font-serif font-bold text-wax-900 mb-1">Post-Term Default Penalty Applied</h3>
                      <p className="text-sm text-wax-800 font-serif italic leading-relaxed mb-4">
                         The 4-installment grace window has closed. The account has entered the default phase.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="p-3 bg-white border border-wax-200 rounded-sm">
                            <span className="block text-[10px] font-black uppercase text-wax-600 mb-1">Base Penalty (10%)</span>
                            <span className="font-mono font-bold">₱{(loan.principal * 0.1).toLocaleString()}</span>
                         </div>
                         <div className="p-3 bg-white border border-wax-200 rounded-sm">
                            <span className="block text-[10px] font-black uppercase text-wax-600 mb-1">Surcharge (10%)</span>
                            <span className="font-mono font-bold">₱{(loan.principal * 0.01).toLocaleString()}</span>
                         </div>
                         <div className="p-3 bg-white border border-wax-200 rounded-sm">
                            <span className="block text-[10px] font-black uppercase text-wax-600 mb-1">Months Overdue</span>
                            <span className="font-mono font-bold">{debt.monthsOverdue} Mo.</span>
                         </div>
                         <div className="p-3 bg-wax-600 text-white rounded-sm shadow-md">
                            <span className="block text-[10px] font-black uppercase text-wax-100 mb-1">Total Penalty Due</span>
                            <span className="font-mono font-bold text-lg">₱{debt.penaltyTotal.toLocaleString()}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-paper-200 pb-2">
                <h3 className="text-sm font-black text-ink-900 uppercase tracking-widest flex items-center gap-2">
                   <Info size={16} className="text-[#C5A028]" /> Principal Recovery Plan
                </h3>
                <span className="text-[10px] font-mono text-ink-400">EXCL. PENALTIES</span>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <span className="text-xs font-serif italic text-ink-600">You have recovered {principalProgress.toFixed(0)}% of the original principal.</span>
                   <span className="text-sm font-mono font-bold text-ink-900">₱{(loan.principal - debt.remainingPrincipal).toLocaleString()} / ₱{loan.principal.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-paper-200 rounded-sm overflow-hidden border border-paper-300">
                   <div 
                      className="h-full bg-[#059669] transition-all duration-1000" 
                      style={{ width: `${principalProgress}%` }}
                   ></div>
                </div>
             </div>
          </div>

          {loan.status === 'active' && (
            <div className="bg-paper-100/50 border-2 border-paper-300 rounded-sm p-6 shadow-sm group hover:border-ink-400 transition-colors">
              <h3 className="text-sm font-black text-ink-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Calculator size={18} className="text-[#C5A028]" /> Post Repayment
              </h3>
              
              <form onSubmit={handleAddPayment} className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-bold text-xl font-serif">₱</span>
                    <input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value ? Number(e.target.value) : '');
                            setError(null); 
                        }}
                        className="w-full pl-10 pr-4 py-4 bg-paper-50 border-b-2 border-paper-300 focus:border-ink-900 outline-none transition-colors text-2xl font-mono text-ink-900"
                    />
                 </div>
                 <button 
                    type="submit" 
                    disabled={isSubmitting || !amount}
                    className="bg-[#0f172a] hover:bg-black text-paper-50 px-10 py-4 rounded-sm font-bold uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-4 border-black"
                 >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><CreditCard size={18}/> Record Payment</>}
                 </button>
              </form>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-ink-400 font-black uppercase tracking-widest">
                  <History size={12}/> Cascade: Penalties (₱{debt.penaltyTotal.toLocaleString()}) are settled before Interest or Principal.
              </div>
              {error && <p className="mt-4 text-xs text-wax-600 font-black flex items-center gap-2"><AlertCircle size={14}/> {error}</p>}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex border-b border-paper-200">
               <button 
                 onClick={() => setActiveTab('history')}
                 className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'history' ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
               >
                 Audit Log
                 {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#C5A028]"></div>}
               </button>
               <button 
                 onClick={() => setActiveTab('schedule')}
                 className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'schedule' ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
               >
                 Aged Schedule
                 {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#C5A028]"></div>}
               </button>
            </div>
            
            {activeTab === 'history' ? (
              <div className="bg-white border border-paper-200 rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-paper-100 border-b border-paper-200 text-[10px] text-ink-500 uppercase tracking-widest font-black">
                    <tr>
                      <th className="px-6 py-4">Ref. Date</th>
                      <th className="px-6 py-4">Amt Collected</th>
                      <th className="px-6 py-4">Allocated Interest/Pen</th>
                      <th className="px-6 py-4 text-right">Running Principal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-100 font-mono text-xs">
                    {payments.length === 0 ? (
                       <tr><td colSpan={4} className="px-6 py-16 text-center text-ink-300 italic font-serif text-xl">No transactions found in history.</td></tr>
                    ) : (
                        payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-paper-50 transition-colors group">
                            <td className="px-6 py-5 text-ink-600 font-serif italic text-base">
                                {new Date(payment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-5 font-bold text-sm text-ink-900">
                                ₱{payment.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-5 text-[#d97706] text-sm">
                                ₱{payment.interest_paid.toLocaleString()}
                            </td>
                            <td className="px-6 py-5 text-right font-black text-ink-900 text-lg">
                                ₱{loan.principal.toLocaleString()}
                            </td>
                        </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
               <div className="bg-white border border-paper-200 rounded-sm overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-paper-100 border-b border-paper-200 text-[10px] text-ink-500 uppercase tracking-widest font-black">
                        <tr>
                            <th className="px-6 py-4">No.</th>
                            <th className="px-6 py-4">Cycle Date</th>
                            <th className="px-6 py-4">Base P+I Due</th>
                            <th className="px-6 py-4">Penalties</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-100 font-mono text-xs">
                        {amortizationSchedule.map((step) => (
                            <tr key={step.number} className={`hover:bg-paper-50 transition-colors ${step.status === 'paid' ? 'opacity-40' : ''}`}>
                                <td className="px-6 py-5 text-ink-400 font-bold">#{step.number}</td>
                                <td className="px-6 py-5 text-ink-900 font-serif italic text-base">
                                    {step.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-5 text-ink-900 font-bold">₱{debt.installmentAmount.toLocaleString()}</td>
                                <td className="px-6 py-5 text-ink-400">₱0.00</td>
                                <td className="px-6 py-5 text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest border ${
                                        step.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        step.status === 'overdue' ? 'bg-wax-50 text-wax-600 border-wax-200 animate-pulse' :
                                        'bg-paper-100 text-ink-400 border-paper-200'
                                    }`}>
                                        {step.status === 'paid' ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                                        {step.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {debt.isPostTerm && (
                           <tr className="bg-wax-50/30">
                              <td className="px-6 py-5 font-bold text-wax-600">PEN</td>
                              <td className="px-6 py-5 italic text-wax-900">Post-Term Accumulation</td>
                              <td className="px-6 py-5">--</td>
                              <td className="px-6 py-5 text-wax-600 font-black">₱{debt.penaltyTotal.toLocaleString()}</td>
                              <td className="px-6 py-5 text-right">
                                 <span className="px-3 py-1 bg-wax-600 text-white text-[9px] font-black rounded-sm uppercase">Active Default</span>
                              </td>
                           </tr>
                        )}
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
