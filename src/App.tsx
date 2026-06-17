import { useEffect } from 'react';
import { useFinanceStore } from './store/useFinanceStore';
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

export default function App() {
  const activeView = useFinanceStore((s) => s.activeView);
  const processAutoSubscriptions = useFinanceStore((s) => s.processAutoSubscriptions);
  const checkBudgetRollover = useFinanceStore((s) => s.checkBudgetRollover);
  const PageComponent = PAGES[activeView] || Dashboard;

  useEffect(() => {
    processAutoSubscriptions();
    checkBudgetRollover();
  }, [processAutoSubscriptions, checkBudgetRollover]);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageComponent />
      </main>
    </div>
  );
}
