import { Transaction, Investment, Subscription, SavingsGoal, SubscriptionFrequency, Account, CreditCard, UserProfile } from '../types';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, format, differenceInCalendarDays } from 'date-fns';

export function getMonthlyAmount(amount: number, frequency: SubscriptionFrequency): number {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
  }
}

export function getMonthTransactions(transactions: Transaction[], monthStr: string) {
  const start = startOfMonth(parseISO(monthStr + '-01'));
  const end = endOfMonth(start);
  return transactions.filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start, end });
  });
}

export function getMonthIncome(transactions: Transaction[], monthStr: string): number {
  return getMonthTransactions(transactions, monthStr)
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthExpenses(transactions: Transaction[], monthStr: string): number {
  return getMonthTransactions(transactions, monthStr)
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getDayExpenses(transactions: Transaction[], dateStr: string): number {
  return transactions
    .filter(t => t.type === 'expense' && t.date === dateStr)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthSavings(transactions: Transaction[], monthStr: string): number {
  return getMonthTransactions(transactions, monthStr)
    .filter(t => t.type === 'saving')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getCategoryTotals(transactions: Transaction[], type: 'income' | 'expense' | 'saving') {
  const map: Record<string, number> = {};
  transactions.filter(t => t.type === type).forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getLast6MonthsData(transactions: Transaction[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const monthStr = format(d, 'yyyy-MM');
    const income = getMonthIncome(transactions, monthStr);
    const expenses = getMonthExpenses(transactions, monthStr);
    return {
      month: format(d, 'MMM'),
      income,
      expenses,
      savings: income - expenses,
    };
  });
}

// StashAway holdings are priced in USD; every other platform is already SGD. Without converting,
// totals here would silently undercount StashAway's contribution by ignoring the USD->SGD rate.
export function toSgdAmount(amount: number, platform: Investment['platform'], usdSgdRate?: number | null): number {
  return platform === 'StashAway' && usdSgdRate ? amount * usdSgdRate : amount;
}

export function getTotalInvestmentValue(investments: Investment[], usdSgdRate?: number | null): number {
  return investments.reduce((sum, inv) => sum + toSgdAmount(inv.units * inv.currentPrice, inv.platform, usdSgdRate), 0);
}

export function getTotalInvestmentCost(investments: Investment[], usdSgdRate?: number | null): number {
  return investments.reduce((sum, inv) => sum + toSgdAmount(inv.units * inv.buyPrice, inv.platform, usdSgdRate), 0);
}

export function getInvestmentReturn(investments: Investment[], usdSgdRate?: number | null): number {
  const cost = getTotalInvestmentCost(investments, usdSgdRate);
  const value = getTotalInvestmentValue(investments, usdSgdRate);
  return cost > 0 ? ((value - cost) / cost) * 100 : 0;
}

export function getAccountBalance(account: Account, transactions: Transaction[]): number {
  const delta = transactions.reduce((sum, t) => {
    if (t.accountId === account.id) return sum + (t.type === 'income' ? t.amount : -t.amount);
    if (t.type === 'transfer' && t.toAccountId === account.id) return sum + t.amount;
    return sum;
  }, 0);
  return account.openingBalance + delta;
}

export function getTotalAccountBalances(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, a) => sum + getAccountBalance(a, transactions), 0);
}

// currentBalance is the available credit remaining, manually maintained by the user (mirrors
// Account.openingBalance but isn't derived from transactions) — so owed/spent is always exactly
// limit minus currentBalance, kept in sync purely by editing the card.
export function getCreditCardOwed(card: CreditCard): number {
  return Math.max(0, card.limit - card.currentBalance);
}

// Older saved profiles stored allocation targets as { savingsPct, expensesPct, investmentsPct };
// newer ones key directly by bucket name (e.g. { savings, expenses, investments, giving }).
export function normalizeAllocationTargets(targets?: Record<string, number>): Record<string, number> {
  if (!targets) return {};
  const map: Record<string, number> = { ...targets };
  const legacyKeys: [string, string][] = [['savingsPct', 'savings'], ['expensesPct', 'expenses'], ['investmentsPct', 'investments']];
  legacyKeys.forEach(([oldKey, newKey]) => {
    if (oldKey in map) {
      map[newKey] = map[oldKey];
      delete map[oldKey];
    }
  });
  return map;
}

export type ProfileCompletion = 'complete' | 'partial' | 'incomplete';

export function getProfileCompletion(profile: UserProfile): ProfileCompletion {
  const filled = [profile.residencyStatus, profile.allocationTargets].filter(Boolean).length;
  if (filled === 2) return 'complete';
  if (filled === 1) return 'partial';
  return 'incomplete';
}

export function getMonthlySubscriptionTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + getMonthlyAmount(s.amount, s.frequency), 0);
}

