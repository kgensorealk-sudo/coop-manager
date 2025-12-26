
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { X, CheckCircle, Loader2, User as UserIcon, Mail, Shield, Users } from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingMember?: User | null;
}

const MemberModal: React.FC<MemberModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingMember 
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'member' as Role,
    is_coop_member: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation state
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      if (editingMember) {
        setFormData({
          full_name: editingMember.full_name,
          email: editingMember.email,
          role: editingMember.role,
          is_coop_member: editingMember.is_coop_member
        });
      } else {
        setFormData({
          full_name: '',
          email: '',
          role: 'member',
          is_coop_member: true
        });
      }
    }
  }, [isOpen, editingMember]);

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
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
            <p className="text-sm text-slate-500 mt-1">{editingMember ? 'Update member details.' : 'Register a new user to the system.'}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                required
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as Role})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  value={formData.is_coop_member ? 'true' : 'false'}
                  onChange={e => setFormData({...formData, is_coop_member: e.target.value === 'true'})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="true">Coop Member</option>
                  <option value="false">Non-Member</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={handleClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
             <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
               {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
               <span>{editingMember ? 'Update Member' : 'Create Member'}</span>
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;
