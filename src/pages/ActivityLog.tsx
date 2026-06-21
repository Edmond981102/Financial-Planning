import { useMemo } from 'react';
import { History } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { ActivityLogEntry } from '../types';

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

export default function ActivityLog() {
  const activityLog = useFinanceStore((s) => s.activityLog);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; entries: ActivityLogEntry[] }>();
    activityLog.forEach((entry) => {
      const date = parseISO(entry.timestamp);
      const key = format(date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { label: dayLabel(date), entries: [] });
      map.get(key)!.entries.push(entry);
    });
    return Array.from(map.values());
  }, [activityLog]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400 text-sm mt-0.5">Everything you've added, edited, or removed — most recent first</p>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-16">
          <History size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No activity recorded yet.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="card">
            <h2 className="text-sm font-semibold text-white mb-3">{group.label}</h2>
            <div className="space-y-2.5">
              {group.entries.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 text-sm border-b border-slate-800/60 last:border-0 pb-2.5 last:pb-0">
                  <span className="text-slate-300">{entry.message}</span>
                  <span className="text-slate-500 text-xs shrink-0 mt-0.5">{format(parseISO(entry.timestamp), 'h:mm a')}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