export function getYearlySubscriptionTotal(subscriptions: Subscription[]): number {
  return getMonthlySubscriptionTotal(subscriptions) * 12;
}

export function calculateGoalProgress(goal: SavingsGoal): number {
  return goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0;
}

export function calculateMonthsToGoal(goal: SavingsGoal): number {
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return Infinity;
  const remaining = goal.targetAmount - goal.currentAmount;
  return remaining <= 0 ? 0 : Math.ceil(remaining / goal.monthlyContribution);
}

export function projectNetWorth(
  currentNetWorth: number,
  monthlyContribution: number,
  annualReturnRate: number,
  years: number,
  annualInflationRate = 0
): { year: number; value: number; realValue: number }[] {
  const monthlyRate = annualReturnRate / 100 / 12;
  const points = [];
  let value = currentNetWorth;
  for (let y = 0; y <= years; y++) {
    // realValue expresses the projection in today's purchasing power, i.e. discounted by inflation.
    const realValue = value / Math.pow(1 + annualInflationRate / 100, y);
    points.push({ year: new Date().getFullYear() + y, value: Math.round(value), realValue: Math.round(realValue) });
    for (let m = 0; m < 12; m++) {
      value = value * (1 + monthlyRate) + monthlyContribution;
    }
  }
  return points;
}

export function calculateFIRE(
  currentSavings: number,
  annualExpenses: number,
  monthlyContribution: number,
  annualReturn: number
): { years: number; targetAmount: number } {
  const targetAmount = annualExpenses * 25; // 4% withdrawal rule
  const monthlyRate = annualReturn / 100 / 12;
  let savings = currentSavings;
  let months = 0;
  while (savings < targetAmount && months < 600) {
    savings = savings * (1 + monthlyRate) + monthlyContribution;
    months++;
  }
  return { years: Math.ceil(months / 12), targetAmount };
}

// Same forward-simulation as calculateFIRE, but against an arbitrary dollar target
// (e.g. a manually-set retirement target) instead of the 25x-expenses FIRE number.
export function yearsToReachTarget(
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  targetAmount: number
): number | null {
  if (targetAmount <= 0) return null;
  if (currentValue >= targetAmount) return 0;
  const monthlyRate = annualReturn / 100 / 12;
  let value = currentValue;
  let months = 0;
  while (value < targetAmount && months < 600) {
    value = value * (1 + monthlyRate) + monthlyContribution;
    months++;
  }
  return months >= 600 ? null : Math.ceil(months / 12);
}

// Simple CAGR from purchase date to today. Annualizing a position held under a month
// would extrapolate noise into a wild yearly figure, so those are left out by callers.
export function getAnnualizedReturn(investment: Investment): number {
  const days = differenceInCalendarDays(new Date(), parseISO(investment.purchaseDate));
  if (investment.buyPrice <= 0 || days < 30) return 0;
  const totalReturnMultiple = investment.currentPrice / investment.buyPrice;
  if (totalReturnMultiple <= 0) return -100;
  return (Math.pow(totalReturnMultiple, 365 / days) - 1) * 100;
}

export function predictNextMonthSpending(transactions: Transaction[]): number {
  const now = new Date();
  const monthTotals = Array.from({ length: 3 }, (_, i) => {
    const monthStr = format(subMonths(now, i + 1), 'yyyy-MM');
    return getMonthExpenses(transactions, monthStr);
  }).filter(v => v > 0);
  if (monthTotals.length === 0) return 0;
  // Weighted average: most recent month has highest weight
  const weights = [0.5, 0.3, 0.2];
  return monthTotals.reduce((sum, val, i) => sum + val * (weights[i] || 0.1), 0);
}

export function getSpendingInsights(transactions: Transaction[]): string[] {
  const insights: string[] = [];
  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

  const thisExpenses = getMonthExpenses(transactions, thisMonth);
  const lastExpenses = getMonthExpenses(transactions, lastMonth);

  if (lastExpenses > 0) {
    const change = ((thisExpenses - lastExpenses) / lastExpenses) * 100;
    if (change > 20) {
      insights.push(`Spending is up ${change.toFixed(0)}% vs last month — review your recent purchases.`);
    } else if (change < -10) {
      insights.push(`Great job! Spending is down ${Math.abs(change).toFixed(0)}% compared to last month.`);
    }
  }

  const thisCategories = getCategoryTotals(
    getMonthTransactions(transactions, thisMonth), 'expense'
  );
  if (thisCategories.length > 0) {
    const top = thisCategories[0];
    insights.push(`Your top expense category this month is ${top.name} at $${top.value.toFixed(0)}.`);
  }

  const predicted = predictNextMonthSpending(transactions);
  if (predicted > 0) {
    insights.push(`Based on your history, next month's expenses are projected around $${predicted.toFixed(0)}.`);
  }

  return insights;
}
