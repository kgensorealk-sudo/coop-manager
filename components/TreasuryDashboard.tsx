
import React, { useState, useEffect } from 'react';
import { ContributionWithMember, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { Wallet, PiggyBank, Search, Filter, ArrowUpRight, Plus, Check, X, Clock, TrendingUp, Info, ArrowDownRight, Calculator, Coins, Scale, Activity, ChevronDown, ChevronUp, Calendar, Target, Edit2 } from 'lucide-react';

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    const barColor = color === 'green' ? 'bg-green-600' : 
                     color === 'emerald' ? 'bg-emerald-600' :
                     color === 'blue' ? 'bg-blue-600' :
                     color === 'purple' ? 'bg-purple-600' : 'bg-red-600';
    
    const containerColor = color === 'green' ? 'bg-green-100' : 
                           color === 'emerald' ? 'bg-emerald-100' :
                           color === 'blue' ? 'bg-blue-100' :
                           color === 'purple' ? 'bg-purple-100' : 'bg-red-100';

    return (
      <div className="relative pt-1 group">
         <div 
           className={`flex justify-between items-center mb-1 text-sm font-serif ${items ? 'cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded-sm transition-colors' : ''}`}
           onClick={() => items && toggleSection(id)}
         >
            <span className="text-slate-700 flex items-center gap-2 font-bold">
               {title}
               {items && (
                 <span className="text-slate-400">
                   {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                 </span>
               )}
            </span>
            <span className={`font-mono font-bold ${id === 'disbursed' ? 'text-red-700' : 'text-slate-800'}`}>
               {id === 'disbursed' ? '-' : ''}₱{amount.toLocaleString()}
            </span>
         </div>
         <div className={`overflow-hidden h-2 mb-2 text-xs flex rounded-sm ${containerColor}`}>
            <div style={{ width: `${percent}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${barColor}`}></div>
         </div>
         
         {/* Collapsible Content */}
         {isExpanded && items && (
           <div className="mb-4 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 space-y-2 animate-fade-in max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-slate-50/50 p-2 rounded-r-sm">
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
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-sm border border-slate-200 shadow-xl p-6 w-full max-w-sm animate-slide-up">
               <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">Set Monthly Goal</h3>
               <p className="text-sm text-slate-500 mb-4 font-serif italic">Target collection amount for this month.</p>
               <form onSubmit={handleUpdateGoal}>
                  <div className="relative mb-4">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-serif">₱</span>
                     <input 
                        autoFocus
                        type="number" 
                        min="0"
                        step="100"
                        value={newGoalInput}
                        onChange={(e) => setNewGoalInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border-b-2 border-slate-300 bg-slate-50 focus:border-blue-600 outline-none font-mono text-lg"
                        placeholder={monthlyGoal.toString()}
                     />
                  </div>
                  <div className="flex justify-end gap-2">
                     <button type="button" onClick={() => setIsEditingGoal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold uppercase text-xs tracking-wide">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-bold uppercase text-xs tracking-wide shadow-sm">Save Goal</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Treasury Books</h1>
          <p className="text-slate-500 mt-2 font-serif italic">Track contributions, deposits, and cash flow.</p>
        </div>
        <div className="flex gap-2">
           <button 
              onClick={() => {
                 setNewGoalInput(monthlyGoal.toString());
                 setIsEditingGoal(true);
              }}
              className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-sm font-bold uppercase tracking-wide text-xs transition-colors flex items-center space-x-2 shadow-sm"
           >
              <Target size={16} />
              <span>Set Target</span>
           </button>
           <button 
             onClick={onAddContribution}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-wide text-xs shadow-md transition-transform active:scale-95 flex items-center space-x-2 border-b-4 border-emerald-800"
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
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard 
          title="Retained Earnings" 
          value={`₱${totalInterestGained.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="Lifetime Profit" 
          trendUp={true}
          colorClass="bg-purple-50 text-purple-700 border-purple-200"
        />
        <StatCard 
          title="Monthly Collections" 
          value={`₱${monthlyCollections.toLocaleString()}`} 
          icon={PiggyBank} 
          trend={`Target: ₱${monthlyGoal.toLocaleString()}`}
          trendUp={monthlyCollections >= monthlyGoal}
          colorClass="bg-blue-50 text-blue-700 border-blue-200"
        />
      </div>

      {/* Financial Position (Balance Sheet) */}
      <div className="bg-[#1C1917] rounded-sm text-[#D6CDBF] shadow-lg overflow-hidden border border-[#2C2420]">
         <div className="p-6 border-b border-[#2C2420] flex items-center space-x-3 bg-[#151210]">
            <div className="p-2 bg-[#2C2420] rounded-sm text-blue-300">
               <Scale size={20} />
            </div>
            <div>
               <h2 className="text-lg font-serif font-bold text-[#F2EDE4]">Statement of Financial Position</h2>
               <p className="text-[#78716C] text-xs uppercase tracking-widest font-bold">Balance Sheet</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2">
            {/* ASSETS */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-[#2C2420]">
               <h3 className="text-xs font-bold text-[#57534E] uppercase tracking-widest mb-6 font-serif underline decoration-[#2C2420] underline-offset-4">Assets</h3>
               <div className="space-y-5 font-mono text-sm">
                  <div className="flex justify-between items-center group border-b border-[#2C2420] pb-2 border-dashed">
                     <span className="text-[#A8A29E] group-hover:text-[#D6CDBF] transition-colors">Cash (Treasury)</span>
                     <span className="font-bold text-[#F2EDE4]">₱{treasuryStats.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group border-b border-[#2C2420] pb-2 border-dashed">
                     <span className="text-[#A8A29E] group-hover:text-[#D6CDBF] transition-colors">Receivables (Loans)</span>
                     <span className="font-bold text-[#F2EDE4]">₱{activeLoanVolume.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center text-lg font-bold text-blue-300">
                     <span className="font-serif">Total Assets</span>
                     <span>₱{totalAssets.toLocaleString()}</span>
                  </div>
               </div>
            </div>
            {/* EQUITY */}
            <div className="p-8">
               <h3 className="text-xs font-bold text-[#57534E] uppercase tracking-widest mb-6 font-serif underline decoration-[#2C2420] underline-offset-4">Equity</h3>
               <div className="space-y-5 font-mono text-sm">
                  <div className="flex justify-between items-center group border-b border-[#2C2420] pb-2 border-dashed">
                     <span className="text-[#A8A29E] group-hover:text-[#D6CDBF] transition-colors">Member Capital</span>
                     <span className="font-bold text-[#F2EDE4]">₱{treasuryStats.totalContributions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group border-b border-[#2C2420] pb-2 border-dashed">
                     <span className="text-[#A8A29E] group-hover:text-[#D6CDBF] transition-colors">Retained Earnings</span>
                     <span className="font-bold text-emerald-400">+ ₱{totalInterestGained.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center text-lg font-bold text-emerald-400">
                     <span className="font-serif">Total Equity</span>
                     <span>₱{totalEquity.toLocaleString()}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Detailed Cash Flow Statement */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-sm border border-blue-100">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-900">Cash Flow Statement</h2>
                <p className="text-xs text-slate-500 font-mono">Detailed breakdown</p>
              </div>
           </div>
           <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Net Flow</div>
              <div className={`text-xl font-bold font-mono ${treasuryStats.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                 ₱{treasuryStats.balance.toLocaleString()}
              </div>
           </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
           
           {/* INFLOWS */}
           <div className="p-8 space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                 <div className="p-1 bg-green-50 rounded-sm text-green-700 border border-green-200"><ArrowUpRight size={14} /></div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-serif">Inflows</h3>
              </div>

              {/* 1. Member Capital */}
              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Financing Activities</h4>
                 
                 <BreakdownRow 
                    title="Monthly Deposits"
                    amount={monthlyDeposits}
                    color="green"
                    percent={getPercent(monthlyDeposits)}
                    id="monthly"
                    items={
                        monthlyDepositContribs.length > 0 ? monthlyDepositContribs.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                                <div>
                                    <div className="font-serif font-bold text-slate-700">{c.member.full_name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {new Date(c.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-slate-900">₱{c.amount.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-slate-400 font-serif">No records found</div>
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
                            <div key={c.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                                <div>
                                    <div className="font-serif font-bold text-slate-700">{c.member.full_name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {new Date(c.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-slate-900">₱{c.amount.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-slate-400 font-serif">No records found</div>
                    }
                 />
              </div>

              {/* 2. Operations & Investing */}
              <div className="space-y-4 pt-6">
                 <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Operating Activities</h4>
                 
                 <BreakdownRow 
                    title="Loan Repayments"
                    amount={treasuryStats.totalPrincipalRepaid}
                    color="blue"
                    percent={getPercent(treasuryStats.totalPrincipalRepaid)}
                    id="principal"
                    items={
                        repayingLoans.length > 0 ? repayingLoans.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border border-transparent hover:border-slate-200">
                                <span className="truncate pr-2 text-slate-700 font-serif font-bold">{l.borrower.full_name}</span>
                                <span className="font-mono font-bold text-slate-900">₱{(l.principal - l.remaining_principal).toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-slate-400 font-serif">No records found</div>
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
              
              <div className="flex justify-between pt-4 border-t-2 border-slate-100 font-serif font-bold text-slate-900 text-lg">
                 <span>Total Inflow</span>
                 <span className="font-mono">₱{totalInflow.toLocaleString()}</span>
              </div>
           </div>

           {/* OUTFLOWS */}
           <div className="p-8 space-y-6 bg-slate-50/30">
              <div className="flex items-center space-x-2 mb-4">
                 <div className="p-1 bg-red-50 rounded-sm text-red-700 border border-red-200"><ArrowDownRight size={14} /></div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-serif">Outflows</h3>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Investing Activities</h4>
                 
                 <BreakdownRow 
                    title="Loans Disbursed"
                    amount={treasuryStats.totalDisbursed}
                    color="red"
                    percent={100} 
                    id="disbursed"
                    items={
                        disbursedLoans.length > 0 ? disbursedLoans.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 rounded-sm hover:bg-white transition-colors border-b border-slate-200 last:border-0 border-dashed">
                                <div>
                                    <div className="font-serif font-bold text-slate-700">{l.borrower.full_name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Calendar size={10} />
                                        {l.start_date ? new Date(l.start_date).toLocaleDateString() : 'Pending'}
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-red-700">-₱{l.principal.toLocaleString()}</span>
                            </div>
                        )) : <div className="text-center italic py-2 text-slate-400 font-serif">No records found</div>
                    }
                 />
              </div>

              {/* Placeholder for Expenses */}
              <div className="space-y-4 opacity-60">
                 <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Operating Expenses</h4>
                 <div className="p-3 bg-slate-100 border border-slate-200 rounded-sm border-dashed">
                    <div className="flex justify-between items-center text-sm font-serif">
                       <span className="text-slate-500 italic">Administrative Costs</span>
                       <span className="font-bold text-slate-500 font-mono">₱0.00</span>
                    </div>
                 </div>
              </div>

              <div className="flex justify-between pt-4 border-t-2 border-slate-200 font-serif font-bold text-slate-900 mt-auto text-lg">
                 <span>Total Outflow</span>
                 <span className="text-red-700 font-mono">- ₱{treasuryStats.totalDisbursed.toLocaleString()}</span>
              </div>
           </div>

        </div>
      </div>

      {/* Review Pending Deposits Table */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-paper overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-amber-50/30">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 p-2 rounded-sm text-amber-700 border border-amber-200">
              <Clock size={20} />
            </div>
            <h2 className="text-lg font-serif font-bold text-slate-900">Pending Verification</h2>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-sm border border-amber-200 uppercase tracking-wide">
            {pendingContributions.length} Pending
          </span>
        </div>

        {pendingContributions.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Check size={48} className="mx-auto mb-3 text-emerald-200" strokeWidth={1} />
            <p className="font-serif italic text-lg">All entries verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-serif text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingContributions.map((contribution) => (
                  <tr key={contribution.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-serif font-bold text-xs border border-blue-200">
                          {contribution.member.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif font-bold text-slate-900">{contribution.member.full_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{contribution.member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm font-mono">
                      {new Date(contribution.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900 capitalize text-sm font-medium font-serif">
                      {contribution.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                      ₱{contribution.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => onRejectContribution && onRejectContribution(contribution.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition-colors border border-transparent hover:border-red-200"
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
