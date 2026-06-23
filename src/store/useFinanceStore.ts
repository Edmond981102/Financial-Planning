import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, Subscription, SavingsGoal, MonthlyBudget, CategoryBudget, CategoryAllocations, AllocationBucket, Investment, UserProfile, SubscriptionFrequency, CreditCard, Account, ActivityLogEntry, ProfileValueHistoryEntry } from '../types';
import { addWeeks, addMonths, addYears, format, parseISO, isAfter, startOfDay } from 'date-fns';
import { formatCurrency } from '../utils/formatters';
import { estimateNetFromGross } from '../utils/cpf';

const MAX_ACTIVITY_LOG_ENTRIES = 300;

// Prepends a new entry so the log stays newest-first, and caps its length so it
// doesn't grow unbounded in localStorage/cloud sync.
function withLog(activityLog: ActivityLogEntry[], message: string): ActivityLogEntry[] {
  const entry: ActivityLogEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message };
  return [entry, ...activityLog].slice(0, MAX_ACTIVITY_LOG_ENTRIES);
}

function advanceBillingDate(date: Date, frequency: SubscriptionFrequency): Date {
  switch (frequency) {
    case 'weekly': return addWeeks(date, 1);
    case 'monthly': return addMonths(date, 1);
    case 'yearly': return addYears(date, 1);
  }
}

