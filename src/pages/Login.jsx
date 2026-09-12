import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(form);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      if (data.user?.role === 'cashier') {
        navigate('/pos');
      } else if (data.user?.role === 'superAdmin') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans flex flex-col lg:grid lg:grid-cols-12 overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT PANEL: Branding, Value Proposition & Dashboard Preview (lg+)   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 border-r border-brand-800/60 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-accent/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(127,212,168,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(127,212,168,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Top: Brand Header with Duotone Icon */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {/* Duotone Logo Square */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-900 to-brand-950 border border-brand-700/80 shadow-lg flex items-center justify-center text-brand-accent relative overflow-hidden group">
              <div className="absolute inset-0 bg-brand-accent/10 opacity-50" />
              <svg
                className="w-6 h-6 text-brand-accent drop-shadow-[0_0_8px_rgba(127,212,168,0.6)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                Inventory POS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-brand-accent block">
                Multi-Tenant Retail ERP
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Value Proposition & Live Dashboard Preview Cards */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/90 border border-brand-700/50 text-brand-accent text-xs font-semibold mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            Live Retail Sync Active
          </div>

          <h2 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
            Manage all your branches, stock, and sales from one trusted platform.
          </h2>

          <p className="text-sm text-neutral-300 leading-relaxed mb-7 max-w-md">
            Real-time multi-branch inventory tracking, fast cashier POS terminals, and automated
            financial customer ledgers built for serious commerce.
          </p>

          {/* ── Mock Dashboard Preview Cards ──────────────────────────────── */}
          <div className="space-y-3 max-w-md">
            {/* Stat Card 1: Today's Revenue */}
            <div className="p-4 rounded-xl bg-brand-900/60 border border-brand-700/60 shadow-md backdrop-blur-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300 block mb-0.5">
                  Today&apos;s Gross Revenue
                </span>
                <span className="font-mono text-xl font-extrabold text-white tracking-tight">
                  $24,850.00
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  +14.2%
                </span>
                <span className="text-[10px] text-neutral-400 mt-1 font-mono">vs yesterday</span>
              </div>
            </div>

            {/* Stat Card 2: Connected Branches & POS sync */}
            <div className="p-3.5 rounded-xl bg-brand-900/40 border border-brand-800/80 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-800/80 border border-brand-700/60 flex items-center justify-center text-brand-accent shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-white block">4 Active Branches</span>
                  <span className="text-[11px] text-neutral-400">Main • Lahore • Multan • Islamabad</span>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                Synced
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: Trust & Security Badges */}
        <div className="relative z-10 pt-4 border-t border-brand-800/50 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <svg className="w-3.5 h-3.5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Encrypted Ledgers
            </span>
            <span>•</span>
            <span>Multi-Tenant Isolated</span>
          </div>
          <span className="font-mono text-[11px] text-brand-400">v2.4 Production</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL: Focused Authentication Form                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-10 sm:py-14 bg-neutral-950 relative min-h-screen">
        {/* Subtle background ambient ring */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-brand-900/10 blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Mobile Header Branding (Shown on mobile/tablet) */}
        <div className="lg:hidden flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-brand-900 border border-brand-700/80 shadow-md flex items-center justify-center text-brand-accent">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">
              Inventory POS
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-accent block">
              Enterprise POS & Inventory
            </span>
          </div>
        </div>

        {/* ── Elevated Form Card ───────────────────────────────────────────── */}
        <div className="w-full max-w-[440px] bg-neutral-900 border border-neutral-800 shadow-2xl rounded-2xl p-7 sm:p-9 relative z-10 animate-auth-in">
          {/* Subtle top accent highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent"
            aria-hidden="true"
          />

          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Inventory Manager
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Sign in to your account to continue
            </p>
          </div>

          {/* ── Form Inputs ────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 bg-neutral-800/80 border rounded-xl outline-none transition-all duration-150 ${
                    errors.email
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-neutral-700/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 focus:bg-neutral-800'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 bg-neutral-800/80 border rounded-xl outline-none transition-all duration-150 ${
                    errors.password
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-neutral-700/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 focus:bg-neutral-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/60 transition-colors"
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-brand-accent hover:bg-brand-200 text-brand-950 shadow-lg shadow-brand-accent/15 transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Spinner size="sm" className="text-brand-950" />}
                <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              </button>
            </div>
          </form>

          {/* ── Footer Navigation ─────────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center text-xs text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-brand-accent hover:text-brand-200 font-semibold hover:underline transition-colors ml-1"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Clean minimal footer */}
        <p className="mt-6 text-[11px] text-neutral-500 text-center">
          Secure cloud retail infrastructure • All transactions encrypted
        </p>
      </div>
    </div>
  );
}

