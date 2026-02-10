
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Calendar, Clock, Coins, Landmark, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScheduleViewProps {
   filterByUserId?: string;
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

  const groupedSchedules = schedules.reduce((acc: any, curr) => {
    const monthYear = new Date(curr.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {});

  const totalSchedules = schedules.length;
  const paidSchedules = schedules.filter(s => s.status === 'paid').length;
  const overdueSchedules = schedules.filter(s => s.status === 'overdue').length;
  const collectionRate = totalSchedules > 0 ? (paidSchedules / totalSchedules) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900">{filterByUserId ? 'My Repayment Schedule' : 'Schedules & Payday Deadlines'}</h1>
          <p className="text-slate-500 mt-2 font-serif italic text-xl">
             {filterByUserId ? 'Tracking your split semi-monthly obligations.' : 'Upcoming loan repayments aligned with standard payday cycles.'}
          </p>
        </div>
        
        {filterByUserId && (
           <div className="bg-white px-6 py-3 rounded-sm border-2 border-paper-200 shadow-sm flex items-center gap-6">
              <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-widest text-ink-400">Paid</div>
                 <div className="text-lg font-mono font-bold text-emerald-700">{paidSchedules}</div>
              </div>
              <div className="w-px h-8 bg-paper-200"></div>
              <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-widest text-ink-400">Arrears</div>
                 <div className="text-lg font-mono font-bold text-wax-600">{overdueSchedules}</div>
              </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="bg-white p-12 rounded-sm border-2 border-dashed border-slate-200 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-serif italic text-lg">No upcoming schedules detected for your active ledger.</p>
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
                         const status = item.status || (isPast ? 'overdue' : 'upcoming');

                         return (
                            <div key={idx} className={`bg-white rounded-sm border-2 p-5 flex items-start gap-6 transition-all hover:shadow-card relative overflow-hidden group ${status === 'paid' ? 'border-emerald-100 opacity-80' : status === 'overdue' ? 'border-wax-200 ring-1 ring-wax-50' : isPayday ? 'border-gold-300 ring-2 ring-gold-50/50 shadow-sm' : 'border-paper-200'}`}>
                               
                               {status === 'paid' && (
                                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 uppercase tracking-widest flex items-center gap-1">
                                     <CheckCircle2 size={10} />
                                     Settled
                                  </div>
                               )}
                               {status === 'overdue' && (
                                  <div className="absolute top-0 right-0 bg-wax-600 text-white text-[9px] font-black px-3 py-1 uppercase tracking-widest flex items-center gap-1">
                                     <AlertCircle size={10} />
                                     Arrears
                                  </div>
                               )}
                               {status === 'upcoming' && isPayday && (
                                  <div className="absolute top-0 right-0 bg-gold-500 text-leather-900 text-[9px] font-black px-3 py-1 uppercase tracking-widest">Scheduled</div>
                               )}

                               <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-sm shrink-0 border-2 ${status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : status === 'overdue' ? 'bg-wax-50 text-wax-600 border-wax-100' : isPayday ? 'bg-gold-50 text-gold-600 border-gold-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                  <span className="text-[10px] font-black uppercase tracking-tighter">{date.toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-2xl font-mono font-bold leading-none">{day}</span>
                               </div>
                               
                               <div className="flex-1 pt-1">
                                  <div className="flex items-center gap-2">
                                     <h3 className={`font-serif font-bold text-xl ${status === 'paid' ? 'text-emerald-800' : 'text-slate-900'}`}>{item.title}</h3>
                                     {isPayday && status !== 'paid' && <Coins size={14} className="text-gold-500" />}
                                  </div>
                                  {!filterByUserId && (
                                     <div className="flex items-center gap-2 text-xs text-ink-400 uppercase font-black tracking-widest mt-1">
                                        <Landmark size={12} />
                                        <span>{item.borrower_name}</span>
                                     </div>
                                  )}
                               </div>
                               
                               <div className="text-right pt-1">
                                  <div className={`font-mono font-bold text-xl ${status === 'paid' ? 'text-emerald-600' : status === 'overdue' ? 'text-wax-600' : 'text-ink-900'}`}>
                                     ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-widest ${status === 'paid' ? 'bg-emerald-50 text-emerald-700' : status === 'overdue' ? 'bg-wax-50 text-wax-600' : 'bg-paper-100 text-ink-500'}`}>
                                     {status === 'paid' ? 'Transferred' : status === 'overdue' ? 'Action Required' : 'Planned'}
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

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-sm border-2 border-paper-200 shadow-card">
              <h3 className="font-bold text-ink-900 mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                 <Clock size={18} className="text-blue-500" />
                 Compliance Horizon
              </h3>
              <div className="space-y-6">
                 <div>
                    <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Active Arrears</span>
                    <div className={`text-3xl font-mono font-bold mt-1 ${overdueSchedules > 0 ? 'text-wax-600' : 'text-ink-900'}`}>
                       ₱{schedules
                          .filter(s => s.status === 'overdue')
                          .reduce((sum, s) => sum + s.amount, 0)
                          .toLocaleString()}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-paper-100">
                    <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Collection Rate</span>
                    <div className="mt-2 h-2 w-full bg-paper-100 rounded-full overflow-hidden border border-paper-200">
                       <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${collectionRate}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-serif italic text-ink-500">
                       <span>Efficiency Index</span>
                       <span className="font-mono font-bold">{collectionRate.toFixed(1)}%</span>
                    </div>
                 </div>
                 
                 <div className="pt-4 border-t border-paper-100">
                    <span className="text-[10px] font-black text-ink-400 uppercase tracking-widest">Next Payday Entry</span>
                    {schedules.find(s => s.status === 'upcoming') ? (
                       <div className="mt-2 p-3 bg-paper-50 border border-paper-200 rounded-sm">
                          <div className="text-xs font-bold text-ink-700">{schedules.find(s => s.status === 'upcoming').title}</div>
                          <div className="text-lg font-mono font-bold text-gold-600 mt-1">₱{schedules.find(s => s.status === 'upcoming').amount.toLocaleString()}</div>
                          <div className="text-[10px] text-ink-400 font-mono mt-1 uppercase tracking-widest">Due: {new Date(schedules.find(s => s.status === 'upcoming').date).toLocaleDateString()}</div>
                       </div>
                    ) : (
                       <p className="text-xs text-ink-400 italic">No pending schedules detected in active cycle.</p>
                    )}
                 </div>
              </div>
           </div>

           <div className="bg-leather-900 p-8 rounded-sm border border-leather-800 text-paper-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gold-500 opacity-5 blur-2xl rounded-full"></div>
              <h3 className="font-bold mb-3 text-gold-500 uppercase tracking-widest text-xs">Policy Note</h3>
              <p className="text-sm font-serif italic leading-relaxed opacity-80">
                 "First installment commences on the first available payday (10th or 25th) occurring at least 5 business days after the principal disbursement."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
