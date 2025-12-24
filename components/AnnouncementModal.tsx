
import React from 'react';
import { Announcement } from '../types';
import { X, Megaphone, Calendar, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, announcement }) => {
  if (!isOpen || !announcement) return null;

  const getTheme = (priority: string) => {
    switch (priority) {
      case 'urgent': 
        return { 
          gradient: 'from-red-600 to-orange-600', 
          icon: <AlertTriangle size={120} className="text-white transform rotate-6" />,
          smallIcon: <AlertTriangle size={24} />,
          badge: 'bg-red-100 text-red-600',
          btn: 'bg-red-600 hover:bg-red-700 shadow-red-200'
        };
      case 'high': 
        return { 
          gradient: 'from-orange-500 to-amber-500', 
          icon: <AlertCircle size={120} className="text-white transform rotate-6" />,
          smallIcon: <AlertCircle size={24} />,
          badge: 'bg-orange-100 text-orange-600',
          btn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
        };
      case 'low': 
        return { 
          gradient: 'from-slate-600 to-slate-500', 
          icon: <CheckCircle2 size={120} className="text-white transform rotate-6" />,
          smallIcon: <CheckCircle2 size={24} />,
          badge: 'bg-slate-100 text-slate-600',
          btn: 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'
        };
      default: 
        return { 
          gradient: 'from-blue-600 to-indigo-600', 
          icon: <Megaphone size={120} className="text-white transform -rotate-12" />,
          smallIcon: <Info size={24} />,
          badge: 'bg-blue-100 text-blue-600',
          btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
        };
    }
  };

  const theme = getTheme(announcement.priority || 'normal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative animate-slide-up">
        
        {/* Decorative Header Background */}
        <div className={`bg-gradient-to-r ${theme.gradient} h-32 relative overflow-hidden transition-colors`}>
          <div className="absolute top-0 right-0 p-4 opacity-15">
            {theme.icon}
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-black/10 hover:bg-black/20 rounded-full p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-0 -mt-12 relative">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100 flex items-center gap-4 mb-6">
             <div className={`${theme.badge} p-3 rounded-full shrink-0 transition-colors`}>
               {theme.smallIcon}
             </div>
             <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {announcement.priority === 'urgent' ? 'Important Announcement' : 'New Update'}
                </h3>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                   <Calendar size={10} />
                   <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                </div>
             </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">{announcement.title}</h2>
          
          <div className="prose prose-sm text-slate-600 leading-relaxed mb-8 max-h-60 overflow-y-auto custom-scrollbar">
            <p className="whitespace-pre-line">{announcement.message}</p>
          </div>

          <button 
            onClick={onClose}
            className={`w-full py-3 text-white rounded-xl font-medium transition-all shadow-lg ${theme.btn}`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
