
import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { dataService } from '../services/dataService';
import AnnouncementModal from './AnnouncementModal';
import { Megaphone, Calendar, Eye, EyeOff, Plus, AlertTriangle, AlertCircle, Info, CheckCircle2, Edit2, Clock } from 'lucide-react';

interface AnnouncementHistoryProps {
  onOpenCreate: () => void;
  onEdit: (announcement: Announcement) => void;
  readOnly?: boolean; // New prop for member view
}

export const AnnouncementHistory: React.FC<AnnouncementHistoryProps> = ({ onOpenCreate, onEdit, readOnly = false }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      // If read-only (Member), only fetch active ones effectively (though we fetch all and filter for tabs)
      // Note: In a real app, API should enforce visibility. Here we filter.
      const data = await dataService.getAnnouncements();
      setAnnouncements(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
        await dataService.updateAnnouncementStatus(id, !currentStatus);
    } catch (e: any) {
        console.error("Failed to update status:", e.message);
        fetchAnnouncements();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Members only see active announcements, Admins see all based on tab
  const filteredAnnouncements = readOnly 
    ? announcements.filter(a => {
        // Filter logic for members: must be active, and if scheduled, must be currently valid
        if (!a.is_active) return false;
        const now = new Date();
        const start = a.scheduled_start ? new Date(a.scheduled_start) : null;
        if (start && start > now) return false;
        return true;
    })
    : announcements.filter(a => activeTab === 'active' ? a.is_active : !a.is_active);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: 'bg-wax-50', border: 'border-wax-200', text: 'text-wax-700', icon: <AlertTriangle size={16} /> };
      case 'high': return { bg: 'bg-gold-50', border: 'border-gold-200', text: 'text-gold-700', icon: <AlertCircle size={16} /> };
      case 'normal': return { bg: 'bg-paper-100', border: 'border-paper-300', text: 'text-ink-700', icon: <Info size={16} /> };
      case 'low': return { bg: 'bg-paper-50', border: 'border-paper-200', text: 'text-ink-400', icon: <CheckCircle2 size={16} /> };
      default: return { bg: 'bg-paper-50', border: 'border-paper-200', text: 'text-ink-400', icon: <Info size={16} /> };
    }
  };

  const getScheduleStatus = (announcement: Announcement) => {
     const now = new Date();
     const start = announcement.scheduled_start ? new Date(announcement.scheduled_start) : null;
     const end = announcement.scheduled_end ? new Date(announcement.scheduled_end) : null;

     if (!start && !end) return null;
     if (start && start > now) return <span className="text-gold-600 flex items-center gap-1"><Clock size={12}/> Scheduled</span>;
     if (end && end < now) return <span className="text-ink-400 flex items-center gap-1"><Clock size={12}/> Expired</span>;
     return <span className="text-emerald-600 flex items-center gap-1"><Clock size={12}/> Active Now</span>;
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-paper-300 pb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-ink-900">{readOnly ? 'Official Notices' : 'Registry Announcements'}</h1>
          <p className="text-ink-500 mt-2 font-serif italic text-xl">
             {readOnly ? 'Archive of official cooperative communications.' : 'Manage communications, broadcast updates, and schedule notifications.'}
          </p>
        </div>
        {!readOnly && (
           <button 
             onClick={onOpenCreate}
             className="bg-ink-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-ink-950"
           >
              <Plus size={18} />
              <span>Post New Notice</span>
           </button>
        )}
      </div>

      {/* Tabs (Only for Admins) */}
      {!readOnly && (
        <div className="flex space-x-1 bg-paper-200/50 p-1 rounded-xl w-fit border border-paper-300">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}
          >
            Active / Scheduled
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-ink-900 text-paper-50 shadow-md' : 'text-ink-400 hover:text-ink-600'}`}
          >
            Archived / Disabled
          </button>
        </div>
      )}

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {filteredAnnouncements.length === 0 ? (
            <div className="col-span-full py-20 text-center text-ink-300 flex flex-col items-center bg-paper-50 rounded-2xl border-2 border-dashed border-paper-200">
               <Megaphone size={64} className="mb-4 opacity-10" />
               <p className="font-serif italic text-xl">No notices currently posted in the registry.</p>
            </div>
         ) : (
            filteredAnnouncements.map((item, index) => {
               const style = getPriorityStyle(item.priority || 'normal');
               const scheduleLabel = getScheduleStatus(item);
               
               return (
                  <div 
                    key={item.id} 
                    onClick={() => setViewIndex(index)}
                    className={`group relative bg-paper-50 rounded-xl border-2 ${style.border} shadow-card hover:shadow-float transition-all duration-500 flex flex-col overflow-hidden cursor-pointer active:scale-[0.98]`}
                  >
                     {/* Priority Stripe */}
                     <div className={`h-1.5 w-full ${style.bg.replace('bg-', 'bg-').replace('50', '500').replace('100', '500')}`}></div>
                     
                     <div className="p-8 flex-1 flex flex-col relative">
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                           <div className="flex flex-col gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit border ${style.bg} ${style.text} ${style.border}`}>
                                 {style.icon}
                                 {item.priority || 'Normal'}
                              </span>
                              {scheduleLabel && !readOnly && <div className="text-[10px] font-black uppercase tracking-tighter ml-1">{scheduleLabel}</div>}
                           </div>

                           {!readOnly && (
                              <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 relative">
                                 <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(item);
                                    }}
                                    className="p-2 text-ink-300 hover:text-ink-900 hover:bg-paper-100 rounded-xl border border-transparent hover:border-paper-300 transition-all"
                                    title="Edit"
                                 >
                                    <Edit2 size={16} />
                                 </button>
                                 <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleStatus(item.id, item.is_active);
                                    }}
                                    className="p-2 text-ink-300 hover:text-ink-900 hover:bg-paper-100 rounded-xl border border-transparent hover:border-paper-300 transition-all"
                                    title={item.is_active ? "Archive" : "Activate"}
                                 >
                                    {item.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                              </div>
                           )}
                        </div>

                        <h3 className="text-2xl font-serif font-bold text-ink-900 mb-3 leading-tight relative z-10">{item.title}</h3>
                        <p className="text-ink-600 text-base font-serif italic leading-relaxed mb-8 line-clamp-3 relative z-10">
                           {item.message}
                        </p>

                        <div className="mt-auto pt-6 border-t border-dashed border-paper-300 flex flex-col gap-3 text-[10px] text-ink-400 font-mono relative z-10">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                 <Calendar size={14} className="text-paper-400" />
                                 <span className="uppercase tracking-tighter">{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              {!readOnly && <span className="font-black uppercase tracking-widest">{item.is_active ? 'Visible' : 'Hidden'}</span>}
                           </div>
                           
                           {/* Schedule Details if available */}
                           {!readOnly && (item.scheduled_start || item.scheduled_end) && (
                              <div className="bg-paper-100/50 p-3 rounded-xl space-y-1 border border-paper-200">
                                 {item.scheduled_start && <div className="flex justify-between"><span>Starts:</span> <span className="text-ink-600">{new Date(item.scheduled_start).toLocaleString()}</span></div>}
                                 {item.scheduled_end && <div className="flex justify-between"><span>Ends:</span> <span className="text-ink-600">{new Date(item.scheduled_end).toLocaleString()}</span></div>}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               );
            })
         )}
      </div>

      {/* Full Details Modal */}
      <AnnouncementModal 
        isOpen={viewIndex !== null}
        onClose={() => setViewIndex(null)}
        announcements={filteredAnnouncements}
        startIndex={viewIndex || 0}
      />
    </div>
  );
};
