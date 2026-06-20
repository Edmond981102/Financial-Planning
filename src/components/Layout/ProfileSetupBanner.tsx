import { AlertTriangle } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { getProfileCompletion } from '../../utils/calculations';

export default function ProfileSetupBanner() {
  const { profile, reopenOnboarding } = useFinanceStore();
  const completion = getProfileCompletion(profile);
  if (completion === 'complete') return null;

  const isPartial = completion === 'partial';

  return (
    <div
      className={`sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-3 border-b ${
        isPartial ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className={`shrink-0 ${isPartial ? 'text-amber-400' : 'text-rose-400'}`} />
        <div className="text-sm">
          <span className={`font-medium ${isPartial ? 'text-amber-300' : 'text-rose-300'}`}>
            {isPartial ? 'Your financial profile is partially set up.' : 'Your financial profile setup is incomplete.'}
          </span>
          <span className="text-slate-400 ml-2">Add your residency status and budget split so FinanceIQ can give you accurate advice.</span>
        </div>
      </div>
      <button onClick={reopenOnboarding} className="btn-secondary shrink-0 text-xs">Complete setup</button>
    </div>
  );
}
