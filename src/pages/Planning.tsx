import { useState, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Flame, Shield, Home, TrendingUp, Edit2, Check } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatCompact } from '../utils/formatters';
import { projectNetWorth, calculateFIRE, getTotalInvestmentValue } from '../utils/calculations';

export default function Planning() {
  const { profile, investments, savingsGoals, updateProfile } = useFinanceStore();
  const [editProfile, setEditProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ ...profile });

  // FIRE inputs
  const [fireInputs, setFireInputs] = useState({
    annualExpenses: String(profile.monthlyIncome * 0.6 * 12),
    annualReturn: '7',
    monthlyContribution: String(profile.monthlySavingsTarget),
  });

  const totalSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalInvestments = getTotalInvestmentValue(investments);
  const netWorth = totalSavings + totalInvestments;

  const projectionData = useMemo(() => {
    return projectNetWorth(
      netWorth,
      parseFloat(fireInputs.monthlyContribution) || 0,
      parseFloat(fireInputs.annualReturn) || 7,
      30
    );
  }, [netWorth, fireInputs]);

  const fireResult = useMemo(() => {
    return calculateFIRE(
      netWorth,
      parseFloat(fireInputs.annualExpenses) || 0,
      parseFloat(fireInputs.monthlyContribution) || 0,
      parseFloat(fireInputs.annualReturn) || 7
    );
  }, [netWorth, fireInputs]);

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
    parseFloat(fireInputs.annualReturn) || 7,
    yearsToRetirement
  );
  const projectedRetirementWealth = retirementProjection[retirementProjection.length - 1]?.value || 0;

  function saveProfile() {
    updateProfile(profileDraft);
    setEditProfile(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Long-term Planning</h1>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Monthly Income</label>
              <input className="input" type="number" value={profileDraft.monthlyIncome} onChange={e => setProfileDraft(p => ({ ...p, monthlyIncome: Number(e.target.value) }))} />
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
              <input className="input" type="number" value={profileDraft.monthlySavingsTarget} onChange={e => setProfileDraft(p => ({ ...p, monthlySavingsTarget: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Target Retirement Amount</label>
              <input className="input" type="number" value={profileDraft.retirementTargetAmount ?? ''} onChange={e => setProfileDraft(p => ({ ...p, retirementTargetAmount: e.target.value ? Number(e.target.value) : undefined }))} />
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
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Current Net Worth</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
          <div className="text-xs text-slate-500 mt-0.5">savings + investments</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">FIRE Target</div>
          <div className="text-2xl font-bold text-amber-400">{formatCurrency(fireResult.targetAmount)}</div>
          <div className="text-xs text-slate-500 mt-0.5">25× annual expenses</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">FIRE in ~{fireResult.years} years</div>
          <div className="text-2xl font-bold text-emerald-400">{fireYear}</div>
          <div className="text-xs text-slate-500 mt-0.5">age {fireAge}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Retirement at {profile.retirementAge}</div>
          <div className="text-2xl font-bold text-blue-400">{formatCurrency(projectedRetirementWealth)}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {profile.retirementTargetAmount
              ? `${((projectedRetirementWealth / profile.retirementTargetAmount) * 100).toFixed(0)}% of ${formatCurrency(profile.retirementTargetAmount)} target`
              : 'projected wealth'}
          </div>
        </div>
      </div>

      {/* Net Worth Projection */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">30-Year Net Worth Projection</h2>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-slate-400 mr-1.5">Annual Return %</label>
              <input
                className="input w-16 py-1 text-xs inline"
                type="number"
                step="0.5"
                value={fireInputs.annualReturn}
                onChange={e => setFireInputs(f => ({ ...f, annualReturn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mr-1.5">Monthly Contribution</label>
              <input
                className="input w-24 py-1 text-xs inline"
                type="number"
                value={fireInputs.monthlyContribution}
                onChange={e => setFireInputs(f => ({ ...f, monthlyContribution: e.target.value }))}
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
              formatter={(v: number) => [formatCurrency(v), 'Net Worth']}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="value" name="Net Worth" stroke="#10b981" strokeWidth={2.5} fill="url(#netWorthGradient)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* FIRE Calculator + Emergency Fund */}
      <div className="grid grid-cols-2 gap-4">
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
              <label className="label">Annual Expenses (in retirement)</label>
              <input
                className="input"
                type="number"
                value={fireInputs.annualExpenses}
                onChange={e => setFireInputs(f => ({ ...f, annualExpenses: e.target.value }))}
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
