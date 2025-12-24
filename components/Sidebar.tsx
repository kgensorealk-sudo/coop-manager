
import React from 'react';
import { LayoutDashboard, Users, PiggyBank, FileText, LogOut, Code2, Calendar, Megaphone, PenTool } from 'lucide-react';
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
    { id: 'schedules', label: 'Calendar', icon: Calendar },
  ];

  const memberMenuItems = [
    { id: 'my-dashboard', label: 'My Ledger', icon: LayoutDashboard },
  ];

  const menuItems = isAdmin ? adminMenuItems : memberMenuItems;

  return (
    <div className="hidden lg:flex flex-col w-72 bg-leather-900 text-paper-200 h-screen fixed left-0 top-0 border-r border-leather-800 shadow-2xl z-20">
      
      {/* Brand Header */}
      <div className="p-10 pb-8 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-paper-100 p-2.5 rounded-sm shadow-md rotate-3 border border-paper-300">
            <PenTool size={22} className="text-ink-900" />
          </div>
          <div>
            <span className="text-2xl font-serif font-bold tracking-wide text-paper-50 block leading-none">The 13th Page</span>
            <span className="text-xs font-sans tracking-widest text-gold-600 uppercase mt-1 block">Cooperative Ledger</span>
          </div>
        </div>
        {/* Decorative divider */}
        <div className="mt-8 border-t border-leather-800 border-dashed w-full opacity-50"></div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-gold-600 uppercase tracking-[0.2em] px-3 mb-2 font-sans opacity-80">
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
              <span className={`text-sm tracking-wide ${isActive ? 'font-medium' : 'font-light'}`}>{item.label}</span>
            </button>
          );
        })}
        
        {isAdmin && (
          <div className="pt-8 mt-4">
            <div className="text-[10px] font-bold text-gold-600 uppercase tracking-[0.2em] px-3 mb-2 font-sans opacity-80">System</div>
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
              <span className="text-sm font-light tracking-wide">Developer Guide</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer / User */}
      <div className="p-6 bg-leather-800 border-t border-white/5">
        <div className="flex items-center space-x-3 mb-4">
          <img 
            src={currentUser.avatar_url || "https://picsum.photos/200"} 
            alt={currentUser.full_name} 
            className="w-10 h-10 rounded-full border border-gold-600/30 object-cover grayscale opacity-80"
          />
          <div className="overflow-hidden">
            <div className="text-sm font-serif font-medium text-paper-100 truncate">{currentUser.full_name}</div>
            <div className="text-[10px] text-gold-600/80 uppercase tracking-wider">{currentUser.role}</div>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-paper-400 hover:text-wax-500 transition-colors uppercase tracking-widest font-bold"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
