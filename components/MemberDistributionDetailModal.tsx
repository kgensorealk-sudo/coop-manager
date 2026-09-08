import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberDistributionRow } from '../utils/distributionCalculator';
import { X, User as UserIcon, ShieldAlert, Coins, History, Receipt } from 'lucide-react';

interface Props {
  row: MemberDistributionRow;
  onClose: () => void;
}

const fmt = (n: number) => `₱${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const MemberDistributionDetailModal: React.FC<Props> = ({ row, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
          className="bg-paper-50 rounded-sm shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border-4 border-double border-paper-300 relative z-10"
        >
          {/* Header */}
          <div className="bg-paper-100 border-b border-paper-200 p-6 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg -rotate-3">
                <UserIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">{row.member.full_name}</h2>
                <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">Distribution Detail</p>
              </div>
            </div>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 sm:p-8 space-y-8">
            {row.flags.length > 0 && (
              <div className="space-y-2">
                {row.flags.map((flag, i) => (
                  <div key={i} className="bg-wax-50 border border-wax-200 rounded-sm p-3 flex items-start gap-2">
                    <ShieldAlert size={16} className="text-wax-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-wax-700 font-serif italic">{flag}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Payout breakdown */}
            <div>
              <h3 className="text-sm font-black uppercase text-ink-400 tracking-widest mb-3 flex items-center gap-2">
                <Coins size={14} /> Payout Breakdown
              </h3>
              <div className="bg-white border-2 border-paper-200 rounded-sm divide-y divide-paper-100">
                {[
                  ['Current Equity', fmt(row.currentEquity)],
                  ['Historical Avg. Monthly Pace', fmt(row.avgMonthlyContributionPace)],
                  ...(row.isPaceSimulated ? [['Simulated Monthly Pace (in use)', fmt(row.simulatedMonthlyContributionPace)]] : []),
                  ['Projected Additional Contributions', fmt(row.projectedAdditionalContributions)],
                  ['Projected Equity (at distribution)', fmt(row.projectedEquity)],
                  ['Equity Share %', `${(row.equitySharePercent * 100).toFixed(2)}%`],
                  ['Interest Income Share', fmt(row.interestIncomeShare)],
                  ['Gross Entitlement', fmt(row.grossEntitlement)],
                  ['Outstanding Loan Balance', row.outstandingLoanBalance > 0 ? `-${fmt(row.outstandingLoanBalance)}` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-ink-500 font-serif">{label}</span>
                    <span className="font-mono font-bold text-ink-900">{value}</span>
                  </div>
                ))}
                <div className={`flex justify-between items-center px-4 py-4 ${row.netPayout < 0 ? 'bg-wax-50' : 'bg-emerald-50'}`}>
                  <span className="text-sm font-black uppercase tracking-widest text-ink-700">Net Payout</span>
                  <span className={`font-mono font-bold text-xl ${row.netPayout < 0 ? 'text-wax-700' : 'text-emerald-700'}`}>{fmt(row.netPayout)}</span>
                </div>
              </div>
            </div>

            {/* Contribution history */}
            <div>
              <h3 className="text-sm font-black uppercase text-ink-400 tracking-widest mb-3 flex items-center gap-2">
                <History size={14} /> Contribution History ({row.contributionHistory.length})
              </h3>
              {row.contributionHistory.length === 0 ? (
                <p className="text-sm text-ink-400 font-serif italic px-1">No contributions on record.</p>
              ) : (
                <div className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-paper-100 text-[10px] font-black uppercase text-ink-400 tracking-widest">
                      <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-paper-100">
                      {row.contributionHistory.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-mono text-ink-600">{fmtDate(c.date)}</td>
                          <td className="px-4 py-2 text-ink-500 capitalize">{c.type.replace('_', ' ')}</td>
                          <td className="px-4 py-2 font-mono text-right font-bold text-emerald-700">+{fmt(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Loan payment history */}
            <div>
              <h3 className="text-sm font-black uppercase text-ink-400 tracking-widest mb-3 flex items-center gap-2">
                <Receipt size={14} /> Loan Payment History
              </h3>
              {row.loanPaymentHistory.length === 0 ? (
                <p className="text-sm text-ink-400 font-serif italic px-1">No loans on record.</p>
              ) : (
                <div className="space-y-4">
                  {row.loanPaymentHistory.map(({ loan, payments }) => (
                    <div key={loan.id} className="bg-white border-2 border-paper-200 rounded-sm overflow-hidden">
                      <div className="bg-paper-100 px-4 py-2 flex justify-between items-center">
                        <span className="text-sm font-serif font-bold text-ink-900">{loan.purpose || 'Loan'} · {fmt(loan.principal)}</span>
                        <span className="text-[10px] font-black uppercase text-ink-500 tracking-widest">{loan.status}</span>
                      </div>
                      {payments.length === 0 ? (
                        <p className="text-sm text-ink-400 font-serif italic px-4 py-3">No payments recorded yet.</p>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead className="text-[10px] font-black uppercase text-ink-400 tracking-widest">
                            <tr>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2 text-right">Principal</th>
                              <th className="px-4 py-2 text-right">Interest</th>
                              <th className="px-4 py-2 text-right">Penalty</th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-paper-100">
                            {payments.map(p => (
                              <tr key={p.id}>
                                <td className="px-4 py-2 font-mono text-ink-600">{fmtDate(p.date)}</td>
                                <td className="px-4 py-2 font-mono text-right text-ink-600">{fmt(p.principal_paid)}</td>
                                <td className="px-4 py-2 font-mono text-right text-emerald-700">{fmt(p.interest_paid)}</td>
                                <td className="px-4 py-2 font-mono text-right text-wax-600">{p.penalty_paid > 0 ? fmt(p.penalty_paid) : '—'}</td>
                                <td className="px-4 py-2 font-mono text-right font-bold text-ink-900">{fmt(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MemberDistributionDetailModal;
