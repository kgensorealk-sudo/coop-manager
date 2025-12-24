
import React, { useState, useEffect } from 'react';
import { ContributionWithMember, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { Wallet, PiggyBank, ArrowUpRight, Plus, Check, X, Clock, TrendingUp, ArrowDownRight, Coins, Scale, Activity, ChevronDown, ChevronUp, Calendar, Target } from 'lucide-react';

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
  activeLoanVolume: number; // Passed from parent
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

  // Fetch goal on mount
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

  const pendingContributions = contributions.filter(c => c.status === 'pending');
  const approvedContributions = contributions.filter(c => c.status === 'approved');

  // 1. Detailed Breakdown of Contributions
  const monthlyDepositContribs = approvedContributions.filter(c => c.type === 'monthly_deposit');
  const monthlyDeposits = monthlyDepositContribs.reduce((sum, c) => sum + c.amount, 0);
  
  const oneTimeContribs = approvedContributions.filter(c => c.type === 'one_time');
  const oneTimeDeposits = oneTimeContribs.reduce((sum, c) => sum + c.amount, 0);

  // 2. Monthly Collection Stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyCollections = approvedContributions
    .filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, c) => sum + c.amount, 0);

  // 3. Loans Disbursed Breakdown
  const disbursedLoans = loans.filter(l => l.status === 'active' || l.status === 'paid');

  // 4. Principal Repaid Breakdown (Approximation: Loans where principal > remaining)
  const repayingLoans = loans.filter(l => (l.status === 'active' || l.status === 'paid') && l.principal > l.remaining_principal);

  // 5. Balance Sheet Calculation
  const totalAssets = treasuryStats.balance + activeLoanVolume;
  const totalEquity = treasuryStats.totalContributions + totalInterestGained;

  // 6. Cash Flow Composition for Progress Bars
  const totalInflow = treasuryStats.totalContributions + treasuryStats.totalPayments;
  const getPercent = (val: number) => totalInflow > 0 ? (val / totalInflow) * 100 : 0;

  // Helper Row Component
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
    
    // Extract raw color keys
    const barColor = color === 'green' ? 'bg-emerald-700' : 
                     color === 'emerald' ? 'bg-emerald-600' :
                     color === 'blue' ? 'bg-blue-700' :
                     color === 'purple' ? 'bg-purple-700' : 'bg-red-700';
    
    const containerColor = color === 'green' ? 'bg-emerald-100' : 
                           color === 'emerald' ? 'bg-emerald-100' :
                           color === 'blue' ? 'bg-blue-100' :
                           color === 'purple' ? 'bg-purple-100' : 'bg-red-100';

    return (
      <div className="relative pt-1 group">
         <div 
           className={`flex justify-between items-center mb-1 text-sm font-serif ${items ? 'cursor-pointer hover:bg-paper-100 p-1.5 -mx-1.5 rounded-sm transition-colors' : ''}`}
           onClick={() => items && toggleSection(id)}
         >
            <span className="text-ink-700 flex items-center gap-2 font-bold">
               {title}
               {items && (
                 <span className="text-ink-400">
                   {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                 </span>
               )}
            </span>
            <span className={`font-mono font-medium ${id === 'disbursed' ? 'text-wax-600' : 'text-ink-900'}`}>
               {id === 'disbursed' ? '-' : ''}₱{amount.toLocaleString()}
            </span>
         </div>
         <div className={`overflow-hidden h-1.5 mb-2 text-xs flex rounded-full ${containerColor}`}>
            <div style={{ width: `${percent}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${barColor}`}></div>
         </div>
         
         {/* Collapsible Content */}
         {isExpanded && items && (
           <div className="mb-4 pl-3 border-l-2 border-paper-300 text-xs text-ink-500 space-y-2 animate-fade-in max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-paper-100/50 p-2 rounded-r-sm">
              {items}
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Edit Goal Overlay */}
      {isEditingGoal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-leather-900/60 backdrop-blur-sm p-4">
            <div className="bg-paper-50 rounded-sm border-2 border-paper-300 shadow-xl p-6 w-full max-w-sm animate-slide-up">
               <h3 className="text-lg font-serif font-bold text-ink-900 mb-2">Set Monthly Goal</h3>
               <p className="text-sm text-ink-500 mb-4 font-serif italic">Target collection amount for this month.</p>
               <form onSubmit={handleUpdateGoal}>
                  <div className="relative mb-4">
                     <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400 font-bold font-serif text-xl">₱</span>
                     <input 
                        autoFocus
                        type="number" 
                        min="0"
                        step="100"
                        value={newGoalInput}
                        onChange={(e) => setNewGoalInput(e.target.value)}
                        className="w-full pl-6 pr-4 py-2 border-b-2 border-ink-300 bg-transparent focus:border-ink-900 outline-none font-mono text-xl text-ink-900"
                        placeholder={monthlyGoal.toString()}
                     />
                  </div>
                  <div className="flex justify-end gap-2">
                     <button type="button" onClick={() => setIsEditingGoal(false)} className="px-4 py-2 text-ink-500 hover:text-ink-900 font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                     <button type="submit" className="px-6 py-2 bg-ink-900 text-white rounded-sm hover:bg-black font-bold uppercase text-[10px] tracking-widest shadow-sm">Save Goal</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink-900">Treasury Books</h1>
          <p className="text-ink-500 mt-2 font-serif italic">Track contributions, deposits, and cash flow.</p>
        </div>
        <div className="flex gap-2">
           <button 
              onClick={() => {
                 setNewGoalInput(monthlyGoal.toString());
                 setIsEditingGoal(true);
              }}
              className="bg-paper-50 border border-paper-300 text-ink-600 hover:bg-paper-100 px-4 py-2.5 rounded-sm font-bold uppercase tracking-widest text-xs transition-colors flex items-center space-x-2 shadow-sm"
           >
              <Target size={16} />
              <span>Set Target</span>
           </button>
           <button 
             onClick={onAddContribution}
             className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-widest text-xs shadow-md transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-emerald-900"
           >
              <Plus size={16} />
              <span>Log Entry</span>
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Treasury Balance" 
          value={`₱${treasuryStats.balance.toLocaleString()}`} 
          icon={Wallet} 
          trend="Cash on Hand" 
          trendUp={true}
          colorClass="text-emerald-700"
        />
        <StatCard 
          title="Retained Earnings" 
          value={`₱${totalInterestGained.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Lifetime Profit" 
          trendUp={true}
          colorClass="text-purple-700"
        />
        <StatCard 
          title="Monthly Collections" 
          value={`₱${monthlyCollections.toLocaleString()}`} 
          icon={PiggyBank} 
          trend={`Target: ₱${monthlyGoal.toLocaleString()}`}
          trendUp={monthlyCollections >= monthlyGoal}
          colorClass="text-blue-700"
        />
      </div>

      {/* Financial Position (Balance Sheet) */}
      <div className="bg-leather-900 rounded-sm text-paper-200 shadow-2xl overflow-hidden border border-leather-800 relative">
         <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500 opacity-5 blur-3xl rounded-full"></div>
         
         <div className="p-6 border-b border-white/10 flex items-center space-x-3 bg-black/20">
            <div className="p-2 bg-leather-800 rounded-sm text-gold-500 border border-white/5">
               <Scale size={20} />
            </div>
            <div>
               <h2 className="text-lg font-serif font-bold text-paper-50">Statement of Financial Position</h2>
               <p className="text-gold-600/70 text-[10px] uppercase tracking-[0.2em] font-bold">Balance Sheet</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2">
            {/* ASSETS */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-white/10">
               <h3 className="text-xs font-bold text-ink-400 uppercase tracking-[0.2em] mb-6 font-sans">Assets</h3>
               <div className="space-y-5 font-mono text-sm">
                  <div className="flex justify-between items-center group border-b border-white/5 pb-3">
                     <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Cash (Treasury)</span>
                     <span className="font-bold text-paper-50">₱{treasuryStats.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group border-b border-white/5 pb-3">
                     <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Receivables (Loans)</span>
                     <span className="font-bold text-paper-50">₱{activeLoanVolume.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 flex justify-between items-center text-lg font-bold text-gold-400">
                     <span className="font-serif">Total Assets</span>
                     <span>₱{totalAssets.toLocaleString()}</span>
                  </div>
               </div>
            </div>
            {/* EQUITY */}
            <div className="p-8">
               <h3 className="text-xs font-bold text-ink-400 uppercase tracking-[0.2em] mb-6 font-sans">Equity</h3>
               <div className="space-y-5 font-mono text-sm">
                  <div className="flex justify-between items-center group border-b border-white/5 pb-3">
                     <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Member Capital</span>
                     <span className="font-bold text-paper-50">₱{treasuryStats.totalContributions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group border-b border-white/5 pb-3">
                     <span className="text-paper-400 group-hover:text-paper-100 transition-colors">Retained Earnings</span>
                     <span className="font-bold text-emerald-400">+ ₱{totalInterestGained.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 flex justify-between items-center text-lg font-bold text-emerald-400">
                     <span className="font-serif">Total Equity</span>
                     <span>₱{totalEquity.toLocaleString()}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Detailed Cash Flow Statement */}
      <div className="bg-paper-50 rounded-sm border border-paper-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-paper-200 flex items-center justify-between bg-paper-100/30">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-sm border border-blue-100">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-ink-900">Cash Flow Statement</h2>
                <p className="text-xs text-ink-500 font-mono">Detailed breakdown</p>
              </div>
           </div>
           <div className="text-right">
              <div className="text-[10px] text-ink-400 uppercase font-bold tracking-widest">Net Flow</div>
              <div className={`text-xl font-bold font-mono ${treasuryStats.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                 ₱{treasuryStats.balance.toLocaleString()}
              </div>
           </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-paper-200">
           
           {/* INFLOWS */}
           <div className="p-8 space-y-8">
              <div className="flex items-center space-x-2 mb-4">
                 <div className="p-1 bg-green-50 rounded-sm text-green-700 border border-green-200"><ArrowUpRight size={14} /></div>
                 <h3 className="text-xs font-bold text-ink-900 uppercase tracking-[0.2em]">Inflows</h3>
              </div>

              {/* 1. Member Capital */}
              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-ink-400 uppercase border-b border-paper-200 pb-1 font-serif italic">Financing Activities</h4>
                 
                 <BreakdownRow 
                    title="Monthly Deposits"
                    amount={monthlyDeposits}
                    color="green"
                    percent={getPercent(monthlyDeposits)}
                    id="monthly"
                    items={
                        monthlyDepositContribs.length > 0 ? monthlyDepositContribs.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-paper-200">
                                <div>
                                    <div className="font-serif font-bold text-ink-700">{c.member.full_name}</div>
                                    <div className="text-[10px] text-ink-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {new Date(c.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-ink-900">₱{c.amount.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-ink-400 font-serif">No records found</div>
                    }
                 />

                 <BreakdownRow 
                    title="Share Capital"
                    amount={oneTimeDeposits}
                    color="emerald"
                    percent={getPercent(oneTimeDeposits)}
                    id="onetime"
                    items={
                        oneTimeContribs.length > 0 ? oneTimeContribs.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-paper-200">
                                <div>
                                    <div className="font-serif font-bold text-ink-700">{c.member.full_name}</div>
                                    <div className="text-[10px] text-ink-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {new Date(c.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-ink-900">₱{c.amount.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-ink-400 font-serif">No records found</div>
                    }
                 />
              </div>

              {/* 2. Operations & Investing */}
              <div className="space-y-4 pt-4">
                 <h4 className="text-xs font-bold text-ink-400 uppercase border-b border-paper-200 pb-1 font-serif italic">Operating Activities</h4>
                 
                 <BreakdownRow 
                    title="Loan Repayments"
                    amount={treasuryStats.totalPrincipalRepaid}
                    color="blue"
                    percent={getPercent(treasuryStats.totalPrincipalRepaid)}
                    id="principal"
                    items={
                        repayingLoans.length > 0 ? repayingLoans.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-paper-200">
                                <span className="truncate pr-2 text-ink-700 font-serif font-bold">{l.borrower.full_name}</span>
                                <span className="font-mono font-bold text-ink-900">₱{(l.principal - l.remaining_principal).toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-ink-400 font-serif">No records found</div>
                    }
                 />

                 <BreakdownRow 
                    title={<span className="flex items-center gap-2"><Coins size={14} className="text-purple-600"/> Interest Income</span>}
                    amount={treasuryStats.totalInterestCollected}
                    color="purple"
                    percent={getPercent(treasuryStats.totalInterestCollected)}
                    id="interest"
                    // Intentionally no breakdown for interest
                 />
              </div>
              
              <div className="flex justify-between pt-4 border-t-2 border-paper-200 font-serif font-bold text-ink-900 text-lg">
                 <span>Total Inflow</span>
                 <span className="font-mono">₱{totalInflow.toLocaleString()}</span>
              </div>
           </div>

           {/* OUTFLOWS */}
           <div className="p-8 space-y-8 bg-paper-100/30">
              <div className="flex items-center space-x-2 mb-4">
                 <div className="p-1 bg-red-50 rounded-sm text-red-700 border border-red-200"><ArrowDownRight size={14} /></div>
                 <h3 className="text-xs font-bold text-ink-900 uppercase tracking-[0.2em]">Outflows</h3>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-ink-400 uppercase border-b border-paper-200 pb-1 font-serif italic">Investing Activities</h4>
                 
                 <BreakdownRow 
                    title="Loans Disbursed"
                    amount={treasuryStats.totalDisbursed}
                    color="red"
                    percent={100} 
                    id="disbursed"
                    items={
                        disbursedLoans.length > 0 ? disbursedLoans.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border-b border-paper-200 last:border-0 border-dashed">
                                <div>
                                    <div className="font-serif font-bold text-ink-700">{l.borrower.full_name}</div>
                                    <div className="text-[10px] text-ink-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {l.start_date ? new Date(l.start_date).toLocaleDateString() : 'Pending'}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-wax-600">-₱{l.principal.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-ink-400 font-serif">No records found</div>
                    }
                 />
              </div>

              {/* Placeholder for Expenses */}
              <div className="space-y-4 opacity-60">
                 <h4 className="text-xs font-bold text-ink-400 uppercase border-b border-paper-200 pb-1 font-serif italic">Operating Expenses</h4>
                 <div className="p-3 bg-paper-100 border border-paper-200 rounded-sm border-dashed">
                    <div className="flex justify-between items-center text-sm font-serif">
                       <span className="text-ink-500 italic">Administrative Costs</span>
                       <span className="font-bold text-ink-500 font-mono">₱0.00</span>
                    </div>
                 </div>
              </div>

              <div className="flex justify-between pt-4 border-t-2 border-paper-200 font-serif font-bold text-ink-900 mt-auto text-lg">
                 <span>Total Outflow</span>
                 <span className="text-wax-600 font-mono">- ₱{treasuryStats.totalDisbursed.toLocaleString()}</span>
              </div>
           </div>

        </div>
      </div>

      {/* Review Pending Deposits Table */}
      <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-paper-200 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 p-2 rounded-sm text-amber-700 border border-amber-200">
              <Clock size={20} />
            </div>
            <h2 className="text-lg font-serif font-bold text-ink-900">Pending Verification</h2>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest">
            {pendingContributions.length} Pending
          </span>
        </div>

        {pendingContributions.length === 0 ? (
          <div className="p-16 text-center text-ink-400">
            <Check size={48} className="mx-auto mb-3 text-emerald-200" strokeWidth={1} />
            <p className="font-serif italic text-lg">All entries verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-paper-100 border-b border-paper-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-ink-400 uppercase tracking-[0.2em] font-sans">Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-400 uppercase tracking-[0.2em] font-sans">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-400 uppercase tracking-[0.2em] font-sans">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-400 uppercase tracking-[0.2em] font-sans">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-400 uppercase tracking-[0.2em] font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-100">
                {pendingContributions.map((contribution) => (
                  <tr key={contribution.id} className="hover:bg-paper-100 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-serif font-bold text-xs border border-blue-200">
                          {contribution.member.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif font-bold text-ink-900">{contribution.member.full_name}</div>
                          <div className="text-xs text-ink-500 font-mono">{contribution.member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-600 text-sm font-mono">
                      {new Date(contribution.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-ink-900 capitalize text-sm font-medium font-serif">
                      {contribution.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 font-bold text-ink-900 font-mono">
                      ₱{contribution.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => onRejectContribution && onRejectContribution(contribution.id)}
                          className="p-2 text-wax-600 hover:bg-red-50 rounded-sm transition-colors border border-transparent hover:border-red-200"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                        <button 
                          onClick={() => onApproveContribution && onApproveContribution(contribution.id)}
                          className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-sm transition-colors shadow-sm"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
