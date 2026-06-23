import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Menu, Wallet } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useFinanceStore } from './store/useFinanceStore';
import Login from './components/Auth/Login';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import Sidebar from './components/Layout/Sidebar';
import ProfileSetupBanner from './components/Layout/ProfileSetupBanner';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Subscriptions from './pages/Subscriptions';
import Savings from './pages/Savings';
import Investments from './pages/Investments';
import Planning from './pages/Planning';
import Insights from './pages/Insights';
import Accounts from './pages/Accounts';
import ActivityLog from './pages/ActivityLog';

const PAGES: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: Transactions,
  accounts: Accounts,
  budget: Budget,
  subscriptions: Subscriptions,
  savings: Savings,
  investments: Investments,
  planning: Planning,
  insights: Insights,
  activityLog: ActivityLog,
};

const SYNC_DEBOUNCE_MS = 1500;

async function pushToCloud(userId: string) {
  const snapshot = useFinanceStore.getState().getSyncableState();
  await supabase.from('user_data').upsert({ id: userId, data: snapshot, updated_at: new Date().toISOString() });
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeView = useFinanceStore((s) => s.activeView);
  const onboardingComplete = useFinanceStore((s) => s.onboardingComplete);
  const processAutoSubscriptions = useFinanceStore((s) => s.processAutoSubscriptions);
  const checkBudgetRollover = useFinanceStore((s) => s.checkBudgetRollover);
  const setUsdSgdRate = useFinanceStore((s) => s.setUsdSgdRate);
  const PageComponent = PAGES[activeView] || Dashboard;

  // Fetched once app-wide (not per-page) so every page's net-worth total converts
  // StashAway's USD holdings to SGD consistently, regardless of which page loads first.
  useEffect(() => {
    fetch('/api/quote?symbols=USDSGD=X')
      .then(res => res.json())
      .then(data => {
        const rate = data['USDSGD=X'];
        if (typeof rate === 'number') setUsdSgdRate(rate);
      })
      .catch(() => {});
  }, [setUsdSgdRate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Pull this user's data from the cloud once per login; seed the cloud on first-ever login.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_data')
        .select('data')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.data) {
        useFinanceStore.getState().hydrateFromCloud(data.data);
      } else {
        await pushToCloud(session.user.id);
      }
      useFinanceStore.getState().migrateCreditCardBalanceSemantics();
      useFinanceStore.getState().migrateMonthlyIncomeToNet();
      useFinanceStore.getState().migrateCreditCardBalanceAsOf();
    })();
    return () => { cancelled = true; };
  }, [session?.user.id]);

  // Push local changes to the cloud (debounced) so other devices can pick them up.
  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useFinanceStore.subscribe(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => pushToCloud(userId), SYNC_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [session?.user.id]);

  useEffect(() => {
    processAutoSubscriptions();
    checkBudgetRollover();
  }, [processAutoSubscriptions, checkBudgetRollover]);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!onboardingComplete) {
    return <OnboardingWizard />;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white">FinanceIQ</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <ProfileSetupBanner />
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
