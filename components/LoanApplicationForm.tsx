
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, CheckCircle, AlertCircle, DollarSign, Calendar, FileText, User as UserIcon, Loader2 } from 'lucide-react';

interface LoanApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { borrower_id: string; principal: number; duration_months: number; purpose: string }) => Promise<void>;
  members: User[];
  currentUser?: User; // Add current user prop
}

const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  members,
  currentUser
}) => {
  const [borrowerId, setBorrowerId] = useState('');
  const [principal, setPrincipal] = useState<number | ''>('');
  const [duration, setDuration] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Effect to set borrower if currentUser is a member
  useEffect(() => {
    if (isOpen && currentUser && currentUser.role === 'member') {
      setBorrowerId(currentUser.id);
    } else if (isOpen) {
      setBorrowerId(''); // Reset for admin
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!borrowerId) {
      setError('Please select a member.');
      return;
    }
    if (!principal || principal <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!duration || duration <= 0) {
      setError('Please enter a valid duration.');
      return;
    }
    if (!purpose.trim()) {
      setError('Please enter a loan purpose.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        borrower_id: borrowerId,
        principal: Number(principal),
        duration_months: Number(duration),
        purpose: purpose
      });
      // Reset form
      if (!currentUser || currentUser.role === 'admin') setBorrowerId('');
      setPrincipal('');
      setDuration('');
      setPurpose('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = !currentUser || currentUser.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">New Loan Application</h2>
            <p className="text-sm text-slate-500 mt-1">Submit a new loan request for review.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
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
              Borrower
            </label>
            {isAdmin ? (
              <select
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
                required
              >
                <option value="" disabled>Select a member...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.is_coop_member ? 'Member' : 'Non-Member'})
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
            {/* Principal Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                Amount (₱)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={16} className="text-purple-500" />
                Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value ? Math.round(Number(e.target.value)) : '')}
                  placeholder="Months"
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">months</span>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-amber-500" />
              Purpose
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="E.g., Home renovation, Business capital..."
              rows={3}
              className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 resize-none"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
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
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanApplicationForm;
