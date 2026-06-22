import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Flame, Shield, Home, TrendingUp, Edit2, Check, History } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatCompact } from '../utils/formatters';
import {
  projectNetWorth, calculateFIRE, getTotalInvestmentValue, getTotalAccountBalances,
  yearsToReachTarget, getAnnualizedReturn, toSgdAmount,
} from '../utils/calculations';
import MoneyInput from '../components/common/MoneyInput';
import InfoTooltip from '../components/common/InfoTooltip';
import type { ProfileValueHistoryEntry } from '../types';

// Turns a list of "value that held until this date" records plus the current live value into a
// human-readable timeline, oldest first, ending with the value in effect today.
function historyTimeline(history: ProfileValueHistoryEntry[], current: number, fmt: (n: number) => string): string[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const lines = sorted.map((h) => `${fmt(h.amount)} (until ${h.date})`);
  lines.push(`${fmt(current)} (current)`);
  return lines;
}

export default function Planning() {
  const {
    profile, investments, savingsGoals, accounts, transactions, updateProfile, usdSgdRate,
    netWorthHistory, recordNetWorthSnapshot, incomeHistory, expensesHistory,
  } = useFinanceStore();
  const [editProfile, setEditProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ ...profile });

  // FIRE inputs
  const [fireInputs, setFireInputs] = useState({
    annualExpenses: String(profile.retirementAnnualExpenses ?? profile.monthlyIncome * 0.6 * 12),
    annualReturn: '7',
    monthlyContribution: String(profile.monthlySavingsTarget),
    // Singapore's 20-year long-term average CPI inflation runs ~2.1%; used to discount the
    // projection back to today's purchasing power (the "real" line on the chart).
    inflationRate: '2.1',
  });

  const totalSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalInvestments = getTotalInvestmentValue(investments, usdSgdRate);
  const totalAccountBalances = getTotalAccountBalances(accounts, transactions);
  const netWorth = totalSavings + totalInvestments + totalAccountBalances;

  // Records one snapshot per calendar day so the chart below can show an "Actual" line —
  // your real track record — alongside the projected nominal/real lines.
  useEffect(() => {
    recordNetWorthSnapshot(netWorth);
  }, [netWorth, recordNetWorthSnapshot]);

  // Latest recorded snapshot per calendar year, so years with multiple visits collapse to one point.
  const actualByYear = useMemo(() => {
    const map: Record<number, number> = {};
    [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date)).forEach(({ date, value }) => {
      map[Number(date.slice(0, 4))] = value;
    });
    return map;
  }, [netWorthHistory]);

  // Cost-weighted CAGR across all current holdings, used as a starting suggestion (not auto-applied)
  // for the Annual Return % input below — minus a flat 2-point haircut per the user's "be safer" rule.
  const portfolioAnnualizedReturn = useMemo(() => {
    const weightedCost = investments.reduce((sum, inv) => sum + toSgdAmount(inv.units * inv.buyPrice, inv.platform, usdSgdRate), 0);
    if (weightedCost <= 0) return 0;
    return investments.reduce((sum, inv) => sum + getAnnualizedReturn(inv) * toSgdAmount(inv.units * inv.buyPrice, inv.platform, usdSgdRate), 0) / weightedCost;
  }, [investments, usdSgdRate]);
  const suggestedSaferReturn = Math.max(0, portfolioAnnualizedReturn - 2);

  const incomeHistoryLines = useMemo(
    () => historyTimeline(incomeHistory, profile.monthlyIncome, formatCurrency),
    [incomeHistory, profile.monthlyIncome]
  );
  const expensesHistoryLines = useMemo(
    () => historyTimeline(expensesHistory, parseFloat(fireInputs.annualExpenses) || 0, formatCurrency),
    [expensesHistory, fireInputs.annualExpenses]
  );

  const annualReturn = parseFloat(fireInputs.annualReturn) || 7;
  const inflationRate = parseFloat(fireInputs.inflationRate) || 0;

  const projectionData = useMemo(() => {
    return projectNetWorth(
      netWorth,
      parseFloat(fireInputs.monthlyContribution) || 0,
      annualReturn,
      30,
      inflationRate
    ).map((d, i) => ({ ...d, age: profile.currentAge + i, actualValue: actualByYear[d.year] }));
  }, [netWorth, fireInputs, annualReturn, inflationRate, profile.currentAge, actualByYear]);

  const fireResult = useMemo(() => {
    return calculateFIRE(
      netWorth,
      parseFloat(fireInputs.annualExpenses) || 0,
      parseFloat(fireInputs.monthlyContribution) || 0,
      annualReturn
    );
  }, [netWorth, fireInputs, annualReturn]);

  const fireYear = new Date().getFullYear() + fireResult.years;
  const fireAge = profile.currentAge + fireResult.years;

  // Emergency fund
  const emergencyTarget = profile.monthlyIncome * 6;
  const emergencyGoal = savingsGoals.find(g => g.category === 'emergency');
  const emergencyCurrent = emergencyGoal?.currentAmount || 0;
  const emergencyPct = Math.min(100, (emergencyCurrent / emergencyTarget) * 100);

  // Retirement scenario
  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const retirementProjection = projectNetWorth(
    netWorth,
    profile.monthlySavingsTarget,
    annualReturn,
    yearsToRetirement
  );
  const projectedRetirementWealth = retirementProjection[retirementProjection.length - 1]?.value || 0;

  // When will the user actually hit their manually-set retirement target (if any)?
  const yearsToRetirementTarget = profile.retirementTargetAmount
    ? yearsToReachTarget(netWorth, profile.monthlySavingsTarget, annualReturn, profile.retirementTargetAmount)
    : null;
  const retirementTargetYear = yearsToRetirementTarget != null ? new Date().getFullYear() + yearsToRetirementTarget : null;
  const retirementTargetAge = yearsToRetirementTarget != null ? profile.currentAge + yearsToRetirementTarget : null;

  function saveProfile() {
    updateProfile(profileDraft);
    setEditProfile(false);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Long-term Planning</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your financial roadmap</p>
        </div>
        {editProfile ? (
          <div className="flex gap-2">
            <button onClick={() => setEditProfile(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={saveProfile} className="btn-primary flex items-center gap-1.5 text-sm"><Check size={14} /> Save</button>
          </div>
        ) : (
          <button onClick={() => { setProfileDraft({ ...profile }); setEditProfile(true); }} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Edit2 size={14} /> Edit Profile
          </button>
        )}
      </div>

      {/* Profile */}
      {editProfile && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Financial Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label flex items-center gap-1">
                Monthly Income (take-home)
                {incomeHistory.length > 0 && (
                  <InfoTooltip lines={incomeHistoryLines}>
                    <History size={12} className="text-slate-500" />
                  </InfoTooltip>
                )}
              </label>
              <MoneyInput className="input" value={profileDraft.monthlyIncome} onChange={raw => setProfileDraft(p => ({ ...p, monthlyIncome: Number(raw) || 0 }))} />
            </div>
            <div>
              <label className="label">Current Age</label>
              <input className="input" type="number" value={profileDraft.currentAge} onChange={e => setProfileDraft(p => ({ ...p, currentAge: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Target Retirement Age</label>
              <input className="input" type="number" value={profileDraft.retirementAge} onChange={e => setProfileDraft(p => ({ ...p, retirementAge: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Monthly Savings Target</label>
              <MoneyInput className="input" value={profileDraft.monthlySavingsTarget} onChange={raw => setProfileDraft(p => ({ ...p, monthlySavingsTarget: Number(raw) || 0 }))} />
            </div>
            <div>
              <label className="label">Target Retirement Amount</label>
              <MoneyInput className="input" value={profileDraft.retirementTargetAmount ?? ''} onChange={raw => setProfileDraft(p => ({ ...p, retirementTargetAmount: raw ? Number(raw) : undefined }))} />
            </div>
            <div>
              <label className="label">Risk Tolerance</label>
              <select className="input" value={profileDraft.riskTolerance} onChange={e => setProfileDraft(p => ({ ...p, riskTolerance: e.target.value as typeof profile.riskTolerance }))}>
                <option value="conservative">Conservative (4-5% return)</option>
                <option value="moderate">Moderate (6-8% return)</option>
                <option value="aggressive">Aggressive (9-12% return)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoTooltip lines={[
          `Savings goals: ${formatCurrency(totalSavings)}`,
          `Investments: ${formatCurrency(totalInvestments)}`,
          `Account balances: ${formatCurrency(totalAccountBalances)}`,
          `Total = ${formatCurrency(totalSavings)} + ${formatCurrency(totalInvestments)} + ${formatCurrency(totalAccountBalances)} = ${formatCurrency(netWorth)}`,
        ]}>
          <div className="card">
            <div className="text-xs text-slate-400 mb-1">Current Net Worth</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
            <div className="text-xs text-slate-500 mt-0.5">savings + investments + accounts</div>
          </div>
        </InfoTooltip>
        <InfoTooltip lines={[
          `Annual expenses (retirement): ${formatCurrency(parseFloat(fireInputs.annualExpenses) || 0)}`,
          'FIRE number = 25 × annual expenses (4% safe withdrawal rule)',
          `= 25 × ${formatCurrency(parseFloat(fireInputs.annualExpenses) || 0)} = ${formatCurrency(fireResult.targetAmount)}`,
        ]}>
          <div className="card">
            <div className="text-xs text-slate-400 mb-1">FIRE Target</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400">{formatCurrency(fireResult.targetAmount)}</div>
            <div className="text-xs text-slate-500 mt-0.5">25× annual expenses</div>
          </div>
        </InfoTooltip>
        <InfoTooltip lines={[
          `Starting net worth: ${formatCurrency(netWorth)}`,
          `Monthly contribution: ${formatCurrency(parseFloat(fireInputs.monthlyContribution) || 0)}`,
          `Annual return: ${annualReturn}%`,
          `Target (25× expenses): ${formatCurrency(fireResult.targetAmount)}`,
          `Net worth is compounded month-by-month until it reaches the target → ~${fireResult.years} years → ${fireYear} (age ${fireAge})`,
        ]}>
          <div className="card">
            <div className="text-xs text-slate-400 mb-1">FIRE in ~{fireResult.years} years</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{fireYear}</div>
            <div className="text-xs text-slate-500 mt-0.5">age {fireAge}</div>
          </div>
        </InfoTooltip>
        <InfoTooltip lines={[
          `Years to retirement age ${profile.retirementAge}: ${yearsToRetirement}`,
          `Monthly savings target: ${formatCurrency(profile.monthlySavingsTarget)}`,
          `Annual return: ${annualReturn}%`,
          `Starting net worth ${formatCurrency(netWorth)} compounded monthly for ${yearsToRetirement} years ≈ ${formatCurrency(projectedRetirementWealth)}`,
          ...(profile.retirementTargetAmount ? [`Target: ${formatCurrency(profile.retirementTargetAmount)}`] : []),
          ...(retirementTargetYear != null ? [`On track to hit that target in ${retirementTargetYear} (age ${retirementTargetAge})`] : []),
        ]}>
          <div className="card">
            <div className="text-xs text-slate-400 mb-1">Retirement at {profile.retirementAge}</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-400">{formatCurrency(projectedRetirementWealth)}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {profile.retirementTargetAmount
                ? `${((projectedRetirementWealth / profile.retirementTargetAmount) * 100).toFixed(0)}% of ${formatCurrency(profile.retirementTargetAmount)} target`
                : 'projected wealth'}
            </div>
            {retirementTargetYear != null && (
              <div className="text-xs text-blue-400 mt-0.5">Target hit ~{retirementTargetYear} (age {retirementTargetAge})</div>
            )}
          </div>
        </InfoTooltip>
      </div>

      {/* Net Worth Projection */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">30-Year Net Worth Projection</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-xs text-slate-400 mr-1.5">Annual Return %</label>
              <input
                className="input w-16 py-1 text-xs inline"
                type="number"
                step="0.5"
                value={fireInputs.annualReturn}
                onChange={e => setFireInputs(f => ({ ...f, annualReturn: e.target.value }))}
              />
              {portfolioAnnualizedReturn !== 0 && (
                <button
                  type="button"
                  onClick={() => setFireInputs(f => ({ ...f, annualReturn: suggestedSaferReturn.toFixed(1) }))}
                  className="ml-1.5 text-[11px] text-slate-400 hover:text-emerald-400 underline"
                  title={`Your portfolio's cost-weighted annualized return is ${portfolioAnnualizedReturn.toFixed(1)}%/yr. This applies a safer -2pp haircut.`}
                >
                  use safer {suggestedSaferReturn.toFixed(1)}%
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 mr-1.5">Inflation Rate %</label>
              <input
                className="input w-16 py-1 text-xs inline"
                type="number"
                step="0.1"
                value={fireInputs.inflationRate}
                onChange={e => setFireInputs(f => ({ ...f, inflationRate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mr-1.5">Monthly Contribution</label>
              <MoneyInput
                className="input w-24 py-1 text-xs inline"
                value={fireInputs.monthlyContribution}
                onChange={raw => setFireInputs(f => ({ ...f, monthlyContribution: raw }))}
              />
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={projectionData}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${formatCompact(v)}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as { value: number; realValue: number; age: number; actualValue?: number };
                return (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs space-y-1">
                    <div className="text-slate-300 font-medium">{label} · age {point.age}</div>
                    <div className="text-emerald-400">Projected (nominal): {formatCurrency(point.value)}</div>
                    <div className="text-amber-400">Projected (real, today's $): {formatCurrency(point.realValue)}</div>
                    {point.actualValue != null && <div className="text-blue-400">Actual: {formatCurrency(point.actualValue)}</div>}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v) => v === 'Net Worth' ? 'Projected (nominal)' : v === 'Real Net Worth' ? 'Projected (real)' : 'Actual'}
            />
            <Area type="monotone" dataKey="value" name="Net Worth" stroke="#10b981" strokeWidth={2.5} fill="url(#netWorthGradient)" dot={false} />
            <Area type="monotone" dataKey="realValue" name="Real Net Worth" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" fill="transparent" dot={false} />
            <Area type="monotone" dataKey="actualValue" name="Actual" stroke="#3b82f6" strokeWidth={2} fill="transparent" dot={{ r: 3, fill: '#3b82f6' }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">
          "Actual" tracks your real net worth once a day while this page is open — it'll fill in as a track record over time so you can see if you're ahead of or behind the projection.
        </p>
      </div>

      {/* FIRE Calculator + Emergency Fund */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* FIRE */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Flame size={16} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">FIRE Calculator</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label flex items-center gap-1">
                Annual Expenses (in retirement)
                {expensesHistory.length > 0 && (
                  <InfoTooltip lines={expensesHistoryLines}>
                    <History size={12} className="text-slate-500" />
                  </InfoTooltip>
                )}
              </label>
              <MoneyInput
                className="input"
                value={fireInputs.annualExpenses}
                onChange={raw => setFireInputs(f => ({ ...f, annualExpenses: raw }))}
                onBlur={() => {
                  const parsed = parseFloat(fireInputs.annualExpenses);
                  if (!isNaN(parsed) && parsed !== profile.retirementAnnualExpenses) {
                    updateProfile({ retirementAnnualExpenses: parsed });
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-800/60 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">FIRE Number (25× rule)</span>
              <span className="text-white font-semibold">{formatCurrency(fireResult.targetAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current Progress</span>
              <span className="text-emerald-400">{fireResult.targetAmount > 0 ? ((netWorth / fireResult.targetAmount) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Estimated Years to FIRE</span>
              <span className="text-amber-400 font-bold">{fireResult.years < 600 ? `~${fireResult.years} years` : 'Increase contributions'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">FIRE Year / Age</span>
              <span className="text-white">{fireYear} / Age {fireAge}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.min(100, fireResult.targetAmount > 0 ? (netWorth / fireResult.targetAmount) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Emergency Fund + Milestones */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Shield size={16} className="text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Emergency Fund</h2>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Target (6 months expenses)</span>
              <span className="text-white">{formatCurrency(emergencyTarget)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-400">Current</span>
              <span className={emergencyPct >= 100 ? 'text-emerald-400 font-medium' : 'text-white'}>{formatCurrency(emergencyCurrent)}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${emergencyPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{emergencyPct.toFixed(0)}% funded</span>
              <span>{emergencyPct < 100 ? `${formatCurrency(emergencyTarget - emergencyCurrent)} to go` : '✓ Fully funded'}</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Net Worth Milestones</h2>
            </div>
            {[10000, 50000, 100000, 250000, 500000, 1000000].map(milestone => {
              const pct = Math.min(100, (netWorth / milestone) * 100);
              const reached = netWorth >= milestone;
              return (
                <div key={milestone} className="flex items-center gap-3 mb-2.5">
                  <div className={`text-xs font-medium w-20 ${reached ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {reached ? '✓ ' : ''}{formatCurrency(milestone, '$')}
                  </div>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
