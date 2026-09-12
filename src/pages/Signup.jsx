import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const INITIAL = { firstName: '', lastName: '', email: '', password: '', organizationName: '' };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ── Password Strength Computation (0-4 score) ─────────────────────────
  const passwordStrength = useMemo(() => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: 'bg-neutral-700' };

    let score = 0;
    if (p.length >= 6) score += 1;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 1;

    if (p.length < 6 || score <= 1) {
      return { score: 1, label: 'Weak (min. 6 characters)', color: 'bg-rose-500', text: 'text-rose-400' };
    }
    if (score <= 3) {
      return { score: 2, label: 'Medium strength', color: 'bg-amber-400', text: 'text-amber-400' };
    }
    return { score: 3, label: 'Strong password', color: 'bg-emerald-400', text: 'text-emerald-400' };
  }, [form.password]);

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.organizationName.trim()) errs.organizationName = 'Organization name is required';
    if (!form.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
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
      const data = await signup(form);
      toast.success(`Welcome, ${data.user.firstName}! Your organization is ready.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans flex flex-col lg:grid lg:grid-cols-12 overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT PANEL: Branding, Architecture Overview & Value Prop (lg+)       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 border-r border-brand-800/60 relative overflow-hidden">
        {/* Ambient background glows */}
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
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-900 to-brand-950 border border-brand-700/80 shadow-lg flex items-center justify-center text-brand-accent relative overflow-hidden">
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
                Enterprise Multi-Tenant Setup
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Onboarding Highlights & SaaS Architecture Preview */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/90 border border-brand-700/50 text-brand-accent text-xs font-semibold mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            14-Day Full Access Evaluation
          </div>

          <h2 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
            Build your multi-branch enterprise on solid financial infrastructure.
          </h2>

          <p className="text-sm text-neutral-300 leading-relaxed mb-7 max-w-md">
            Sign up your organization in minutes. Add branches, assign managers and cashiers, and
            track daily sales with complete ledger auditability.
          </p>

          {/* ── Architecture Highlights Cards ────────────────────────────── */}
          <div className="space-y-3 max-w-md">
            <div className="p-4 rounded-xl bg-brand-900/60 border border-brand-700/60 shadow-md backdrop-blur-xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand-800/80 border border-brand-700/60 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Multi-Branch Architecture</span>
                <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                  Isolate branch stock, cashiers, and sales while retaining master-level oversight from head office.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-900/40 border border-brand-800/80 shadow-xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand-800/80 border border-brand-700/60 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Role-Based Access Control</span>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Admins, Branch Managers, and Cashiers each get dedicated, tamper-proof workflows.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Security Credentials */}
        <div className="relative z-10 pt-4 border-t border-brand-800/50 flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            No credit card required
          </span>
          <span className="font-mono text-[11px] text-brand-400">Instant Activation</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL: Signup Registration Form                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-10 sm:py-14 bg-neutral-950 relative min-h-screen">
        {/* Subtle background ambient glow */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-brand-900/10 blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Mobile Header Branding (Shown on mobile/tablet) */}
        <div className="lg:hidden flex items-center gap-3 mb-6">
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
              Enterprise Multi-Tenant Setup
            </span>
          </div>
        </div>

        {/* ── Elevated Form Card ───────────────────────────────────────────── */}
        <div className="w-full max-w-[480px] bg-neutral-900 border border-neutral-800 shadow-2xl rounded-2xl p-6 sm:p-9 relative z-10 animate-auth-in">
          {/* Subtle top accent highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent"
            aria-hidden="true"
          />

          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Set up your organization and start managing your inventory
            </p>
          </div>

          {/* ── Registration Form ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* First Name & Last Name (Two-Column Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
                >
                  First name
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 bg-neutral-800/80 border rounded-xl outline-none transition-all duration-150 ${
                      errors.firstName
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-neutral-700/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 focus:bg-neutral-800'
                    }`}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
                >
                  Last name
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 bg-neutral-800/80 border rounded-xl outline-none transition-all duration-150 ${
                      errors.lastName
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-neutral-700/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 focus:bg-neutral-800'
                    }`}
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label
                htmlFor="organizationName"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
              >
                Organization name
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  value={form.organizationName}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 bg-neutral-800/80 border rounded-xl outline-none transition-all duration-150 ${
                    errors.organizationName
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-neutral-700/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 focus:bg-neutral-800'
                  }`}
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-brand-accent/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This is your business name — you can add branches after signup.
              </p>
              {errors.organizationName && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errors.organizationName}
                </p>
              )}
            </div>

            {/* Email Address */}
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

            {/* Password & Strength Meter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300"
                >
                  Password
                </label>
                {form.password && (
                  <span className={`text-[10px] font-mono font-semibold ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                )}
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
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
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

              {/* 3-Segment Password Strength Meter */}
              {form.password.length > 0 && (
                <div className="flex gap-1.5 mt-2" aria-label="Password strength meter">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 1 ? passwordStrength.color : 'bg-neutral-700'
                    }`}
                  />
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 2 ? passwordStrength.color : 'bg-neutral-700'
                    }`}
                  />
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 3 ? passwordStrength.color : 'bg-neutral-700'
                    }`}
                  />
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-brand-accent hover:bg-brand-200 text-brand-950 shadow-lg shadow-brand-accent/15 transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Spinner size="sm" className="text-brand-950" />}
                <span>{loading ? 'Creating account…' : 'Create account'}</span>
              </button>
            </div>
          </form>

          {/* ── Footer Link ───────────────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center text-xs text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-accent hover:text-brand-200 font-semibold hover:underline transition-colors ml-1"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Clean minimal footer */}
        <p className="mt-6 text-[11px] text-neutral-500 text-center">
          Multi-branch enterprise retail ERP • Safe & secure registration
        </p>
      </div>
    </div>
  );
}

