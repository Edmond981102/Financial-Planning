import { formatCurrency } from '../../utils/formatters';

interface Props {
  currency: 'SGD' | 'MYR';
  onCurrencyChange: (currency: 'SGD' | 'MYR') => void;
  rate: number;
  onRateChange: (rate: number) => void;
  convertedAmount?: number;
}

export default function CurrencyToggle({ currency, onCurrencyChange, rate, onRateChange, convertedAmount }: Props) {
  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <div className="flex rounded-lg overflow-hidden border border-slate-700 text-[11px] shrink-0">
        {(['SGD', 'MYR'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCurrencyChange(c)}
            className={`px-2 py-0.5 font-medium transition-colors ${
              currency === c ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {currency === 'MYR' && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap">
          <span>1 MYR =</span>
          <input
            type="number"
            step="0.001"
            min="0"
            className="w-14 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            value={rate}
            onChange={(e) => onRateChange(parseFloat(e.target.value) || 0)}
          />
          <span>SGD</span>
          {convertedAmount !== undefined && (
            <span className="text-emerald-400 ml-1">≈ {formatCurrency(convertedAmount)}</span>
          )}
        </div>
      )}
    </div>
  );
}
