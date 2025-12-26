
import React from 'react';
import { LayoutDashboard, Users, PiggyBank, FileText, LogOut, Code2, Calendar, Megaphone, Feather, Image } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  onLogout 
}) => {
  const isAdmin = currentUser.role === 'admin';

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'loans', label: 'Loan Ledger', icon: FileText },
    { id: 'members', label: 'Membership', icon: Users },
    { id: 'treasury', label: 'Treasury', icon: PiggyBank },
    { id: 'announcements', label: 'Notices', icon: Megaphone },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'schedules', label: 'Calendar', icon: Calendar },
  ];

  const memberMenuItems = [
    { id: 'my-dashboard', label: 'My Ledger', icon: LayoutDashboard },
    { id: 'announcements', label: 'Notices', icon: Megaphone },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'schedules', label: 'My Calendar', icon: Calendar },
  ];

  const menuItems = isAdmin ? adminMenuItems : memberMenuItems;

  return (
    <div className="hidden lg:flex flex-col w-72 bg-leather-900 text-paper-200 h-screen fixed left-0 top-0 border-r border-leather-800 shadow-2xl z-20">
      
      {/* Brand Header */}
      <div className="p-10 pb-8 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-paper-100 p-2.5 rounded-sm shadow-md rotate-3 border border-paper-300">
            <Feather size={22} className="text-ink-900" />
          </div>
          <div>
            <span className="text-2xl font-serif font-bold tracking-wide text-paper-50 block leading-none">The 13th Page</span>
            <span className="text-sm font-sans tracking-widest text-gold-600 uppercase mt-1 block">Cooperative Ledger</span>
          </div>
        </div>
        {/* Decorative divider */}
        <div className="mt-8 border-t border-leather-800 border-dashed w-full opacity-50"></div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-bold text-gold-600 uppercase tracking-[0.2em] px-3 mb-2 font-sans opacity-80">
          {isAdmin ? 'Administration' : 'Member Access'}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-sm transition-all duration-300 group relative overflow-hidden ${
                isActive 
                  ? 'text-paper-50 bg-white/5' 
                  : 'text-paper-400 hover:text-paper-100 hover:bg-white/5'
              }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500 shadow-[0_0_10px_rgba(197,160,40,0.5)]"></div>
              )}
              
              <Icon size={18} strokeWidth={1.5} className={isActive ? 'text-gold-400' : 'text-paper-500 group-hover:text-paper-300 transition-colors'} />
              <span className={`text-base tracking-wide ${isActive ? 'font-medium' : 'font-light'}`}>{item.label}</span>
            </button>
          );
        })}
        
        {isAdmin && (
          <div className="pt-8 mt-4">
            <div className="text-xs font-bold text-gold-600 uppercase tracking-[0.2em] px-3 mb-2 font-sans opacity-80">System</div>
            <button
              onClick={() => onTabChange('dev-guide')}
              className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-sm transition-all duration-300 group relative ${
                activeTab === 'dev-guide'
                  ? 'text-paper-50 bg-white/5' 
                  : 'text-paper-400 hover:text-paper-100 hover:bg-white/5'
              }`}
            >
              {activeTab === 'dev-guide' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500"></div>}
              <Code2 size={18} strokeWidth={1.5} className={activeTab === 'dev-guide' ? 'text-gold-400' : 'text-paper-500 group-hover:text-paper-300'} />
              <span className="text-base font-light tracking-wide">Developer Guide</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer / User */}
      <div className="p-6 bg-leather-800 border-t border-white/5 relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
           <Feather size={64} />
        </div>

        <div className="flex items-center space-x-4 mb-4 relative z-10">
          <div className="relative">
            {/* The aesthetic frame - Vintage Photo Style */}
            <div className="w-12 h-12 rounded-sm bg-paper-200 border-2 border-paper-400 shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden relative group">
               <img 
                 src={currentUser.avatar_url || "https://picsum.photos/200"} 
                 alt={currentUser.full_name} 
                 className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 sepia-[0.3] hover:sepia-0"
               />
               {/* Shine effect overlay */}
               <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
            </div>
            
            {/* Status indicator looking like a small seal */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full border border-leather-800 shadow-sm" title="Active"></div>
          </div>

          <div className="overflow-hidden">
            <div className="text-lg font-serif font-bold text-paper-100 truncate tracking-wide">{currentUser.full_name}</div>
            <div className="flex items-center space-x-1.5 text-xs text-gold-600/90 uppercase tracking-[0.15em] font-sans font-medium">
               <span>{currentUser.role}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center justify-between w-full px-4 py-3 text-xs text-paper-400 hover:text-paper-100 hover:bg-white/5 transition-all uppercase tracking-widest font-bold border border-white/5 rounded-sm group"
        >
          <span>Sign Out</span>
          <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
