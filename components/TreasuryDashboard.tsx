import React, { useState, useEffect } from 'react';
import { ContributionWithMember, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  Plus, 
  Check, 
  Clock, 
  TrendingUp, 
  ArrowDownRight, 
  Scale, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Equal,
  BookOpen,
  ArrowRightLeft,
  FileText,
  ShieldCheck,
  Download,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface TreasuryDashboardProps {
  treasuryStats: {
    balance: number;
    totalContributions: number;
    totalPayments: number;
    totalDisbursed: number;
    totalInterestCollected: number;
    totalPrincipalRepaid: number;
  };
  contributions: ContributionWithMember[];
  loans: LoanWithBorrower[];
  activeLoanVolume: number;
  totalInterestGained: number;
  onAddContribution: () => void;
  onApproveContribution?: (id: string) => void;
  onRejectContribution?: (id: string) => void;
  loading: boolean;
}

export const TreasuryDashboard: React.FC<TreasuryDashboardProps> = ({ 
  treasuryStats, 
  contributions,
  loans, 
  activeLoanVolume,
  totalInterestGained,
  onAddContribution,
  onApproveContribution,
  onRejectContribution,
  loading 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    dataService.getMonthlyGoal().then(setMonthlyGoal);
    
    const fetchAllPayments = async () => {
      try {
        const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'paid');
        if (activeLoans.length === 0) return;

        const paymentPromises = activeLoans.map(l => dataService.getLoanPayments(l.id));
        const results = await Promise.all(paymentPromises);
        const flattened = results.flat().map(p => ({
           ...p,
           borrower_name: loans.find(l => l.id === p.loan_id)?.borrower.full_name || 'Unknown Entity'
        }));
        setRecentPayments(flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (err: any) {
        // Robust console logging to see the actual error instead of [object Object]
        console.error("Failed to fetch payments for journal:", err?.message || JSON.stringify(err) || err);
      }
    };
    
    if (loans && loans.length > 0) {
      fetchAllPayments();
    }
  }, [loans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-600"></div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
     e.preventDefault();
     if(!newGoalInput) return;
     const amount = parseFloat(newGoalInput);
     if(isNaN(amount) || amount < 0) return;

     await dataService.updateMonthlyGoal(amount);
     setMonthlyGoal(amount);
     setIsEditingGoal(false);
  };

  const pendingContributions = contributions.filter(c => c.status === 'pending');
  const approvedContributions = contributions.filter(c => c.status === 'approved');

  const monthlyDepositContribs = approvedContributions.filter(c => c.type === 'monthly_deposit');
  const monthlyDeposits = monthlyDepositContribs.reduce((sum, c) => sum + c.amount, 0);
  
  const oneTimeContribs = approvedContributions.filter(c => c.type === 'one_time');
  const oneTimeDeposits = oneTimeContribs.reduce((sum, c) => sum + c.amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyCollections = approvedContributions
    .filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, c) => sum + c.amount, 0);

  const totalInflow = treasuryStats.totalContributions + treasuryStats.totalPayments;
  const getPercent = (val: number) => totalInflow > 0 ? (val / totalInflow) * 100 : 0;

  // Unified General Journal Entries
  const journalEntries = [
    ...approvedContributions.map(c => ({
      id: c.id,
      date: c.date,
      entity: c.member.full_name,
      type: 'Contribution',
      category: c.type.replace('_', ' '),
      amount: c.amount,
      isCredit: true
    })),
    ...recentPayments.map(p => ({
      id: p.id,
      date: p.date,
      entity: p.borrower_name,
      type: 'Loan Payment',
      category: 'Repayment',
      amount: p.amount,
      isCredit: true
    })),
    ...loans.filter(l => l.status === 'active' || l.status === 'paid').map(l => ({
      id: l.id,
      date: l.start_date || l.created_at,
      entity: l.borrower.full_name,
      type: 'Disbursement',
      category: 'Loan Principal',
      amount: l.principal,
      isCredit: false
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDownloadCSV = () => {
    const headers = ["Date", "Entity", "Type", "Category", "Amount", "Balance Direction"];
    const rows = journalEntries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.entity,
      e.type,
      e.category,
      e.amount,
      e.isCredit ? "INFLOW (CR)" : "OUTFLOW (DR)"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `General_Journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAssets = treasuryStats.balance + activeLoanVolume;
  const totalEquity = treasuryStats.totalContributions + totalInterestGained;
  const balanceVariance = Math.abs(totalAssets - totalEquity);
  const isVerified = balanceVariance < 1; 

  const BreakdownRow = ({ 
    title, 
    amount, 
    color, 
    percent, 
    id, 
    items 
  }: { 
    title: string | React.ReactNode, 
    amount: number, 
    color: string, 
    percent: number, 
    id: string,
    items?: React.ReactNode 
  }) => {
    const isExpanded = expandedSection === id;
    const barColor = color === 'green' ? 'bg-emerald-700' : 
                     color === 'emerald' ? 'bg-emerald-600' :
                     color === 'blue' ? 'bg-blue-700' :
                     color === 'purple' ? 'bg-purple-700' : 'bg-wax-600';
    
    const containerColor = color === 'green' ? 'bg-emerald-50' : 
                           color === 'emerald' ? 'bg-emerald-50' :
                           color === 'blue' ? 'bg-blue-50' :
                           color === 'purple' ? 'bg-purple-50' : 'bg-wax-50';

    return (
      <div className="relative pt-1">
         <div 
           className={`flex justify-between items-center mb-1 text-sm font-serif ${items ? 'cursor-pointer hover:bg-paper-100 p-1.5 -mx-1.5 rounded-sm transition-colors' : ''}`}
           onClick={() => items && toggleSection(id)}
         >
            <span className="text-ink-700 flex items-center gap-2 font-bold tracking-tight">
               {title}
               {items && (
                 <span className="text-ink-400">
                   {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </span>
               )}
            </span>
            <span className={`font-mono font-bold ${id === 'disbursed' ? 'text-wax-600' : 'text-ink-900'}`}>
               {id === 'disbursed' ? '-' : ''}₱{amount.toLocaleString()}
            </span>
         </div>
         <div className={`overflow-hidden h-1.5 mb-2 flex rounded-full ${containerColor} border border-paper-200`}>
            <div style={{ width: `${percent}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${barColor}`}></div>
         </div>
         
         {isExpanded && items && (
           <div className="mb-4 pl-4 border-l-2 border-gold-500/30 text-sm text-ink-600 space-y-2 animate-fade-in max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {items}
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      
      {isEditingGoal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-leather-900/60 backdrop-blur-sm p-4">
            <div className="bg-paper-50 rounded-sm border-2 border-paper-300 shadow-2xl p-8 w-full max-w-sm animate-slide-up">
               <h3 className="text-xl font-serif font-bold text-ink-900 mb-2">Set Collection Target</h3>
               <p className="text-base text-ink-500 mb-6 font-serif italic">The projected cooperative equity growth for this month.</p>
               <form onSubmit={handleUpdateGoal}>
                  <div className="relative mb-6">
                     <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400 font-bold font-serif text-2xl">₱</span>
                     <input 
                        autoFocus
                        type="number" 
                        min="0"
                        step="100"
                        value={newGoalInput}
                        onChange={(e) => setNewGoalInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-b-2 border-ink-300 bg-transparent focus:border-ink-900 outline-none font-mono text-2xl text-ink-900"
                        placeholder={monthlyGoal.toString()}
                     />
                  </div>
                  <div className="flex justify-end gap-3">
                     <button type="button" onClick={() => setIsEditingGoal(false)} className="px-4 py-2 text-ink-500 hover:text-ink-900 font-bold uppercase text-xs tracking-widest transition-colors">Dismiss</button>
                     <button type="submit" className="px-6 py-2 bg-ink-900 text-white rounded-sm hover:bg-black font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Apply Target</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-300 pb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-ink-900">The Treasury Books</h1>
          <div className="flex items-center gap-2 text-ink-500 mt-2 font-serif italic">
             <BookOpen size={16} />
             <p className="text-xl">Detailed ledger of inflows, disbursements, and share capital.</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
              onClick={() => {
                 setNewGoalInput(monthlyGoal.toString());
                 setIsEditingGoal(true);
              }}
              className="bg-paper-50 border border-paper-300 text-ink-600 hover:bg-paper-100 px-4 py-2.5 rounded-sm font-bold uppercase tracking-widest text-sm transition-all flex items-center space-x-2 shadow-sm"
           >
              <Target size={14} />
              <span>Adjust Target</span>
           </button>
           <button 
             onClick={onAddContribution}
             className="bg-ink-900 hover:bg-black text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-widest text-sm shadow-lg transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-ink-950"
           >
              <Plus size={14} />
              <span>New Entry</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Current Cash Balance" 
          value={`₱${treasuryStats.balance.toLocaleString()}`} 
          icon={Wallet} 
          trend="Available Liquidity" 
          trendUp={true}
          colorClass="text-emerald-700"
        />
        <StatCard 
          title="Lifetime Earnings" 
          value={`₱${totalInterestGained.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Interest Accrued" 
          trendUp={true}
          colorClass="text-purple-700"
        />
        <StatCard 
          title="Progress vs Target" 
          value={`${Math.round((monthlyCollections / monthlyGoal) * 100)}%`} 
          icon={PiggyBank} 
          trend={`₱${monthlyCollections.toLocaleString()} of ₱${monthlyGoal.toLocaleString()}`}
          trendUp={monthlyCollections >= monthlyGoal}
          colorClass="text-blue-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
               <div className="p-5 border-b border-paper-200 bg-paper-100/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-ink-900 text-gold-500 rounded-sm">
                        <ArrowRightLeft size={18} />
                     </div>
                     <h2 className="text-xl font-serif font-bold text-ink-900">Cash Flow Breakdown</h2>
                  </div>
                  <div className="text-sm font-mono text-ink-400 uppercase tracking-widest">Bookkeeping View</div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-paper-200">
                  <div className="p-6 space-y-6">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-2">
                           <ArrowUpRight size={14} />
                           Source of Funds
                        </h3>
                        <span className="text-sm text-ink-300 font-mono">CR (Credit)</span>
                     </div>

                     <div className="space-y-6">
                        <div>
                           <div className="text-sm text-ink-400 font-bold uppercase mb-3 border-b border-paper-200 pb-1">Capital Receipts</div>
                           <BreakdownRow 
                              title="Monthly Member Equity"
                              amount={monthlyDeposits}
                              color="green"
                              percent={getPercent(monthlyDeposits)}
                              id="br-monthly"
                              items={monthlyDepositContribs.slice(0, 5).map(c => (
                                 <div key={c.id} className="flex justify-between py-1 border-b border-paper-100 border-dashed">
                                    <span>{c.member.full_name}</span>
                                    <span className="font-mono">₱{c.amount.toLocaleString()}</span>
                                 </div>
                              ))}
                           />
                           <BreakdownRow 
                              title="Direct Share Capital"
                              amount={oneTimeDeposits}
                              color="emerald"
                              percent={getPercent(oneTimeDeposits)}
                              id="br-onetime"
                              items={oneTimeContribs.slice(0, 5).map(c => (
                                 <div key={c.id} className="flex justify-between py-1 border-b border-paper-100 border-dashed">
                                    <span>{c.member.full_name}</span>
                                    <span className="font-mono">₱{c.amount.toLocaleString()}</span>
                                 </div>
                              ))}
                           />
                        </div>

                        <div className="pt-2">
                           <div className="text-sm text-ink-400 font-bold uppercase mb-3 border-b border-paper-200 pb-1">Operating Receipts</div>
                           <BreakdownRow 
                              title="Principal Recovery" 
                              amount={treasuryStats.totalPrincipalRepaid}
                              color="blue"
                              percent={getPercent(treasuryStats.totalPrincipalRepaid)}
                              id="br-principal"
                           />
                           <BreakdownRow 
                              title="Net Interest Income"
                              amount={treasuryStats.totalInterestCollected}
                              color="purple"
                              percent={getPercent(treasuryStats.totalInterestCollected)}
                              id="br-interest"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="p-6 space-y-6 bg-paper-100/20">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-wax-600 uppercase tracking-[0.2em] flex items-center gap-2">
                           <ArrowDownRight size={14} />
                           Application of Funds
                        </h3>
                        <span className="text-sm text-ink-300 font-mono">DR (Debit)</span>
                     </div>

                     <div className="space-y-6">
                        <div>
                           <div className="text-sm text-ink-400 font-bold uppercase mb-3 border-b border-paper-200 pb-1">Investing Outflows</div>
                           <BreakdownRow 
                              title="Loan Disbursements"
                              amount={treasuryStats.totalDisbursed}
                              color="wax"
                              percent={100}
                              id="br-disbursed"
                              items={loans.filter(l => l.status === 'active' || l.status === 'paid').slice(0, 5).map(l => (
                                 <div key={l.id} className="flex justify-between py-1 border-b border-paper-100 border-dashed">
                                    <span>{l.borrower.full_name}</span>
                                    <span className="font-mono text-wax-600">₱{l.principal.toLocaleString()}</span>
                                 </div>
                              ))}
                           />
                        </div>

                        <div className="pt-2 opacity-50">
                           <div className="text-sm text-ink-400 font-bold uppercase mb-3 border-b border-paper-200 pb-1">Operating Outflows</div>
                           <div className="p-4 rounded-sm border-2 border-dashed border-paper-300 flex flex-col items-center justify-center">
                              <span className="text-base font-serif italic text-ink-400">No active operating expenses</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-paper-200 p-5 flex flex-col md:flex-row justify-between items-center border-t-2 border-paper-300 gap-4">
                  <div className="flex items-center gap-2 text-ink-700">
                     <div className="w-8 h-8 rounded-full bg-ink-900 flex items-center justify-center text-paper-50 font-bold text-xs shadow-md">
                        <Equal size={14} />
                     </div>
                     <span className="text-sm font-black uppercase tracking-[0.2em]">Net Treasury Position</span>
                  </div>
                  
                  <div className="flex items-center gap-6 font-mono text-sm">
                     <div className="flex flex-col items-end">
                        <span className="text-emerald-700 font-bold">+ ₱{totalInflow.toLocaleString()}</span>
                        <span className="text-xs uppercase text-ink-400 font-bold">Total In</span>
                     </div>
                     <span className="text-ink-300">-</span>
                     <div className="flex flex-col items-end">
                        <span className="text-wax-600 font-bold">₱{treasuryStats.totalDisbursed.toLocaleString()}</span>
                        <span className="text-xs uppercase text-ink-400 font-bold">Total Out</span>
                     </div>
                     <span className="text-ink-300">=</span>
                     <div className="flex flex-col items-end bg-paper-50 px-4 py-2 rounded-sm border border-paper-300 shadow-sm">
                        <span className="text-xl font-bold text-ink-900 tracking-tighter">₱{treasuryStats.balance.toLocaleString()}</span>
                        <span className="text-xs uppercase text-ink-400 font-bold">Balance</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
               <div className="p-5 border-b border-paper-200 bg-paper-100/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-paper-200 text-ink-700 rounded-sm border border-paper-300">
                        <Activity size={18} />
                     </div>
                     <h2 className="text-xl font-serif font-bold text-ink-900">General Journal</h2>
                  </div>
                  <button 
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest border-b border-blue-600/30 transition-all active:scale-95"
                  >
                    <Download size={14} />
                    <span>Download CSV</span>
                  </button>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-paper-100/80 border-b border-paper-200">
                        <tr>
                           <th className="px-5 py-3 text-sm font-black text-ink-400 uppercase tracking-widest font-sans">Date</th>
                           <th className="px-5 py-3 text-sm font-black text-ink-400 uppercase tracking-widest font-sans">Entity / Account</th>
                           <th className="px-5 py-3 text-sm font-black text-ink-400 uppercase tracking-widest font-sans">Transaction Type</th>
                           <th className="px-5 py-3 text-sm font-black text-ink-400 uppercase tracking-widest font-sans text-right">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-paper-100 font-mono text-sm">
                        {journalEntries.slice(0, 15).map((entry) => (
                           <tr key={entry.id} className="hover:bg-paper-100/50 transition-colors group">
                              <td className="px-5 py-3 text-ink-500">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                              <td className="px-5 py-3">
                                 <div className="font-serif font-bold text-ink-900 group-hover:text-blue-700 transition-colors">{entry.entity}</div>
                                 <div className="text-xs text-ink-400 uppercase tracking-tighter">{entry.category}</div>
                              </td>
                              <td className="px-5 py-3">
                                 <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-xs font-bold uppercase tracking-widest border ${
                                    entry.isCredit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-wax-50 text-wax-600 border-wax-200'
                                 }`}>
                                    {entry.type}
                                 </span>
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-base">
                                 <span className={entry.isCredit ? 'text-emerald-700' : 'text-wax-600'}>
                                    {entry.isCredit ? '+' : '-'}₱{entry.amount.toLocaleString()}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

         </div>

         <div className="space-y-8">
            <div className="bg-leather-900 rounded-sm text-paper-200 shadow-2xl overflow-hidden border border-leather-800 relative group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500 opacity-5 blur-[80px] rounded-full"></div>
               
               <div className="p-5 border-b border-white/10 flex items-center space-x-3 bg-black/30">
                  <div className="p-2 bg-leather-800 rounded-sm text-gold-500 border border-white/5">
                     <Scale size={18} />
                  </div>
                  <div>
                     <h2 className="text-lg font-serif font-bold text-paper-50">Trial Balance</h2>
                     <p className="text-gold-600 text-sm font-black uppercase tracking-[0.2em]">Statement of Position</p>
                  </div>
               </div>
               
               <div className="p-6 space-y-6">
                  <div>
                     <h3 className="text-sm font-black text-ink-400 uppercase tracking-[0.2em] mb-4 font-sans flex items-center justify-between">
                        <span>Current Assets</span>
                        <div className="h-px bg-white/5 flex-1 ml-4"></div>
                     </h3>
                     <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between items-center group">
                           <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Treasury Cash</span>
                           <span className="font-bold text-paper-50">₱{treasuryStats.balance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                           <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Loans Receivable</span>
                           <span className="font-bold text-paper-50">₱{activeLoanVolume.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-gold-400 font-bold border-t border-white/5">
                           <span>Total Assets</span>
                           <span>₱{(treasuryStats.balance + activeLoanVolume).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-sm font-black text-ink-400 uppercase tracking-[0.2em] mb-4 font-sans flex items-center justify-between">
                        <span>Equity Pool</span>
                        <div className="h-px bg-white/5 flex-1 ml-4"></div>
                     </h3>
                     <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between items-center group">
                           <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Paid-in Capital</span>
                           <span className="font-bold text-paper-50">₱{treasuryStats.totalContributions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                           <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Coop Interest Bank</span>
                           <span className="font-bold text-emerald-400">₱{totalInterestGained.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-emerald-400 font-bold border-t border-white/5">
                           <span>Total Liability/Equity</span>
                           <span>₱{(treasuryStats.totalContributions + totalInterestGained).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-black/60 p-4 text-center border-t border-white/5">
                  <span className="text-sm font-serif italic text-gold-500 flex items-center justify-center gap-2 font-bold">
                     {isVerified ? (
                        <><Check size={16}/> Double-entry verification complete</>
                     ) : (
                        <><AlertTriangle size={16}/> Balance Variance Detected</>
                     )}
                  </span>
               </div>
            </div>

            <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
               <div className={`p-4 border-b border-paper-200 flex items-center justify-between ${isVerified ? 'bg-emerald-50/40' : 'bg-red-50/40'}`}>
                  <div className="flex items-center space-x-2">
                     <ShieldCheck size={18} className={isVerified ? 'text-emerald-600' : 'text-red-600'} />
                     <h3 className="text-base font-serif font-bold text-ink-900">Treasury Audit</h3>
                  </div>
                  <span className={`${isVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'} text-[10px] font-black px-2 py-0.5 rounded-sm border uppercase tracking-widest`}>
                     {isVerified ? 'PASS' : 'REVIEW'}
                  </span>
               </div>
               
               <div className="p-5 space-y-4">
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500 font-serif italic">Inflow/Outflow Check</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                           <Check size={12}/> Verified
                        </span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500 font-serif italic">Trial Balance Equality</span>
                        <span className={`${isVerified ? 'text-emerald-600' : 'text-red-600'} font-bold flex items-center gap-1`}>
                           {isVerified ? <Check size={12}/> : <AlertCircle size={12}/>} Assets = Equity
                        </span>
                     </div>
                  </div>

                  <div className="bg-paper-100 p-3 rounded-sm border border-paper-200 text-xs text-ink-600 font-serif leading-relaxed italic">
                     {isVerified 
                       ? `"All ledger entries cross-referenced. Current cash balance is verified against all validated journal entries."`
                       : `"Warning: Statement of position variance detected. Audit required on manual entries."`}
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
               <div className="p-4 border-b border-paper-200 bg-amber-50/40 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <Clock size={16} className="text-amber-600" />
                     <h3 className="text-base font-serif font-bold text-ink-900">Pending Review</h3>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-sm font-black px-2 py-0.5 rounded-sm border border-amber-200 uppercase tracking-widest">
                     {pendingContributions.length} Items
                  </span>
               </div>
               
               <div className="divide-y divide-paper-100">
                  {pendingContributions.length === 0 ? (
                     <div className="p-8 text-center text-ink-300 italic text-base font-serif">
                        No pending entries to verify.
                     </div>
                  ) : (
                     pendingContributions.map(c => (
                        <div key={c.id} className="p-4 flex flex-col gap-3">
                           <div className="flex justify-between items-start">
                              <div>
                                 <div className="font-serif font-bold text-ink-900 text-base">{c.member.full_name}</div>
                                 <div className="text-xs font-mono text-ink-400 uppercase tracking-tighter">{c.type.replace('_', ' ')}</div>
                              </div>
                              <div className="font-mono font-bold text-ink-900 text-base">₱{c.amount.toLocaleString()}</div>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                 onClick={() => onRejectContribution?.(c.id)}
                                 className="flex-1 py-1.5 text-wax-600 border border-wax-200 hover:bg-wax-50 rounded-sm text-xs font-black uppercase tracking-widest transition-colors"
                              >
                                 Reject
                              </button>
                              <button 
                                 onClick={() => onApproveContribution?.(c.id)}
                                 className="flex-1 py-1.5 bg-ink-900 text-white hover:bg-black rounded-sm text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                              >
                                 Approve
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>

            <div className="bg-paper-100/50 p-6 rounded-sm border-2 border-dashed border-paper-300 flex flex-col items-center text-center">
               <FileText size={32} className="text-ink-200 mb-3" />
               <h4 className="text-sm font-bold text-ink-700 uppercase tracking-widest mb-1">Fiscal Year Reports</h4>
               <p className="text-sm text-ink-400 font-serif italic">Comprehensive audit reports and yearly statements are generated at end-of-period.</p>
            </div>
         </div>
      </div>

    </div>
  );
};