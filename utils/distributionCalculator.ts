import { User, ContributionWithMember, LoanWithBorrower, Payment } from '../types';

export interface DistributionAssumptions {
  distributionDate: Date;
  coopSharePercent: number; // e.g. 5 for 5%
  treasuryBalance: number;
}

export interface LoanProjection {
  loanId: string;
  borrowerId: string;
  currentRemainingPrincipal: number;
  paymentsMade: number;
  avgInterestPerPayment: number;
  avgPrincipalPerPayment: number;
  observedFrequencyPerMonth: number;
  projectedPaymentsCount: number;
  projectedPrincipalCollected: number;
  projectedInterestCollected: number;
  newRemainingPrincipal: number;
  onTrackToBeFullyRepaid: boolean;
}

export interface MemberDistributionRow {
  member: User;
  currentEquity: number;
  avgMonthlyContributionPace: number;
  totalHistoricalContributed: number;
  firstContributionDate: Date | null;
  projectedAdditionalContributions: number;
  projectedEquity: number;
  equitySharePercent: number;
  interestIncomeShare: number;
  grossEntitlement: number;
  outstandingLoanBalance: number;
  netPayout: number;
  contributionHistory: ContributionWithMember[];
  loanPaymentHistory: { loan: LoanWithBorrower; payments: Payment[] }[];
  flags: string[];
}

export interface DistributionResult {
  monthsRemaining: number;
  historicalInterestCollected: number;
  projectedAdditionalInterest: number;
  totalInterestPool: number;
  coopShareAmount: number;
  distributableInterestPool: number;
  totalProjectedEquity: number;
  totalOutstandingLoans: number;
  totalNetPayout: number;
  projectedTreasuryBalance: number;
  loanProjections: LoanProjection[];
  memberRows: MemberDistributionRow[];
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_MONTH);
}

function monthsSinceInclusive(from: Date, to: Date): number {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);
}

/**
 * Projects a single active loan forward to the distribution date, using the loan's
 * OWN historically observed payment pace (frequency + average interest/principal split
 * per payment) rather than assuming it gets paid off on schedule. This mirrors the
 * December 10 simulation spreadsheet's methodology.
 */
export function projectLoan(loan: LoanWithBorrower, allPayments: Payment[], today: Date, monthsRemaining: number): LoanProjection {
  const loanPayments = allPayments.filter(p => p.loan_id === loan.id);
  const paymentsMade = loanPayments.length;
  const totalInterestPaid = loanPayments.reduce((s, p) => s + p.interest_paid, 0);
  const totalPrincipalPaid = loanPayments.reduce((s, p) => s + p.principal_paid, 0);
  const avgInterestPerPayment = paymentsMade > 0 ? totalInterestPaid / paymentsMade : 0;
  const avgPrincipalPerPayment = paymentsMade > 0 ? totalPrincipalPaid / paymentsMade : 0;

  const startDate = loan.start_date ? new Date(loan.start_date) : new Date(loan.created_at);
  const monthsSinceStart = Math.max(0.1, monthsBetween(startDate, today));
  const observedFrequencyPerMonth = paymentsMade / monthsSinceStart;

  const projectedPaymentsCount = observedFrequencyPerMonth * monthsRemaining;
  const uncappedPrincipal = projectedPaymentsCount * avgPrincipalPerPayment;
  const projectedPrincipalCollected = Math.min(loan.remaining_principal, uncappedPrincipal);
  // Scale interest proportionally if principal collection was capped by the remaining balance
  const projectedInterestCollected = avgPrincipalPerPayment > 0
    ? (projectedPrincipalCollected / avgPrincipalPerPayment) * avgInterestPerPayment
    : 0;
  const newRemainingPrincipal = Math.max(0, loan.remaining_principal - projectedPrincipalCollected);

  return {
    loanId: loan.id,
    borrowerId: loan.borrower_id,
    currentRemainingPrincipal: loan.remaining_principal,
    paymentsMade,
    avgInterestPerPayment,
    avgPrincipalPerPayment,
    observedFrequencyPerMonth,
    projectedPaymentsCount,
    projectedPrincipalCollected,
    projectedInterestCollected,
    newRemainingPrincipal,
    onTrackToBeFullyRepaid: newRemainingPrincipal <= 0.01,
  };
}

/**
 * Full distribution simulation: projects each member's equity and each active loan
 * forward to `assumptions.distributionDate`, pools interest income (minus the coop's
 * held-back share), and computes each member's net payout after deducting their own
 * projected outstanding loan balance, if any.
 */
