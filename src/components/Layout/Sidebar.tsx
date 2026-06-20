import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, CreditCard,
  Target, TrendingUp, Map, Lightbulb, LogOut, Wallet, Settings, Landmark
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { supabase } from '../../lib/supabase';
import { getCpfBreakdown } from '../../utils/cpf';
import { getProfileCompletion } from '../../utils/calculations';
import ProfileSummary from './ProfileSummary';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
  { id: 'budget', label: 'Budget', icon: PieChart },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'savings', label: 'Savings Goals', icon: Target },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'planning', label: 'Long-term Plan', icon: Map },
  { id: 'insights', label: 'AI Insights', icon: Lightbulb },
];

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: Props) {
  const { activeView, setActiveView, profile, reopenOnboarding } = useFinanceStore();
  const takeHomePay = getCpfBreakdown(profile).takeHomePay;
  const completion = getProfileCompletion(profile);
  const [showProfileSummary, setShowProfileSummary] = useState(false);

  function handleSettingsClick() {
    if (completion === 'complete') {
      setShowProfileSummary(true);
    } else {
      reopenOnboarding();
    }
  }

  function handleNavClick(id: string) {
    setActiveView(id);
    onCloseMobile();
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FinanceIQ</div>
            <div className="text-xs text-slate-400">Smart Money Manager</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile.name}</div>
              <div className="text-xs text-emerald-400">{profile.currencySymbol}{Math.round(takeHomePay).toLocaleString()} / mo</div>
              <div className="text-[10px] text-slate-500">take-home, after CPF</div>
            </div>
          </div>
          <button
            onClick={handleSettingsClick}
            title={completion === 'complete' ? 'View financial profile setup' : 'Finish setting up your financial profile'}
            className="relative p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <Settings size={15} />
            {completion !== 'complete' && (
              <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-2 ring-slate-900 ${
                completion === 'partial' ? 'bg-amber-400' : 'bg-rose-500'
              }`} />
            )}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon size={17} className={active ? 'text-emerald-400' : ''} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>

      {showProfileSummary && (
        <ProfileSummary
          onClose={() => setShowProfileSummary(false)}
          onEdit={() => { setShowProfileSummary(false); reopenOnboarding(); }}
        />
      )}
      </aside>
    </>
  );
}
