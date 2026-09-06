
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, AlertCircle, AlertTriangle, Banknote, Loader2, ShieldAlert } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { member_id: string; amount: number; is_full_withdrawal: boolean }) => Promise<void>;
  currentUser: User;
  hasActiveLoan: boolean;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  hasActiveLoan
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const equity = currentUser.equity;

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setAmount('');
      setError('');
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const isFullWithdrawal = amount !== '' && Number(amount) >= equity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (hasActiveLoan) {
      setError('You have an active loan. Settle it in full before withdrawing your equity.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (Number(amount) > equity) {
      setError(`You can withdraw at most ₱${equity.toLocaleString()} — your current equity balance.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        member_id: currentUser.id,
        amount: Number(amount),
        is_full_withdrawal: isFullWithdrawal,
      });
      setAmount('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to submit withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className="absolute inset-0 bg-leather-900/60 backdrop-blur-sm" onClick={handleClose} />

      <div className={`bg-paper-50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border-4 border-double border-paper-300 relative z-10 ${isClosing ? 'animate-scale-out' : 'animate-zoom-in'}`}>

        {/* Header */}
        <div className="bg-paper-100 border-b border-paper-200 p-6 flex justify-between items-start relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
            <Banknote size={120} className="text-ink-900" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg -rotate-3">
              <Banknote size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Equity Withdrawal</h2>
              <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">Requires Admin Approval</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full relative z-10">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative">
          {hasActiveLoan ? (
            <div className="bg-wax-50 text-wax-700 p-5 rounded-xl text-sm flex items-start gap-3 border border-wax-200 relative z-10">
              <ShieldAlert size={22} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-serif font-bold text-base mb-1">Withdrawal Unavailable</p>
                <p className="font-serif italic">You have an active loan on record. Please settle it in full before requesting a withdrawal of your equity.</p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-wax-50 text-wax-700 p-4 rounded-xl text-sm flex items-start border border-wax-200 animate-fade-in relative z-10">
                  <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
                  <span className="font-serif italic">{error}</span>
                </div>
              )}

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between bg-paper-100 border border-paper-300 rounded-xl p-4">
                  <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest">Available Equity</span>
                  <span className="font-mono font-bold text-xl text-ink-900">₱{equity.toLocaleString()}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block">Amount to Withdraw (₱)</label>
                    <button
                      type="button"
                      onClick={() => setAmount(equity)}
                      className="text-[10px] font-black uppercase text-gold-600 hover:text-gold-700 tracking-widest underline"
                    >
                      Withdraw All
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 font-serif font-bold text-xl">₱</span>
                    <input
                      type="number"
                      min="1"
                      max={equity}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-mono text-2xl font-bold text-ink-900"
                      required
                    />
                  </div>
                </div>

                {isFullWithdrawal && (
                  <div className="bg-gold-50 text-ink-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-gold-200 animate-fade-in">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-gold-600" />
                    <span className="font-serif italic">This withdraws your entire equity balance. Once approved, your cooperative membership will end.</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-8 flex items-center justify-between border-t border-paper-200 mt-4 relative z-10">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-ink-400 hover:text-ink-900 font-black uppercase text-xs tracking-[0.2em] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {!hasActiveLoan && (
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
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Banknote size={16} />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalModal;
