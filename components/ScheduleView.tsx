
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Calendar, Clock, User as UserIcon, Coins, Landmark } from 'lucide-react';

interface ScheduleViewProps {
   filterByUserId?: string; // If present, only show schedules for this user
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ filterByUserId }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const data = await dataService.getUpcomingSchedules();
        
        let filteredData = data;
        if (filterByUserId) {
           filteredData = data.filter((item) => item.borrower_id === filterByUserId);
        }
        
        setSchedules(filteredData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [filterByUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group by month
  const groupedSchedules = schedules.reduce((acc: any, curr) => {
    const monthYear = new Date(curr.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900">{filterByUserId ? 'My Repayment Schedule' : 'Schedules & Payday Deadlines'}</h1>
        <p className="text-slate-500 mt-2 font-serif italic text-xl">
           {filterByUserId ? 'Tracking your split semi-monthly (10th & 25th) obligations.' : 'Upcoming loan repayments aligned with standard payday cycles.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="bg-white p-12 rounded-sm border-2 border-dashed border-slate-200 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-serif italic text-lg">No upcoming schedules detected.</p>
            </div>
          ) : (
             Object.entries(groupedSchedules).map(([month, items]: [string, any]) => (
                <div key={month}>
                   <div className="flex items-center gap-3 mb-6">
                      <div className="px-5 py-1.5 bg-leather-900 text-paper-50 text-xs font-black uppercase tracking-[0.2em] rounded-sm shadow-md">
                         {month}
                      </div>
                      <div className="h-px bg-paper-300 flex-1"></div>
                   </div>
                   
                   <div className="space-y-6">
                      {items.map((item: any, idx: number) => {
                         const date = new Date(item.date);
                         const isPast = date < new Date();
                         const day = date.getDate();
                         const isPayday = day === 10 || day === 25;

                         return (
                            <div key={idx} className={`bg-white rounded-sm border-2 p-5 flex items-start gap-6 transition-all hover:shadow-card relative overflow-hidden group ${isPast ? 'border-paper-100 opacity-60' : isPayday ? 'border-gold-300 ring-2 ring-gold-50/50 shadow-sm' : 'border-paper-200'}`}>
                               
                               {isPayday && !isPast && (
                                  <div className="absolute top-0 right-0 bg-gold-500 text-leather-900 text-[9px] font-black px-3 py-1 uppercase tracking-widest">Payday Alignment</div>
                               )}

                               <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-sm shrink-0 border-2 ${isPast ? 'bg-slate-100 text-slate-400 border-paper-200' : isPayday ? 'bg-gold-50 text-gold-600 border-gold-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                  <span className="text-[10px] font-black uppercase tracking-tighter">{date.toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-2xl font-mono font-bold leading-none">{day}</span>
                               </div>
                               
                               <div className="flex-1 pt-1">
                                  <div className="flex items-center gap-2">
                                     <h3 className={`font-serif font-bold text-xl ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>{item.title}</h3>
                                     {isPayday && <Coins size={14} className="text-gold-500" />}
                                  </div>
                                  {!filterByUserId && (
                                     <div className="flex items-center gap-2 text-xs text-ink-400 uppercase font-black tracking-widest mt-1">
                                        <Landmark size={12} />
                                        <span>{item.borrower_name}</span>
                                     </div>
                                  )}
                               </div>
                               
                               <div className="text-right pt-1">
                                  <div className={`font-mono font-bold text-xl ${isPast ? 'text-slate-400' : 'text-emerald-700'}`}>
                                     ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-widest ${isPast ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                                     {isPast ? 'Settled / Past' : 'Installment Due'}
                                  </span>
                                </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
             ))
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
           <div className="bg-white p-8 rounded-sm border-2 border-paper-200 shadow-card">
              <h3 className="font-bold text-ink-900 mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                 <Clock size={18} className="text-blue-500" />
                 Cash Flow Horizon
              </h3>
              <div className="space-y-6">
                 <div>
                    <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Net Payable (30 Days)</span>
                    <div className="text-3xl font-mono font-bold text-ink-900 mt-1">
                       ₱{schedules
                          .filter(s => {
                             const d = new Date(s.date);
                             const now = new Date();
                             const diff = d.getTime() - now.getTime();
                             return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
                          })
                          .reduce((sum, s) => sum + s.amount, 0)
                          .toLocaleString()}
                    </div>
                 </div>
                 
                 <div className="pt-4 border-t border-paper-100">
                    <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Next Payday Entry</span>
                    {schedules.find(s => new Date(s.date) > new Date()) ? (
                       <div className="mt-2 p-3 bg-paper-50 border border-paper-200 rounded-sm">
                          <div className="text-xs font-bold text-ink-700">{schedules.find(s => new Date(s.date) > new Date()).title}</div>
                          <div className="text-lg font-mono font-bold text-gold-600 mt-1">₱{schedules.find(s => new Date(s.date) > new Date()).amount.toLocaleString()}</div>
                          <div className="text-[10px] text-ink-400 font-mono mt-1 uppercase tracking-widest">Due: {new Date(schedules.find(s => new Date(s.date) > new Date()).date).toLocaleDateString()}</div>
                       </div>
                    ) : (
                       <p className="text-xs text-ink-400 italic">No future entries.</p>
                    )}
                 </div>
              </div>
           </div>

           <div className="bg-leather-900 p-8 rounded-sm border border-leather-800 text-paper-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gold-500 opacity-5 blur-2xl rounded-full"></div>
              <h3 className="font-bold mb-3 text-gold-500 uppercase tracking-widest text-xs">Policy Note</h3>
              <p className="text-sm font-serif italic leading-relaxed opacity-80">
                 "Payments are split semi-monthly to ease member cash flow. The first 50% is due by the 10th, and the remainder by the 25th. Interest is accrued daily on the remaining ledger balance."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