// Credit card currentBalance represents available credit remaining (limit minus
// amount owed), not the amount owed itself — so paying off the card increases it.
// It isn't derived from transactions like account balances are, so a transfer
// paying down a card has to nudge its balance directly when applied (sign=1)
// or reversed (sign=-1) on edit/delete.
function applyTransferToCreditCards(creditCards: CreditCard[], t: Transaction, sign: 1 | -1): CreditCard[] {
  if (t.type !== 'transfer' || !t.toAccountId) return creditCards;
  return creditCards.map((c) =>
    c.id === t.toAccountId ? { ...c, currentBalance: c.currentBalance + sign * t.amount } : c
  );
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
  // April 2026
  { id: 'tx-001', date: '2026-04-01', amount: 6000, category: 'Salary', description: 'Monthly Salary', type: 'income' },
  { id: 'tx-002', date: '2026-04-02', amount: 1500, category: 'Housing', description: 'Apartment Rent', type: 'expense' },
  { id: 'tx-003', date: '2026-04-03', amount: 90, category: 'Utilities', description: 'Electric & Water', type: 'expense' },
  { id: 'tx-004', date: '2026-04-05', amount: 130, category: 'Food & Dining', description: 'Weekly Groceries', type: 'expense' },
  { id: 'tx-005', date: '2026-04-07', amount: 50, category: 'Transport', description: 'Gas', type: 'expense' },
  { id: 'tx-006', date: '2026-04-10', amount: 75, category: 'Food & Dining', description: 'Restaurants', type: 'expense' },
  { id: 'tx-007', date: '2026-04-12', amount: 200, category: 'Health', description: 'Gym Membership + Doctor', type: 'expense' },
  { id: 'tx-008', date: '2026-04-14', amount: 500, category: 'Freelance', description: 'Website Design Project', type: 'income' },
  { id: 'tx-009', date: '2026-04-15', amount: 120, category: 'Shopping', description: 'Amazon Purchases', type: 'expense' },
  { id: 'tx-010', date: '2026-04-18', amount: 60, category: 'Entertainment', description: 'Movies & Games', type: 'expense' },
  { id: 'tx-011', date: '2026-04-20', amount: 110, category: 'Food & Dining', description: 'Groceries', type: 'expense' },
  { id: 'tx-012', date: '2026-04-22', amount: 40, category: 'Transport', description: 'Grab/Taxi', type: 'expense' },
  { id: 'tx-013', date: '2026-04-25', amount: 85, category: 'Personal Care', description: 'Haircut & Grooming', type: 'expense' },
  { id: 'tx-014', date: '2026-04-28', amount: 150, category: 'Shopping', description: 'Clothing', type: 'expense' },
  // May 2026
  { id: 'tx-015', date: '2026-05-01', amount: 6000, category: 'Salary', description: 'Monthly Salary', type: 'income' },
  { id: 'tx-016', date: '2026-05-02', amount: 1500, category: 'Housing', description: 'Apartment Rent', type: 'expense' },
  { id: 'tx-017', date: '2026-05-03', amount: 88, category: 'Utilities', description: 'Electric & Water', type: 'expense' },
  { id: 'tx-018', date: '2026-05-05', amount: 145, category: 'Food & Dining', description: 'Weekly Groceries', type: 'expense' },
  { id: 'tx-019', date: '2026-05-07', amount: 55, category: 'Transport', description: 'Gas', type: 'expense' },
  { id: 'tx-020', date: '2026-05-09', amount: 90, category: 'Food & Dining', description: 'Restaurants', type: 'expense' },
  { id: 'tx-021', date: '2026-05-11', amount: 800, category: 'Freelance', description: 'App Development Project', type: 'income' },
  { id: 'tx-022', date: '2026-05-13', amount: 250, category: 'Shopping', description: 'Electronics', type: 'expense' },
  { id: 'tx-023', date: '2026-05-15', amount: 50, category: 'Gifts & Donations', description: 'Friend Birthday Gift', type: 'expense' },
  { id: 'tx-024', date: '2026-05-18', amount: 120, category: 'Food & Dining', description: 'Groceries', type: 'expense' },
  { id: 'tx-025', date: '2026-05-20', amount: 180, category: 'Health', description: 'Annual Check-up', type: 'expense' },
  { id: 'tx-026', date: '2026-05-22', amount: 35, category: 'Transport', description: 'MRT/Bus', type: 'expense' },
  { id: 'tx-027', date: '2026-05-25', amount: 65, category: 'Entertainment', description: 'Concert Ticket', type: 'expense' },
  { id: 'tx-028', date: '2026-05-28', amount: 70, category: 'Education', description: 'Online Course', type: 'expense' },
  // June 2026
  { id: 'tx-029', date: '2026-06-01', amount: 6000, category: 'Salary', description: 'Monthly Salary', type: 'income' },
  { id: 'tx-030', date: '2026-06-02', amount: 1500, category: 'Housing', description: 'Apartment Rent', type: 'expense' },
  { id: 'tx-031', date: '2026-06-03', amount: 95, category: 'Utilities', description: 'Electric & Water', type: 'expense' },
  { id: 'tx-032', date: '2026-06-05', amount: 140, category: 'Food & Dining', description: 'Groceries', type: 'expense' },
  { id: 'tx-033', date: '2026-06-06', amount: 45, category: 'Transport', description: 'Gas', type: 'expense' },
  { id: 'tx-034', date: '2026-06-08', amount: 85, category: 'Food & Dining', description: 'Weekend Dining Out', type: 'expense' },
  { id: 'tx-035', date: '2026-06-10', amount: 1200, category: 'Freelance', description: 'Consulting Project', type: 'income' },
  { id: 'tx-036', date: '2026-06-11', amount: 60, category: 'Entertainment', description: 'Streaming & Entertainment', type: 'expense' },
];

