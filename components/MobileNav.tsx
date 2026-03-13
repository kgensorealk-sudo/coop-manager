
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  PiggyBank, 
  FileText, 
  LogOut, 
  Calendar, 
  Megaphone, 
  Feather, 
  Image, 
  Book
} from 'lucide-react';
import { User } from '../types';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  onLogout 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'loans', label: 'Loan Ledger', icon: FileText },
    { id: 'members', label: 'Membership', icon: Users },
    { id: 'treasury', label: 'Treasury', icon: PiggyBank },
    { id: 'announcements', label: 'Notices', icon: Megaphone },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'personal-ledger', label: 'Personal Books', icon: Book },
    { id: 'schedules', label: 'Calendar', icon: Calendar },
  ];

  const memberMenuItems = [
    { id: 'my-dashboard', label: 'My Ledger', icon: LayoutDashboard },
    { id: 'personal-ledger', label: 'Personal Books', icon: Book },
    { id: 'announcements', label: 'Notices', icon: Megaphone },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'schedules', label: 'My Calendar', icon: Calendar },
  ];

  const menuItems = isAdmin ? adminMenuItems : memberMenuItems;

  const handleTabClick = (id: string) => {
    onTabChange(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-leather-900 text-paper-50 fixed top-0 left-0 right-0 z-40 border-b border-leather-800 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-paper-100 p-1.5 rounded-sm rotate-3 border border-paper-300">
            <Feather size={18} className="text-ink-900" />
          </div>
          <span className="text-lg font-serif font-bold tracking-wide text-paper-50">The 13th Page</span>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-paper-200 hover:text-paper-50 transition-colors"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-leather-900 text-paper-200 z-50 lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-leather-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-sm bg-paper-200 border-2 border-paper-400 overflow-hidden">
                    <img 
                      src={currentUser.avatar_url || "https://picsum.photos/200"} 
                      alt={currentUser.full_name} 
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-serif font-bold text-paper-100 truncate">{currentUser.full_name}</div>
                    <div className="text-[10px] text-gold-600 uppercase tracking-widest">{currentUser.role}</div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-paper-400 hover:text-paper-50">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-6 space-y-2">
                <div className="text-[10px] font-bold text-gold-600 uppercase tracking-[0.2em] px-3 mb-4 opacity-80">
                  {isAdmin ? 'Administration' : 'Member Access'}
                </div>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center space-x-4 px-4 py-4 rounded-sm transition-all ${
                        isActive 
                          ? 'text-paper-50 bg-white/10 border-l-4 border-gold-500' 
                          : 'text-paper-400 hover:text-paper-100 hover:bg-white/5 border-l-4 border-transparent'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-gold-400' : 'text-paper-500'} />
                      <span className={`text-base tracking-wide ${isActive ? 'font-bold' : 'font-light'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-6 bg-leather-800 border-t border-white/5">
                <button 
                  onClick={onLogout}
                  className="flex items-center justify-between w-full px-4 py-4 text-xs text-paper-400 hover:text-paper-100 bg-white/5 transition-all uppercase tracking-widest font-bold rounded-sm"
                >
                  <span>Sign Out</span>
                  <LogOut size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
