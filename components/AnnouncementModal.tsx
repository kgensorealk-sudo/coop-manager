
import React, { useState, useEffect, useRef } from 'react';
import { Announcement } from '../types';
import { X, Megaphone, Calendar, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  startIndex?: number; // New prop to start at specific index
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, announcements, startIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
      setIsClosing(false);
    }
  }, [isOpen, startIndex]);

  if (!isOpen || !announcements || announcements.length === 0) return null;

  // Safety check to ensure index is valid
  const validIndex = Math.min(Math.max(0, currentIndex), announcements.length - 1);
  const announcement = announcements[validIndex];
  
  const hasNext = validIndex < announcements.length - 1;
  const hasPrev = validIndex > 0;
  const isLast = validIndex === announcements.length - 1;

  const handleCloseAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // 300ms matches the CSS animation duration
  };

  const handleNext = () => {
    if (hasNext) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (hasPrev) setCurrentIndex(prev => prev - 1);
  };

  const handleMainAction = () => {
    if (hasNext) {
      handleNext();
    } else {
      handleCloseAnimation();
    }
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && hasNext) {
      handleNext();
    }
    if (isRightSwipe && hasPrev) {
      handlePrev();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  const getTheme = (priority: string) => {
    switch (priority) {
      case 'urgent': 
        return { 
          headerBg: 'bg-wax-600',
          headerText: 'text-paper-50',
          iconColor: 'text-paper-50',
          icon: <AlertTriangle size={90} className="opacity-10 transform rotate-12 absolute -right-4 -bottom-6" />,
          smallIcon: <AlertTriangle size={16} />,
          btnClass: 'bg-wax-600 hover:bg-wax-500 text-white'
        };
      case 'high': 
        return { 
          headerBg: 'bg-gold-500', 
          headerText: 'text-ink-900',
          iconColor: 'text-ink-900',
          icon: <AlertCircle size={90} className="opacity-10 transform rotate-12 absolute -right-4 -bottom-6" />,
          smallIcon: <AlertCircle size={16} />,
          btnClass: 'bg-gold-500 hover:bg-gold-400 text-ink-900'
        };
      case 'low': 
        return { 
          headerBg: 'bg-paper-300', 
          headerText: 'text-ink-800',
          iconColor: 'text-ink-600',
          icon: <CheckCircle2 size={90} className="opacity-10 transform rotate-12 absolute -right-4 -bottom-6" />,
          smallIcon: <CheckCircle2 size={16} />,
          btnClass: 'bg-ink-500 hover:bg-ink-400 text-white'
        };
      default: // normal
        return { 
          headerBg: 'bg-ink-800', 
          headerText: 'text-white',
          iconColor: 'text-white',
          icon: <Megaphone size={90} className="opacity-10 transform rotate-12 absolute -right-4 -bottom-6" />,
          smallIcon: <Info size={16} />,
          btnClass: 'bg-ink-800 hover:bg-ink-700 text-white'
        };
    }
  };

  const theme = getTheme(announcement.priority || 'normal');

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-leather-900/80 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div 
        className={`bg-paper-50 w-full max-w-md overflow-hidden flex flex-col relative shadow-2xl rounded-3xl border-2 border-paper-300 max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-slide-up'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Paper texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23000000\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>

        {/* Carousel Navigation (Desktop Arrows) */}
        {hasPrev && (
           <button 
             onClick={handlePrev}
             className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 hover:bg-white/40 text-ink-900 backdrop-blur-md border border-white/30 hidden md:flex transition-all hover:scale-110"
           >
              <ChevronLeft size={24} />
           </button>
        )}
        {hasNext && (
           <button 
             onClick={handleNext}
             className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 hover:bg-white/40 text-ink-900 backdrop-blur-md border border-white/30 hidden md:flex transition-all hover:scale-110"
           >
              <ChevronRight size={24} />
           </button>
        )}

        {/* Header Block */}
        <div className={`${theme.headerBg} p-8 relative overflow-hidden transition-colors duration-500 shrink-0`}>
           <div className={`transition-colors duration-500 ${theme.iconColor}`}>
             {theme.icon}
           </div>
           
           <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col pr-8">
                 <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold opacity-80 mb-2 transition-colors duration-500 ${theme.headerText}`}>
                    {theme.smallIcon}
                    <span>{announcement.priority || 'NOTICE'}</span>
                    {announcements.length > 1 && (
                      <span className="opacity-70 ml-2 border-l pl-2 border-current">
                        {validIndex + 1} / {announcements.length}
                      </span>
                    )}
                 </div>
                 <h2 className={`text-2xl font-serif font-bold ${theme.headerText} leading-tight transition-colors duration-500`}>
                    {announcement.title}
                 </h2>
              </div>
              <button 
                onClick={handleCloseAnimation}
                className={`bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors ${theme.headerText}`}
              >
                <X size={20} />
              </button>
           </div>
        </div>

        {/* Body */}
        <div className="p-8 relative bg-paper-50 flex-1 flex flex-col overflow-hidden">
           {/* Date Badge */}
           <div className="flex items-center gap-2 mb-6 text-ink-400 text-sm font-mono border-b border-paper-200 pb-3 border-dashed shrink-0">
               <Calendar size={14} />
               <span className="uppercase tracking-widest">
                 {new Date(announcement.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </span>
           </div>

           <div className="prose prose-sm text-ink-800 font-serif text-lg leading-relaxed mb-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
             <p className="whitespace-pre-line">{announcement.message}</p>
           </div>

           {/* Progress Dots */}
           {announcements.length > 1 && (
             <div className="flex justify-center gap-2 mb-6 shrink-0">
                {announcements.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all duration-300 ${idx === validIndex ? 'w-8 bg-ink-800' : 'w-2 bg-paper-300'}`}
                  />
                ))}
             </div>
           )}

           <div className="pt-2 shrink-0">
              <button 
                onClick={handleMainAction}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-sm shadow-lg transition-all transform active:scale-[0.98] ${theme.btnClass}`}
              >
                {isLast ? 'Close Notice' : 'Next Announcement'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