const SAMPLE_SUBSCRIPTIONS: Subscription[] = [
  { id: 'sub-001', name: 'Netflix', amount: 15.99, frequency: 'monthly', nextBillingDate: '2026-07-05', isActive: true, color: '#E50914', paymentMethod: 'auto' },
  { id: 'sub-002', name: 'Spotify', amount: 9.99, frequency: 'monthly', nextBillingDate: '2026-07-08', isActive: true, color: '#1DB954', paymentMethod: 'auto' },
  { id: 'sub-003', name: 'Amazon Prime', amount: 14.99, frequency: 'monthly', nextBillingDate: '2026-07-15', isActive: true, color: '#FF9900', paymentMethod: 'auto' },
  { id: 'sub-004', name: 'Adobe Creative', amount: 54.99, frequency: 'monthly', nextBillingDate: '2026-07-01', isActive: true, color: '#FF0000', paymentMethod: 'manual' },
  { id: 'sub-005', name: 'iCloud 200GB', amount: 2.99, frequency: 'monthly', nextBillingDate: '2026-07-20', isActive: true, color: '#007AFF', paymentMethod: 'auto' },
  { id: 'sub-006', name: 'Gym Membership', amount: 49.99, frequency: 'monthly', nextBillingDate: '2026-07-01', isActive: true, color: '#10b981', paymentMethod: 'manual' },
  { id: 'sub-007', name: 'ChatGPT Plus', amount: 20, frequency: 'monthly', nextBillingDate: '2026-07-12', isActive: true, color: '#74aa9c', paymentMethod: 'auto' },
  { id: 'sub-008', name: 'LinkedIn Premium', amount: 39.99, frequency: 'monthly', nextBillingDate: '2026-07-03', isActive: false, color: '#0A66C2', paymentMethod: 'manual' },
];

const SAMPLE_GOALS: SavingsGoal[] = [
  { id: 'goal-001', name: 'Emergency Fund', targetAmount: 18000, currentAmount: 9500, targetDate: '2026-12-31', category: 'emergency', color: '#f59e0b', monthlyContribution: 700 },
  { id: 'goal-002', name: 'Japan Vacation', targetAmount: 5000, currentAmount: 2800, targetDate: '2026-10-01', category: 'vacation', color: '#8b5cf6', monthlyContribution: 400 },
  { id: 'goal-003', name: 'New Laptop', targetAmount: 2500, currentAmount: 1200, targetDate: '2026-08-01', category: 'gadget', color: '#3b82f6', monthlyContribution: 300 },
  { id: 'goal-004', name: 'House Down Payment', targetAmount: 80000, currentAmount: 28000, targetDate: '2029-01-01', category: 'home', color: '#10b981', monthlyContribution: 1500 },
];

// The budget template applies to the current month and all future months.
// Past months are frozen into `budgetHistory` snapshots and never affected by later template edits.
const SAMPLE_BUDGET_TEMPLATE: CategoryBudget = {
  'Housing': 1500,
  'Food & Dining': 500,
  'Transport': 150,
  'Health': 200,
  'Entertainment': 100,
  'Shopping': 200,
  'Utilities': 120,
  'Personal Care': 80,
  'Education': 100,
  'Gifts & Donations': 50,
  'Subscriptions': 200,
  'Other': 100,
};

const SAMPLE_INVESTMENTS: Investment[] = [
  { id: 'inv-001', name: 'S&P 500 ETF (VOO)', type: 'etf', ticker: 'VOO', units: 20, buyPrice: 420, currentPrice: 485, purchaseDate: '2024-03-15', color: '#3b82f6' },
  { id: 'inv-002', name: 'Apple Inc.', type: 'stock', ticker: 'AAPL', units: 30, buyPrice: 165, currentPrice: 192, purchaseDate: '2024-06-10', color: '#6366f1' },
  { id: 'inv-003', name: 'Bitcoin', type: 'crypto', ticker: 'BTC', units: 0.15, buyPrice: 42000, currentPrice: 68500, purchaseDate: '2024-01-20', color: '#f59e0b' },
  { id: 'inv-004', name: 'Ethereum', type: 'crypto', ticker: 'ETH', units: 1.5, buyPrice: 2400, currentPrice: 3200, purchaseDate: '2024-02-14', color: '#8b5cf6' },
  { id: 'inv-005', name: 'Vanguard Bond Fund', type: 'bond', ticker: 'BND', units: 50, buyPrice: 72, currentPrice: 74, purchaseDate: '2024-09-01', color: '#10b981' },
  { id: 'inv-006', name: 'NVIDIA Corp', type: 'stock', ticker: 'NVDA', units: 10, buyPrice: 580, currentPrice: 875, purchaseDate: '2024-05-20', color: '#ef4444' },
];

