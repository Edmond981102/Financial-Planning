import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, Subscription, SavingsGoal, MonthlyBudget, Investment, UserProfile } from '../types';

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
  { id: 'sub-001', name: 'Netflix', amount: 15.99, frequency: 'monthly', nextBillingDate: '2026-07-05', isActive: true, color: '#E50914' },
  { id: 'sub-002', name: 'Spotify', amount: 9.99, frequency: 'monthly', nextBillingDate: '2026-07-08', isActive: true, color: '#1DB954' },
  { id: 'sub-003', name: 'Amazon Prime', amount: 14.99, frequency: 'monthly', nextBillingDate: '2026-07-15', isActive: true, color: '#FF9900' },
  { id: 'sub-004', name: 'Adobe Creative', amount: 54.99, frequency: 'monthly', nextBillingDate: '2026-07-01', isActive: true, color: '#FF0000' },
  { id: 'sub-005', name: 'iCloud 200GB', amount: 2.99, frequency: 'monthly', nextBillingDate: '2026-07-20', isActive: true, color: '#007AFF' },
  { id: 'sub-006', name: 'Gym Membership', amount: 49.99, frequency: 'monthly', nextBillingDate: '2026-07-01', isActive: true, color: '#10b981' },
  { id: 'sub-007', name: 'ChatGPT Plus', amount: 20, frequency: 'monthly', nextBillingDate: '2026-07-12', isActive: true, color: '#74aa9c' },
  { id: 'sub-008', name: 'LinkedIn Premium', amount: 39.99, frequency: 'monthly', nextBillingDate: '2026-07-03', isActive: false, color: '#0A66C2' },
];

const SAMPLE_GOALS: SavingsGoal[] = [
  { id: 'goal-001', name: 'Emergency Fund', targetAmount: 18000, currentAmount: 9500, targetDate: '2026-12-31', category: 'emergency', color: '#f59e0b', monthlyContribution: 700 },
  { id: 'goal-002', name: 'Japan Vacation', targetAmount: 5000, currentAmount: 2800, targetDate: '2026-10-01', category: 'vacation', color: '#8b5cf6', monthlyContribution: 400 },
  { id: 'goal-003', name: 'New Laptop', targetAmount: 2500, currentAmount: 1200, targetDate: '2026-08-01', category: 'gadget', color: '#3b82f6', monthlyContribution: 300 },
  { id: 'goal-004', name: 'House Down Payment', targetAmount: 80000, currentAmount: 28000, targetDate: '2029-01-01', category: 'home', color: '#10b981', monthlyContribution: 1500 },
];

const SAMPLE_BUDGETS: MonthlyBudget[] = [
  {
    month: '2026-06',
    categories: {
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
    },
  },
];

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
  budgets: MonthlyBudget[];
  investments: Investment[];
  profile: UserProfile;
  activeView: string;

  setActiveView: (view: string) => void;

  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addSubscription: (s: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;

  addSavingsGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addFundsToGoal: (id: string, amount: number) => void;

  setBudget: (budget: MonthlyBudget) => void;

  addInvestment: (inv: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      transactions: SAMPLE_TRANSACTIONS,
      subscriptions: SAMPLE_SUBSCRIPTIONS,
      savingsGoals: SAMPLE_GOALS,
      budgets: SAMPLE_BUDGETS,
      investments: SAMPLE_INVESTMENTS,
      profile: SAMPLE_PROFILE,
      activeView: 'dashboard',

      setActiveView: (view) => set({ activeView: view }),

      addTransaction: (t) =>
        set((state) => ({
          transactions: [
            { ...t, id: `tx-${Date.now()}` },
            ...state.transactions,
          ],
        })),
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      addSubscription: (s) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, { ...s, id: `sub-${Date.now()}` }],
        })),
      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      deleteSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        })),

      addSavingsGoal: (g) =>
        set((state) => ({
          savingsGoals: [...state.savingsGoals, { ...g, id: `goal-${Date.now()}` }],
        })),
      updateSavingsGoal: (id, updates) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),
      deleteSavingsGoal: (id) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        })),
      addFundsToGoal: (id, amount) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id
              ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
              : g
          ),
        })),

      setBudget: (budget) =>
        set((state) => ({
          budgets: [
            ...state.budgets.filter((b) => b.month !== budget.month),
            budget,
          ],
        })),

      addInvestment: (inv) =>
        set((state) => ({
          investments: [...state.investments, { ...inv, id: `inv-${Date.now()}` }],
        })),
      updateInvestment: (id, updates) =>
        set((state) => ({
          investments: state.investments.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        })),
      deleteInvestment: (id) =>
        set((state) => ({
          investments: state.investments.filter((inv) => inv.id !== id),
        })),

      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
    }),
    {
      name: 'finance-iq-storage',
    }
  )
);
