import React, { useState, useMemo } from 'react';
import { User, ContributionWithMember, LoanWithBorrower, Payment } from '../types';
import { computeDistribution, MemberDistributionRow } from '../utils/distributionCalculator';
import { StatCard } from './StatCard';
import MemberDistributionDetailModal from './MemberDistributionDetailModal';
import {
  Coins, PiggyBank, TrendingUp, Wallet, AlertTriangle, ChevronRight,
  Calendar, Percent, Landmark, ClipboardList, ListOrdered, ShieldAlert, Sliders
} from 'lucide-react';

interface DistributionReportProps {
  members: User[];
  contributions: ContributionWithMember[];
  loans: LoanWithBorrower[];
  allPayments: Payment[];
  treasuryBalance: number;
}

const DistributionReport: React.FC<DistributionReportProps> = ({
  members, contributions, loans, allPayments, treasuryBalance
}) => {
  const [distributionDate, setDistributionDate] = useState<string>('2026-12-10');
  const [coopSharePercent, setCoopSharePercent] = useState<number>(5);
  const [treasuryOverride, setTreasuryOverride] = useState<number>(treasuryBalance);
  const [selectedMember, setSelectedMember] = useState<MemberDistributionRow | null>(null);
  const [paceOverrides, setPaceOverrides] = useState<Record<string, number>>({});
  const [bulkPaceInput, setBulkPaceInput] = useState<string>('1000');

  const result = useMemo(() => {
    return computeDistribution(
      members.filter(m => m.is_coop_member),
      contributions,
      loans,
      allPayments,
      {
        distributionDate: new Date(distributionDate + 'T00:00:00'),
        coopSharePercent,
        treasuryBalance: treasuryOverride,
        paceOverrides,
      }
    );
  }, [members, contributions, loans, allPayments, distributionDate, coopSharePercent, treasuryOverride, paceOverrides]);

  const fmt = (n: number) => `₱${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const reconciliation = result.totalNetPayout + result.coopShareAmount - result.projectedTreasuryBalance;

  const applyBulkPaceToAll = () => {
    const val = Number(bulkPaceInput);
    if (Number.isNaN(val) || val < 0) return;
    const next: Record<string, number> = {};
    result.memberRows.forEach(r => { next[r.member.id] = val; });
    setPaceOverrides(next);
  };

  const resetAllPaces = () => setPaceOverrides({});

  const setMemberPace = (memberId: string, value: string) => {
    if (value === '') {
      setPaceOverrides(prev => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      return;
    }
    const val = Number(value);
    if (Number.isNaN(val) || val < 0) return;
    setPaceOverrides(prev => ({ ...prev, [memberId]: val }));
  };

  const resetMemberPace = (memberId: string) => {
    setPaceOverrides(prev => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  const simulationActive = Object.keys(paceOverrides).length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-serif font-bold text-ink-900 tracking-tight">Distribution Simulator</h1>
        <p className="text-ink-500 mt-2 font-serif italic text-lg opacity-80">
          Project each member's payout share ahead of a planned distribution.
        </p>
      </div>

      {/* Methodology */}
      <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-ink-900 text-gold-500 rounded-sm -rotate-3">
            <ListOrdered size={18} />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-900">How Each Member's Share Is Calculated</h2>
        </div>
        <ol className="space-y-4">
          {[
            { title: 'Project each member\'s equity forward', body: 'Each member\'s future contributions are projected at their own historical average monthly pace, from today through the distribution date.' },
            { title: 'Pool the interest income', body: 'Interest already collected, plus interest projected from active loans (each loan projected using its own observed payment pace, not an assumed payoff schedule) between now and the distribution date.' },
            { title: 'The coop takes its share first', body: `A fixed percentage of the interest pool is held back for maintenance and operations, before the remainder is split among members.` },
            { title: 'Split the remaining interest by equity share', body: 'Each member gets a share of the remaining interest pool proportional to their projected equity as a % of everyone\'s projected equity combined.' },
            { title: 'Deduct any outstanding loan balance', body: 'A member\'s own projected remaining loan balance (as of the distribution date) is subtracted from their entitlement. This can result in a negative payout if they still owe more than they\'re due.' },
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-paper-100 border-2 border-paper-300 flex items-center justify-center font-serif font-bold text-ink-700 text-sm">
                {i + 1}
              </div>
              <div>
                <p className="font-serif font-bold text-ink-900">{step.title}</p>
                <p className="text-sm text-ink-500 mt-0.5 max-w-2xl">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Assumptions */}
      <div className="bg-paper-50 rounded-sm border-2 border-paper-200 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gold-500 text-ink-900 rounded-sm rotate-2">
            <Percent size={18} />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-900">Assumptions</h2>
          <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest">Adjust and it recalculates live</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest flex items-center gap-1.5 mb-2">
              <Calendar size={12} /> Distribution Date
            </label>
            <input
              type="date"
              value={distributionDate}
              onChange={e => setDistributionDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none font-mono text-ink-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest flex items-center gap-1.5 mb-2">
              <Percent size={12} /> Coop Share (maintenance %)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={coopSharePercent}
              onChange={e => setCoopSharePercent(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none font-mono text-ink-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest flex items-center gap-1.5 mb-2">
              <Landmark size={12} /> Current Treasury Balance
            </label>
            <input
              type="number"
              value={treasuryOverride}
              onChange={e => setTreasuryOverride(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none font-mono text-ink-900"
            />
          </div>
        </div>
        <p className="text-xs text-ink-400 mt-4 font-serif italic">
          Months remaining until distribution: <span className="font-bold text-ink-700">{result.monthsRemaining.toFixed(2)}</span>
        </p>
      </div>

      {/* Simulate future contributions */}
      <div className="bg-white rounded-sm border-2 border-paper-200 shadow-card p-6 sm:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-sm -rotate-3">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-ink-900">Simulate Future Contributions</h2>
              <p className="text-xs text-ink-500 mt-0.5">By default, each member is projected at their own historical pace. Override it here to test "what if" scenarios.</p>
            </div>
          </div>
          {simulationActive && (
            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-sm tracking-widest">
              Simulation active — {Object.keys(paceOverrides).length} member{Object.keys(paceOverrides).length > 1 ? 's' : ''} overridden
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-2">Set every member to (₱/month)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 font-serif font-bold">₱</span>
              <input
                type="number"
                min={0}
                value={bulkPaceInput}
                onChange={e => setBulkPaceInput(e.target.value)}
                className="pl-7 pr-4 py-2.5 w-40 bg-white border border-paper-300 rounded-sm focus:border-ink-900 outline-none font-mono text-ink-900"
              />
            </div>
          </div>
          <button
            onClick={applyBulkPaceToAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm font-black uppercase text-xs tracking-widest transition-colors"
          >
            Apply to All
          </button>
          {simulationActive && (
            <button
              onClick={resetAllPaces}
              className="px-5 py-2.5 text-ink-500 hover:text-ink-900 hover:bg-paper-100 rounded-sm font-black uppercase text-xs tracking-widest transition-colors border border-paper-300"
            >
              Reset to Historical Pace
            </button>
          )}
          <p className="text-xs text-ink-400 font-serif italic ml-2">
            You can also override individual members directly in the table below.
          </p>
        </div>
      </div>

      {/* Detailed Reports - overview */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-600 text-white rounded-sm -rotate-2">
            <ClipboardList size={18} />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-900">Detailed Report</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard index={0} title="Total Interest Pool" value={fmt(result.totalInterestPool)} icon={TrendingUp} colorClass="text-emerald-700" />
          <StatCard index={1} title="Coop Share (held back)" value={fmt(result.coopShareAmount)} icon={PiggyBank} colorClass="text-gold-600" />
          <StatCard index={2} title="Total Projected Equity" value={fmt(result.totalProjectedEquity)} icon={Coins} colorClass="text-ink-700" />
          <StatCard index={3} title="Total Outstanding Loans" value={fmt(result.totalOutstandingLoans)} icon={Wallet} colorClass="text-wax-600" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div className="bg-ink-900 text-paper-50 rounded-sm p-6 shadow-card">
            <p className="text-[10px] font-black uppercase text-gold-500 tracking-widest mb-2">Total Net Payout to Members</p>
            <p className="text-3xl font-serif font-bold">{fmt(result.totalNetPayout)}</p>
          </div>
          <div className={`rounded-sm p-6 border-2 ${Math.abs(reconciliation) < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-wax-50 border-wax-200'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-ink-500">Projected Treasury Balance at Distribution</p>
            <p className="text-3xl font-serif font-bold text-ink-900">{fmt(result.projectedTreasuryBalance)}</p>
            <p className="text-xs mt-2 font-serif italic text-ink-500">
              {Math.abs(reconciliation) < 1
                ? 'Payouts + coop share reconcile exactly with the projected treasury balance.'
                : `Off by ${fmt(Math.abs(reconciliation))} — check your assumptions.`}
            </p>
          </div>
        </div>
      </div>

      {/* Per-member detailed report */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-wax-600 text-white rounded-sm rotate-2">
            <Wallet size={18} />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink-900">Detailed Report for Each Member</h2>
        </div>
        <div className="bg-paper-50 rounded-sm border-2 border-paper-200 shadow-card overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-paper-100 border-b border-paper-200 text-xs font-bold text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-4">Member</th>
                  <th className="px-5 py-4">Monthly Contribution</th>
                  <th className="px-5 py-4">Projected Equity</th>
                  <th className="px-5 py-4">Equity Share</th>
                  <th className="px-5 py-4">Interest Share</th>
                  <th className="px-5 py-4">Gross</th>
                  <th className="px-5 py-4">Outstanding Loan</th>
                  <th className="px-5 py-4">Net Payout</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {result.memberRows.map(row => (
                  <tr
                    key={row.member.id}
                    onClick={() => setSelectedMember(row)}
                    className={`cursor-pointer hover:bg-paper-100/60 transition-colors ${row.flags.length > 0 ? 'bg-wax-50/40' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-ink-900">{row.member.full_name}</span>
                        {row.flags.length > 0 && <ShieldAlert size={14} className="text-wax-600 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 text-xs font-serif">₱</span>
                          <input
                            type="number"
                            min={0}
                            value={paceOverrides[row.member.id] ?? Math.round(row.avgMonthlyContributionPace)}
                            onChange={e => setMemberPace(row.member.id, e.target.value)}
                            className={`pl-6 pr-2 py-1.5 w-28 border rounded-sm outline-none font-mono text-sm ${row.isPaceSimulated ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold' : 'border-paper-300 bg-white text-ink-600'}`}
                          />
                        </div>
                        {row.isPaceSimulated && (
                          <button onClick={() => resetMemberPace(row.member.id)} title="Reset to historical pace" className="text-[10px] text-ink-400 hover:text-ink-700 underline">
                            reset
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-700">{fmt(row.projectedEquity)}</td>
                    <td className="px-5 py-4 font-mono text-ink-500">{(row.equitySharePercent * 100).toFixed(1)}%</td>
                    <td className="px-5 py-4 font-mono text-emerald-700">{fmt(row.interestIncomeShare)}</td>
                    <td className="px-5 py-4 font-mono text-ink-700">{fmt(row.grossEntitlement)}</td>
                    <td className="px-5 py-4 font-mono text-wax-600">{row.outstandingLoanBalance > 0 ? `-${fmt(row.outstandingLoanBalance)}` : '—'}</td>
                    <td className={`px-5 py-4 font-mono font-bold ${row.netPayout < 0 ? 'text-wax-700' : 'text-ink-900'}`}>{fmt(row.netPayout)}</td>
                    <td className="px-5 py-4 text-right"><ChevronRight size={16} className="text-ink-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-paper-200">
            {result.memberRows.map(row => (
              <div
                key={row.member.id}
                className={`p-4 ${row.flags.length > 0 ? 'bg-wax-50/40' : ''}`}
              >
                <div onClick={() => setSelectedMember(row)} className="flex justify-between items-start cursor-pointer active:opacity-70 transition-opacity">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-ink-900">{row.member.full_name}</span>
                      {row.flags.length > 0 && <ShieldAlert size={14} className="text-wax-600" />}
                    </div>
                    <div className="text-xs text-ink-400 mt-1">{(row.equitySharePercent * 100).toFixed(1)}% equity share</div>
                  </div>
                  <div className={`font-mono font-bold text-lg ${row.netPayout < 0 ? 'text-wax-700' : 'text-ink-900'}`}>{fmt(row.netPayout)}</div>
                </div>
                <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest">Monthly:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 text-xs font-serif">₱</span>
                    <input
                      type="number"
                      min={0}
                      value={paceOverrides[row.member.id] ?? Math.round(row.avgMonthlyContributionPace)}
                      onChange={e => setMemberPace(row.member.id, e.target.value)}
                      className={`pl-6 pr-2 py-1.5 w-28 border rounded-sm outline-none font-mono text-sm ${row.isPaceSimulated ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold' : 'border-paper-300 bg-white text-ink-600'}`}
                    />
                  </div>
                  {row.isPaceSimulated && (
                    <button onClick={() => resetMemberPace(row.member.id)} className="text-[10px] text-ink-400 hover:text-ink-700 underline">reset</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {result.memberRows.some(r => r.netPayout < 0) && (
          <div className="mt-4 bg-wax-50 border border-wax-200 rounded-sm p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-wax-600 shrink-0 mt-0.5" />
            <p className="text-sm text-wax-700 font-serif italic">
              One or more members have a negative net payout — they're projected to still owe the coop money on the distribution date, not receive one. Click their row for the breakdown.
            </p>
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDistributionDetailModal row={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
};

export default DistributionReport;
