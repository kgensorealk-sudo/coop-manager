
import React, { useState, useEffect, useMemo } from 'react';
import { ContributionWithMember, LoanWithBorrower, Payment } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { 
  Wallet, 
  ArrowUpRight, 
  Plus, 
  Check, 
  TrendingUp, 
  ArrowDownRight, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Equal,
  BookOpen,
  ArrowRightLeft,
  ShieldCheck, 
  BarChart3,
  Briefcase,
  LineChart,
  PieChart,
  GanttChartSquare
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
  allPayments: Payment[];
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
  allPayments,
  onAddContribution,
  loading 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(10000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState('');

  // Advanced Calculations for True Cooperative Wealth & Full Interest Pipeline
  const financialMetrics = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'active');
    
    // 1. Principal Receivables
    const totalReceivables = activeLoans.reduce((sum, l) => sum + l.remaining_principal, 0);
    
    // 2. Comprehensive Interest Analysis
    let totalContractInterest = 0; // The theoretical maximum interest from all current active contracts
    let totalArrearsInterest = 0;  // Materialized interest that passed its date but wasn't paid
    let totalPaidFromActive = 0;   // Interest already collected specifically from these active loans

    activeLoans.forEach(l => {
        const loanPayments = allPayments.filter(p => p.loan_id === l.id);
        const interestPaidOnLoan = loanPayments.reduce((s, p) => s + p.interest_paid, 0);
        
        const fullTermInterest = (l.principal * (l.interest_rate / 100)) * l.duration_months;
        const liveArrears = dataService.calculateLiveInterest(l, loanPayments);

        totalContractInterest += fullTermInterest;
        totalArrearsInterest += liveArrears;
        totalPaidFromActive += interestPaidOnLoan;
    });

    // TOTAL UNEARNED: Everything we haven't touched yet (Arrears + Future)
    const totalUnearnedInterest = Math.max(0, totalContractInterest - totalPaidFromActive);
    
    // FUTURE ONLY: Interest not even materialized yet
    const futureOnlyInterest = Math.max(0, totalUnearnedInterest - totalArrearsInterest);

    // 3. Valuation
    const totalProjectedValuation = treasuryStats.balance + totalReceivables + totalUnearnedInterest;
    const totalNetValue = treasuryStats.balance + totalReceivables;

    // 4. Harvest Efficiency (How much of the interest we SHOULD have by now is actually in the bank)
    const materializedTarget = totalPaidFromActive + totalArrearsInterest;
    const activeHarvestRate = materializedTarget > 0 ? (totalPaidFromActive / materializedTarget) * 100 : 100;

    return {
      totalReceivables,
      totalNetValue,
      totalContractInterest,
      totalPaidFromActive,
      totalArrearsInterest,
      totalUnearnedInterest,
      futureOnlyInterest,
      totalProjectedValuation,
      activeHarvestRate,
      activeCount: activeLoans.length
    };
  }, [loans, treasuryStats, allPayments]);

  useEffect(() => {
    dataService.getMonthlyGoal().then(setMonthlyGoal);
  }, []);

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

  // Chart Percentages
  const cashPercent = financialMetrics.totalProjectedValuation > 0 
    ? (treasuryStats.balance / financialMetrics.totalProjectedValuation) * 100 
    : 0;
  const receivablePercent = financialMetrics.totalProjectedValuation > 0 
    ? (financialMetrics.totalReceivables / financialMetrics.totalProjectedValuation) * 100 
    : 0;
  const unearnedPercent = financialMetrics.totalProjectedValuation > 0 
    ? (financialMetrics.totalUnearnedInterest / financialMetrics.totalProjectedValuation) * 100 
    : 0;

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
          trend="Total Hard Assets" 
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
          title="Active Harvest Rate" 
          value={`${financialMetrics.activeHarvestRate.toFixed(1)}%`} 
          icon={ShieldCheck} 
          trend={financialMetrics.activeHarvestRate < 90 ? "Collection Review Req." : "Standard Collections"}
          trendUp={financialMetrics.activeHarvestRate >= 90}
          colorClass={financialMetrics.activeHarvestRate < 90 ? "text-wax-600" : "text-blue-700"}
        />
        <StatCard 
          title="Unearned Interest" 
          value={`₱${financialMetrics.totalUnearnedInterest.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Total Projected Yield"
          trendUp={true}
          colorClass="text-purple-700"
        />
      </div>

      {/* REFINED: Interest Realization Stack Analysis */}
      <div className="bg-paper-50 border-4 border-double border-paper-300 rounded-sm p-8 shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <PieChart size={160} />
          </div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8 border-b border-paper-200 pb-4">
                  <div className="p-2 bg-ink-900 text-gold-500 rounded-sm">
                      <LineChart size={20} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-serif font-bold text-ink-900">Interest Lifecycle Analysis</h2>
                      <p className="text-sm text-ink-500 font-serif italic uppercase tracking-widest">Tracking the Realization of Cooperative Profit</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Left: 3-Stage Pipeline Breakdown */}
                  <div className="space-y-6">
                      <div className="bg-white p-5 border border-paper-200 rounded-sm shadow-sm group hover:border-emerald-300 transition-colors">
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <Check size={12}/> 1. Realized Cash (Paid)
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900">₱{treasuryStats.totalInterestCollected.toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-2 font-serif italic">Profit already collected and sitting in the vault.</p>
                      </div>

                      <div className="bg-white p-5 border border-paper-200 rounded-sm shadow-sm group hover:border-amber-300 transition-colors">
                          <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <TrendingUp size={12}/> 2. Arrears Burden (Accrued)
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900">₱{financialMetrics.totalArrearsInterest.toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-2 font-serif italic">Interest that has matured based on time but is not yet paid.</p>
                      </div>

                      <div className="bg-white p-5 border border-paper-200 rounded-sm shadow-sm group hover:border-violet-300 transition-colors">
                          <div className="text-[10px] font-black text-violet-700 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <LineChart size={12}/> 3. Pipeline Forecast (Future)
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900">₱{financialMetrics.futureOnlyInterest.toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-2 font-serif italic">Contracted profit that will materialize in future months.</p>
                      </div>
                  </div>

                  {/* Middle: Visualization & Projection */}
                  <div className="lg:col-span-2 space-y-10">
                      <div className="space-y-4">
                          <div className="flex justify-between items-end">
                              <h3 className="text-sm font-black text-ink-800 uppercase tracking-[0.2em]">Total Interest Contracted</h3>
                              <span className="text-lg font-mono font-bold text-violet-700">₱{financialMetrics.totalContractInterest.toLocaleString()}</span>
                          </div>
                          <div className="h-6 w-full bg-paper-200 rounded-sm border border-paper-300 overflow-hidden flex shadow-inner">
                              <div 
                                style={{ width: `${(financialMetrics.totalPaidFromActive / financialMetrics.totalContractInterest) * 100}%` }} 
                                className="h-full bg-emerald-600 border-r border-white/20"
                                title="Realized"
                              ></div>
                              <div 
                                style={{ width: `${(financialMetrics.totalArrearsInterest / financialMetrics.totalContractInterest) * 100}%` }} 
                                className="h-full bg-amber-500 border-r border-white/20"
                                title="Arrears"
                              ></div>
                              <div 
                                style={{ width: `${(financialMetrics.futureOnlyInterest / financialMetrics.totalContractInterest) * 100}%` }} 
                                className="h-full bg-violet-500"
                                title="Future"
                              ></div>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-ink-400 uppercase">
                              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-600"></div> Realized</span>
                              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500"></div> Arrears</span>
                              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-violet-500"></div> Future Pipeline</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4 border-l-2 border-paper-200 pl-6">
                              <h4 className="text-xs font-black text-ink-500 uppercase tracking-widest flex items-center gap-2">
                                 <GanttChartSquare size={14}/> Where is the profit?
                              </h4>
                              <ul className="space-y-3 text-sm font-serif italic text-ink-700">
                                  <li className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></div>
                                      <span>₱{treasuryStats.totalInterestCollected.toLocaleString()} is fully liquid cash.</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></div>
                                      <span>₱{financialMetrics.totalArrearsInterest.toLocaleString()} is owed and 'up' on borrower ledgers.</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5"></div>
                                      <span>₱{financialMetrics.futureOnlyInterest.toLocaleString()} is expected yield from active term lengths.</span>
                                  </li>
                              </ul>
                          </div>

                          <div className="bg-ink-900 rounded-sm p-6 text-paper-50 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 opacity-10">
                                 <ShieldCheck size={48} />
                              </div>
                              <h4 className="text-[10px] font-black text-gold-500 uppercase tracking-widest mb-4">True Value Projection</h4>
                              <div className="space-y-2">
                                  <div className="text-xs text-paper-400 font-serif italic">Full Equity + Future Pipeline:</div>
                                  <div className="text-4xl font-mono font-bold text-white tracking-tighter">₱{financialMetrics.totalProjectedValuation.toLocaleString()}</div>
                                  <div className="pt-4 border-t border-white/10 mt-4">
                                      <p className="text-[10px] text-paper-500 leading-relaxed font-sans uppercase font-bold tracking-tighter">
                                          Total wealth represents cash, principal out in the field, and all contracted future interest.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Composition Visualizer */}
      <div className="bg-white border-2 border-paper-200 rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-ink-500 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={16} />
                  Asset Composition
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-300 uppercase">
                  <span>Gross Valuation:</span>
                  <span className="font-bold text-ink-900 italic">₱{financialMetrics.totalProjectedValuation.toLocaleString()}</span>
              </div>
          </div>
          
          <div className="flex w-full h-10 rounded-sm overflow-hidden mb-8 border border-paper-200 shadow-inner">
              <div 
                  style={{ width: `${cashPercent}%` }} 
                  className="bg-emerald-600 h-full flex items-center justify-center group relative cursor-help transition-all duration-700"
              >
                  <div className="absolute -top-10 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Vault Cash: {cashPercent.toFixed(1)}%
                  </div>
              </div>
              <div 
                  style={{ width: `${receivablePercent}%` }} 
                  className="bg-blue-600 h-full flex items-center justify-center group relative cursor-help transition-all duration-700 border-x border-white/10"
              >
                  <div className="absolute -top-10 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Receivable Principal: {receivablePercent.toFixed(1)}%
                  </div>
              </div>
              <div 
                  style={{ width: `${unearnedPercent}%` }} 
                  className="bg-violet-500 h-full flex items-center justify-center group relative cursor-help transition-all duration-700"
              >
                  <div className="absolute -top-10 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Unearned Pipeline: {unearnedPercent.toFixed(1)}%
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 mt-1 shrink-0"></div>
                  <div>
                      <div className="text-xs font-black uppercase text-ink-400 tracking-wider">Vault Liquidity</div>
                      <div className="text-xl font-mono font-bold text-ink-900">₱{treasuryStats.balance.toLocaleString()}</div>
                  </div>
              </div>
              <div className="flex items-start gap-4 border-l border-paper-100 md:pl-6">
                  <div className="w-4 h-4 rounded-full bg-blue-600 mt-1 shrink-0"></div>
                  <div>
                      <div className="text-xs font-black uppercase text-ink-400 tracking-wider">Principal Out</div>
                      <div className="text-xl font-mono font-bold text-ink-900">₱{financialMetrics.totalReceivables.toLocaleString()}</div>
                  </div>
              </div>
              <div className="flex items-start gap-4 border-l border-paper-100 md:pl-6">
                  <div className="w-4 h-4 rounded-full bg-violet-500 mt-1 shrink-0"></div>
                  <div>
                      <div className="text-xs font-black uppercase text-ink-400 tracking-wider">Future Interest</div>
                      <div className="text-xl font-mono font-bold text-violet-700">₱{financialMetrics.totalUnearnedInterest.toLocaleString()}</div>
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
  );
};
