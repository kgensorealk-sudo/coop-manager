
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { LoanWithBorrower } from '../types';
import { 
  Clock, 
  Coins, 
  Landmark, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  LayoutGrid, 
  List, 
  Bell, 
  CreditCard,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import LoanDetailsModal from './LoanDetailsModal';

interface ScheduleViewProps {
   filterByUserId?: string;
}

interface PaydayGroup {
  date: string;
  items: any[];
  expectedTotal: number;
  expectedInterest: number;
  paidTotal: number;
  isPayday: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ filterByUserId }) => {
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedLoan, setSelectedLoan] = useState<LoanWithBorrower | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allLoans = await dataService.getLoans();
      setLoans(allLoans.filter(l => l.status === 'active' || l.status === 'paid'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toLocalISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => toLocalISO(new Date()), []);

  const allInstallments = useMemo(() => {
    const installments: any[] = [];
    const now = new Date();

    loans.forEach(loan => {
      if (filterByUserId && loan.borrower_id !== filterByUserId) return;

      // New Math: 2-month term, 4 installments
      const totalTermDebt = loan.principal * 1.20; 
      const installmentAmount = totalTermDebt / 4;
      const installmentInterest = (loan.principal * 0.05); // 5% per payment (Total 20%)
      const installmentPrincipal = loan.principal / 4;

      const loanStart = new Date(loan.start_date || loan.created_at);
      const scheduleDates = dataService.getInstallmentDates(loanStart);

      const totalPaidOverall = loan.principal - loan.remaining_principal; // Approx for simplicity in ledger view
      // NOTE: We rely on the payments collection logic for higher accuracy, but here we track by cumulative principal
      let cumulativeExpectedPrincipal = 0;

      scheduleDates.forEach((paydayDate, index) => {
        cumulativeExpectedPrincipal += installmentPrincipal;

        // Strict date-based overdue check (ignoring hours)
        const isPast = paydayDate < now;
        const isSettled = totalPaidOverall >= (cumulativeExpectedPrincipal - 0.1);

        installments.push({
          loanId: loan.id,
          loanPurpose: loan.purpose,
          borrowerName: loan.borrower.full_name,
          date: paydayDate,
          dateStr: toLocalISO(paydayDate),
          principal: installmentPrincipal,
          interest: installmentInterest,
          total: installmentAmount,
          status: isSettled ? 'paid' : (isPast ? 'overdue' : 'upcoming'),
          loanRef: loan
        });
      });
    });

    return installments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [loans, filterByUserId]);

  const paydayGroups = useMemo(() => {
    const groups: Record<string, PaydayGroup> = {};
    
    allInstallments.forEach(inst => {
      const key = inst.dateStr;
      if (!groups[key]) {
        groups[key] = {
          date: key,
          items: [],
          expectedTotal: 0,
          expectedInterest: 0,
          paidTotal: 0,
          isPayday: inst.date.getDate() === 10 || inst.date.getDate() === 25
        };
      }
      groups[key].items.push(inst);
      groups[key].expectedTotal += inst.total;
      groups[key].expectedInterest += inst.interest;
      if (inst.status === 'paid') groups[key].paidTotal += inst.total;
    });

    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [allInstallments]);

  const forecast = useMemo(() => {
    const now = new Date();
    const ninetyDaysOut = new Date();
    ninetyDaysOut.setDate(now.getDate() + 90);

    const upcomingItems = allInstallments.filter(inst => 
      inst.date >= now && inst.date <= ninetyDaysOut && inst.status !== 'paid'
    );

    return {
      totalInterest: upcomingItems.reduce((sum, item) => sum + item.interest, 0),
      totalCashflow: upcomingItems.reduce((sum, item) => sum + item.total, 0),
      count: upcomingItems.length
    };
  }, [allInstallments]);

  const handleAction = (loan: LoanWithBorrower) => {
    setSelectedLoan(loan);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-paper-300 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-ink-900 leading-tight">Executive Collection Calendar</h1>
          <div className="flex items-center gap-3 text-ink-500 mt-2 font-serif italic text-xl">
             <CalendarDays size={20} className="text-gold-600" />
             <p>Treasury foresight and repayment tracking for the 10th and 25th cycles.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-paper-200/50 p-1 rounded-sm border border-paper-300 shadow-inner">
             <button onClick={() => setViewType('grid')} className={`p-2 px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'grid' ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}>
                <LayoutGrid size={14} />
                <span>Grid</span>
             </button>
             <button onClick={() => setViewType('list')} className={`p-2 px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'list' ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}>
                <List size={14} />
                <span>Ledger</span>
             </button>
          </div>
          <button onClick={fetchData} className="p-3 bg-paper-50 border border-paper-300 rounded-sm hover:bg-paper-100 transition-colors shadow-sm">
            <Clock size={18} className="text-ink-400" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-sm p-8 text-paper-50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <BarChart3 size={120} />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
           <div className="space-y-1">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gold-500 mb-2">Quarterly Outlook</div>
              <h3 className="text-4xl font-serif font-bold italic tracking-tight">3-Month Forecast</h3>
           </div>
           
           <div className="border-l border-white/10 pl-8">
              <div className="text-[10px] font-black uppercase tracking-widest text-ink-400 mb-1 flex items-center gap-2">
                 <Coins size={12} className="text-gold-500" /> Projected Interest
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-400">₱{forecast.totalInterest.toLocaleString()}</div>
           </div>

           <div className="border-l border-white/10 pl-8">
              <div className="text-[10px] font-black uppercase tracking-widest text-ink-400 mb-1 flex items-center gap-2">
                 <ArrowUpRight size={12} className="text-blue-400" /> Gross Cash Inflow
              </div>
              <div className="text-3xl font-mono font-bold text-blue-400">₱{forecast.totalCashflow.toLocaleString()}</div>
           </div>
        </div>
      </div>

      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paydayGroups.map((group) => {
            const [y, m, d] = group.date.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const isToday = group.date === todayStr;
            const hasItems = group.items.length > 0;
            const progress = group.expectedTotal > 0 ? (group.paidTotal / group.expectedTotal) * 100 : 0;
            
            return (
              <div key={group.date} className={`bg-white border-2 rounded-sm transition-all duration-500 hover:shadow-float group overflow-hidden ${isToday ? 'border-gold-500 ring-4 ring-gold-50 shadow-xl' : 'border-paper-200'}`}>
                <div className={`p-5 flex items-center justify-between border-b ${isToday ? 'bg-gold-500 text-white' : 'bg-paper-100 text-ink-900'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-sm flex flex-col items-center justify-center border ${isToday ? 'bg-white text-gold-600 border-white' : 'bg-leather-900 text-paper-50 border-leather-900 shadow-md'}`}>
                       <span className="text-[9px] font-black uppercase tracking-tighter leading-none mb-1">{date.toLocaleString('default', { month: 'short' })}</span>
                       <span className="text-xl font-mono font-bold leading-none">{date.getDate()}</span>
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg leading-tight">{date.toLocaleString('default', { weekday: 'long' })}</h4>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-white/80' : 'text-ink-400'}`}>
                        {hasItems ? `${group.items.length} Installments` : 'Collection Free'}
                      </p>
                    </div>
                  </div>
                  {isToday && <span className="bg-white text-gold-600 text-[10px] font-black px-2 py-1 uppercase tracking-widest rounded-sm animate-pulse shadow-sm">Active Payday</span>}
                </div>

                <div className="p-6">
                  {!hasItems ? (
                    <div className="py-8 flex flex-col items-center text-center opacity-40">
                       <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                       <p className="text-sm font-serif italic text-ink-600">The registry is clear for this date. No collections required.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">Collection Status</span>
                             <span className="text-xs font-mono font-bold text-ink-900">₱{group.paidTotal.toLocaleString()} / ₱{group.expectedTotal.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-paper-100 rounded-full overflow-hidden border border-paper-200">
                             <div className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-600' : 'bg-ink-900'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          {group.items.slice(0, 5).map((inst, i) => (
                            <div key={i} className={`p-3 rounded-sm border-l-4 transition-all group/item ${inst.status === 'paid' ? 'bg-emerald-50/50 border-emerald-500 opacity-60' : inst.status === 'overdue' ? 'bg-wax-50/50 border-wax-600 shadow-sm' : 'bg-paper-50 border-ink-900'}`}>
                               <div className="flex justify-between items-start mb-1">
                                  <div className="flex-1 min-w-0">
                                     <div className="text-xs font-bold text-ink-900 truncate leading-tight flex items-center gap-1.5">
                                        {inst.status === 'overdue' && <AlertCircle size={10} className="text-wax-600 shrink-0" />}
                                        {inst.borrowerName}
                                     </div>
                                     <div className="text-[10px] text-ink-400 font-mono mt-0.5 uppercase tracking-tighter truncate">{inst.loanPurpose}</div>
                                  </div>
                                  <div className={`text-xs font-mono font-black ${inst.status === 'overdue' ? 'text-wax-600' : 'text-ink-900'}`}>
                                     ₱{inst.total.toLocaleString()}
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden shadow-card animate-slide-up">
           <table className="w-full text-left border-collapse">
              <thead className="bg-leather-900 text-paper-100 text-[10px] font-black uppercase tracking-[0.2em]">
                 <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payday Date</th>
                    <th className="px-6 py-4">Account Holder</th>
                    <th className="px-6 py-4">Principal Part</th>
                    <th className="px-6 py-4">Interest Part</th>
                    <th className="px-6 py-4 text-right">Total Installment</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-paper-100">
                 {allInstallments.map((inst, idx) => (
                    <tr key={idx} className={`hover:bg-paper-50 transition-colors group ${inst.status === 'paid' ? 'opacity-40' : ''}`}>
                       <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest border ${inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inst.status === 'overdue' ? 'bg-wax-50 text-wax-600 border-wax-200 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                             {inst.status === 'paid' ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                             {inst.status}
                          </span>
                       </td>
                       <td className="px-6 py-5">
                          <div className="font-serif font-bold text-lg text-ink-900">{inst.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                       </td>
                       <td className="px-6 py-5">
                          <div className="font-bold text-ink-800">{inst.borrowerName}</div>
                          <div className="text-[10px] font-mono text-ink-400 uppercase tracking-tighter">{inst.loanPurpose}</div>
                       </td>
                       <td className="px-6 py-5 font-mono text-sm">₱{inst.principal.toLocaleString()}</td>
                       <td className="px-6 py-5 font-mono text-sm text-emerald-700 font-bold">₱{inst.interest.toLocaleString()}</td>
                       <td className="px-6 py-5 text-right">
                          <div className={`font-mono font-bold text-xl ${inst.status === 'overdue' ? 'text-wax-600' : 'text-ink-900'}`}>₱{inst.total.toLocaleString()}</div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      <div className="bg-paper-200/50 p-8 rounded-sm border-2 border-dashed border-paper-300 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gold-600 shadow-md border-2 border-gold-200 shrink-0">
           <Landmark size={32} />
        </div>
        <div className="flex-1">
           <h4 className="text-xl font-serif font-bold text-ink-900 mb-1 italic">The Standard Payday Clause</h4>
           <p className="text-base text-ink-600 font-serif leading-relaxed">
              As per cooperative bylaws, all loan repayments are synchronized with the 10th and 25th of the month. 
              The first installment is scheduled for the month following the loan disbursement to provide a mandatory grace period.
           </p>
        </div>
      </div>

      <LoanDetailsModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        loan={selectedLoan} 
        onPaymentSuccess={() => {
          fetchData();
          setIsPaymentModalOpen(false);
        }}
      />
    </div>
  );
};
