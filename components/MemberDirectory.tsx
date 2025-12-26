
import React, { useState } from 'react';
import { User, LoanWithBorrower } from '../types';
import { dataService } from '../services/dataService';
import { Search, Shield, User as UserIcon, Wallet, Mail, Edit2, Plus, CreditCard, PiggyBank } from 'lucide-react';
import MemberModal from './MemberModal';

interface MemberDirectoryProps {
  members: User[];
  loans: LoanWithBorrower[];
  onRefresh: () => void;
  currentUserRole?: string;
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({ 
  members, 
  loans, 
  onRefresh, 
  currentUserRole = 'admin' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  const filteredMembers = members.filter(member => 
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = async (data: any) => {
    await dataService.createMember(data);
    onRefresh();
  };

  const handleUpdateMember = async (data: any) => {
    if (editingMember) {
      await dataService.updateMember(editingMember.id, data);
      onRefresh();
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Member Directory</h1>
          <p className="text-slate-600 mt-2 text-lg">Manage and view all cooperative members.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 shadow-sm text-base"
            />
          </div>
          
          {isAdmin && (
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={openAddModal}
                className="flex flex-1 md:flex-auto items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-200 transition-transform active:scale-95 whitespace-nowrap text-sm"
              >
                <Plus size={18} />
                <span>Add Manually</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => {
          // FIX: Only include 'active' or 'paid' loans in the principal total. 
          // Rejected and Pending loans should not contribute to the "Loans" snapshot.
          const memberLoans = loans.filter(l => 
            l.borrower_id === member.id && 
            (l.status === 'active' || l.status === 'paid')
          );
          const totalLoanPrincipal = memberLoans.reduce((sum, l) => sum + l.principal, 0);

          return (
            <div key={member.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow group relative">
              
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => openEditModal(member)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100"
                    title="Edit Member"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}

              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-sm bg-slate-100 p-1 border border-slate-200 shadow-sm rotate-1 hover:rotate-0 transition-transform duration-300">
                  <img 
                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`} 
                    alt={member.full_name}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
                
                <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-white shadow-sm ${member.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                  {member.role === 'admin' ? <Shield size={10} className="text-white" /> : <UserIcon size={10} className="text-white" />}
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 font-serif leading-tight">{member.full_name}</h3>
                <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 font-mono mt-1">
                  <Mail size={14} />
                  <span className="truncate max-w-[180px]">{member.email}</span>
                </div>
              </div>

              <div className="w-full bg-slate-50 rounded-lg p-4 mb-5 border border-slate-100 flex items-center justify-around">
                <div className="text-center">
                  <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <CreditCard size={12} />
                    <span>Loans</span>
                  </div>
                  <div className="text-base font-mono font-bold text-ink-900">
                    ₱{totalLoanPrincipal.toLocaleString()}
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <PiggyBank size={12} />
                    <span>Equity</span>
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-700">
                    ₱{member.equity.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-base">
                  <span className="text-slate-500 font-serif italic">Membership Status</span>
                  <span className={`px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wide border ${member.is_coop_member ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                    {member.is_coop_member ? 'Member' : 'External'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="col-span-full text-center py-12 flex flex-col items-center text-slate-400">
            <UserIcon size={48} className="mb-3 opacity-20" />
            <p className="text-lg">No members found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      <MemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={editingMember ? handleUpdateMember : handleAddMember}
        editingMember={editingMember}
      />
    </div>
  );
};
