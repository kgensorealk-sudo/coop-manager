
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, PersonalLedgerEntry, PersonalAccount, SavingGoal } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Loader2, 
  Search,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  ShieldCheck, 
  RefreshCw,
  Target,
  PiggyBank,
  Coins,
  History,
  LayoutGrid,
  Edit2,
  AlertCircle,
  ArrowRightLeft,
  PieChart as PieChartIcon,
  BarChart3,
  CalendarDays
} from 'lucide-react';

interface PersonalLedgerProps {
  currentUser: User;
}

export const PersonalLedger: React.FC<PersonalLedgerProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<PersonalLedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [obligations, setObligations] = useState<any[]>([]);
  
  // View State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PersonalLedgerEntry | null>(null);
  const [activeView, setActiveView] = useState<'register' | 'insights' | 'vaults'>('register');

  const PRESETS = [
    { label: 'Salary', description: 'Salary Deposit', category: 'Salary', type: 'income' },
    { label: 'Coop Loan', description: 'Coop Loan Repayment', category: 'Coop Loan', type: 'expense' },
    { label: 'Utilities', description: 'Monthly Utilities', category: 'Utilities', type: 'expense' },
    { label: 'Savings', description: 'Transfer to Savings', category: 'Savings', type: 'expense' },
    { label: 'Groceries', description: 'Grocery Shopping', category: 'Food', type: 'expense' },
  ];

  const QUICK_AMOUNTS = [500, 1000, 5000, 10000];
  const COMMON_CATEGORIES = ['Salary', 'Coop Loan', 'Utilities', 'Food', 'Savings', 'Transport', 'Medical'];

  const applyPreset = (p: any) => {
    setDescription(p.description);
    setCategory(p.category);
    setType(p.type);
    setFormError(null);
  };

  const addAmount = (val: number) => {
    const current = typeof amount === 'number' ? amount : 0;
    setAmount(current + val);
  };

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [entryData, accountData, goalData, , scheduleData] = await Promise.all([
        dataService.getPersonalEntries(currentUser.id),
        dataService.getPersonalAccounts(currentUser.id),
        dataService.getSavingGoals(currentUser.id),
        dataService.getBudgets(currentUser.id),
        dataService.getUpcomingSchedules()
      ]);
      setEntries(entryData);
      setAccounts(accountData);
      setGoals(goalData);
      setObligations(scheduleData.filter(s => s.borrower_id === currentUser.id));
      
      if (accountData.length > 0) {
        setAccountId(prev => prev || accountData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser.id]); // Removed accountId dependency by using functional update for setAccountId

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description);
      setAmount(editingEntry.amount);
      setType(editingEntry.type);
      setCategory(editingEntry.category);
      setAccountId(editingEntry.account_id || '');
      setDate(new Date(editingEntry.date).toISOString().split('T')[0]);
      setIsRecurring(editingEntry.is_recurring || false);
      setFormError(null);
      setShowForm(true);
    }
  }, [editingEntry]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setEditingEntry(null);
    setFormError(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!description || !amount || amount <= 0 || !accountId) return;

    // VALIDATION: Prevent expense greater than vault balance
    if (type === 'expense') {
      const selectedAcc = accounts.find(a => a.id === accountId);
      if (selectedAcc && amount > selectedAcc.balance) {
        setFormError(`Insufficient funds in ${selectedAcc.name}. Current balance is ₱${selectedAcc.balance.toLocaleString()}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description,
        amount: Number(amount),
        type,
        category: category || 'General',
        account_id: accountId,
        date: date,
        is_recurring: isRecurring
      };

      if (editingEntry) {
        await dataService.updatePersonalEntry(editingEntry.id, payload);
      } else {
        await dataService.addPersonalEntry({
          user_id: currentUser.id,
          ...payload
        });
      }
      
      resetForm();
      fetchAllData();
    } catch (e) {
      console.error(e);
      setFormError("A system error occurred while posting to the ledger.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await dataService.deletePersonalEntry(id);
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const current = new Date(selectedMonth + '-01');
    current.setMonth(current.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(current.toISOString().slice(0, 7));
  };

  const stats = useMemo(() => {
    const filtered = entries.filter(e => e.date.startsWith(selectedMonth));
    const income = filtered.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = filtered.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const monthlyObligations = obligations.filter(o => o.date.startsWith(selectedMonth)).reduce((sum, o) => sum + o.amount, 0);
    
    return {
      income,
      expense,
      obligations: monthlyObligations,
      balance: income - expense,
      safeToSpend: (income - expense) - monthlyObligations,
      totalAssets: accounts.reduce((sum, a) => sum + a.balance, 0)
    };
  }, [entries, selectedMonth, obligations, accounts]);

  const groupedEntries = useMemo<Record<string, PersonalLedgerEntry[]>>(() => {
    const filtered = entries.filter(e => {
      const matchesMonth = e.date.startsWith(selectedMonth);
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
      return matchesMonth && matchesSearch && matchesCategory;
    });
    const groups: Record<string, PersonalLedgerEntry[]> = {};
    filtered.forEach(e => {
      const dateKey = new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [entries, selectedMonth, searchTerm, filterCategory]);

  const allCategories = useMemo(() => {
    const cats = new Set(entries.map(e => e.category));
    return ['All', ...Array.from(cats)];
  }, [entries]);

  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Chart Data Preparation
  const categoryData = useMemo(() => {
    const filtered = entries.filter(e => e.date.startsWith(selectedMonth) && e.type === 'expense');
    const categories: Record<string, number> = {};
    filtered.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries, selectedMonth]);

  const monthlyTrendData = useMemo(() => {
    // Last 6 months
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });
      
      const monthEntries = entries.filter(e => e.date.startsWith(monthKey));
      const income = monthEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const expense = monthEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
      
      data.push({
        name: monthLabel,
        income,
        expense,
        balance: income - expense
      });
    }
    return data;
  }, [entries]);

  const COLORS = ['#141414', '#C5A028', '#4A5D23', '#7C2D12', '#1E3A8A', '#4C1D95', '#064E3B'];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header with Navigation Views */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-paper-300 pb-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-ink-900 leading-tight">Personal Books</h1>
            <p className="text-ink-500 font-serif italic text-lg md:text-xl mt-1">Refined ledger with semi-monthly Payday alignments.</p>
          </div>
          
          <div className="flex bg-paper-200/50 p-1 rounded-sm border border-paper-300 w-full md:w-fit overflow-x-auto no-scrollbar">
             {[
               { id: 'register', label: 'Journal', icon: History },
               { id: 'vaults', label: 'Vaults', icon: Coins },
               { id: 'insights', label: 'Analysis', icon: LayoutGrid }
             ].map(view => (
                <button 
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === view.id ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}
                >
                   <view.icon size={14} />
                   <span>{view.label}</span>
                </button>
             ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
           <div className="flex items-center justify-between gap-2 bg-paper-50 p-1 rounded-sm border border-paper-300 shadow-inner w-full sm:w-auto">
              <button onClick={() => handleMonthChange('prev')} className="p-3 hover:bg-paper-200 rounded-sm text-ink-600 transition-colors"><ChevronLeft size={20} /></button>
              <span className="font-serif font-bold text-ink-900 text-base md:text-lg px-2 md:px-4 flex-1 text-center">{monthLabel}</span>
              <button onClick={() => handleMonthChange('next')} className="p-3 hover:bg-paper-200 rounded-sm text-ink-600 transition-colors"><ChevronRight size={20} /></button>
           </div>
           <button 
             onClick={() => setShowForm(true)}
             className="bg-ink-900 hover:bg-black text-white px-8 py-4 sm:py-3 rounded-sm font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 border-b-4 border-ink-950 w-full sm:w-auto"
           >
              <Plus size={16} />
              <span>Record</span>
           </button>
        </div>
      </div>

      {/* Sovereign Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard index={0} title="Net Worth" value={`₱${stats.totalAssets.toLocaleString()}`} icon={ShieldCheck} trend="Across Vaults" trendUp={true} colorClass="text-ink-900" />
        <StatCard index={1} title="Safe to Spend" value={`₱${stats.safeToSpend.toLocaleString()}`} icon={Wallet} trend="After 10th/25th Dues" trendUp={stats.safeToSpend > 0} colorClass="text-emerald-700" />
        <StatCard index={2} title="Burn Rate" value={`₱${Math.round(stats.expense / 30).toLocaleString()}`} icon={TrendingDown} trend="Average Daily" colorClass="text-wax-600" />
        <StatCard index={3} title="Coop Savings" value={`₱${currentUser.equity.toLocaleString()}`} icon={PiggyBank} trend="Member Share" trendUp={true} colorClass="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* LEFT COLUMN: Vaults, Trends, Goals */}
         <div className="lg:col-span-4 space-y-8">
            
            {/* Repayment Deadlines */}
            <div className="bg-paper-50 border-2 border-paper-200 rounded-sm overflow-hidden shadow-card">
               <div className="p-4 bg-leather-900 text-paper-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Target size={16} className="text-gold-500" />
                     <h3 className="font-bold text-sm uppercase tracking-widest">Repayment Deadlines</h3>
                  </div>
                  <span className="text-[10px] font-mono text-paper-400">SEMI-MONTHLY</span>
               </div>
               <div className="p-4 space-y-3">
                  {obligations.length === 0 ? (
                     <p className="text-ink-400 italic text-sm py-4 text-center">No active payday obligations.</p>
                  ) : (
                     obligations.slice(0, 4).map((o, i) => {
                        const date = new Date(o.date);
                        const isPayday = date.getDate() === 10 || date.getDate() === 25;
                        return (
                           <div key={i} className={`flex justify-between items-center p-3 bg-white border rounded-sm group ${isPayday ? 'border-gold-300 ring-1 ring-gold-100' : 'border-paper-200'}`}>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <div className="text-xs font-bold text-ink-900 leading-tight">{o.title}</div>
                                    {isPayday && <span className="bg-gold-500 text-white text-[8px] font-black px-1 rounded-sm">PAYDAY</span>}
                                 </div>
                                 <div className="text-[10px] text-ink-400 font-mono mt-0.5">{date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                              </div>
                              <div className="text-sm font-mono font-bold text-wax-600">₱{o.amount.toLocaleString()}</div>
                           </div>
                        );
                     })
                  )}
               </div>
            </div>

            {/* Vaults (Accounts) */}
            <div className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden shadow-card">
               <div className="p-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Coins size={16} className="text-ink-600" />
                     <h3 className="font-bold text-sm uppercase tracking-widest text-ink-900">Vault Balances</h3>
                  </div>
               </div>
               <div className="p-4 space-y-3">
                  {accounts.map(acc => (
                     <div key={acc.id} className="flex justify-between items-center p-3 bg-paper-50 border border-paper-100 rounded-sm">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${acc.color || 'bg-ink-400'}`}></div>
                           <div className="text-sm font-bold text-ink-900">{acc.name}</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-ink-800 tracking-tighter">₱{acc.balance.toLocaleString()}</div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Savings Goals */}
            <div className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden shadow-card">
               <div className="p-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-900">
                     <Target size={16} />
                     <h3 className="font-bold text-sm uppercase tracking-widest">Wealth Goals</h3>
                  </div>
               </div>
               <div className="p-5 space-y-6">
                  {goals.map(goal => {
                     const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                     return (
                        <div key={goal.id}>
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-sm font-serif font-bold text-ink-800">{goal.name}</span>
                              <span className="text-[10px] font-mono font-bold text-ink-400">{pct.toFixed(0)}%</span>
                           </div>
                           <div className="h-2 w-full bg-paper-100 rounded-full overflow-hidden border border-paper-200">
                              <div className="h-full bg-ink-900 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>

         </div>

         {/* RIGHT COLUMN: Ledger */}
         <div className="lg:col-span-8 space-y-8">
            <AnimatePresence>
              {showForm && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 20 }}
                   className="fixed md:relative inset-0 md:inset-auto z-50 md:z-0 bg-paper-50 p-6 md:p-8 rounded-none md:rounded-sm border-0 md:border-2 border-leather-800/20 shadow-float overflow-y-auto"
                 >
                    <button onClick={resetForm} className="absolute top-4 right-4 md:top-6 md:right-6 text-ink-400 hover:text-ink-600 p-2"><X size={24}/></button>
                    <h3 className="font-serif font-bold text-2xl md:text-3xl text-ink-900 mb-8 md:mb-10 flex items-center gap-3">
                       <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-ink-900 flex items-center justify-center text-paper-50 text-sm md:text-base italic shadow-md">#</div>
                       {editingEntry ? 'Revise Entry' : 'Record Transaction'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                       {/* Quick Presets */}
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block">Quick Presets</label>
                          <div className="flex flex-wrap gap-2">
                             {PRESETS.map((p, i) => (
                                <button key={i} type="button" onClick={() => applyPreset(p)}
                                   className="px-3 py-1.5 bg-white border border-paper-200 rounded-sm text-[10px] font-bold uppercase tracking-widest text-ink-600 hover:border-ink-900 hover:text-ink-900 transition-all"
                                >
                                   {p.label}
                                </button>
                             ))}
                          </div>
                       </div>

                       {/* Validation Error Display */}
                       <AnimatePresence>
                         {formError && (
                            <motion.div 
                               initial={{ opacity: 0, height: 0 }}
                               animate={{ opacity: 1, height: 'auto' }}
                               exit={{ opacity: 0, height: 0 }}
                               className="bg-wax-50 border border-wax-200 p-4 rounded-sm flex items-start gap-3 overflow-hidden"
                            >
                               <AlertCircle className="text-wax-600 shrink-0 mt-0.5" size={18} />
                               <p className="text-sm text-wax-900 font-serif italic">{formError}</p>
                            </motion.div>
                         )}
                       </AnimatePresence>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                          <div className="space-y-6 md:space-y-8">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Description / Particulars</label>
                                <input autoFocus required value={description} onChange={e => { setDescription(e.target.value); setFormError(null); }}
                                   className="w-full text-2xl md:text-3xl font-serif text-ink-900 border-b-2 border-paper-300 focus:border-ink-900 outline-none pb-2 bg-transparent"
                                   placeholder="e.g. Payday Repayment (10th)"
                                />
                             </div>
                             
                             <div>
                                <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-3">Transaction Mode</label>
                                <div className="flex gap-3 md:gap-4">
                                   <button type="button" onClick={() => { setType('expense'); setFormError(null); }}
                                      className={`flex-1 py-3 md:py-4 border-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all ${type === 'expense' ? 'bg-wax-50 text-wax-600 border-wax-600 shadow-sm' : 'bg-white text-ink-400 border-paper-300'}`}>
                                      Debit (DR)
                                   </button>
                                   <button type="button" onClick={() => { setType('income'); setFormError(null); }}
                                      className={`flex-1 py-3 md:py-4 border-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all ${type === 'income' ? 'bg-emerald-50 text-emerald-700 border-emerald-600 shadow-sm' : 'bg-white text-ink-400 border-paper-300'}`}>
                                      Credit (CR)
                                   </button>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-6 md:space-y-8">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Amount (₱)</label>
                                   <input type="number" required min="0.01" step="0.01" value={amount} onChange={e => { setAmount(e.target.value ? parseFloat(e.target.value) : ''); setFormError(null); }}
                                      className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-xl md:text-2xl font-mono font-bold"
                                   />
                                   <div className="flex gap-2 mt-2">
                                      {QUICK_AMOUNTS.map(val => (
                                         <button key={val} type="button" onClick={() => addAmount(val)}
                                            className="flex-1 py-1 bg-paper-100 hover:bg-paper-200 text-[9px] font-bold text-ink-600 rounded-sm transition-colors"
                                         >
                                            +{val}
                                         </button>
                                      ))}
                                      <button type="button" onClick={() => setAmount('')}
                                         className="px-2 py-1 bg-wax-50 hover:bg-wax-100 text-[9px] font-bold text-wax-600 rounded-sm transition-colors"
                                      >
                                         CLR
                                      </button>
                                   </div>
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Effective Date</label>
                                   <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                                      className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-sm font-mono"
                                   />
                                </div>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Vault (Source)</label>
                                   <select required value={accountId} onChange={e => { setAccountId(e.target.value); setFormError(null); }}
                                      className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-sm font-serif appearance-none">
                                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (₱{a.balance.toLocaleString()})</option>)}
                                   </select>
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Category</label>
                                   <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                                      className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-sm font-serif"
                                      placeholder="e.g. Coop Loan"
                                   />
                                   <div className="flex flex-wrap gap-1.5 mt-2">
                                      {COMMON_CATEGORIES.map(cat => (
                                         <button key={cat} type="button" onClick={() => setCategory(cat)}
                                            className="px-2 py-1 bg-paper-50 hover:bg-paper-100 border border-paper-200 rounded-sm text-[8px] font-bold uppercase tracking-tighter text-ink-500 transition-colors"
                                         >
                                            {cat}
                                         </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 pt-6 border-t border-paper-300">
                          <button type="button" onClick={resetForm} className="px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-ink-400 hover:text-ink-900 order-2 sm:order-1">Cancel</button>
                          <button type="submit" disabled={isSubmitting}
                             className="px-12 py-4 bg-ink-900 text-white rounded-sm font-bold uppercase tracking-[0.3em] text-xs hover:bg-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all order-1 sm:order-2"
                          >
                             {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                             {editingEntry ? 'Revise Entry' : 'Post to Ledger'}
                          </button>
                       </div>
                    </form>
                 </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content Area */}
            {activeView === 'register' && (
               <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card flex flex-col min-h-[600px]">
                  <div className="p-5 border-b border-paper-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-paper-50/50">
                     <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64 group">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900" size={16} />
                           <input placeholder="Search Register..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none text-sm font-serif placeholder:italic"
                           />
                        </div>
                        <select 
                           value={filterCategory} 
                           onChange={e => setFilterCategory(e.target.value)}
                           className="w-full sm:w-40 p-2.5 bg-white border border-paper-300 rounded-sm text-[10px] font-bold uppercase tracking-widest text-ink-600 outline-none focus:border-ink-900"
                        >
                           {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono font-bold">
                           <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="text-emerald-700">₱{stats.income.toLocaleString()}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-wax-500"></div>
                              <span className="text-wax-600">₱{stats.expense.toLocaleString()}</span>
                           </div>
                        </div>
                        <button onClick={fetchAllData} className="p-2 text-ink-400 hover:text-ink-900 transition-colors"><RefreshCw size={20} /></button>
                     </div>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[750px] custom-scrollbar">
                     {(Object.entries(groupedEntries) as [string, PersonalLedgerEntry[]][]).map(([dateLabel, dayEntries]) => (
                        <div key={dateLabel}>
                           <div className="bg-paper-100/60 px-6 py-2 text-[10px] font-black uppercase text-ink-500 tracking-[0.4em] border-y border-paper-200 sticky top-0 backdrop-blur-sm z-10">{dateLabel}</div>
                           <div className="divide-y divide-paper-100">
                              {dayEntries.map((entry) => {
                                 const acc = accounts.find(a => a.id === entry.account_id);
                                 const entryDate = new Date(entry.date);
                                 const isPayday = entryDate.getDate() === 10 || entryDate.getDate() === 25;
                                 
                                 return (
                                    <motion.div 
                                       key={entry.id}
                                       initial={{ opacity: 0, x: -10 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ duration: 0.3 }}
                                       className={`px-4 md:px-6 py-4 md:py-5 hover:bg-paper-50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between border-l-4 gap-4 ${isPayday ? 'border-l-gold-500 bg-gold-50/20' : 'border-l-transparent hover:border-l-gold-500'}`}
                                    >
                                       <div className="flex items-center gap-4 md:gap-6">
                                          <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center shrink-0 border-2 rounded-sm rotate-1 group-hover:rotate-0 transition-transform ${entry.type === 'income' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-paper-100 border-paper-200 text-ink-400'}`}>
                                             {entry.type === 'income' ? <TrendingUp size={20} className="md:size-24" /> : <TrendingDown size={20} className="md:size-24" />}
                                          </div>
                                          <div className="overflow-hidden">
                                             <div className="flex items-center gap-2">
                                                <div className={`font-serif font-bold text-xl md:text-2xl leading-tight truncate ${entry.type === 'expense' ? 'text-ink-900' : 'text-emerald-800'}`}>{entry.description}</div>
                                                {isPayday && <span className="shrink-0 bg-gold-500 text-white text-[8px] font-black px-1 rounded-sm tracking-tighter">PAYDAY</span>}
                                             </div>
                                             <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 md:mt-2">
                                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gold-600 bg-gold-50 px-2 py-0.5 rounded-sm border border-gold-100">{entry.category}</span>
                                                {acc && (
                                                   <span className="text-[9px] md:text-[10px] font-mono text-ink-400 uppercase flex items-center gap-1">
                                                      <div className={`w-1.5 h-1.5 rounded-full ${acc.color || 'bg-ink-300'}`}></div>
                                                      {acc.name}
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                       
                                       <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-10">
                                          <div className={`font-mono font-bold text-xl md:text-2xl tabular-nums ${entry.type === 'income' ? 'text-emerald-700' : 'text-wax-600'}`}>
                                             {entry.type === 'income' ? '+' : '-'}₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </div>
                                          <div className="flex gap-1 md:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setEditingEntry(entry)} className="p-2.5 md:p-2 text-ink-400 sm:text-ink-300 hover:text-ink-900 hover:bg-paper-100 border border-paper-200 rounded-sm"><Edit2 size={16} /></button>
                                             <button onClick={() => handleDelete(entry.id)} className="p-2.5 md:p-2 text-ink-400 sm:text-ink-300 hover:text-wax-600 hover:bg-wax-50 border border-paper-200 rounded-sm"><Trash2 size={16} /></button>
                                          </div>
                                       </div>
                                    </motion.div>
                                 );
                              })}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'insights' && (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Category Breakdown */}
                     <div className="bg-white p-6 rounded-sm border-2 border-paper-200 shadow-card">
                        <div className="flex items-center gap-3 mb-8">
                           <PieChartIcon size={20} className="text-gold-600" />
                           <h3 className="font-serif font-bold text-xl text-ink-900">Expense Allocation</h3>
                        </div>
                        <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <RePieChart>
                                 <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                 >
                                    {categoryData.map((_, index) => (
                                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                 </Pie>
                                 <Tooltip 
                                    formatter={(value: any) => `₱${Number(value).toLocaleString()}`}
                                    contentStyle={{ backgroundColor: '#F5F2ED', border: '1px solid #DED9D1', fontFamily: 'serif' }}
                                 />
                              </RePieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                           {categoryData.slice(0, 6).map((cat, i) => (
                              <div key={cat.name} className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                 <span className="text-xs font-serif text-ink-600 truncate">{cat.name}</span>
                                 <span className="text-xs font-mono font-bold text-ink-900 ml-auto">₱{cat.value.toLocaleString()}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Monthly Performance */}
                     <div className="bg-white p-6 rounded-sm border-2 border-paper-200 shadow-card">
                        <div className="flex items-center gap-3 mb-8">
                           <BarChart3 size={20} className="text-emerald-700" />
                           <h3 className="font-serif font-bold text-xl text-ink-900">Cash Flow History</h3>
                        </div>
                        <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={monthlyTrendData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E3E0" />
                                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                                 <Tooltip 
                                    cursor={{ fill: '#F5F2ED' }}
                                    contentStyle={{ backgroundColor: '#F5F2ED', border: '1px solid #DED9D1', fontFamily: 'serif' }}
                                 />
                                 <Bar dataKey="income" fill="#065F46" radius={[2, 2, 0, 0]} name="Credit" />
                                 <Bar dataKey="expense" fill="#991B1B" radius={[2, 2, 0, 0]} name="Debit" />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="mt-6 flex justify-center gap-8">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-emerald-800"></div>
                              <span className="text-xs font-serif text-ink-600">Income</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-red-800"></div>
                              <span className="text-xs font-serif text-ink-600">Expenses</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Net Worth Projection / Trend */}
                  <div className="bg-white p-8 rounded-sm border-2 border-paper-200 shadow-card">
                     <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                           <TrendingUp size={20} className="text-ink-900" />
                           <h3 className="font-serif font-bold text-2xl text-ink-900">Capital Accumulation Trend</h3>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-ink-400 tracking-widest">Current Net Value</p>
                           <p className="text-3xl font-mono font-bold text-ink-900">₱{stats.totalAssets.toLocaleString()}</p>
                        </div>
                     </div>
                     <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={monthlyTrendData}>
                              <defs>
                                 <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#141414" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E3E0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                              <Tooltip 
                                 contentStyle={{ backgroundColor: '#F5F2ED', border: '1px solid #DED9D1', fontFamily: 'serif' }}
                              />
                              <Area 
                                 type="monotone" 
                                 dataKey="balance" 
                                 stroke="#141414" 
                                 strokeWidth={3}
                                 fillOpacity={1} 
                                 fill="url(#colorBalance)" 
                                 name="Monthly Surplus"
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            )}

            {activeView === 'vaults' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {accounts.map(acc => (
                     <div key={acc.id} className="bg-white rounded-sm border-2 border-paper-200 shadow-card overflow-hidden group hover:border-ink-900 transition-all">
                        <div className="p-6 bg-paper-50 border-b border-paper-200 flex justify-between items-start">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-sm flex items-center justify-center text-white shadow-md ${acc.color || 'bg-ink-900'}`}>
                                 <Coins size={24} />
                              </div>
                              <div>
                                 <h3 className="font-serif font-bold text-xl text-ink-900">{acc.name}</h3>
                                 <p className="text-[10px] font-mono text-ink-400 uppercase tracking-widest">Vault ID: {acc.id.substring(0,8)}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-ink-400 uppercase tracking-widest mb-1">Available</p>
                              <p className="text-2xl font-mono font-bold text-ink-900">₱{acc.balance.toLocaleString()}</p>
                           </div>
                        </div>
                        <div className="p-6 space-y-6">
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-ink-500 font-serif italic">Recent Activity</span>
                              <button className="text-[10px] font-bold uppercase text-gold-600 hover:text-gold-700 tracking-widest">View Full History</button>
                           </div>
                           <div className="space-y-3">
                              {entries.filter(e => e.account_id === acc.id).slice(0, 3).map(e => (
                                 <div key={e.id} className="flex justify-between items-center py-2 border-b border-paper-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-1.5 h-1.5 rounded-full ${e.type === 'income' ? 'bg-emerald-500' : 'bg-wax-500'}`}></div>
                                       <span className="text-xs font-serif text-ink-800 truncate max-w-[150px]">{e.description}</span>
                                    </div>
                                    <span className={`text-xs font-mono font-bold ${e.type === 'income' ? 'text-emerald-700' : 'text-wax-600'}`}>
                                       {e.type === 'income' ? '+' : '-'}₱{e.amount.toLocaleString()}
                                    </span>
                                 </div>
                              ))}
                              {entries.filter(e => e.account_id === acc.id).length === 0 && (
                                 <p className="text-xs text-ink-400 italic py-4 text-center">No transactions recorded in this vault.</p>
                              )}
                           </div>
                           <div className="pt-4 flex gap-3">
                              <button className="flex-1 py-3 bg-paper-100 hover:bg-paper-200 text-ink-600 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                                 <ArrowRightLeft size={14} />
                                 Transfer
                              </button>
                              <button className="flex-1 py-3 bg-paper-100 hover:bg-paper-200 text-ink-600 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                                 <CalendarDays size={14} />
                                 Schedule
                              </button>
                           </div>
                        </div>
                     </div>
                  ))}
                  
                  {/* Add New Vault Placeholder */}
                  <button className="bg-paper-50 rounded-sm border-2 border-dashed border-paper-300 p-8 flex flex-col items-center justify-center gap-4 text-ink-400 hover:text-ink-900 hover:border-ink-900 transition-all group">
                     <div className="w-12 h-12 rounded-full border-2 border-paper-300 flex items-center justify-center group-hover:bg-ink-900 group-hover:text-paper-50 transition-all">
                        <Plus size={24} />
                     </div>
                     <span className="font-serif font-bold text-lg">Establish New Vault</span>
                  </button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
