
import React, { useState, useEffect } from 'react';
import { User, ContributionStatus } from '../types';
import { X, CheckCircle, AlertCircle, DollarSign, Loader2, User as UserIcon } from 'lucide-react';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { member_id: string; amount: number; type: 'monthly_deposit' | 'one_time'; status: ContributionStatus }) => Promise<void>;
  members: User[];
  currentUser?: User; // Pass current user to determine flow
}

const ContributionModal: React.FC<ContributionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  members,
  currentUser
}) => {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<'monthly_deposit' | 'one_time'>('monthly_deposit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Animation state
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      if (currentUser && currentUser.role === 'member') {
        setMemberId(currentUser.id);
      } else {
        setMemberId('');
        setAmount('');
      }
    }
  }, [isOpen, currentUser]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const isAdmin = !currentUser || currentUser.role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!memberId) {
      setError('Please select a member.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        member_id: memberId,
        amount: Number(amount),
        type,
        status: isAdmin ? 'approved' : 'pending', // Admins approve immediately, Members go to pending
      });
      // Reset form
      setMemberId('');
      setAmount('');
      setType('monthly_deposit');
      handleClose();
    } catch (err) {
      console.error(err);
      setError('Failed to record contribution.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{isAdmin ? 'Log Contribution' : 'Submit Deposit'}</h2>
            <p className="text-sm text-slate-500 mt-1">
               {isAdmin ? 'Record a new deposit from a member.' : 'Notify admin of a new deposit.'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {error}
            </div>
          )}

          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <UserIcon size={16} className="text-blue-500" />
              Member
            </label>
            {isAdmin ? (
               <select
               value={memberId}
               onChange={(e) => setMemberId(e.target.value)}
               className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
               required
             >
               <option value="" disabled>Select a member...</option>
               {members
                 .filter(m => m.is_coop_member)
                 .map(member => (
                 <option key={member.id} value={member.id}>
                   {member.full_name}
                 </option>
               ))}
             </select>
            ) : (
               <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium">
                  {currentUser?.full_name} (Me)
               </div>
            )}
            
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                Amount (₱)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
              >
                <option value="monthly_deposit">Monthly Deposit</option>
                <option value="one_time">One-time / Extra</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{isAdmin ? 'Log Contribution' : 'Submit for Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributionModal;