const SAMPLE_PROFILE: UserProfile = {
  name: 'Edmond',
  currency: 'USD',
  currencySymbol: '$',
  monthlyIncome: 6000,
  currentAge: 25,
  retirementAge: 55,
  riskTolerance: 'moderate',
  monthlySavingsTarget: 1500,
};

interface FinanceStore {
  transactions: Transaction[];
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
  budgetTemplate: CategoryBudget;
  categoryAllocations: CategoryAllocations; // maps budget category -> which Income Allocation bucket its spending counts toward
  budgetTemplateMonth: string; // YYYY-MM the template currently represents "live" (current real month last synced)
  budgetHistory: MonthlyBudget[]; // frozen snapshots for months that have already passed
  investments: Investment[];
  creditCards: CreditCard[];
  accounts: Account[];
  profile: UserProfile;
  activeView: string;
  onboardingComplete: boolean;
  myrToSgdRate: number; // user-editable; used to convert MYR amounts entered in Budget/Transactions into SGD, the app's base currency
  creditCardBalanceMigratedV1: boolean; // true once existing creditCards.currentBalance values have been flipped from "amount owed" to "available credit"
  monthlyIncomeMigratedV1: boolean; // true once profile.monthlyIncome has been converted from gross salary to take-home pay
  creditCardBalanceAsOfMigratedV1: boolean; // true once existing creditCards without a balanceAsOf have been backfilled with one
  activityLog: ActivityLogEntry[]; // newest-first record of create/update/delete actions, for the Activity Log page
  // Live USD->SGD rate, fetched on the Investments page; shared (not cloud-synced) so net-worth
  // totals elsewhere (Dashboard, Planning, Insights) convert StashAway's USD holdings consistently.
  usdSgdRate: number | null;
  // One snapshot per calendar day of actual net worth, recorded automatically while the Planning
  // page is open — the historical "actual" track record plotted against the projection chart.
  netWorthHistory: { date: string; value: number }[];
  // Previous values of profile.monthlyIncome / profile.retirementAnnualExpenses, recorded
  // automatically whenever updateProfile changes them, so past figures stay on record even as
  // the current/forward-looking number is updated.
  incomeHistory: ProfileValueHistoryEntry[];
  expensesHistory: ProfileValueHistoryEntry[];

