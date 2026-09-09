import React, { useState, useEffect } from 'react';
import { LoanWithBorrower, User } from '../types';
import { X, AlertCircle, Banknote, Loader2, Info } from 'lucide-react';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { loan_id: string; member_id: string; amount: number; note?: string }) => Promise<void>;
  loan: LoanWithBorrower | null;
  currentUser: User;
}

const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({ isOpen, onClose, onSubmit, loan, currentUser }) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!amount || amount <= 0) {
      setError('Enter the amount you paid.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ loan_id: loan.id, member_id: currentUser.id, amount: Number(amount), note: note.trim() || undefined });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to submit your payment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-leather-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-paper-50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border-4 border-double border-paper-300 relative z-10 animate-zoom-in">
        <div className="bg-paper-100 border-b border-paper-200 p-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg -rotate-3">
              <Banknote size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Submit a Payment</h2>
              <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">Requires Admin Confirmation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-paper-100 border border-paper-300 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-ink-400 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-600 font-serif italic">
              Let us know how much you paid (e.g. via bank transfer or GCash) for <span className="font-bold not-italic">{loan.purpose}</span>. An admin will review and confirm it against the loan.
            </p>
          </div>

          {error && (
            <div className="bg-wax-50 text-wax-700 p-4 rounded-xl text-sm flex items-start border border-wax-200">
              <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
              <span className="font-serif italic">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Amount Paid (₱)</label>
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Reference / Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. GCash ref #123456"
              className="w-full px-4 py-3 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none transition-all font-serif text-ink-900"
            />
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-paper-200">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3 text-ink-400 hover:text-ink-900 font-black uppercase text-xs tracking-[0.2em] transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-3 px-8 py-4 font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95 border-b-4 ${
                isSubmitting ? 'bg-paper-300 text-paper-400 border-paper-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800'
              }`}
            >
              {isSubmitting ? (<><Loader2 size={16} className="animate-spin" /><span>Submitting...</span></>) : (<><Banknote size={16} /><span>Submit</span></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentRequestModal;
