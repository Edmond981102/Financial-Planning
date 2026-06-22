import { X, Edit2, User, ShieldCheck, PieChart } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { getCpfBreakdown } from '../../utils/cpf';
import { normalizeAllocationTargets } from '../../utils/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';

const RESIDENCY_LABELS: Record<string, string> = {
  citizen: 'Singapore Citizen',
  pr: 'Permanent Resident',
  foreigner: 'Foreigner / Other',
};

const BUCKET_LABELS: Record<string, string> = {
  savings: 'Savings',
  expenses: 'Expenses',
  investments: 'Investments',
};

interface Props {
  onClose: () => void;
  onEdit: () => void;
}

export default function ProfileSummary({ onClose, onEdit }: Props) {
  const profile = useFinanceStore((s) => s.profile);
  const cpf = getCpfBreakdown(profile);
  const allocationTargets = normalizeAllocationTargets(profile.allocationTargets);
  const allocationEntries = Object.entries(allocationTargets);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Your Financial Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="card !bg-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><User size={13} /> Income & Age</div>
            <Row label="Name" value={profile.name} />
            <Row label="Monthly income" value={formatCurrency(profile.monthlyIncome)} />
            <Row label="Date of birth" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth, 'MMM d, yyyy') : '—'} />
            <Row label="Current age" value={String(profile.currentAge)} />
            <Row label="Target retirement age" value={String(profile.retirementAge)} />
            <Row label="Target retirement amount" value={profile.retirementTargetAmount ? formatCurrency(profile.retirementTargetAmount) : '—'} />
          </div>

          <div className="card !bg-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><ShieldCheck size={13} /> Residency & CPF</div>
            <Row label="Residency status" value={profile.residencyStatus ? RESIDENCY_LABELS[profile.residencyStatus] : '—'} />
            {profile.residencyStatus === 'pr' && (
              <Row label="PR start date" value={profile.prStartDate ? formatDate(profile.prStartDate, 'MMM d, yyyy') : '—'} />
            )}
            {cpf.applicable ? (
              <Row label="Estimated take-home pay" value={formatCurrency(cpf.takeHomePay)} valueClass="text-emerald-400" />
            ) : (
              <Row label="CPF deductions" value="None" />
            )}
          </div>

          <div className="card !bg-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><PieChart size={13} /> Budget Split</div>
            {allocationEntries.length > 0 ? (
              allocationEntries.map(([bucket, pct]) => (
                <Row key={bucket} label={BUCKET_LABELS[bucket] ?? bucket} value={`${pct}%`} />
              ))
            ) : (
              <Row label="Budget split" value="Not set" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button onClick={onEdit} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Edit2 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`text-white font-medium ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
