import { useState, FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FinanceIQ</div>
            <div className="text-xs text-slate-400">Smart Money Manager</div>
          </div>
        </div>
        <h1 className="text-lg font-bold text-white mb-1">{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
        <p className="text-xs text-slate-400 mb-5">
          {mode === 'signin' ? 'Access your data from any device.' : 'Set a password to sync your data everywhere.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {info && <p className="text-xs text-emerald-400">{info}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center">
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
          className="text-xs text-slate-400 hover:text-white mt-4 w-full text-center"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
