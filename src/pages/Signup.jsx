import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const INITIAL = { firstName: '', lastName: '', email: '', password: '', organizationName: '' };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await signup(form);
      toast.success(`Welcome, ${data.user.firstName}! Your account is ready.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shared input style helpers
  const inputBase = {
    background: 'rgba(0,30,45,0.6)',
    border: '1px solid rgba(125,191,178,0.15)',
  };
  const onFocusStyle = (e) => {
    e.target.style.border = '1px solid rgba(125,191,178,0.5)';
    e.target.style.boxShadow = '0 0 0 3px rgba(61,122,122,0.15), 0 0 20px rgba(61,122,122,0.1)';
    e.target.style.background = 'rgba(0,45,65,0.8)';
  };
  const onBlurStyle = (e) => {
    e.target.style.border = '1px solid rgba(125,191,178,0.15)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(0,30,45,0.6)';
  };

  const inputCls =
    'w-full pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 rounded-xl outline-none transition-all duration-200';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5';
  const labelStyle = { color: 'rgba(197,216,213,0.7)' };
  const iconStyle = { color: 'rgba(125,191,178,0.5)' };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #001220 0%, #001B29 40%, #002D3E 100%)' }}
    >
      {/* ── Ambient orbs ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3D7A7A 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #7DBFB2 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, #3D7A7A 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(125,191,178,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,191,178,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Glass card ────────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-lg"
        style={{
          background: 'rgba(0,30,45,0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(125,191,178,0.15)',
          borderRadius: '24px',
          boxShadow:
            '0 0 0 1px rgba(125,191,178,0.08), 0 25px 50px rgba(0,18,32,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px rounded-t-3xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(125,191,178,0.6), transparent)',
          }}
        />

        <div className="p-8">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="text-center mb-7">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative"
              style={{
                background: 'linear-gradient(135deg, #3D7A7A, #7DBFB2)',
                boxShadow: '0 0 30px rgba(61,122,122,0.5), 0 0 60px rgba(61,122,122,0.2)',
              }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                />
              </svg>
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(125,191,178,0.7)' }}>
              Set up your organization and get started
            </p>
          </div>

          {/* ── Form ────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={labelCls} style={labelStyle}>
                  First name
                </label>
                <div className="relative">
                  <div
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={iconStyle}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
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
                    className={inputCls}
                    style={inputBase}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className={labelCls} style={labelStyle}>
                  Last name
                </label>
                <div className="relative">
                  <div
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={iconStyle}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
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
                    className={inputCls}
                    style={inputBase}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organizationName" className={labelCls} style={labelStyle}>
                Organization name
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={iconStyle}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
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
                  className={inputCls}
                  style={inputBase}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelCls} style={labelStyle}>
                Email address
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={iconStyle}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
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
                  className={inputCls}
                  style={inputBase}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelCls} style={labelStyle}>
                Password
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={iconStyle}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
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
                  className="w-full pl-10 pr-11 py-3 text-sm text-white placeholder-white/40 rounded-xl outline-none transition-all duration-200"
                  style={inputBase}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: showPass ? 'rgba(125,191,178,0.9)' : 'rgba(125,191,178,0.4)' }}
                >
                  {showPass ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mt-2 relative overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #3D7A7A, #4E9090)',
                boxShadow: loading
                  ? 'none'
                  : '0 0 20px rgba(61,122,122,0.4), 0 4px 15px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.target.style.boxShadow =
                    '0 0 30px rgba(61,122,122,0.6), 0 4px 20px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  e.target.style.boxShadow =
                    '0 0 20px rgba(61,122,122,0.4), 0 4px 15px rgba(0,0,0,0.3)';
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
              />
              <span className="flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" />}
                {loading ? 'Creating account…' : 'Create account'}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(197,216,213,0.5)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold transition-colors"
              style={{ color: 'rgba(125,191,178,0.9)' }}
              onMouseEnter={(e) => {
                e.target.style.color = '#7DBFB2';
                e.target.style.textShadow = '0 0 12px rgba(125,191,178,0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(125,191,178,0.9)';
                e.target.style.textShadow = 'none';
              }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <div
          className="absolute inset-x-0 bottom-0 h-px rounded-b-3xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(61,122,122,0.3), transparent)',
          }}
        />
      </div>
    </div>
  );
}
