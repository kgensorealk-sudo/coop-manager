
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { 
  X, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  ScrollText, 
  ChevronLeft, 
  CalendarClock,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  CalendarDays
} from 'lucide-react';

interface LoanApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { borrower_id: string; principal: number; duration_months: number; purpose: string }) => Promise<void>;
  members: User[];
  currentUser?: User;
}

const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  members,
  currentUser
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [borrowerId, setBorrowerId] = useState('');
  const [principal, setPrincipal] = useState<number | ''>('');
  const [durationMonths, setDurationMonths] = useState<number>(2);
  const [purpose, setPurpose] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  
  const [isClosing, setIsClosing] = useState(false);

  // Hook must be called at top level
  const simulatedSchedule = useMemo(() => {
    // Safety guard inside the hook
    if (!isOpen || !principal) return [];
    
    const totalRepaymentLocal = Number(principal) * (1 + (0.10 * durationMonths));
    const totalInstallmentsLocal = durationMonths * 2;
    const installmentAmountLocal = totalRepaymentLocal / totalInstallmentsLocal;
    
    const startDate = new Date(); 
    const dates = dataService.getInstallmentDates(startDate, totalInstallmentsLocal);
    
    const principalPerPayment = Number(principal) / totalInstallmentsLocal;
    const interestPerPayment = (Number(principal) * 0.10 * durationMonths) / totalInstallmentsLocal;

    return dates.map((date, index) => ({
      number: index + 1,
      date,
      principal: principalPerPayment,
      interest: interestPerPayment,
      total: installmentAmountLocal
    }));
  }, [isOpen, principal, durationMonths]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setStep(1);
      setAcceptedTerms(false);
      setDurationMonths(2);
      setShowSchedule(false);
      if (currentUser && currentUser.role === 'member') {
        setBorrowerId(currentUser.id);
      } else {
        setBorrowerId('');
      }
    }
  }, [isOpen, currentUser]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const borrowerName = members.find(m => m.id === borrowerId)?.full_name || currentUser?.full_name || 'Borrower';
  
  // Logic: 10% interest per month. Total interest = principal * (0.10 * months)
  const interestMultiplier = 1 + (0.10 * durationMonths);
  const totalRepayment = principal ? Number(principal) * interestMultiplier : 0;
  const totalInstallments = durationMonths * 2;
  const installmentAmount = totalRepayment / totalInstallments;

  const validateStep1 = () => {
    setError('');
    if (!borrowerId) { setError('Please select a member.'); return false; }
    if (!principal || principal <= 0) { setError('Please enter a valid amount.'); return false; }
    if (durationMonths < 1 || durationMonths > 12) { setError('Loan term must be between 1 and 12 months.'); return false; }
    if (!purpose.trim()) { setError('Please enter a loan purpose.'); return false; }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
       setError('You must accept the covenant terms to proceed.');
       return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        borrower_id: borrowerId,
        principal: Number(principal),
        duration_months: durationMonths,
        purpose: purpose
      });
      setPrincipal('');
      setPurpose('');
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
      setIsSubmitting(false);
    }
  };

  const isAdmin = !currentUser || currentUser.role === 'admin';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-leather-900/60 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-paper-50 rounded-sm shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-double border-paper-300 relative ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        {/* Header */}
        <div className="bg-paper-100 border-b border-paper-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-ink-900 text-gold-500 rounded-sm shadow-md">
                <ScrollText size={20} />
             </div>
             <div>
                <h2 className="text-xl font-serif font-bold text-ink-900 uppercase tracking-widest">Loan Requisition</h2>
                <p className="text-xs text-ink-500 font-black uppercase tracking-widest">Step {step} of 2: {step === 1 ? 'Details' : 'Agreement'}</p>
             </div>
          </div>
          <button onClick={handleClose} className="text-ink-400 hover:text-ink-700 transition-colors p-1"><X size={24} /></button>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="p-8 space-y-6 overflow-y-auto">
            {error && (
              <div className="bg-wax-50 text-wax-700 p-4 rounded-sm text-sm flex items-start border border-wax-200 animate-fade-in">
                <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
                <span className="font-serif italic">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Target Account</label>
                {isAdmin ? (
                  <select
                    value={borrowerId}
                    onChange={(e) => setBorrowerId(e.target.value)}
                    className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none transition-all font-serif text-lg text-ink-900"
                  >
                    <option value="" disabled>Select shareholder...</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>{member.full_name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full p-3 bg-paper-100 border border-paper-300 rounded-sm text-ink-600 font-serif italic text-lg">
                    {currentUser?.full_name} (Self)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Principal Amount (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 font-serif font-bold text-xl">₱</span>
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pl-8 pr-4 py-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none transition-all font-mono text-2xl font-bold text-ink-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Repayment Term (Months)</label>
                  <div className="relative group">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={20} />
                    <select
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none transition-all font-mono text-xl font-bold text-ink-900 appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(m => (
                        <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[9px] text-ink-400 font-black uppercase tracking-tighter mt-1 italic">
                    Resulting in {durationMonths * 2} bi-monthly installments.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Reason for Requisition</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="State the intended use of these funds..."
                  rows={3}
                  className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none transition-all font-serif italic text-lg text-ink-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-paper-200">
               <button 
                 onClick={handleNextStep}
                 className="w-full bg-ink-900 hover:bg-black text-paper-50 py-4 rounded-sm font-black uppercase tracking-[0.3em] text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-black"
               >
                  <span>Review Covenant</span>
                  <ArrowRight size={16} />
               </button>
            </div>
          </div>
        )}

        {/* Step 2: Agreement */}
        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-paper-50 relative custom-scrollbar">
               <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                  <ShieldCheck size={300} className="text-ink-900" />
               </div>

               <div className="relative z-10 space-y-8">
                  <div className="text-center border-b-2 border-ink-900 pb-4 mb-6">
                     <h3 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Master Loan & Repayment Covenant</h3>
                     <p className="text-xs font-black uppercase tracking-widest text-ink-500">The 13th Page Cooperative • Registry Office</p>
                  </div>

                  <div className="space-y-6 font-serif text-ink-800 leading-relaxed text-base">
                     <p>I, <strong className="text-ink-950 underline decoration-gold-500 decoration-2">{borrowerName}</strong>, hereby acknowledge the filing of a loan request for <strong className="text-ink-950 font-mono text-lg">₱{Number(principal).toLocaleString()}</strong>.</p>
                     
                     <div className="bg-white border border-paper-300 p-6 rounded-sm space-y-3 font-mono text-sm shadow-inner">
                        <div className="flex justify-between border-b border-paper-100 pb-2">
                           <span className="text-ink-400 font-sans font-bold uppercase text-[10px] tracking-widest">Total Indebtedness (P+I):</span>
                           <span className="font-bold text-ink-900 text-base">₱{totalRepayment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-paper-100 pb-2">
                           <span className="text-ink-400 font-sans font-bold uppercase text-[10px] tracking-widest">Repayment Period:</span>
                           <span className="font-bold text-ink-900 text-base">{durationMonths} Months / {totalInstallments} Payments</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-ink-400 font-sans font-bold uppercase text-[10px] tracking-widest">Installment Amount:</span>
                           <span className="font-bold text-emerald-700 text-xl">₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                     </div>

                     {/* Proposed Schedule Examination */}
                     <div className="border border-paper-300 rounded-sm overflow-hidden bg-paper-100/50">
                        <button 
                          onClick={() => setShowSchedule(!showSchedule)}
                          className="w-full px-5 py-4 flex items-center justify-between hover:bg-paper-200 transition-colors"
                        >
                           <div className="flex items-center gap-3 text-ink-900 font-bold uppercase tracking-[0.15em] text-xs">
                              <ListOrdered size={16} className="text-gold-600" />
                              <span>Examine Repayment Cycle</span>
                           </div>
                           {showSchedule ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                        
                        {showSchedule && (
                           <div className="p-5 pt-0 animate-fade-in">
                              <div className="bg-white border border-paper-200 rounded-sm overflow-hidden shadow-sm">
                                 <table className="w-full text-left font-mono text-xs border-collapse">
                                    <thead className="bg-paper-200 text-ink-500 uppercase font-black tracking-tighter">
                                       <tr>
                                          <th className="p-3 border-b border-paper-300">No.</th>
                                          <th className="p-3 border-b border-paper-300">Date</th>
                                          <th className="p-3 border-b border-paper-300 text-right">Amount</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-paper-100">
                                       {simulatedSchedule.map((row) => (
                                          <tr key={row.number} className="hover:bg-paper-50 transition-colors">
                                             <td className="p-3 font-bold text-ink-400">#{row.number}</td>
                                             <td className="p-3 italic text-ink-900 flex items-center gap-2">
                                                <CalendarDays size={14} className="text-paper-400" />
                                                {row.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                             </td>
                                             <td className="p-3 text-right font-bold text-emerald-700 text-sm">₱{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                              <p className="mt-3 text-[10px] text-ink-400 font-serif italic text-center uppercase tracking-tighter">Dates projected based on standard 10th/25th window rules.</p>
                           </div>
                        )}
                     </div>

                     <section className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-ink-900 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-gold-600 rounded-full"></div> Repayment Terms
                        </h4>
                        <p className="italic text-sm text-ink-700 leading-relaxed pl-3 border-l border-paper-300">
                           Repayments are strictly bi-monthly, scheduled on the <strong>10th and 25th</strong> of each month, starting the month following disbursement. Total interest of {durationMonths * 10}% has been applied to the principal sum.
                        </p>
                     </section>

                     <section className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-ink-900 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-wax-600 rounded-full"></div> Default Clause
                        </h4>
                        <p className="italic text-sm text-ink-700 leading-relaxed pl-3 border-l border-paper-300">
                           Failure to settle by the {totalInstallments}th installment triggers the <strong>Penalty Phase</strong>: a 10% principal penalty plus a 10% monthly surcharge on that penalty until settled.
                        </p>
                     </section>
                  </div>

                  <div className="pt-8 border-t border-dashed border-paper-300">
                     <label className="flex items-start gap-4 cursor-pointer group p-4 bg-paper-100/30 rounded-sm hover:bg-paper-100 transition-colors">
                        <input 
                           type="checkbox" 
                           checked={acceptedTerms}
                           onChange={(e) => setAcceptedTerms(e.target.checked)}
                           className="mt-1 w-6 h-6 accent-ink-900 border-paper-300 rounded-sm cursor-pointer"
                        />
                        <span className="text-base font-serif font-bold text-ink-900 group-hover:text-ink-950 transition-colors">
                           I have read the Covenant and understand that my digital signature here is legally binding to the cooperative books.
                        </span>
                     </label>
                  </div>
               </div>
            </div>

            {error && step === 2 && (
               <div className="px-8 pb-4">
                  <div className="bg-wax-50 text-wax-700 p-4 rounded-sm text-sm flex items-center border border-wax-200 font-serif italic">
                     <AlertCircle size={18} className="mr-3 shrink-0" />
                     {error}
                  </div>
               </div>
            )}

            <div className="p-6 bg-paper-100 border-t border-paper-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-ink-500 hover:text-ink-900 font-bold uppercase text-xs tracking-widest transition-colors p-2"
              >
                <ChevronLeft size={20} />
                <span>Revise Details</span>
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !acceptedTerms}
                className={`flex items-center gap-3 px-12 py-4 font-black uppercase text-sm tracking-[0.2em] rounded-sm shadow-xl transition-all active:scale-95 border-b-4 ${
                  !acceptedTerms 
                    ? 'bg-paper-300 text-paper-400 border-paper-400 cursor-not-allowed shadow-none' 
                    : 'bg-ink-900 hover:bg-black text-paper-50 border-black'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>Accept & Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanApplicationForm;
