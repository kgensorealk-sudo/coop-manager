
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div 
        className="absolute inset-0 bg-leather-900/60 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      <div className={`bg-paper-50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border-4 border-double border-paper-300 relative z-10 ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        {/* Header */}
        <div className="bg-paper-100 border-b border-paper-200 p-6 flex justify-between items-start relative overflow-hidden">
          {/* Decorative background icon */}
          <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
             <Users size={120} className="text-ink-900" />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg rotate-3">
               <UserIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">
                {editingMember ? 'Revise Shareholder' : 'Register Shareholder'}
              </h2>
              <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">
                 {editingMember ? 'Update Registry Entry' : 'New Official Enrollment'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full relative z-10"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Full Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif text-lg text-ink-900"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif text-lg text-ink-900"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">System Role</label>
                <div className="relative group">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={18} />
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as Role})}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif italic text-lg text-ink-900 appearance-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Coop Status</label>
                <div className="relative group">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={18} />
                  <select 
                    value={formData.is_coop_member ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, is_coop_member: e.target.value === 'true'})}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif italic text-lg text-ink-900 appearance-none"
                  >
                    <option value="true">Coop Shareholder</option>
                    <option value="false">Associate User</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between border-t border-paper-200 mt-4 relative z-10">
             <button 
               type="button" 
               onClick={handleClose} 
               className="px-6 py-3 text-ink-400 hover:text-ink-900 font-black uppercase text-xs tracking-[0.2em] transition-colors disabled:opacity-50"
             >
               Cancel
             </button>
             <button 
               type="submit" 
               disabled={isSubmitting} 
               className={`flex items-center gap-3 px-8 py-4 font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95 border-b-4 ${
                 isSubmitting 
                   ? 'bg-paper-300 text-paper-400 border-paper-400 cursor-not-allowed' 
                   : 'bg-ink-900 hover:bg-black text-paper-50 border-black'
               }`}
             >
               {isSubmitting ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   <span>Processing...</span>
                 </>
               ) : (
                 <>
                   <CheckCircle size={16} />
                   <span>{editingMember ? 'Update Entry' : 'Enroll Shareholder'}</span>
                 </>
               )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;
