import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useFinanceStore } from './store/useFinanceStore';
import Login from './components/Auth/Login';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Subscriptions from './pages/Subscriptions';
import Savings from './pages/Savings';
import Investments from './pages/Investments';
import Planning from './pages/Planning';
import Insights from './pages/Insights';

const PAGES: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: Transactions,
  budget: Budget,
  subscriptions: Subscriptions,
  savings: Savings,
  investments: Investments,
  planning: Planning,
  insights: Insights,
};

const SYNC_DEBOUNCE_MS = 1500;

async function pushToCloud(userId: string) {
  const snapshot = useFinanceStore.getState().getSyncableState();
  await supabase.from('user_data').upsert({ id: userId, data: snapshot, updated_at: new Date().toISOString() });
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const activeView = useFinanceStore((s) => s.activeView);
  const processAutoSubscriptions = useFinanceStore((s) => s.processAutoSubscriptions);
  const checkBudgetRollover = useFinanceStore((s) => s.checkBudgetRollover);
  const PageComponent = PAGES[activeView] || Dashboard;

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

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageComponent />
      </main>
    </div>
  );
}
