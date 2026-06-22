import { ReactNode } from 'react';

interface Props {
  lines: ReactNode[];
  children: ReactNode;
}

// Wraps a card/metric so hovering reveals a breakdown of the numbers/formula behind it.
export default function InfoTooltip({ lines, children }: Props) {
  return (
    <div className="relative group/tooltip cursor-help">
      {children}
      <div className="invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 transition-opacity absolute z-30 left-0 top-full mt-2 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1.5">
        {lines.map((line, i) => (
          <div key={i} className="text-slate-300 leading-snug">{line}</div>
        ))}
      </div>
    </div>
  );
}
