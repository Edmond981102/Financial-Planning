import { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
  getLast6MonthsData, getMonthExpenses, getMonthIncome, getCategoryTotals,
  getMonthTransactions, predictNextMonthSpending, getSpendingInsights,
  getMonthlySubscriptionTotal, calculateGoalProgress, getTotalInvestmentValue,
  getInvestmentReturn
} from '../utils/calculations';
import { format, subMonths } from 'date-fns';

export default function Insights() {
  const { transactions, subscriptions, savingsGoals, investments, profile, usdSgdRate } = useFinanceStore();

  const thisMonth = format(new Date(), 'yyyy-MM');
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

  const monthlyData = useMemo(() => getLast6MonthsData(transactions), [transactions]);
  const predicted = useMemo(() => predictNextMonthSpending(transactions), [transactions]);
  const insights = useMemo(() => getSpendingInsights(transactions), [transactions]);

  const thisExpenses = getMonthExpenses(transactions, thisMonth);
  const lastExpenses = getMonthExpenses(transactions, lastMonth);
  const thisIncome = getMonthIncome(transactions, thisMonth);

  const savingsRate = thisIncome > 0 ? ((thisIncome - thisExpenses) / thisIncome) * 100 : 0;
  const monthlySubCost = getMonthlySubscriptionTotal(subscriptions);
  const subPct = thisIncome > 0 ? (monthlySubCost / thisIncome) * 100 : 0;

  const categoryThisMonth = useMemo(() => getCategoryTotals(getMonthTransactions(transactions, thisMonth), 'expense'), [transactions, thisMonth]);
  const categoryLastMonth = useMemo(() => getCategoryTotals(getMonthTransactions(transactions, lastMonth), 'expense'), [transactions, lastMonth]);

  const categoryComparison = useMemo(() => {
    const map: Record<string, { thisMonth: number; lastMonth: number }> = {};
    categoryThisMonth.forEach(({ name, value }) => {
      if (!map[name]) map[name] = { thisMonth: 0, lastMonth: 0 };
      map[name].thisMonth = value;
    });
    categoryLastMonth.forEach(({ name, value }) => {
      if (!map[name]) map[name] = { thisMonth: 0, lastMonth: 0 };
      map[name].lastMonth = value;
    });
    return Object.entries(map)
      .map(([name, vals]) => ({ name, ...vals, change: vals.lastMonth > 0 ? ((vals.thisMonth - vals.lastMonth) / vals.lastMonth) * 100 : 0 }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [categoryThisMonth, categoryLastMonth]);

  const investmentValue = getTotalInvestmentValue(investments, usdSgdRate);
  const investmentReturn = getInvestmentReturn(investments, usdSgdRate);

  const predictedData = [...monthlyData, {
    month: 'Next',
    income: profile.monthlyIncome,
    expenses: predicted,
    savings: profile.monthlyIncome - predicted,
  }];

  // Score calculation
  const scores: { label: string; score: number; desc: string }[] = [
    {
      label: 'Savings Rate',
      score: Math.min(100, savingsRate * 4),
      desc: savingsRate >= 20 ? 'Excellent! Keep it up.' : savingsRate >= 10 ? 'Good, aim for 20%+.' : 'Try to save more each month.',
    },
    {
      label: 'Emergency Fund',
      score: Math.min(100, (savingsGoals.find(g => g.category === 'emergency')?.currentAmount || 0) / (profile.monthlyIncome * 6) * 100),
      desc: 'Target: 6 months of expenses.',
    },
    {
      label: 'Investment Diversity',
      score: Math.min(100, investments.length * 15),
      desc: investments.length >= 5 ? 'Well diversified portfolio.' : 'Consider diversifying further.',
    },
    {
      label: 'Budget Adherence',
      score: lastExpenses > 0 ? Math.max(0, 100 - Math.abs((thisExpenses - lastExpenses) / lastExpenses) * 200) : 50,
      desc: 'Consistency in monthly spending.',
    },
  ];

  const overallScore = Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">AI Insights</h1>
        <p className="text-slate-400 text-sm mt-0.5">Intelligent analysis of your finances</p>
      </div>

      {/* Financial Health Score */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="text-center shrink-0">
            <div className={`text-5xl font-black ${overallScore >= 70 ? 'text-emerald-400' : overallScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {overallScore}
            </div>
            <div className="text-xs text-slate-400 mt-1">Financial Health Score</div>
            <div className="text-xs mt-0.5 font-medium">
              {overallScore >= 70 ? '🟢 Excellent' : overallScore >= 50 ? '🟡 Good' : '🔴 Needs Work'}
            </div>
          </div>
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scores.map(sc => (
              <div key={sc.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{sc.label}</span>
                  <span className={`font-medium ${sc.score >= 70 ? 'text-emerald-400' : sc.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {sc.score.toFixed(0)}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${sc.score}%`,
                      background: sc.score >= 70 ? '#10b981' : sc.score >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{sc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Cards */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-400" /> Smart Recommendations
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
              <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb size={12} className="text-amber-400" />
              </div>
              <p className="text-sm text-slate-300">{insight}</p>
            </div>
          ))}

          {/* Additional recommendations */}
          {subPct > 15 && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                Subscriptions consume <span className="text-rose-400 font-medium">{formatPercent(subPct)}</span> of your income ({formatCurrency(monthlySubCost)}/mo).
                Review inactive or overlapping services to save money.
              </p>
            </div>
          )}

          {savingsRate >= 20 && (
            <div className="flex items-start gap-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                Your savings rate of <span className="text-emerald-400 font-medium">{formatPercent(savingsRate)}</span> is excellent.
                You're on track for a strong financial future!
              </p>
            </div>
          )}

          {investmentReturn !== 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <TrendingUp size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                Your investment portfolio of <span className="text-blue-400 font-medium">{formatCurrency(investmentValue)}</span> is returning{' '}
                <span className={`font-medium ${investmentReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {investmentReturn >= 0 ? '+' : ''}{formatPercent(investmentReturn)}
                </span>. {investmentReturn > 10 ? 'Outstanding performance!' : 'Keep investing consistently.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trends & Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-1">Spending Trend & Prediction</h2>
          <p className="text-xs text-slate-500 mb-4">Next month projected at {formatCurrency(predicted)}</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={predictedData}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expGrad)" strokeDasharray="0"
                dot={(props: any) => {
                  const { cx, cy, index } = props;
                  if (index === predictedData.length - 1) {
                    return <circle cx={cx} cy={cy} r={5} fill="#f43f5e" stroke="#0f172a" strokeWidth={2} strokeDasharray="4 2" />;
                  }
                  return <circle cx={cx} cy={cy} r={3} fill="#f43f5e" stroke="#0f172a" strokeWidth={1} />;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-1">Category Changes</h2>
          <p className="text-xs text-slate-500 mb-4">This month vs last month</p>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {categoryComparison.slice(0, 8).map(cat => {
              const up = cat.change > 0;
              const noChange = cat.lastMonth === 0;
              return (
                <div key={cat.name} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 w-28 text-xs truncate">{cat.name}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="h-1.5 bg-slate-800 rounded flex-1 overflow-hidden">
                      <div className="h-full bg-slate-700 rounded" style={{ width: `${Math.min(100, (cat.lastMonth / (Math.max(cat.thisMonth, cat.lastMonth) || 1)) * 100)}%` }} />
                    </div>
                    <ArrowRight size={10} className="text-slate-700 shrink-0" />
                    <div className="h-1.5 bg-slate-800 rounded flex-1 overflow-hidden">
                      <div className="h-full rounded" style={{
                        width: `${Math.min(100, (cat.thisMonth / (Math.max(cat.thisMonth, cat.lastMonth) || 1)) * 100)}%`,
                        background: cat.thisMonth > cat.lastMonth ? '#f43f5e' : '#10b981',
                      }} />
                    </div>
                  </div>
                  {!noChange && (
                    <span className={`text-xs font-medium w-14 text-right ${up ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {up ? '+' : ''}{cat.change.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">6-Month Summary</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
            <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="savings" name="Savings" radius={[3, 3, 0, 0]} barSize={14}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.savings >= 0 ? '#3b82f6' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Avg Monthly Income</div>
            <div className="text-lg font-bold text-emerald-400">
              {formatCurrency(monthlyData.reduce((s, d) => s + d.income, 0) / (monthlyData.filter(d => d.income > 0).length || 1))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Avg Monthly Expenses</div>
            <div className="text-lg font-bold text-rose-400">
              {formatCurrency(monthlyData.reduce((s, d) => s + d.expenses, 0) / (monthlyData.filter(d => d.expenses > 0).length || 1))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Avg Monthly Savings</div>
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(monthlyData.reduce((s, d) => s + d.savings, 0) / (monthlyData.filter(d => d.income > 0).length || 1))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
