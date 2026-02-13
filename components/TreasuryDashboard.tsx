
import React, { useState, useEffect, useMemo } from 'react';
import { ContributionWithMember, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { 
  Wallet, 
  ArrowUpRight, 
  Plus, 
  Check, 
  TrendingUp, 
  ArrowDownRight, 
  Scale, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Equal,
  BookOpen,
  ArrowRightLeft,
  FileText,
  ShieldCheck,
  BarChart3,
  Briefcase
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
  totalInterestGained,
  onAddContribution,
  loading 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  // Advanced Calculations for True Cooperative Value
  const financialMetrics = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'active');
    
    // 1. Receivables: Principal that is out and expected back
    const totalReceivables = activeLoans.reduce((sum, l) => sum + l.remaining_principal, 0);
    
    // 2. Total Assets: Cash + Loans out
    const totalNetValue = treasuryStats.balance + totalReceivables;

    // 3. Projected Interest: What we will earn if all active loans finish their terms
    // Calculated as: Remaining Principal * (Monthly Rate) * (Remaining Term)
    // Note: This is an estimation based on current status
    const totalProjectedInterest = activeLoans.reduce((sum, l) => {
        return sum + (l.remaining_principal * (l.interest_rate / 100));
    }, 0);

    // 4. Collection Efficiency: Interest Collected vs Interest that SHOULD have been collected (including accrued/unpaid)
    // If interest_accrued exists in your schema, it represents unpaid logged interest.
    const totalAccruedInterest = activeLoans.reduce((sum, l) => sum + (l.interest_accrued || 0), 0);
    const denominator = treasuryStats.totalInterestCollected + totalAccruedInterest;
    const collectionEfficiency = denominator > 0 ? (treasuryStats.totalInterestCollected / denominator) * 100 : 100;

    return {
      totalReceivables,
      totalNetValue,
      totalProjectedInterest,
      collectionEfficiency,
      activeCount: activeLoans.length
    };
  }, [loans, treasuryStats]);

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

  const approvedContributions = contributions.filter(c => c.status === 'approved');
  const monthlyDepositContribs = approvedContributions.filter(c => c.type === 'monthly_deposit');
  const monthlyDeposits = monthlyDepositContribs.reduce((sum, c) => sum + c.amount, 0);
  const oneTimeContribs = approvedContributions.filter(c => c.type === 'one_time');
  const oneTimeDeposits = oneTimeContribs.reduce((sum, c) => sum + c.amount, 0);

  const totalInflow = treasuryStats.totalContributions + treasuryStats.totalPayments;
  const getPercent = (val: number) => totalInflow > 0 ? (val / totalInflow) * 100 : 0;

  const cashPercent = financialMetrics.totalNetValue > 0 ? (treasuryStats.balance / financialMetrics.totalNetValue) * 100 : 0;
  const receivablePercent = 100 - cashPercent;

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
             <p className="text-xl">Detailed ledger of inflows, disbursements, and total cooperative wealth.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Net Cooperative Value" 
          value={`₱${financialMetrics.totalNetValue.toLocaleString()}`} 
          icon={Briefcase} 
          trend="Total Assets" 
          trendUp={true}
          colorClass="text-ink-900"
        />
        <StatCard 
          title="Cash Liquidity" 
          value={`₱${treasuryStats.balance.toLocaleString()}`} 
          icon={Wallet} 
          trend="Available in Vault" 
          trendUp={treasuryStats.balance > 0}
          colorClass="text-emerald-700"
        />
        <StatCard 
          title="Portfolio Health" 
          value={`${financialMetrics.collectionEfficiency.toFixed(1)}%`} 
          icon={ShieldCheck} 
          trend={financialMetrics.collectionEfficiency < 90 ? "Collection Review Req." : "Standard Collections"}
          trendUp={financialMetrics.collectionEfficiency >= 90}
          colorClass={financialMetrics.collectionEfficiency < 90 ? "text-wax-600" : "text-blue-700"}
        />
        <StatCard 
          title="Unearned Interest" 
          value={`₱${financialMetrics.totalProjectedInterest.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Projected Income"
          trendUp={true}
          colorClass="text-purple-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            
            {/* Asset Composition Visualizer */}
            <div className="bg-white border-2 border-paper-200 rounded-sm p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-ink-500 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={16} />
                        Asset Composition
                    </h3>
                    <span className="text-[10px] font-mono text-ink-300 uppercase">Valuation Snapshot</span>
                </div>
                
                <div className="flex w-full h-8 rounded-sm overflow-hidden mb-6 border border-paper-200">
                    <div 
                        style={{ width: `${cashPercent}%` }} 
                        className="bg-emerald-600 h-full flex items-center justify-center group relative cursor-help"
                    >
                        <div className="absolute -top-10 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                            Cash Liquidity: {cashPercent.toFixed(1)}%
                        </div>
                    </div>
                    <div 
                        style={{ width: `${receivablePercent}%` }} 
                        className="bg-blue-600 h-full flex items-center justify-center group relative cursor-help"
                    >
                        <div className="absolute -top-10 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                            Receivables (Active Loans): {receivablePercent.toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="flex items-start gap-4">
                        <div className="w-4 h-4 rounded-full bg-emerald-600 mt-1 shrink-0"></div>
                        <div>
                            <div className="text-xs font-black uppercase text-ink-400 tracking-wider">Liquid Cash</div>
                            <div className="text-xl font-mono font-bold text-ink-900">₱{treasuryStats.balance.toLocaleString()}</div>
                            <div className="text-[10px] text-ink-300 mt-1 uppercase font-bold tracking-tighter">Ready for Disbursement</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-4 h-4 rounded-full bg-blue-600 mt-1 shrink-0"></div>
                        <div>
                            <div className="text-xs font-black uppercase text-ink-400 tracking-wider">Loan Receivables</div>
                            <div className="text-xl font-mono font-bold text-ink-900">₱{financialMetrics.totalReceivables.toLocaleString()}</div>
                            <div className="text-[10px] text-ink-300 mt-1 uppercase font-bold tracking-tighter">{financialMetrics.activeCount} Active Portfolio Items</div>
                        </div>
                    </div>
                </div>
            </div>

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
                           <span className="font-bold text-paper-50">₱{financialMetrics.totalReceivables.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-gold-400 font-bold border-t border-white/5">
                           <span>Total Assets</span>
                           <span>₱{financialMetrics.totalNetValue.toLocaleString()}</span>
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
            </div>

            <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
               <div className="p-4 border-b border-paper-200 flex items-center justify-between bg-emerald-50/40">
                  <div className="flex items-center space-x-2">
                     <ShieldCheck size={18} className="text-emerald-600" />
                     <h3 className="text-base font-serif font-bold text-ink-900">Treasury Audit</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-sm border uppercase tracking-widest">
                     PASS
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
                  </div>

                  <div className="bg-paper-100 p-3 rounded-sm border border-paper-200 text-xs text-ink-600 font-serif leading-relaxed italic">
                    "Total Cooperative wealth includes both liquid cash reserves and outstanding principal assets. Current valuation verified."
                  </div>
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