export function computeDistribution(
  members: User[],
  contributions: ContributionWithMember[],
  loans: LoanWithBorrower[],
  allPayments: Payment[],
  assumptions: DistributionAssumptions
): DistributionResult {
  const today = new Date();
  const monthsRemaining = monthsBetween(today, assumptions.distributionDate);

  const historicalInterestCollected = allPayments.reduce((s, p) => s + p.interest_paid, 0);

  const activeLoans = loans.filter(l => l.status === 'active');
  const loanProjections = activeLoans.map(l => projectLoan(l, allPayments, today, monthsRemaining));
  const projectedAdditionalInterest = loanProjections.reduce((s, lp) => s + lp.projectedInterestCollected, 0);

  const totalInterestPool = historicalInterestCollected + projectedAdditionalInterest;
  const coopShareAmount = totalInterestPool * (assumptions.coopSharePercent / 100);
  const distributableInterestPool = totalInterestPool - coopShareAmount;

  const outstandingByMember = new Map<string, number>();
  loanProjections.forEach(lp => {
    outstandingByMember.set(lp.borrowerId, (outstandingByMember.get(lp.borrowerId) || 0) + lp.newRemainingPrincipal);
  });

  const approvedContributions = contributions.filter(c => c.status === 'approved');

  const memberRowsRaw = members.map(member => {
    const memberContribs = approvedContributions.filter(c => c.member_id === member.id);
    const totalHistoricalContributed = memberContribs.reduce((s, c) => s + c.amount, 0);
    let firstContributionDate: Date | null = null;
    let avgMonthlyContributionPace = 0;
    if (memberContribs.length > 0) {
      const dates = memberContribs.map(c => new Date(c.date));
      firstContributionDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const monthsActive = monthsSinceInclusive(firstContributionDate, today);
      avgMonthlyContributionPace = totalHistoricalContributed / monthsActive;
    }
    const projectedAdditionalContributions = avgMonthlyContributionPace * monthsRemaining;
    const projectedEquity = member.equity + projectedAdditionalContributions;

    const memberLoans = loans.filter(l => l.borrower_id === member.id);
    const loanPaymentHistory = memberLoans.map(loan => ({
      loan,
      payments: allPayments.filter(p => p.loan_id === loan.id),
    })).filter(entry => entry.payments.length > 0 || entry.loan.status === 'active');

    const outstandingLoanBalance = outstandingByMember.get(member.id) || 0;

    const flags: string[] = [];
    if (member.equity === 0 && totalHistoricalContributed > 0) {
      flags.push(`Current equity is 0 but has ₱${totalHistoricalContributed.toLocaleString()} in historical approved contributions - data inconsistency, verify before distributing.`);
    }
    if (!member.is_coop_member) {
      flags.push('This person is marked as not currently a coop member.');
    }

    return {
      member,
      currentEquity: member.equity,
      avgMonthlyContributionPace,
      totalHistoricalContributed,
      firstContributionDate,
      projectedAdditionalContributions,
      projectedEquity,
      outstandingLoanBalance,
      contributionHistory: memberContribs,
      loanPaymentHistory,
      flags,
    };
  });

  const totalProjectedEquity = memberRowsRaw.reduce((s, r) => s + r.projectedEquity, 0);

  const memberRows: MemberDistributionRow[] = memberRowsRaw.map(r => {
    const equitySharePercent = totalProjectedEquity > 0 ? r.projectedEquity / totalProjectedEquity : 0;
    const interestIncomeShare = equitySharePercent * distributableInterestPool;
    const grossEntitlement = r.projectedEquity + interestIncomeShare;
    const netPayout = grossEntitlement - r.outstandingLoanBalance;
    const flags = [...r.flags];
    if (netPayout < 0) {
      flags.push(`Projected NET PAYOUT is negative - this member would owe the coop ₱${Math.abs(netPayout).toLocaleString(undefined, { maximumFractionDigits: 0 })}, not receive a payout.`);
    }
    return { ...r, equitySharePercent, interestIncomeShare, grossEntitlement, netPayout, flags };
  });

  const totalOutstandingLoans = loanProjections.reduce((s, lp) => s + lp.newRemainingPrincipal, 0);
  const totalNetPayout = memberRows.reduce((s, r) => s + r.netPayout, 0);
  const totalNewContributions = totalProjectedEquity - members.reduce((s, m) => s + m.equity, 0);
  const totalProjectedPrincipalCollected = loanProjections.reduce((s, lp) => s + lp.projectedPrincipalCollected, 0);
  const projectedTreasuryBalance = assumptions.treasuryBalance + totalNewContributions + totalProjectedPrincipalCollected + projectedAdditionalInterest;

  return {
    monthsRemaining,
    historicalInterestCollected,
    projectedAdditionalInterest,
    totalInterestPool,
    coopShareAmount,
    distributableInterestPool,
    totalProjectedEquity,
    totalOutstandingLoans,
    totalNetPayout,
    projectedTreasuryBalance,
    loanProjections,
    memberRows,
  };
}
