
import React from 'react';
import { LayoutDashboard, Users, PiggyBank, FileText, LogOut, Briefcase, Code2, Calendar, Megaphone, PenTool } from 'lucide-react';
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
    <div className="hidden lg:flex flex-col w-64 bg-[#1C1917] text-[#D6CDBF] h-screen fixed left-0 top-0 border-r border-[#2C2420]">
      <div className="p-8">
        <div className="flex items-center space-x-3">
          <div className="bg-[#D6CDBF] p-2 rounded-md">
            <PenTool size={24} className="text-[#1C1917]" />
          </div>
          <div>
            <span className="text-xl font-serif font-bold tracking-wide text-[#F2EDE4] block leading-none">The 13th Page</span>
            <span className="text-sm font-serif italic text-[#A8A29E]">Our Shared Story</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-bold text-[#57534E] uppercase tracking-widest px-4 mb-2 font-serif">
          {isAdmin ? 'Administration' : 'Member Access'}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group border ${
                isActive 
                  ? 'bg-[#292524] text-[#F2EDE4] border-[#44403C] shadow-inner' 
                  : 'border-transparent text-[#A8A29E] hover:text-[#D6CDBF] hover:bg-[#292524]'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#F2EDE4]' : 'text-[#57534E] group-hover:text-[#D6CDBF]'} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
        
        {isAdmin && (
          <div className="pt-6 mt-6 border-t border-[#2C2420]">
            <div className="text-xs font-bold text-[#57534E] uppercase tracking-widest px-4 mb-2 font-serif">System</div>
            <button
              onClick={() => onTabChange('dev-guide')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group mb-2 border ${
                activeTab === 'dev-guide'
                  ? 'bg-[#292524] text-[#F2EDE4] border-[#44403C]' 
                  : 'border-transparent text-[#78716C] hover:text-[#D6CDBF] hover:bg-[#292524]'
              }`}
            >
              <Code2 size={18} className={activeTab === 'dev-guide' ? 'text-[#F2EDE4]' : 'text-[#57534E] group-hover:text-[#D6CDBF]'} />
              <span className="font-medium">Guide</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-[#2C2420] mt-auto">
        <button 
          onClick={onLogout}
          className="flex items-center space-x-3 px-4 py-3 text-[#A8A29E] hover:text-red-300 transition-colors w-full rounded-lg hover:bg-[#292524]"
        >
          <LogOut size={18} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
      
      {/* User Profile Snippet */}
      <div className="p-6 bg-[#0C0A09]">
        <div className="flex items-center space-x-3">
          <img 
            src={currentUser.avatar_url || "https://picsum.photos/200"} 
            alt={currentUser.full_name} 
            className="w-10 h-10 rounded-full border-2 border-[#44403C] object-cover grayscale opacity-80"
          />
          <div className="overflow-hidden">
            <div className="text-sm font-serif font-bold text-[#D6CDBF] truncate">{currentUser.full_name}</div>
            <div className="text-xs text-[#78716C] uppercase tracking-wider">{currentUser.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
