
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Calendar, Clock, User as UserIcon } from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const data = await dataService.getUpcomingSchedules();
        setSchedules(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

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
        <h1 className="text-3xl font-bold text-slate-900">Schedules & Deadlines</h1>
        <p className="text-slate-500 mt-2">Upcoming loan repayments and events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-20" />
              <p>No upcoming schedules found based on active loans.</p>
            </div>
          ) : (
             Object.entries(groupedSchedules).map(([month, items]: [string, any]) => (
                <div key={month}>
                   <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-md">
                         {month}
                      </div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                   </div>
                   
                   <div className="space-y-4">
                      {items.map((item: any, idx: number) => {
                         const date = new Date(item.date);
                         const isPast = date < new Date();
                         return (
                            <div key={idx} className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-all hover:shadow-md ${isPast ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
                               <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg shrink-0 ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                                  <span className="text-xs font-bold uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-xl font-bold">{date.getDate()}</span>
                               </div>
                               
                               <div className="flex-1">
                                  <h3 className={`font-bold ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>{item.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                     <UserIcon size={14} />
                                     <span>{item.borrower_name}</span>
                                  </div>
                               </div>
                               
                               <div className="text-right">
                                  <div className={`font-mono font-bold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                                     ₱{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${isPast ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                                     {isPast ? 'Past Due' : 'Upcoming'}
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
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Clock size={18} className="text-blue-500" />
                 Next 30 Days
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Total Due</span>
                    <span className="font-bold text-slate-900">
                       ₱{schedules
                          .filter(s => {
                             const d = new Date(s.date);
                             const now = new Date();
                             const diff = d.getTime() - now.getTime();
                             return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
                          })
                          .reduce((sum, s) => sum + s.amount, 0)
                          .toLocaleString()}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Events Count</span>
                    <span className="font-bold text-slate-900">
                       {schedules.filter(s => {
                             const d = new Date(s.date);
                             const now = new Date();
                             const diff = d.getTime() - now.getTime();
                             return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
                          }).length}
                    </span>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-indigo-900">
              <h3 className="font-bold mb-2 text-sm">Note on Automation</h3>
              <p className="text-xs leading-relaxed opacity-80">
                 These schedules are automatically generated based on active loan disbursement dates and durations. Actual payment dates may vary based on member activity.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
