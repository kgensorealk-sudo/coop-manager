
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

interface BreakdownRowProps {
  title: string | React.ReactNode;
  amount: number;
  color: string;
  percent: number;
  id: string;
  items?: React.ReactNode;
  expandedSection: string | null;
  toggleSection: (id: string) => void;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({ 
  title, 
  amount, 
  color, 
  percent, 
  id, 
  items,
  expandedSection,
  toggleSection
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
         className={`flex justify-between items-center mb-1 text-sm font-serif ${items ? 'cursor-pointer hover:bg-paper-100 p-1.5 -mx-1.5 rounded-xl transition-colors' : ''}`}
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
       
       <AnimatePresence>
         {isExpanded && items && (
           <motion.div 
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: 'auto', opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             transition={{ duration: 0.3 }}
             className="mb-4 pl-4 border-l-2 border-gold-500/30 text-sm text-ink-600 space-y-2 overflow-hidden max-h-48 overflow-y-auto pr-1 custom-scrollbar"
           >
              {items}
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

interface TreasuryDashboardProps {
  treasuryStats: {
    balance: number;
    totalContributions: number;
    totalPayments: number;
    totalDisbursed: number;
    totalInterestCollected: number;
    totalPenaltyCollected: number;
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

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
    const activeLoans = loans.filter(l => {
      if (l.status !== 'active') return false;
      const loanPayments = allPayments.filter(p => p.loan_id === l.id);
      const debt = dataService.calculateDetailedDebt(l, loanPayments);
      return debt.liveTotalDue > 0.01;
    });
    
    // 1. Principal Receivables
    const totalReceivables = activeLoans.reduce((sum, l) => sum + l.remaining_principal, 0);
    
    // 2. Comprehensive Interest Analysis
    let totalContractInterest = 0; // The theoretical maximum interest from all current active contracts
    let totalArrearsInterest = 0;  // Materialized interest that passed its date but wasn't paid
    let totalPenaltyArrears = 0;   // Unpaid penalties
    let totalPaidFromActive = 0;   // Interest already collected specifically from these active loans

    activeLoans.forEach(l => {
        const loanPayments = allPayments.filter(p => p.loan_id === l.id);
        const interestPaidOnLoan = loanPayments.reduce((s, p) => s + (p.interest_paid || 0), 0);
        
        const fullTermInterest = (l.principal * (l.interest_rate / 100)) * l.duration_months;
        const debt = dataService.calculateDetailedDebt(l, loanPayments);

        totalContractInterest += fullTermInterest;
        totalArrearsInterest += debt.unpaidMaturedInterest;
        totalPenaltyArrears += debt.remainingPenalty;
        totalPaidFromActive += interestPaidOnLoan;
    });

    // TOTAL UNEARNED: Everything we haven't touched yet (Arrears + Future)
    const totalUnearnedInterest = Math.max(0, totalContractInterest - totalPaidFromActive);
    
    // FUTURE ONLY: Interest not even materialized yet
    const futureOnlyInterest = Math.max(0, totalUnearnedInterest - totalArrearsInterest);

    // 3. Valuation
    const totalProjectedValuation = treasuryStats.balance + totalReceivables + totalUnearnedInterest + totalPenaltyArrears;
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
      totalPenaltyArrears,
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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 animate-fade-in relative pb-12"
    >
      
      {isEditingGoal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-leather-900/60 backdrop-blur-sm p-4">
            <div className="bg-paper-50 rounded-xl border-2 border-paper-300 shadow-2xl p-8 w-full max-w-sm animate-slide-up">
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
                     <button type="submit" className="px-6 py-2 bg-ink-900 text-white rounded-xl hover:bg-black font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Apply Target</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-300 pb-6">
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
             className="bg-ink-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-ink-950"
           >
              <Plus size={14} />
              <span>New Entry</span>
           </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          index={0}
          title="Net Cooperative Value" 
          value={`₱${financialMetrics.totalNetValue.toLocaleString()}`} 
          icon={Briefcase} 
          trend="Total Hard Assets" 
          trendUp={true}
          colorClass="text-ink-900"
        />
        <StatCard 
          index={1}
          title="Cash Liquidity" 
          value={`₱${treasuryStats.balance.toLocaleString()}`} 
          icon={Wallet} 
          trend="Available in Vault" 
          trendUp={treasuryStats.balance > 0}
          colorClass="text-emerald-700"
        />
        <StatCard 
          index={2}
          title="Active Harvest Rate" 
          value={`${financialMetrics.activeHarvestRate.toFixed(1)}%`} 
          icon={ShieldCheck} 
          trend={financialMetrics.activeHarvestRate < 90 ? "Collection Review Req." : "Standard Collections"}
          trendUp={financialMetrics.activeHarvestRate >= 90}
          colorClass={financialMetrics.activeHarvestRate < 90 ? "text-wax-600" : "text-blue-700"}
        />
        <StatCard 
          index={3}
          title="Unearned Interest" 
          value={`₱${financialMetrics.totalUnearnedInterest.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Total Projected Yield"
          trendUp={true}
          colorClass="text-purple-700"
        />
      </motion.div>

      {/* REFINED: Interest Realization Stack Analysis */}
      <motion.div variants={itemVariants} className="bg-paper-50 border-4 border-double border-paper-300 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
          {/* Decorative background accent */}
          <div className="absolute -top-12 -right-12 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 rotate-12">
             <PieChart size={240} />
          </div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10 border-b border-paper-200 pb-6">
                  <div className="p-3 bg-ink-900 text-gold-500 rounded-2xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
                      <LineChart size={24} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-serif font-bold text-ink-900 tracking-tight">Interest Lifecycle Analysis</h2>
                      <p className="text-xs text-ink-500 font-sans font-black uppercase tracking-[0.3em] mt-1">Realization of Cooperative Profit</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Left: 3-Stage Pipeline Breakdown */}
                  <div className="space-y-6">
                      <motion.div 
                        whileHover={{ x: 4 }}
                        className="bg-white p-6 border-2 border-paper-100 rounded-2xl shadow-sm group/item hover:border-emerald-200 transition-all"
                      >
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Check size={12} strokeWidth={3}/> 1. Realized Gains
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900 tracking-tighter">₱{(treasuryStats.totalInterestCollected + treasuryStats.totalPenaltyCollected).toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-3 font-serif italic leading-relaxed">Interest and penalties already collected and sitting in the vault.</p>
                      </motion.div>

                      <motion.div 
                        whileHover={{ x: 4 }}
                        className="bg-white p-6 border-2 border-paper-100 rounded-2xl shadow-sm group/item hover:border-amber-200 transition-all"
                      >
                          <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <TrendingUp size={12} strokeWidth={3}/> 2. Arrears Burden
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900 tracking-tighter">₱{financialMetrics.totalArrearsInterest.toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-3 font-serif italic leading-relaxed">Interest that has matured based on time but is not yet paid.</p>
                      </motion.div>

                      <motion.div 
                        whileHover={{ x: 4 }}
                        className="bg-white p-6 border-2 border-paper-100 rounded-2xl shadow-sm group/item hover:border-violet-200 transition-all"
                      >
                          <div className="text-[10px] font-black text-violet-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <LineChart size={12} strokeWidth={3}/> 3. Pipeline Forecast
                          </div>
                          <div className="text-3xl font-mono font-bold text-ink-900 tracking-tighter">₱{financialMetrics.futureOnlyInterest.toLocaleString()}</div>
                          <p className="text-xs text-ink-400 mt-3 font-serif italic leading-relaxed">Contracted profit that will materialize in future months.</p>
                      </motion.div>
                  </div>

                  {/* Middle: Visualization & Projection */}
                  <div className="lg:col-span-2 space-y-12">
                      <div className="space-y-6">
                          <div className="flex justify-between items-end">
                              <h3 className="text-xs font-black text-ink-800 uppercase tracking-[0.3em]">Total Interest Contracted</h3>
                              <div className="text-right">
                                <span className="text-2xl font-mono font-bold text-violet-700 tracking-tighter">₱{financialMetrics.totalContractInterest.toLocaleString()}</span>
                                <div className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Max Projected Yield</div>
                              </div>
                          </div>
                          <div className="h-8 w-full bg-paper-200 rounded-2xl border-2 border-paper-300 overflow-hidden flex shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(financialMetrics.totalPaidFromActive / financialMetrics.totalContractInterest) * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-emerald-600 border-r-2 border-white/20 relative group/bar"
                                title="Realized"
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                              </motion.div>
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(financialMetrics.totalArrearsInterest / financialMetrics.totalContractInterest) * 100}%` }}
                                transition={{ duration: 1, delay: 0.7 }}
                                className="h-full bg-amber-500 border-r-2 border-white/20 relative group/bar"
                                title="Arrears"
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                              </motion.div>
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(financialMetrics.futureOnlyInterest / financialMetrics.totalContractInterest) * 100}%` }}
                                transition={{ duration: 1, delay: 0.9 }}
                                className="h-full bg-violet-500 relative group/bar"
                                title="Future"
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                              </motion.div>
                          </div>
                          <div className="flex justify-between text-[9px] font-black text-ink-400 uppercase tracking-[0.2em]">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Realized Gains</span>
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Arrears Burden</span>
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500"></div> Future Pipeline</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-5 border-l-2 border-paper-200 pl-8">
                              <h4 className="text-xs font-black text-ink-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                 <GanttChartSquare size={14} className="text-gold-500" />
                                 Profit Distribution
                              </h4>
                              <ul className="space-y-4 text-sm font-serif italic text-ink-700 leading-relaxed">
                                  <li className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                      <span>₱{(treasuryStats.totalInterestCollected + treasuryStats.totalPenaltyCollected).toLocaleString()} is fully liquid gains.</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                                      <span>₱{financialMetrics.totalArrearsInterest.toLocaleString()} is matured interest owed.</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-wax-500 mt-1.5 shadow-[0_0_8px_rgba(211,47,47,0.4)]"></div>
                                      <span>₱{financialMetrics.totalPenaltyArrears.toLocaleString()} is active penalty arrears.</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shadow-[0_0_8px_rgba(139,92,246,0.4)]"></div>
                                      <span>₱{financialMetrics.futureOnlyInterest.toLocaleString()} is expected yield.</span>
                                  </li>
                              </ul>
                          </div>

                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-ink-900 rounded-2xl p-8 text-paper-50 relative overflow-hidden shadow-2xl border-b-4 border-ink-950"
                          >
                              <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12">
                                 <ShieldCheck size={84} />
                              </div>
                              <h4 className="text-[10px] font-black text-gold-500 uppercase tracking-[0.3em] mb-6">True Value Projection</h4>
                              <div className="space-y-3">
                                  <div className="text-xs text-paper-400 font-serif italic opacity-80">Full Equity + Future Pipeline:</div>
                                  <div className="text-5xl font-mono font-bold text-white tracking-tighter">₱{financialMetrics.totalProjectedValuation.toLocaleString()}</div>
                                  <div className="pt-6 border-t border-white/10 mt-6">
                                      <p className="text-[10px] text-paper-500 leading-relaxed font-sans uppercase font-black tracking-widest opacity-60">
                                          Total wealth represents cash, principal out in the field, and all contracted future interest.
                                      </p>
                                  </div>
                              </div>
                          </motion.div>
                      </div>
                  </div>
              </div>
          </div>
      </motion.div>

      {/* REFINED: Composition Visualizer */}
      <motion.div variants={itemVariants} className="bg-white border-2 border-paper-200 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-paper-100 text-ink-900 rounded-xl group-hover:bg-ink-900 group-hover:text-gold-500 transition-colors duration-500">
                      <BarChart3 size={20} />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-ink-900 tracking-tight">
                      Asset Composition
                  </h3>
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-ink-400 uppercase tracking-[0.2em]">Gross Portfolio Valuation</span>
                  <span className="text-xl font-mono font-bold text-ink-900 italic tracking-tighter">₱{financialMetrics.totalProjectedValuation.toLocaleString()}</span>
              </div>
          </div>
          
          <div className="flex w-full h-12 rounded-2xl overflow-hidden mb-10 border-2 border-paper-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] p-1 bg-paper-50">
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cashPercent}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="bg-emerald-600 h-full rounded-xl flex items-center justify-center group/bar relative cursor-help transition-all duration-700 hover:brightness-110 shadow-lg"
              >
                  <div className="absolute -top-12 bg-ink-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl border border-white/10">
                      Vault Cash: {cashPercent.toFixed(1)}%
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </motion.div>
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${receivablePercent}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="bg-blue-600 h-full rounded-xl flex items-center justify-center group/bar relative cursor-help transition-all duration-700 hover:brightness-110 mx-1 shadow-lg"
              >
                  <div className="absolute -top-12 bg-ink-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl border border-white/10">
                      Receivable Principal: {receivablePercent.toFixed(1)}%
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </motion.div>
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${unearnedPercent}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="bg-violet-500 h-full rounded-xl flex items-center justify-center group/bar relative cursor-help transition-all duration-700 hover:brightness-110 shadow-lg"
              >
                  <div className="absolute -top-12 bg-ink-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl border border-white/10">
                      Unearned Pipeline: {unearnedPercent.toFixed(1)}%
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <motion.div whileHover={{ y: -4 }} className="flex items-start gap-5 p-4 rounded-2xl hover:bg-paper-50 transition-colors">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                      <Wallet size={20} />
                  </div>
                  <div>
                      <div className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] mb-1">Vault Liquidity</div>
                      <div className="text-2xl font-mono font-bold text-ink-900 tracking-tighter">₱{treasuryStats.balance.toLocaleString()}</div>
                      <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Available Cash</div>
                  </div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="flex items-start gap-5 p-4 rounded-2xl hover:bg-paper-50 transition-colors border-l border-paper-100 md:pl-10">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                      <Briefcase size={20} />
                  </div>
                  <div>
                      <div className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] mb-1">Principal Out</div>
                      <div className="text-2xl font-mono font-bold text-ink-900 tracking-tighter">₱{financialMetrics.totalReceivables.toLocaleString()}</div>
                      <div className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-1">Active Portfolio</div>
                  </div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="flex items-start gap-5 p-4 rounded-2xl hover:bg-paper-50 transition-colors border-l border-paper-100 md:pl-10">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 shadow-sm border border-violet-100">
                      <LineChart size={20} />
                  </div>
                  <div>
                      <div className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] mb-1">Future Interest</div>
                      <div className="text-2xl font-mono font-bold text-violet-700 tracking-tighter">₱{financialMetrics.totalUnearnedInterest.toLocaleString()}</div>
                      <div className="text-[9px] text-violet-600 font-bold uppercase tracking-widest mt-1">Contracted Yield</div>
                  </div>
              </motion.div>
          </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-paper-50 rounded-2xl border-2 border-paper-200 shadow-xl overflow-hidden group">
         <div className="p-6 border-b border-paper-200 bg-paper-100/50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-ink-900 text-gold-500 rounded-2xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <ArrowRightLeft size={20} />
               </div>
               <div>
                  <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Cash Flow Breakdown</h2>
                  <p className="text-[10px] text-ink-400 font-sans font-black uppercase tracking-[0.2em]">Double-Entry Ledger View</p>
               </div>
            </div>
            <div className="text-[10px] font-black text-ink-300 uppercase tracking-[0.3em] border border-paper-200 px-3 py-1 rounded-full">Bookkeeping Verified</div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-paper-200">
            <div className="p-8 space-y-8">
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-emerald-700 uppercase tracking-[0.3em] flex items-center gap-2">
                     <ArrowUpRight size={14} strokeWidth={3} />
                     Source of Funds (Inflow)
                  </h3>
                  <span className="text-[10px] text-ink-300 font-mono font-bold uppercase tracking-widest bg-paper-100 px-2 py-0.5 rounded">Credit</span>
               </div>

               <div className="space-y-8">
                  <div>
                     <div className="text-[10px] text-ink-400 font-black uppercase tracking-[0.2em] mb-4 border-b border-paper-200 pb-2 flex justify-between">
                        <span>Capital Receipts</span>
                        <span className="opacity-50">Equity Growth</span>
                     </div>
                     <div className="space-y-3">
                        <BreakdownRow 
                           title="Monthly Member Equity"
                           amount={monthlyDeposits}
                           color="green"
                           percent={getPercent(monthlyDeposits)}
                           id="br-monthly"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                           items={monthlyDepositContribs.slice(0, 5).map(c => (
                              <div key={c.id} className="flex justify-between py-2 border-b border-paper-100 border-dashed text-[11px] hover:bg-paper-100 px-2 rounded transition-colors">
                                 <span className="font-serif italic text-ink-700">{c.member.full_name}</span>
                                 <span className="font-mono font-bold text-ink-900">₱{c.amount.toLocaleString()}</span>
                              </div>
                           ))}
                        />
                        <BreakdownRow 
                           title="Direct Share Capital"
                           amount={oneTimeDeposits}
                           color="emerald"
                           percent={getPercent(oneTimeDeposits)}
                           id="br-onetime"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                           items={oneTimeContribs.slice(0, 5).map(c => (
                              <div key={c.id} className="flex justify-between py-2 border-b border-paper-100 border-dashed text-[11px] hover:bg-paper-100 px-2 rounded transition-colors">
                                 <span className="font-serif italic text-ink-700">{c.member.full_name}</span>
                                 <span className="font-mono font-bold text-ink-900">₱{c.amount.toLocaleString()}</span>
                              </div>
                           ))}
                        />
                     </div>
                  </div>

                  <div>
                     <div className="text-[10px] text-ink-400 font-black uppercase tracking-[0.2em] mb-4 border-b border-paper-200 pb-2 flex justify-between">
                        <span>Operating Receipts</span>
                        <span className="opacity-50">Yield Realization</span>
                     </div>
                     <div className="space-y-3">
                        <BreakdownRow 
                           title="Principal Recovery" 
                           amount={treasuryStats.totalPrincipalRepaid}
                           color="blue"
                           percent={getPercent(treasuryStats.totalPrincipalRepaid)}
                           id="br-principal"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                        />
                        <BreakdownRow 
                           title="Net Interest Income"
                           amount={treasuryStats.totalInterestCollected}
                           color="purple"
                           percent={getPercent(treasuryStats.totalInterestCollected)}
                           id="br-interest"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                        />
                        <BreakdownRow 
                           title="Penalty Collections"
                           amount={treasuryStats.totalPenaltyCollected}
                           color="wax"
                           percent={getPercent(treasuryStats.totalPenaltyCollected)}
                           id="br-penalties"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 space-y-8 bg-paper-50/30">
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-wax-700 uppercase tracking-[0.3em] flex items-center gap-2">
                     <ArrowDownRight size={14} strokeWidth={3} />
                     Application of Funds (Outflow)
                  </h3>
                  <span className="text-[10px] text-ink-300 font-mono font-bold uppercase tracking-widest bg-paper-100 px-2 py-0.5 rounded">Debit</span>
               </div>

               <div className="space-y-8">
                  <div>
                     <div className="text-[10px] text-ink-400 font-black uppercase tracking-[0.2em] mb-4 border-b border-paper-200 pb-2 flex justify-between">
                        <span>Capital Deployment</span>
                        <span className="opacity-50">Asset Allocation</span>
                     </div>
                     <div className="space-y-3">
                        <BreakdownRow 
                           title="Loan Disbursements"
                           amount={treasuryStats.totalDisbursed}
                           color="wax"
                           percent={100}
                           id="br-disbursed"
                           expandedSection={expandedSection}
                           toggleSection={toggleSection}
                           items={loans.filter(l => l.status === 'active' || l.status === 'paid').slice(0, 5).map(l => (
                              <div key={l.id} className="flex justify-between py-2 border-b border-paper-100 border-dashed text-[11px] hover:bg-paper-100 px-2 rounded transition-colors">
                                 <span className="font-serif italic text-ink-700">{l.borrower.full_name}</span>
                                 <span className="font-mono font-bold text-wax-600">₱{l.principal.toLocaleString()}</span>
                              </div>
                           ))}
                        />
                     </div>
                  </div>

                  <div className="pt-4 opacity-50">
                     <div className="text-[10px] text-ink-400 font-black uppercase tracking-[0.2em] mb-4 border-b border-paper-200 pb-2">Operating Outflows</div>
                     <div className="p-8 rounded-2xl border-2 border-dashed border-paper-300 flex flex-col items-center justify-center bg-paper-100/50">
                        <span className="text-sm font-serif italic text-ink-400">No active operating expenses</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-paper-200 p-8 flex flex-col md:flex-row justify-between items-center border-t-2 border-paper-300 gap-6">
            <div className="flex items-center gap-4 text-ink-700">
               <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center text-paper-50 font-bold text-xl shadow-xl rotate-3">
                  <Equal size={20} />
               </div>
               <div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-ink-500">Net Treasury Position</span>
                  <p className="text-[10px] text-ink-400 font-serif italic">Vault Liquidity Balance</p>
               </div>
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
               <div className="flex flex-col items-end bg-paper-50 px-4 py-2 rounded-xl border border-paper-300 shadow-sm">
                  <span className="text-xl font-bold text-ink-900 tracking-tighter">₱{treasuryStats.balance.toLocaleString()}</span>
                  <span className="text-xs uppercase text-ink-400 font-bold">Balance</span>
               </div>
            </div>
         </div>
      </motion.div>
    </motion.div>
  );
};
