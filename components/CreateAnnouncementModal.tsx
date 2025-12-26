
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Megaphone, Type, AlignLeft, AlertTriangle, Clock } from 'lucide-react';
import { AnnouncementPriority, Announcement } from '../types';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, message: string, priority: AnnouncementPriority, start: string | null, end: string | null) => Promise<void>;
  editingAnnouncement?: Announcement | null;
}

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  editingAnnouncement
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation state
  const [isClosing, setIsClosing] = useState(false);

  // Load data if editing
  useEffect(() => {
    if (isOpen) {
       setIsClosing(false);
       if (editingAnnouncement) {
          setTitle(editingAnnouncement.title);
          setMessage(editingAnnouncement.message);
          setPriority(editingAnnouncement.priority);
          // Convert ISO to datetime-local string (YYYY-MM-DDTHH:mm)
          setScheduledStart(editingAnnouncement.scheduled_start ? new Date(editingAnnouncement.scheduled_start).toISOString().slice(0, 16) : '');
          setScheduledEnd(editingAnnouncement.scheduled_end ? new Date(editingAnnouncement.scheduled_end).toISOString().slice(0, 16) : '');
       } else {
          setTitle('');
          setMessage('');
          setPriority('normal');
          setScheduledStart('');
          setScheduledEnd('');
       }
    }
  }, [isOpen, editingAnnouncement]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      // Pass raw values or null if empty
      const start = scheduledStart ? new Date(scheduledStart).toISOString() : null;
      const end = scheduledEnd ? new Date(scheduledEnd).toISOString() : null;
      
      await onSubmit(title, message, priority, start, end);
      handleClose();
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const priorityOptions: { value: AnnouncementPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-600 border-red-200' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
               <Megaphone size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">{editingAnnouncement ? 'Edit Announcement' : 'Post Announcement'}</h2>
                <p className="text-sm text-slate-500 mt-1">Configure details and visibility.</p>
             </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-slate-400" />
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-3">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                    priority === option.value 
                      ? `${option.color} ring-2 ring-offset-1 ring-slate-200` 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Type size={16} className="text-slate-400" />
              Title
            </label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., System Maintenance"
              className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlignLeft size={16} className="text-slate-400" />
              Message
            </label>
            <textarea 
              required
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Enter your announcement details here..."
              className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Scheduling Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
             <div className="flex items-center gap-2 text-slate-700 mb-2">
               <Clock size={16} />
               <span className="text-sm font-bold">Scheduling (Optional)</span>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase">Start Showing</label>
                   <input 
                     type="datetime-local" 
                     value={scheduledStart}
                     onChange={e => setScheduledStart(e.target.value)}
                     className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase">Stop Showing</label>
                   <input 
                     type="datetime-local" 
                     value={scheduledEnd}
                     onChange={e => setScheduledEnd(e.target.value)}
                     className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
             </div>
             <p className="text-xs text-slate-400 italic">Leave empty to show immediately or indefinitely.</p>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{editingAnnouncement ? 'Update' : 'Post'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;
