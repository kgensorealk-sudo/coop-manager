
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
  
  // Animation States
  const [isExiting, setIsExiting] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left'); // 'left' means going to next (content exits left)
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false); // New state to track if we are actively navigating

  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
      setIsClosing(false);
      setIsExiting(false);
      setSlideDirection('left');
      setIsInitialMount(true);
      setIsNavigating(false); // Reset navigation state on open to prevent auto-swipe
      
      // Reset initial mount flag after animation
      const timer = setTimeout(() => setIsInitialMount(false), 700); 
      return () => clearTimeout(timer);
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
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // 300ms matches the CSS animation duration for exit
  };

  const handleNext = () => {
    if (hasNext && !isExiting) {
      setIsExiting(true);
      setIsNavigating(true); // Explicitly mark as navigating
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsExiting(false);
      }, 300); // Match CSS animation duration
    }
  };

  const handlePrev = () => {
    if (hasPrev && !isExiting) {
      setIsExiting(true);
      setIsNavigating(true); // Explicitly mark as navigating
      setSlideDirection('right');
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsExiting(false);
      }, 300); // Match CSS animation duration
    }
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

  // Determine animation for the CARD CONTAINER (Entrance/Exit)
  const getCardAnimationClass = () => {
    if (isClosing) return 'animate-scale-out';
    if (isInitialMount) return 'animate-zoom-in'; // Switched to zoom-in for better UX
    return '';
  };

  // Determine animation for the CONTENT (Slide Left/Right)
  const getContentAnimationClass = () => {
    if (isExiting) {
      return slideDirection === 'left' ? 'animate-slide-out-left' : 'animate-slide-out-right';
    }
    // Only animate entrance if we are actively navigating (clicked next/prev), not on first load or close
    if (isNavigating && !isClosing) {
       return slideDirection === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left';
    }
    return '';
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-leather-900/80 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ animationDuration: isClosing ? '0.3s' : '0.6s' }}
    >
      
      {/* Desktop Navigation: Prev (Moved Outside) */}
      <button 
        onClick={handlePrev}
        disabled={!hasPrev || isExiting}
        className={`hidden md:flex p-3 mr-4 rounded-full bg-white/10 text-paper-50 backdrop-blur-md border border-white/20 transition-all hover:scale-110 shrink-0 z-50 ${!hasPrev ? 'opacity-0 pointer-events-none' : 'hover:bg-white/20'}`}
        aria-label="Previous Announcement"
      >
        <ChevronLeft size={32} />
      </button>

      {/* Main Card Container - Fixed Dimensions to prevent jumping */}
      <div 
        className={`bg-paper-50 w-full max-w-md h-[550px] overflow-hidden flex flex-col relative shadow-2xl rounded-3xl border-2 border-paper-300 ${getCardAnimationClass()}`}
        style={{ animationDuration: isInitialMount ? '0.6s' : '0.3s' }} // Slower initial mount
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Paper texture overlay (Static background) */}
        <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply z-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23000000\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>

        {/* Animated Content Wrapper */}
        <div className={`flex-1 flex flex-col h-full ${getContentAnimationClass()}`}>
          
          {/* Header Block */}
          <div className={`${theme.headerBg} p-8 relative overflow-hidden transition-colors duration-500 shrink-0`}>
             <div className={`transition-colors duration-500 ${theme.iconColor}`}>
               {theme.icon}
             </div>
             
             <div className="relative z-20 flex justify-between items-start">
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
                   <h2 className={`text-2xl font-serif font-bold ${theme.headerText} leading-tight transition-colors duration-500 line-clamp-3`}>
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
                  disabled={isExiting}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-sm shadow-lg transition-all transform active:scale-[0.98] ${theme.btnClass}`}
                >
                  {isLast ? 'Close Notice' : 'Next Announcement'}
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation: Next (Moved Outside) */}
      <button 
        onClick={handleNext}
        disabled={!hasNext || isExiting}
        className={`hidden md:flex p-3 ml-4 rounded-full bg-white/10 text-paper-50 backdrop-blur-md border border-white/20 transition-all hover:scale-110 shrink-0 z-50 ${!hasNext ? 'opacity-0 pointer-events-none' : 'hover:bg-white/20'}`}
        aria-label="Next Announcement"
      >
        <ChevronRight size={32} />
      </button>

    </div>
  );
};

export default AnnouncementModal;
