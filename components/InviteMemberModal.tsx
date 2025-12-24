
import React, { useState } from 'react';
import { X, Mail, Send, User, Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Role } from '../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'member' as Role
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Calls the backend function to send the email
      await dataService.inviteMember(formData.email, formData.full_name, formData.role);
      setSuccess(true);
      
      // Auto close after success
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ full_name: '', email: '', role: 'member' });
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Invite Member
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Send an official invitation email via the server.
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
           <div className="p-12 flex flex-col items-center text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Invitation Sent</h3>
              <p className="text-slate-500 mt-2">
                An email has been sent to <strong>{formData.email}</strong> with instructions to join.
              </p>
           </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
                <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jane Doe"
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
                  placeholder="jane@example.com"
                />
              </div>
            </div>

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

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                <span>Send Invite</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteMemberModal;
