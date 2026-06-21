export type TransactionType = 'income' | 'expense' | 'saving' | 'transfer';

export type ExpenseCategory =
  | 'Housing' | 'Food & Dining' | 'Transport' | 'Health' | 'Entertainment'
  | 'Shopping' | 'Education' | 'Travel' | 'Utilities' | 'Personal Care'
  | 'Gifts & Donations' | 'Subscriptions' | 'Other';

export type IncomeCategory =
  | 'Salary' | 'Freelance' | 'Investment Returns' | 'Rental Income'
  | 'Business' | 'Gift' | 'Bonus' | 'Other';

export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  tags?: string[];
  accountId?: string; // for transfers, the source account/credit card
  toAccountId?: string; // destination account/credit card; only set when type is 'transfer'
}

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionPaymentMethod = 'auto' | 'manual';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  nextBillingDate: string;
  isActive: boolean;
  color: string;
  icon?: string;
  endDate?: string; // last payment date, for installments / fixed-term plans like insurance
  paymentMethod?: SubscriptionPaymentMethod; // 'auto' creates an expense transaction automatically when due
  accountId?: string; // account/credit card this subscription is paid from; tagged on auto-created expense transactions
}

export type GoalCategory =
  | 'emergency' | 'vacation' | 'home' | 'vehicle'
  | 'education' | 'retirement' | 'gadget' | 'wedding' | 'other';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: GoalCategory;
  color: string;
  monthlyContribution?: number;
  accountId?: string;
}

export interface CategoryBudget {
  [category: string]: number;
}

// Free-form: 'savings' | 'expenses' | 'investments' are the built-in defaults, but
// users can tag a category with any other bucket name they create from the Budget page.
export type AllocationBucket = string;

export interface CategoryAllocations {
  [category: string]: AllocationBucket;
}

export type AllocationTargets = Record<string, number>; // bucket name -> target % of income; keys match AllocationBucket values

export interface MonthlyBudget {
  month: string; // YYYY-MM
  categories: CategoryBudget;
}

export type InvestmentType =
  | 'stock' | 'etf' | 'crypto' | 'mutual_fund'
  | 'bond' | 'real_estate' | 'gold' | 'other';

export interface AutoInvestConfig {
  amountUsd: number;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number; // 0 (Sun) - 6 (Sat), required when frequency is 'weekly'
  dayOfMonth?: number; // 1-31, required when frequency is 'monthly'
  lastAppliedDate: string; // YYYY-MM-DD; the last occurrence already reflected in units/buyPrice
}

export type InvestmentPlatform = 'Tiger Brokers' | 'Coinbase' | 'StashAway' | 'Other';

export interface PurchaseRecord {
  date: string; // YYYY-MM-DD
  price: number; // price per unit at this purchase
  units: number; // units bought in this transaction
  amount: number; // price * units (kept explicit since real statements report this directly)
  currency?: 'USD' | 'SGD'; // defaults to USD; set when the record is kept in its original statement currency
  fee?: number; // broker commission charged on top of amount, in the same currency; not included in amount
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  ticker?: string;
  units: number;
  buyPrice: number;
  currentPrice: number;
  purchaseDate: string;
  notes?: string;
  color: string;
  autoInvest?: AutoInvestConfig;
  platform?: InvestmentPlatform;
  purchaseHistory?: PurchaseRecord[];
}

export type ResidencyStatus = 'citizen' | 'pr' | 'foreigner';

export interface UserProfile {
  name: string;
  currency: string;
  currencySymbol: string;
  monthlyIncome: number;
  currentAge: number;
  retirementAge: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  monthlySavingsTarget: number;
  residencyStatus?: ResidencyStatus;
  prStartDate?: string; // YYYY-MM-DD; only set when residencyStatus === 'pr', used to determine the CPF graduated-rate year
  allocationTargets?: AllocationTargets;
  dateOfBirth?: string; // YYYY-MM-DD; source of truth for currentAge so it stays accurate as time passes
  retirementTargetAmount?: number;
}

export interface Account {
  id: string;
  name: string;
  openingBalance: number; // balance before any transactions tagged to this account
  color: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  currentBalance: number; // available credit remaining (limit minus amount owed), not the amount owed
  statementDay: number; // 1-31, day of month the statement is generated
  dueDay: number; // 1-31, day of month payment is due
  color: string;
}

export interface NetWorthSnapshot {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO datetime
  message: string;
}
