
import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { dataService } from '../services/dataService';
import { Megaphone, Calendar, Trash2, Eye, EyeOff, Plus, AlertTriangle, AlertCircle, Info, CheckCircle2, Edit2, Clock } from 'lucide-react';

interface AnnouncementHistoryProps {
  onOpenCreate: () => void;
  onEdit: (announcement: Announcement) => void;
}

export const AnnouncementHistory: React.FC<AnnouncementHistoryProps> = ({ onOpenCreate, onEdit }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
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
        // Optimistic update
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
        await dataService.updateAnnouncementStatus(id, !currentStatus);
    } catch (e: any) {
        alert("Failed to update status: " + e.message);
        fetchAnnouncements(); // Revert on error
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        // Optimistic update
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        await dataService.deleteAnnouncement(id);
      } catch (e: any) {
        console.error("Delete failed:", e);
        alert("Failed to delete announcement: " + (e.message || "Unknown error"));
        fetchAnnouncements(); // Revert
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredAnnouncements = announcements.filter(a => activeTab === 'active' ? a.is_active : !a.is_active);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <AlertTriangle size={16} /> };
      case 'high': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: <AlertCircle size={16} /> };
      case 'normal': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Info size={16} /> };
      case 'low': return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: <CheckCircle2 size={16} /> };
      default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: <Info size={16} /> };
    }
  };

  const getScheduleStatus = (announcement: Announcement) => {
     const now = new Date();
     const start = announcement.scheduled_start ? new Date(announcement.scheduled_start) : null;
     const end = announcement.scheduled_end ? new Date(announcement.scheduled_end) : null;

     if (!start && !end) return null;
     if (start && start > now) return <span className="text-amber-600 flex items-center gap-1"><Clock size={12}/> Scheduled</span>;
     if (end && end < now) return <span className="text-slate-400 flex items-center gap-1"><Clock size={12}/> Expired</span>;
     return <span className="text-green-600 flex items-center gap-1"><Clock size={12}/> Active Now</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 mt-2">Manage communications, broadcast updates, and schedule notifications.</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex items-center space-x-2"
        >
           <Plus size={18} />
           <span>Post New</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Active / Scheduled
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Archived / Disabled
        </button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredAnnouncements.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center bg-white rounded-2xl border border-dashed border-slate-200">
               <Megaphone size={48} className="mb-4 opacity-20" />
               <p className="font-medium">No {activeTab} announcements found.</p>
            </div>
         ) : (
            filteredAnnouncements.map((item) => {
               const style = getPriorityStyle(item.priority || 'normal');
               const scheduleLabel = getScheduleStatus(item);
               
               return (
                  <div key={item.id} className={`group relative bg-white rounded-2xl border ${style.border} shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden`}>
                     {/* Priority Stripe */}
                     <div className={`h-1.5 w-full ${style.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                     
                     <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide w-fit ${style.bg} ${style.text}`}>
                                 {style.icon}
                                 {item.priority || 'Normal'}
                              </span>
                              {scheduleLabel && <div className="text-xs font-semibold ml-1">{scheduleLabel}</div>}
                           </div>

                           <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button 
                                 onClick={() => onEdit(item)}
                                 className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                 title="Edit"
                              >
                                 <Edit2 size={18} />
                              </button>
                              <button 
                                 onClick={() => handleToggleStatus(item.id, item.is_active)}
                                 className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                 title={item.is_active ? "Archive" : "Activate"}
                              >
                                 {item.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                              <button 
                                 onClick={() => handleDelete(item.id)}
                                 className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                 title="Delete"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{item.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                           {item.message}
                        </p>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-400">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                 <Calendar size={14} />
                                 <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                              <span>{item.is_active ? 'Visible' : 'Hidden'}</span>
                           </div>
                           
                           {/* Schedule Details if available */}
                           {(item.scheduled_start || item.scheduled_end) && (
                              <div className="bg-slate-50 p-2 rounded-lg space-y-1">
                                 {item.scheduled_start && <div>Starts: {new Date(item.scheduled_start).toLocaleString()}</div>}
                                 {item.scheduled_end && <div>Ends: {new Date(item.scheduled_end).toLocaleString()}</div>}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               );
            })
         )}
      </div>
    </div>
  );
};
