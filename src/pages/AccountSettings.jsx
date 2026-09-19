import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getAccountProfile,
  updateAccountProfile,
  changePassword,
  updateOrganizationSettings,
} from '../services/accountService';
import Spinner from '../components/ui/Spinner';

const CURRENCY_PRESETS = [
  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (PKR - Rs.)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD - $)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR - €)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP - £)' },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal (SAR - ر.س)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (AED - د.إ)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR - ₹)' },
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar (CAD - $)' },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar (AUD - $)' },
];

const ROLE_BADGE_STYLES = {
  superAdmin: {
    bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    label: 'Super Admin',
  },
  admin: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    label: 'Store Owner / Admin',
  },
  manager: {
    bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    label: 'Branch Manager',
  },
  cashier: {
    bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    label: 'Cashier / POS Operator',
  },
};

export default function AccountSettings() {
  const { user, updateUser, permissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isCashier = user?.role === 'cashier';

  // Tabs: 'profile', 'security', 'organization' (admin only), 'work' (manager & cashier only)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'profile';
  });

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Organization Form (Admin Only)
  const [orgForm, setOrgForm] = useState({
    name: '',
    currencyCode: 'PKR',
    currencySymbol: 'Rs.',
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // Fetch full account profile on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getAccountProfile()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data?.data;
        if (data) {
          setProfileData(data);
          setProfileForm({
            firstName: data.user?.firstName || '',
            lastName: data.user?.lastName || '',
            email: data.user?.email || '',
            phone: data.user?.phone || data.employee?.phone || '',
          });

          if (data.organization) {
            setOrgForm({
              name: data.organization.name || '',
              currencyCode: data.organization.currency?.code || 'PKR',
              currencySymbol: data.organization.currency?.symbol || 'Rs.',
            });
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('getAccountProfile error:', err);
        // Fallback to local user info
        if (user) {
          setProfileForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
          });
        }
        toast.error('Failed to load profile details from server');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = passwordForm.newPassword;
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [passwordForm.newPassword]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!profileForm.email.trim()) {
      toast.error('Email address is required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateAccountProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim().toLowerCase(),
        phone: profileForm.phone.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Account profile updated successfully');
        if (res.data.user) {
          updateUser(res.data.user);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Organization Update (Admin Only)
  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setSavingOrg(true);
    try {
      const res = await updateOrganizationSettings({
        name: orgForm.name.trim(),
        currency: {
          code: orgForm.currencyCode.toUpperCase().trim(),
          symbol: orgForm.currencySymbol.trim(),
        },
      });

      if (res.data?.success) {
        toast.success('Organization settings updated successfully');
        // Update user context currency
        updateUser((prev) => ({
          ...prev,
          currency: res.data.organization?.currency || prev?.currency,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update organization settings');
    } finally {
      setSavingOrg(false);
    }
  };

  // Quick Currency Preset Click
  const selectCurrencyPreset = (preset) => {
    setOrgForm((prev) => ({
      ...prev,
      currencyCode: preset.code,
      currencySymbol: preset.symbol,
    }));
  };

  const userInitials =
    (user?.firstName ? user.firstName[0]?.toUpperCase() : 'U') +
    (user?.lastName ? user.lastName[0]?.toUpperCase() : '');

  const roleMeta = ROLE_BADGE_STYLES[user?.role] || {
    bg: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    label: user?.role || 'User',
  };

  const branchDisplay =
    profileData?.branch?.name ||
    (typeof user?.branchId === 'object' && user?.branchId?.name) ||
    user?.branchName ||
    (isAdmin ? 'All Branches (Owner)' : 'Assigned Branch');

  const joinedDate = profileData?.user?.createdAt
    ? new Date(profileData.user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Top Bar / Header Breadcrumb ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Account Settings
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleMeta.bg}`}
            >
              {roleMeta.label}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your personal profile, security credentials, and system preferences.
          </p>
        </div>

        {/* Action button: Back to POS for Cashiers/Managers */}
        {(isCashier || permissions?.sales?.create) && (
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-brand-800 dark:text-brand-accent bg-brand-100/70 dark:bg-brand-900/40 hover:bg-brand-200/70 dark:hover:bg-brand-900/70 border border-brand-300/80 dark:border-brand-700/60 rounded-xl transition-all shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Back to POS Register</span>
          </button>
        )}
      </div>

      {/* ── User Overview Card ──────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-900 to-brand-800 border-2 border-brand-700/60 text-brand-accent flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {user?.email}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                <svg className="w-3 h-3 text-brand-600 dark:text-brand-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate max-w-[180px]">{branchDisplay}</span>
              </span>

              {profileData?.organization?.name && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                  <svg className="w-3 h-3 text-brand-600 dark:text-brand-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate max-w-[180px]">{profileData.organization.name}</span>
                </span>
              )}

              {joinedDate && (
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  Member since {joinedDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-brand-800 dark:border-brand-accent text-brand-900 dark:text-brand-accent bg-white dark:bg-neutral-900 shadow-xs'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Personal Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-brand-800 dark:border-brand-accent text-brand-900 dark:text-brand-accent bg-white dark:bg-neutral-900 shadow-xs'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Security & Password</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('organization')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'organization'
                ? 'border-brand-800 dark:border-brand-accent text-brand-900 dark:text-brand-accent bg-white dark:bg-neutral-900 shadow-xs'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Organization & Business</span>
          </button>
        )}

        {(isManager || isCashier) && (
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'work'
                ? 'border-brand-800 dark:border-brand-accent text-brand-900 dark:text-brand-accent bg-white dark:bg-neutral-900 shadow-xs'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Work & Employment</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8 text-brand-800 dark:text-brand-accent" />
          <p className="text-xs text-neutral-400">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* ── TAB 1: Personal Profile ─────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-4 mb-6">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Personal Information
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Update your display name, contact phone, and login email address.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder="First name"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder="Last name"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Used for signing in to your account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+92 300 1234567"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Direct contact phone for official notifications.
                    </p>
                  </div>
                </div>

                {/* Read-only account overview chips */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Account Metadata (Managed by Administrator)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">System Role</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {roleMeta.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Assigned Location</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                        {branchDisplay}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Account Status</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 dark:bg-brand-700 dark:hover:bg-brand-600 rounded-xl transition-all shadow-xs disabled:opacity-60"
                  >
                    {savingProfile ? (
                      <>
                        <Spinner className="w-3.5 h-3.5 text-white" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 2: Security & Password ──────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-4 mb-6">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Change Account Password
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Protect your account with a secure password. You must verify your current password.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      placeholder="Enter your current password"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showCurrentPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showNewPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {passwordForm.newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">Strength:</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                          } flex-1`}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'
                          } flex-1`}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'
                          } flex-1`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                  />
                  {passwordForm.confirmPassword &&
                    passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
                    )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      savingPassword ||
                      (passwordForm.confirmPassword &&
                        passwordForm.newPassword !== passwordForm.confirmPassword)
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 dark:bg-brand-700 dark:hover:bg-brand-600 rounded-xl transition-all shadow-xs disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <>
                        <Spinner className="w-3.5 h-3.5 text-white" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 3: Organization Settings (Admin Only) ────────────────────── */}
          {activeTab === 'organization' && isAdmin && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-4 mb-6">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Organization & Business Preferences
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Configure your company brand name and official operating currency for POS, sales, and reports.
                </p>
              </div>

              <form onSubmit={handleOrgSubmit} className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Organization / Store Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    placeholder="e.g. Metro Retailers Pvt Ltd"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    This business name appears on customer receipts, invoices, and executive reports.
                  </p>
                </div>

                {/* Currency selection presets */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Default Currency Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CURRENCY_PRESETS.map((p) => {
                      const isSelected =
                        orgForm.currencyCode === p.code && orgForm.currencySymbol === p.symbol;
                      return (
                        <button
                          key={p.code + p.symbol}
                          type="button"
                          onClick={() => selectCurrencyPreset(p)}
                          className={`p-2 rounded-xl text-left border text-xs transition-all ${
                            isSelected
                              ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-800 dark:border-brand-accent text-brand-900 dark:text-brand-accent font-bold shadow-xs'
                              : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div className="font-mono font-bold text-sm">
                            {p.symbol} {p.code}
                          </div>
                          <div className="text-[10px] text-neutral-400 truncate">{p.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Currency Code
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={orgForm.currencyCode}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, currencyCode: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. PKR"
                      className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={orgForm.currencySymbol}
                      onChange={(e) => setOrgForm({ ...orgForm, currencySymbol: e.target.value })}
                      placeholder="e.g. Rs."
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-800/30 dark:focus:ring-brand-accent/30 focus:border-brand-800 dark:focus:border-brand-accent transition-all"
                    />
                  </div>
                </div>

                {/* Plan Information Card */}
                {profileData?.organization && (
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      Subscription Plan Status
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Active Plan</span>
                        <span className="font-bold uppercase text-brand-800 dark:text-brand-accent">
                          {profileData.organization.subscriptionPlan || 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Allowed Branches</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                          {profileData.organization.maxBranches || 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Billing Cycle</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
                          {profileData.organization.subscriptionStatus || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingOrg}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 dark:bg-brand-700 dark:hover:bg-brand-600 rounded-xl transition-all shadow-xs disabled:opacity-60"
                  >
                    {savingOrg ? (
                      <>
                        <Spinner className="w-3.5 h-3.5 text-white" />
                        <span>Saving Settings...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Organization Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 4: Work & Employment Info (Manager & Cashier Only) ───────── */}
          {activeTab === 'work' && (isManager || isCashier) && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs space-y-6">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Store Employment Details
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Information regarding your branch assignment, role designation, and workstation privileges.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Card */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60">
                  <div className="flex items-center gap-2 mb-2 text-brand-800 dark:text-brand-accent">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Assigned Branch</span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {profileData?.branch?.name || branchDisplay}
                  </h4>
                  {profileData?.branch?.address && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {profileData.branch.address}
                      {profileData.branch.city ? `, ${profileData.branch.city}` : ''}
                    </p>
                  )}
                  {profileData?.branch?.phone && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                      Branch Tel: {profileData.branch.phone}
                    </p>
                  )}
                </div>

                {/* Job Designation Card */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60">
                  <div className="flex items-center gap-2 mb-2 text-brand-800 dark:text-brand-accent">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Designation</span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {profileData?.employee?.designation || roleMeta.label}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-neutral-400">Monthly Compensation:</span>
                    <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                      {profileData?.employee?.monthlySalary && profileData.employee.monthlySalary > 0
                        ? `${profileData?.organization?.currency?.symbol || 'Rs.'} ${profileData.employee.monthlySalary.toLocaleString()}`
                        : 'Contact Administrator'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Need to return to sales counter?
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Your active cash register shift is open and ready.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pos')}
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 rounded-xl transition-all shadow-xs shrink-0"
                >
                  Open POS Register →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