  setActiveView: (view: string) => void;

  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addSubscription: (s: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  processAutoSubscriptions: () => void;

  addSavingsGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addFundsToGoal: (id: string, amount: number) => void;

  updateBudgetTemplate: (categories: CategoryBudget, allocations?: CategoryAllocations) => void;
  checkBudgetRollover: () => void;

  addInvestment: (inv: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  addCreditCard: (c: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  migrateCreditCardBalanceSemantics: () => void;
  migrateCreditCardBalanceAsOf: () => void;

  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  reopenOnboarding: () => void;
  setMyrToSgdRate: (rate: number) => void;
  setUsdSgdRate: (rate: number) => void;
  recordNetWorthSnapshot: (value: number) => void;
  migrateMonthlyIncomeToNet: () => void;

  hydrateFromCloud: (data: SyncableState) => void;
  getSyncableState: () => SyncableState;
}

export interface SyncableState {
  transactions: Transaction[];
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
  budgetTemplate: CategoryBudget;
  categoryAllocations: CategoryAllocations;
  budgetTemplateMonth: string;
  budgetHistory: MonthlyBudget[];
  investments: Investment[];
  creditCards: CreditCard[];
  accounts: Account[];
  profile: UserProfile;
  myrToSgdRate: number;
  creditCardBalanceMigratedV1: boolean;
  monthlyIncomeMigratedV1: boolean;
  creditCardBalanceAsOfMigratedV1: boolean;
  activityLog: ActivityLogEntry[];
  netWorthHistory: { date: string; value: number }[];
  incomeHistory: ProfileValueHistoryEntry[];
  expensesHistory: ProfileValueHistoryEntry[];
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      transactions: SAMPLE_TRANSACTIONS,
      subscriptions: SAMPLE_SUBSCRIPTIONS,
      savingsGoals: SAMPLE_GOALS,
      budgetTemplate: SAMPLE_BUDGET_TEMPLATE,
      categoryAllocations: {},
      budgetTemplateMonth: format(new Date(), 'yyyy-MM'),
      budgetHistory: [],
      investments: SAMPLE_INVESTMENTS,
      creditCards: [],
      accounts: [],
      profile: SAMPLE_PROFILE,
      activeView: 'dashboard',
      onboardingComplete: false,
      myrToSgdRate: 0.29,
      creditCardBalanceMigratedV1: false,
      monthlyIncomeMigratedV1: false,
      creditCardBalanceAsOfMigratedV1: false,
      activityLog: [],
      usdSgdRate: null,
      netWorthHistory: [],
      incomeHistory: [],
      expensesHistory: [],

      setActiveView: (view) => set({ activeView: view }),

      addTransaction: (t) =>
        set((state) => {
          const newTx = { ...t, id: `tx-${crypto.randomUUID()}` };
          return {
            transactions: [newTx, ...state.transactions],
            creditCards: applyTransferToCreditCards(state.creditCards, newTx, 1),
            activityLog: withLog(state.activityLog, `Added ${t.type} "${t.description}" for ${formatCurrency(t.amount)}`),
          };
        }),
      updateTransaction: (id, updates) =>
        set((state) => {
          const existing = state.transactions.find((t) => t.id === id);
          if (!existing) return {};
          const updated = { ...existing, ...updates };
          let creditCards = applyTransferToCreditCards(state.creditCards, existing, -1);
          creditCards = applyTransferToCreditCards(creditCards, updated, 1);
          return {
            transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
            creditCards,
            activityLog: withLog(state.activityLog, `Edited transaction "${updated.description}" (${formatCurrency(updated.amount)})`),
          };
        }),
      deleteTransaction: (id) =>
        set((state) => {
          const existing = state.transactions.find((t) => t.id === id);
          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            creditCards: existing ? applyTransferToCreditCards(state.creditCards, existing, -1) : state.creditCards,
            activityLog: existing
              ? withLog(state.activityLog, `Deleted transaction "${existing.description}" (${formatCurrency(existing.amount)})`)
              : state.activityLog,
          };
        }),

      addSubscription: (s) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, { ...s, id: `sub-${crypto.randomUUID()}` }],
          activityLog: withLog(state.activityLog, `Added subscription "${s.name}" (${formatCurrency(s.amount)}/${s.frequency})`),
        })),
      updateSubscription: (id, updates) =>
        set((state) => {
          const existing = state.subscriptions.find((s) => s.id === id);
          return {
            subscriptions: state.subscriptions.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Edited subscription "${existing.name}"`)
              : state.activityLog,
          };
        }),
      deleteSubscription: (id) =>
        set((state) => {
          const existing = state.subscriptions.find((s) => s.id === id);
          return {
            subscriptions: state.subscriptions.filter((s) => s.id !== id),
            activityLog: existing
              ? withLog(state.activityLog, `Deleted subscription "${existing.name}"`)
              : state.activityLog,
          };
        }),

      processAutoSubscriptions: () =>
        set((state) => {
          const today = startOfDay(new Date());
          const newTransactions: Transaction[] = [];

          const updatedSubscriptions = state.subscriptions.map((sub) => {
            if (!sub.isActive || sub.paymentMethod !== 'auto') return sub;

            let billingDate = parseISO(sub.nextBillingDate);
            let safety = 0;
            while (!isAfter(billingDate, today) && safety < 36) {
              if (sub.endDate && isAfter(billingDate, parseISO(sub.endDate))) break;
              const billingDateStr = format(billingDate, 'yyyy-MM-dd');
              newTransactions.push({
                id: `tx-auto-${sub.id}-${billingDateStr}`,
                date: billingDateStr,
                amount: sub.amount,
                category: 'Subscriptions',
                description: sub.name,
                type: 'expense',
                accountId: sub.accountId,
              });
              billingDate = advanceBillingDate(billingDate, sub.frequency);
              safety++;
            }

            const nextBillingDate = format(billingDate, 'yyyy-MM-dd');
            return nextBillingDate === sub.nextBillingDate ? sub : { ...sub, nextBillingDate };
          });

          if (newTransactions.length === 0) return {};

          const existingIds = new Set(state.transactions.map((t) => t.id));
          const dedupedNew = newTransactions.filter((t) => !existingIds.has(t.id));
          if (dedupedNew.length === 0) return { subscriptions: updatedSubscriptions };

          return {
            subscriptions: updatedSubscriptions,
            transactions: [...dedupedNew, ...state.transactions],
          };
        }),

      addSavingsGoal: (g) =>
        set((state) => ({
          savingsGoals: [...state.savingsGoals, { ...g, id: `goal-${crypto.randomUUID()}` }],
          activityLog: withLog(state.activityLog, `Added savings goal "${g.name}" (target ${formatCurrency(g.targetAmount)})`),
        })),
      updateSavingsGoal: (id, updates) =>
        set((state) => {
          const existing = state.savingsGoals.find((g) => g.id === id);
          return {
            savingsGoals: state.savingsGoals.map((g) =>
              g.id === id ? { ...g, ...updates } : g
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Edited savings goal "${existing.name}"`)
              : state.activityLog,
          };
        }),
      deleteSavingsGoal: (id) =>
        set((state) => {
          const existing = state.savingsGoals.find((g) => g.id === id);
          return {
            savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
            activityLog: existing
              ? withLog(state.activityLog, `Deleted savings goal "${existing.name}"`)
              : state.activityLog,
          };
        }),
      addFundsToGoal: (id, amount) =>
        set((state) => {
          const existing = state.savingsGoals.find((g) => g.id === id);
          return {
            savingsGoals: state.savingsGoals.map((g) =>
              g.id === id
                ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
                : g
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Added ${formatCurrency(amount)} to savings goal "${existing.name}"`)
              : state.activityLog,
          };
        }),

      updateBudgetTemplate: (categories, allocations) =>
        set((state) => ({
          budgetTemplate: categories,
          categoryAllocations: allocations ?? state.categoryAllocations,
          activityLog: withLog(state.activityLog, 'Updated budget categories'),
        })),

      checkBudgetRollover: () =>
        set((state) => {
          const currentMonth = format(new Date(), 'yyyy-MM');
          if (state.budgetTemplateMonth >= currentMonth) return {};

          const history = [...state.budgetHistory];
          let month = state.budgetTemplateMonth;
          let safety = 0;
          while (month < currentMonth && safety < 600) {
            if (!history.some((b) => b.month === month)) {
              history.push({ month, categories: state.budgetTemplate });
            }
            month = format(addMonths(parseISO(month + '-01'), 1), 'yyyy-MM');
            safety++;
          }

          return { budgetHistory: history, budgetTemplateMonth: currentMonth };
        }),

      addInvestment: (inv) =>
        set((state) => ({
          investments: [...state.investments, { ...inv, id: `inv-${crypto.randomUUID()}` }],
          activityLog: withLog(state.activityLog, `Added investment "${inv.name}" (${inv.units} units)`),
        })),
      updateInvestment: (id, updates) =>
        set((state) => {
          const existing = state.investments.find((inv) => inv.id === id);
          return {
            investments: state.investments.map((inv) =>
              inv.id === id ? { ...inv, ...updates } : inv
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Edited investment "${existing.name}"`)
              : state.activityLog,
          };
        }),
      deleteInvestment: (id) =>
        set((state) => {
          const existing = state.investments.find((inv) => inv.id === id);
          return {
            investments: state.investments.filter((inv) => inv.id !== id),
            activityLog: existing
              ? withLog(state.activityLog, `Deleted investment "${existing.name}"`)
              : state.activityLog,
          };
        }),

      addCreditCard: (c) =>
        set((state) => ({
          creditCards: [...state.creditCards, { ...c, id: `card-${crypto.randomUUID()}`, balanceAsOf: format(new Date(), 'yyyy-MM-dd') }],
          activityLog: withLog(state.activityLog, `Added credit card "${c.name}" (limit ${formatCurrency(c.limit)})`),
        })),
      updateCreditCard: (id, updates) =>
        set((state) => {
          const existing = state.creditCards.find((c) => c.id === id);
          // Editing currentBalance re-syncs it to a real-world figure, so transactions tagged to
          // the card before today are already reflected in it — bump the cutoff so they aren't
          // also added on top via getCreditCardOwed's delta.
          const resolvedUpdates = updates.currentBalance !== undefined
            ? { ...updates, balanceAsOf: format(new Date(), 'yyyy-MM-dd') }
            : updates;
          return {
            creditCards: state.creditCards.map((c) =>
              c.id === id ? { ...c, ...resolvedUpdates } : c
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Edited credit card "${existing.name}"`)
              : state.activityLog,
          };
        }),
      deleteCreditCard: (id) =>
        set((state) => {
          const existing = state.creditCards.find((c) => c.id === id);
          return {
            creditCards: state.creditCards.filter((c) => c.id !== id),
            activityLog: existing
              ? withLog(state.activityLog, `Deleted credit card "${existing.name}"`)
              : state.activityLog,
          };
        }),
      migrateCreditCardBalanceSemantics: () =>
        set((state) => {
          if (state.creditCardBalanceMigratedV1) return {};
          return {
            creditCardBalanceMigratedV1: true,
            creditCards: state.creditCards.map((c) => ({ ...c, currentBalance: Math.max(0, c.limit - c.currentBalance) })),
          };
        }),
      // Backfills balanceAsOf on cards saved before that field existed, treating their
      // currentBalance as accurate as of today — otherwise every transaction ever tagged
      // to the card would count toward owed on top of an already-current currentBalance.
      migrateCreditCardBalanceAsOf: () =>
        set((state) => {
          if (state.creditCardBalanceAsOfMigratedV1) return {};
          const today = format(new Date(), 'yyyy-MM-dd');
          return {
            creditCardBalanceAsOfMigratedV1: true,
            creditCards: state.creditCards.map((c) => (c.balanceAsOf ? c : { ...c, balanceAsOf: today })),
          };
        }),

      addAccount: (a) =>
        set((state) => ({
          accounts: [...state.accounts, { ...a, id: `acct-${crypto.randomUUID()}` }],
          activityLog: withLog(state.activityLog, `Added account "${a.name}" (opening balance ${formatCurrency(a.openingBalance)})`),
        })),
      updateAccount: (id, updates) =>
        set((state) => {
          const existing = state.accounts.find((a) => a.id === id);
          return {
            accounts: state.accounts.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
            activityLog: existing
              ? withLog(state.activityLog, `Edited account "${existing.name}"`)
              : state.activityLog,
          };
        }),
      deleteAccount: (id) =>
        set((state) => {
          const existing = state.accounts.find((a) => a.id === id);
          return {
            accounts: state.accounts.filter((a) => a.id !== id),
            activityLog: existing
              ? withLog(state.activityLog, `Deleted account "${existing.name}"`)
              : state.activityLog,
          };
        }),

      updateProfile: (updates) =>
        set((state) => {
          const today = format(new Date(), 'yyyy-MM-dd');

          // Daily granularity, like netWorthHistory: only the first change of the day pushes a
          // record, so the entry always captures the value as it stood before today's edits.
          let incomeHistory = state.incomeHistory;
          if (updates.monthlyIncome !== undefined && updates.monthlyIncome !== state.profile.monthlyIncome) {
            incomeHistory = incomeHistory.some((h) => h.date === today)
              ? incomeHistory
              : [...incomeHistory, { date: today, amount: state.profile.monthlyIncome }];
          }

          let expensesHistory = state.expensesHistory;
          if (
            updates.retirementAnnualExpenses !== undefined &&
            updates.retirementAnnualExpenses !== state.profile.retirementAnnualExpenses &&
            state.profile.retirementAnnualExpenses !== undefined
          ) {
            expensesHistory = expensesHistory.some((h) => h.date === today)
              ? expensesHistory
              : [...expensesHistory, { date: today, amount: state.profile.retirementAnnualExpenses }];
          }

          return {
            profile: { ...state.profile, ...updates },
            incomeHistory,
            expensesHistory,
            activityLog: withLog(state.activityLog, 'Updated financial profile'),
          };
        }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      reopenOnboarding: () => set({ onboardingComplete: false }),
      setMyrToSgdRate: (rate) => set({ myrToSgdRate: rate }),
      setUsdSgdRate: (rate) => set({ usdSgdRate: rate }),
      recordNetWorthSnapshot: (value) =>
        set((state) => {
          const today = format(new Date(), 'yyyy-MM-dd');
          const existing = state.netWorthHistory.filter((s) => s.date !== today);
          return { netWorthHistory: [...existing, { date: today, value }] };
        }),
      migrateMonthlyIncomeToNet: () =>
        set((state) => {
          if (state.monthlyIncomeMigratedV1) return {};
          return {
            monthlyIncomeMigratedV1: true,
            profile: { ...state.profile, monthlyIncome: estimateNetFromGross(state.profile, state.profile.monthlyIncome) },
          };
        }),

      hydrateFromCloud: (data) => set(() => ({
        ...data,
        accounts: data.accounts ?? [],
        categoryAllocations: data.categoryAllocations ?? {},
        myrToSgdRate: data.myrToSgdRate ?? 0.29,
        creditCardBalanceMigratedV1: data.creditCardBalanceMigratedV1 ?? false,
        monthlyIncomeMigratedV1: data.monthlyIncomeMigratedV1 ?? false,
        creditCardBalanceAsOfMigratedV1: data.creditCardBalanceAsOfMigratedV1 ?? false,
        activityLog: data.activityLog ?? [],
        netWorthHistory: data.netWorthHistory ?? [],
        incomeHistory: data.incomeHistory ?? [],
        expensesHistory: data.expensesHistory ?? [],
      })),
      getSyncableState: () => {
        const s = get();
        return {
          transactions: s.transactions,
          subscriptions: s.subscriptions,
          savingsGoals: s.savingsGoals,
          budgetTemplate: s.budgetTemplate,
          categoryAllocations: s.categoryAllocations,
          budgetTemplateMonth: s.budgetTemplateMonth,
          budgetHistory: s.budgetHistory,
          investments: s.investments,
          creditCards: s.creditCards,
          accounts: s.accounts,
          profile: s.profile,
          myrToSgdRate: s.myrToSgdRate,
          creditCardBalanceMigratedV1: s.creditCardBalanceMigratedV1,
          monthlyIncomeMigratedV1: s.monthlyIncomeMigratedV1,
          creditCardBalanceAsOfMigratedV1: s.creditCardBalanceAsOfMigratedV1,
          activityLog: s.activityLog,
          netWorthHistory: s.netWorthHistory,
          incomeHistory: s.incomeHistory,
          expensesHistory: s.expensesHistory,
        };
      },
    }),
    {
      name: 'finance-iq-storage',
    }
  )
);
