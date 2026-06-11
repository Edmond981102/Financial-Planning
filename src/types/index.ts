export type TransactionType = 'income' | 'expense';

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
}

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  category: string;
  nextBillingDate: string;
  isActive: boolean;
  color: string;
  icon?: string;
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
}

export interface CategoryBudget {
  [category: string]: number;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  categories: CategoryBudget;
}

export type InvestmentType =
  | 'stock' | 'etf' | 'crypto' | 'mutual_fund'
  | 'bond' | 'real_estate' | 'gold' | 'other';

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
}

export interface UserProfile {
  name: string;
  currency: string;
  currencySymbol: string;
  monthlyIncome: number;
  currentAge: number;
  retirementAge: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  monthlySavingsTarget: number;
}

export interface NetWorthSnapshot {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}
