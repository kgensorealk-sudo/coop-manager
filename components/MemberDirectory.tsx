
import React, { useState } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { Search, Shield, User as UserIcon, Wallet, Mail, Edit2, Trash2, Plus } from 'lucide-react';
import MemberModal from './MemberModal';

interface MemberDirectoryProps {
  members: User[];
  onRefresh: () => void;
  currentUserRole?: string;
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({ members, onRefresh, currentUserRole = 'admin' }) => {
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

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      await dataService.deleteMember(id);
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
          <p className="text-slate-500 mt-2">Manage and view all cooperative members.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 shadow-sm"
            />
          </div>
          
          {isAdmin && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-md shadow-blue-200 transition-transform active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => (
          <div key={member.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow group relative">
            
            {isAdmin && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(member)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Member"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteMember(member.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Member"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="relative mb-4">
              <img 
                src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`} 
                alt={member.full_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 bg-slate-200"
              />
              <div className={`absolute bottom-0 right-0 p-1.5 rounded-full border-2 border-white ${member.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                {member.role === 'admin' ? <Shield size={12} className="text-white" /> : <UserIcon size={12} className="text-white" />}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900">{member.full_name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
               <Mail size={14} />
               {member.email}
            </div>
            
            <div className="w-full space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.is_coop_member ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {member.is_coop_member ? 'Active Member' : 'Non-Member'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1"><Wallet size={14} /> Equity</span>
                <span className="font-bold text-slate-900">₱{member.equity.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="col-span-full text-center py-12 flex flex-col items-center text-slate-400">
            <UserIcon size={48} className="mb-3 opacity-20" />
            <p>No members found matching "{searchTerm}"</p>
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
