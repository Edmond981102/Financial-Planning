import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  CreditCard, Target, ArrowUpRight, ArrowDownRight, Bell, Landmark, Receipt
} from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  getLast6MonthsData, getMonthIncome, getMonthExpenses, getDayExpenses,
  getCategoryTotals, getMonthTransactions, getTotalInvestmentValue,
  getMonthlySubscriptionTotal, calculateGoalProgress, getAccountBalance, getTotalAccountBalances, getCreditCardOwed
} from '../utils/calculations';
import { format, differenceInCalendarDays, setDate, isBefore, addMonths, subDays } from 'date-fns';

function getNextDueDate(dueDay: number): Date {
  const today = new Date();
  let next = setDate(today, dueDay);
  if (isBefore(next, today)) next = setDate(addMonths(today, 1), dueDay);
  return next;
}

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">${p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { transactions, investments, subscriptions, savingsGoals, profile, creditCards, accounts } = useFinanceStore();

  const thisMonth = format(new Date(), 'yyyy-MM');
  const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');

  const thisIncome = useMemo(() => getMonthIncome(transactions, thisMonth), [transactions, thisMonth]);
  const thisExpenses = useMemo(() => getMonthExpenses(transactions, thisMonth), [transactions, thisMonth]);
  const lastIncome = useMemo(() => getMonthIncome(transactions, lastMonth), [transactions, lastMonth]);
  const lastExpenses = useMemo(() => getMonthExpenses(transactions, lastMonth), [transactions, lastMonth]);

  const thisSavings = thisIncome - thisExpenses;
  const expenseChange = lastExpenses > 0 ? ((thisExpenses - lastExpenses) / lastExpenses) * 100 : 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todaySpent = useMemo(() => getDayExpenses(transactions, todayStr), [transactions, todayStr]);
  const yesterdaySpent = useMemo(() => getDayExpenses(transactions, yesterdayStr), [transactions, yesterdayStr]);
  const todayChange = yesterdaySpent > 0 ? ((todaySpent - yesterdaySpent) / yesterdaySpent) * 100 : 0;

  const monthlyData = useMemo(() => getLast6MonthsData(transactions), [transactions]);
  const categoryData = useMemo(
    () => getCategoryTotals(getMonthTransactions(transactions, thisMonth), 'expense'),
    [transactions, thisMonth]
  );

  const investmentValue = useMemo(() => getTotalInvestmentValue(investments), [investments]);
  const subscriptionCost = useMemo(() => getMonthlySubscriptionTotal(subscriptions), [subscriptions]);
  const accountBalance = useMemo(() => getTotalAccountBalances(accounts, transactions), [accounts, transactions]);
  const totalSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const netWorth = totalSavings + investmentValue + accountBalance;

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [transactions]
  );

  const savingsRate = thisIncome > 0 ? (thisSavings / thisIncome) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Good morning, {profile.name} 👋</h1>
          <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button className="relative p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700 shrink-0">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Spent Today"
          value={formatCurrency(todaySpent)}
          sub={`${todayChange > 0 ? '+' : ''}${todayChange.toFixed(1)}% vs yesterday`}
          up={todayChange <= 0}
          icon={<Receipt size={18} />}
          color="rose"
          invertColors
        />
        <MetricCard
          title="Monthly Income"
          value={formatCurrency(thisIncome)}
          sub={`${lastIncome > 0 ? ((thisIncome - lastIncome) / lastIncome * 100).toFixed(1) : 0}% vs last month`}
          up={thisIncome >= lastIncome}
          icon={<DollarSign size={18} />}
          color="emerald"
        />
        <MetricCard
          title="Monthly Expenses"
          value={formatCurrency(thisExpenses)}
          sub={`${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}% vs last month`}
          up={expenseChange <= 0}
          icon={<CreditCard size={18} />}
          color="rose"
          invertColors
        />
        <MetricCard
          title="Saved This Month"
          value={formatCurrency(thisSavings)}
          sub={`${savingsRate.toFixed(1)}% savings rate`}
          up={thisSavings > 0}
          icon={<Wallet size={18} />}
          color="blue"
        />
        <MetricCard
          title="Investment Portfolio"
          value={formatCurrency(investmentValue)}
          sub="Total market value"
          up={true}
          icon={<TrendingUp size={18} />}
          color="violet"
        />
        <MetricCard
          title="Net Worth"
          value={formatCurrency(netWorth)}
          sub="savings + investments + accounts"
          up={true}
          icon={<Landmark size={18} />}
          color="indigo"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white">6-Month Cash Flow</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Savings</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4} barSize={18}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Category */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Spending Breakdown</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i] }} />
                      <span className="text-slate-400">{d.name}</span>
                    </div>
                    <span className="text-slate-300 font-medium">${d.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-xs">No expense data this month.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
            <span className="text-xs text-slate-500">{recentTransactions.length} latest</span>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                    t.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : t.type === 'saving' ? 'bg-sky-500/15 text-sky-400' : t.type === 'transfer' ? 'bg-violet-500/15 text-violet-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {t.category.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{t.description}</div>
                    <div className="text-xs text-slate-500">{t.category} · {formatDate(t.date, 'MMM d')}</div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : t.type === 'saving' ? 'text-sky-400' : t.type === 'transfer' ? 'text-violet-400' : 'text-rose-400'}`}>
                  {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Subscriptions Summary */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Monthly Subscriptions</h2>
            <div className="text-2xl font-bold text-white">{formatCurrency(subscriptionCost)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Across {subscriptions.filter(s => s.isActive).length} active plans</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subscriptions.filter(s => s.isActive).slice(0, 4).map(s => (
                <span key={s.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.color + '20', color: s.color }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Accounts */}
          {accounts.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">Accounts</h2>
              <div className="text-2xl font-bold text-white">{formatCurrency(accountBalance)}</div>
              <div className="text-xs text-slate-400 mt-0.5">across {accounts.length} account{accounts.length === 1 ? '' : 's'}</div>
              <div className="mt-3 space-y-1.5">
                {accounts.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                      {a.name}
                    </span>
                    <span className="text-slate-300 font-medium">{formatCurrency(getAccountBalance(a, transactions))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credit Cards */}
          {creditCards.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">Credit Cards</h2>
              <div className="space-y-3">
                {creditCards.map((c) => {
                  const owed = getCreditCardOwed(c, transactions);
                  const usagePercent = c.limit > 0 ? Math.min(100, (owed / c.limit) * 100) : 0;
                  const daysUntilDue = differenceInCalendarDays(getNextDueDate(c.dueDay), new Date());
                  const dueSoon = daysUntilDue <= 5;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{c.name}</span>
                        <span className={dueSoon ? 'text-amber-400 font-medium' : 'text-slate-500'}>
                          Due in {daysUntilDue}d
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? '#f43f5e' : c.color }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatCurrency(owed)} spent of {formatCurrency(c.limit)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Savings Goals */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Savings Goals</h2>
            <div className="space-y-2.5">
              {savingsGoals.slice(0, 3).map(g => {
                const pct = calculateGoalProgress(g);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{g.name}</span>
                      <span className="text-white font-medium">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title, value, sub, up, icon, color, invertColors
}: {
  title: string; value: string; sub: string; up: boolean;
  icon: React.ReactNode; color: string; invertColors?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: 'text-emerald-400' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', icon: 'text-rose-400' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', icon: 'text-violet-400' },
    indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', icon: 'text-indigo-400' },
  };
  const c = colorMap[color] || colorMap.emerald;
  const isPositive = invertColors ? !up : up;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        <span>{sub}</span>
      </div>
    </div>
  );
}
