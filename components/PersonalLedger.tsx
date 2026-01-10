
import React, { useState, useEffect, useMemo } from 'react';
import { User, PersonalLedgerEntry, PersonalAccount, SavingGoal } from '../types';
import { dataService } from '../services/dataService';
import { StatCard } from './StatCard';
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
  AlertTriangle,
  RefreshCw,
  Target,
  PiggyBank,
  Coins,
  History,
  LayoutGrid,
  Edit2
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
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PersonalLedgerEntry | null>(null);
  const [activeView, setActiveView] = useState<'register' | 'insights' | 'vaults'>('register');

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      const [entryData, accountData, goalData, scheduleData] = await Promise.all([
        dataService.getPersonalEntries(currentUser.id),
        dataService.getPersonalAccounts(currentUser.id),
        dataService.getSavingGoals(currentUser.id),
        dataService.getUpcomingSchedules()
      ]);
      setEntries(entryData);
      setAccounts(accountData);
      setGoals(goalData);
      setObligations(scheduleData.filter(s => s.borrower_id === currentUser.id));
      
      if (accountData.length > 0 && !accountId) setAccountId(accountData[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentUser.id]);

  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description);
      setAmount(editingEntry.amount);
      setType(editingEntry.type);
      setCategory(editingEntry.category);
      setAccountId(editingEntry.account_id || '');
      setDate(new Date(editingEntry.date).toISOString().split('T')[0]);
      setIsRecurring(editingEntry.is_recurring || false);
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
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || amount <= 0 || !accountId) return;

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
      alert("Failed to save entry");
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
    const filtered = entries.filter(e => e.date.startsWith(selectedMonth) && 
      (e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const groups: Record<string, PersonalLedgerEntry[]> = {};
    filtered.forEach(e => {
      const dateKey = new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [entries, selectedMonth, searchTerm]);

  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-paper-300 pb-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-5xl font-serif font-bold text-ink-900 leading-tight">Personal Books</h1>
            <p className="text-ink-500 font-serif italic text-xl mt-1">Refined ledger with semi-monthly Payday alignments.</p>
          </div>
          
          <div className="flex bg-paper-200/50 p-1 rounded-sm border border-paper-300 w-fit">
             {[
               { id: 'register', label: 'Journal', icon: History },
               { id: 'vaults', label: 'Vaults', icon: Coins },
               { id: 'insights', label: 'Analysis', icon: LayoutGrid }
             ].map(view => (
                <button 
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${activeView === view.id ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}
                >
                   <view.icon size={14} />
                   <span>{view.label}</span>
                </button>
             ))}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex items-center gap-2 bg-paper-50 p-1 rounded-sm border border-paper-300 shadow-inner">
              <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-paper-200 rounded-sm text-ink-600 transition-colors"><ChevronLeft size={20} /></button>
              <span className="font-serif font-bold text-ink-900 text-lg px-4 min-w-[140px] text-center">{monthLabel}</span>
              <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-paper-200 rounded-sm text-ink-600 transition-colors"><ChevronRight size={20} /></button>
           </div>
           <button 
             onClick={() => setShowForm(true)}
             className="bg-ink-900 hover:bg-black text-white px-8 py-3 rounded-sm font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 flex items-center space-x-2 border-b-4 border-ink-950"
           >
              <Plus size={16} />
              <span>Record</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Net Worth" value={`₱${stats.totalAssets.toLocaleString()}`} icon={ShieldCheck} trend="Across Vaults" trendUp={true} colorClass="text-ink-900" />
        <StatCard title="Safe to Spend" value={`₱${stats.safeToSpend.toLocaleString()}`} icon={Wallet} trend="After 10th/25th Dues" trendUp={stats.safeToSpend > 0} colorClass="text-emerald-700" />
        <StatCard title="Burn Rate" value={`₱${Math.round(stats.expense / 30).toLocaleString()}`} icon={TrendingDown} trend="Average Daily" colorClass="text-wax-600" />
        <StatCard title="Coop Savings" value={`₱${currentUser.equity.toLocaleString()}`} icon={PiggyBank} trend="Member Share" trendUp={true} colorClass="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4 space-y-8">
            <div className="bg-paper-50 border-2 border-paper-200 rounded-sm overflow-hidden shadow-card">
               <div className="p-4 bg-leather-900 text-paper-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <AlertTriangle size={16} className="text-gold-500" />
                     <h3 className="font-bold text-sm uppercase tracking-widest">Repayment Deadlines</h3>
                  </div>
                  <span className="text-[10px] font-mono text-paper-400">SEMI-MONTHLY</span>
               </div>
               <div className="p-4 space-y-3">
                  {obligations.length === 0 ? (
                     <p className="text-ink-400 italic text-sm py-4 text-center">No active payday obligations.</p>
                  ) : (
                     obligations.slice(0, 4).map((o, i) => {
                        const dateObj = new Date(o.date);
                        const isPayday = dateObj.getDate() === 10 || dateObj.getDate() === 25;
                        return (
                           <div key={i} className={`flex justify-between items-center p-3 bg-white border rounded-sm group ${isPayday ? 'border-gold-300 ring-1 ring-gold-100' : 'border-paper-200'}`}>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <div className="text-xs font-bold text-ink-900 leading-tight">{o.title}</div>
                                    {isPayday && <span className="bg-gold-500 text-white text-[8px] font-black px-1 rounded-sm">PAYDAY</span>}
                                 </div>
                                 <div className="text-[10px] text-ink-400 font-mono mt-0.5">{dateObj.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                              </div>
                              <div className="text-sm font-mono font-bold text-wax-600">₱{o.amount.toLocaleString()}</div>
                           </div>
                        );
                     })
                  )}
               </div>
            </div>

            <div className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden shadow-card">
               <div className="p-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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

         <div className="lg:col-span-8 space-y-8">
            {showForm && (
               <div className="bg-paper-50 p-8 rounded-sm border-2 border-leather-800/20 shadow-float animate-slide-up relative">
                  <button onClick={resetForm} className="absolute top-6 right-6 text-ink-400 hover:text-ink-600 p-1"><X size={24}/></button>
                  <h3 className="font-serif font-bold text-3xl text-ink-900 mb-10 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center text-paper-50 text-base italic shadow-md">#</div>
                     {editingEntry ? 'Revise Entry' : 'Record Transaction'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Description / Particulars</label>
                              <input autoFocus required value={description} onChange={e => setDescription(e.target.value)}
                                 className="w-full text-3xl font-serif text-ink-900 border-b-2 border-paper-300 focus:border-ink-900 outline-none pb-2 bg-transparent"
                                 placeholder="e.g. Payday Repayment (10th)"
                              />
                           </div>
                           
                           <div>
                              <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-3">Transaction Mode</label>
                              <div className="flex gap-4">
                                 <button type="button" onClick={() => setType('expense')}
                                    className={`flex-1 py-4 border-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${type === 'expense' ? 'bg-wax-50 text-wax-600 border-wax-600 shadow-sm' : 'bg-white text-ink-400 border-paper-300'}`}>
                                    Debit (DR)
                                 </button>
                                 <button type="button" onClick={() => setType('income')}
                                    className={`flex-1 py-4 border-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${type === 'income' ? 'bg-emerald-50 text-emerald-700 border-emerald-600 shadow-sm' : 'bg-white text-ink-400 border-paper-300'}`}>
                                    Credit (CR)
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Amount (₱)</label>
                                 <input type="number" required min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                                    className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-2xl font-mono font-bold"
                                 />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Effective Date</label>
                                 <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                                    className="w-full p-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none text-sm font-mono"
                                 />
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-ink-400 tracking-[0.2em] block mb-2">Vault (Source)</label>
                                 <select required value={accountId} onChange={e => setAccountId(e.target.value)}
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
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-4 pt-6 border-t border-paper-300">
                        <button type="button" onClick={resetForm} className="px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-ink-400 hover:text-ink-900">Cancel</button>
                        <button type="submit" disabled={isSubmitting}
                           className="px-12 py-4 bg-ink-900 text-white rounded-sm font-bold uppercase tracking-[0.3em] text-xs hover:bg-black shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                        >
                           {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                           {editingEntry ? 'Revise Entry' : 'Post to Ledger'}
                        </button>
                     </div>
                  </form>
               </div>
            )}

            {activeView === 'register' && (
               <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card flex flex-col min-h-[600px]">
                  <div className="p-5 border-b border-paper-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-paper-50/50">
                     <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900" size={16} />
                        <input placeholder="Search Register..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                           className="w-full pl-10 pr-4 py-3 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none text-base font-serif placeholder:italic"
                        />
                     </div>
                     <div className="flex items-center gap-6">
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
                                 return (
                                    <div key={entry.id} className="px-6 py-5 hover:bg-paper-50 transition-colors group flex items-center justify-between border-l-4 border-l-transparent hover:border-l-gold-500">
                                       <div className="flex items-center gap-6">
                                          <div className={`w-14 h-14 flex items-center justify-center shrink-0 border-2 rounded-sm rotate-1 group-hover:rotate-0 transition-transform ${entry.type === 'income' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-paper-100 border-paper-200 text-ink-400'}`}>
                                             {entry.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                          </div>
                                          <div>
                                             <div className={`font-serif font-bold text-2xl leading-tight ${entry.type === 'expense' ? 'text-ink-900' : 'text-emerald-800'}`}>{entry.description}</div>
                                             <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gold-600 bg-gold-50 px-2 py-0.5 rounded-sm border border-gold-100">{entry.category}</span>
                                                {acc && (
                                                   <span className="text-[10px] font-mono text-ink-400 uppercase flex items-center gap-1">
                                                      <div className={`w-1.5 h-1.5 rounded-full ${acc.color || 'bg-ink-300'}`}></div>
                                                      {acc.name}
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                       
                                       <div className="flex items-center gap-10">
                                          <div className={`font-mono font-bold text-2xl tabular-nums ${entry.type === 'income' ? 'text-emerald-700' : 'text-wax-600'}`}>
                                             {entry.type === 'income' ? '+' : '-'}₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setEditingEntry(entry)} className="p-2 text-ink-300 hover:text-ink-900 hover:bg-paper-100 border border-paper-200"><Edit2 size={16} /></button>
                                             <button onClick={() => handleDelete(entry.id)} className="p-2 text-ink-300 hover:text-wax-600 hover:bg-wax-50 border border-paper-200"><Trash2 size={16} /></button>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
