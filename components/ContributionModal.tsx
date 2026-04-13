
import React, { useState, useEffect } from 'react';
import { User, ContributionStatus } from '../types';
import { X, CheckCircle, AlertCircle, DollarSign, Loader2, User as UserIcon, ChevronDown } from 'lucide-react';

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
      const timer = setTimeout(() => {
        setIsClosing(false);
        if (currentUser && currentUser.role === 'member') {
          setMemberId(currentUser.id);
        } else {
          setMemberId('');
          setAmount('');
        }
      }, 0);
      return () => clearTimeout(timer);
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
      
      // Reset form state immediately
      setMemberId('');
      setAmount('');
      setType('monthly_deposit');
      setError('');
      
      // Close the modal
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to record contribution.');
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
             <DollarSign size={120} className="text-ink-900" />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg rotate-3">
               <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">
                {isAdmin ? 'Capital Contribution' : 'Deposit Requisition'}
              </h2>
              <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">
                 {isAdmin ? 'Official Ledger Entry' : 'Submit for Treasury Audit'}
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
          
          {error && (
            <div className="bg-wax-50 text-wax-700 p-4 rounded-xl text-sm flex items-start border border-wax-200 animate-fade-in relative z-10">
              <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
              <span className="font-serif italic">{error}</span>
            </div>
          )}

          <div className="space-y-6 relative z-10">
            {/* Member Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">
                Shareholder Account
              </label>
              {isAdmin ? (
                 <div className="relative group">
                   <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-900 transition-colors" size={18} />
                   <select
                     value={memberId}
                     onChange={(e) => setMemberId(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif text-lg text-ink-900 appearance-none"
                     required
                   >
                     <option value="" disabled>Select a shareholder...</option>
                     {members
                       .filter(m => m.is_coop_member)
                       .map(member => (
                       <option key={member.id} value={member.id}>
                         {member.full_name}
                       </option>
                     ))}
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-300">
                      <ChevronDown size={18} />
                   </div>
                 </div>
              ) : (
                 <div className="w-full p-3 bg-paper-100 border border-paper-300 rounded-xl text-ink-600 font-serif italic text-lg">
                    {currentUser?.full_name} (Self)
                 </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">
                  Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 font-serif font-bold text-xl">₱</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-mono text-2xl font-bold text-ink-900"
                    required
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">
                  Capital Type
                </label>
                <div className="relative group">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif italic text-lg text-ink-900 appearance-none"
                  >
                    <option value="monthly_deposit">Monthly Deposit</option>
                    <option value="one_time">Extra / One-time</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-300">
                      <ChevronDown size={18} />
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-8 flex items-center justify-between border-t border-paper-200 mt-4 relative z-10">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>{isAdmin ? 'Log Entry' : 'Submit Requisition'}</span>
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
