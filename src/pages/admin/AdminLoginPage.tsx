import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { SEOHead } from '../../components/SEOHead';
import { BrandLogo } from '../../components/BrandLogo';

const OWNER_EMAIL = 'arjunjareda2007@gmail.com';

export const AdminLoginPage: React.FC = () => {
  const { adminUser, loginWithCredentials, loginWithGoogle } = useCMS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (adminUser && adminUser.email.toLowerCase() === OWNER_EMAIL) {
      navigate('/owner-portal-cai/dashboard', { replace: true });
    }
  }, [adminUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (email.trim().toLowerCase() !== OWNER_EMAIL) {
      setErrorMsg('Access denied. This portal is restricted exclusively to the verified site owner.');
      return;
    }
    setLoading(true);
    const res = await loginWithCredentials(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      navigate('/owner-portal-cai/dashboard', { replace: true });
    } else {
      setErrorMsg(res.error || 'Invalid owner credentials.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.ok) {
      navigate('/owner-portal-cai/dashboard', { replace: true });
    } else {
      setErrorMsg(res.error || 'Owner Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6F8FB] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6">
      <SEOHead title="Owner Authentication Portal" canonicalPath="/owner-portal-cai/login" noIndex />

      <div className="w-full max-w-md mx-auto animate-fade-in-up">
        <div className="h-1 w-24 mx-auto flex mb-5 rounded overflow-hidden">
          <div className="w-1/3 bg-[#FF7A00]" />
          <div className="w-1/3 bg-white border-y border-slate-200" />
          <div className="w-1/3 bg-[#138A36]" />
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-3 shadow-xs mb-3">
            <BrandLogo variant="header" size="md" theme="light" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#071A3D] mt-1">
            Restricted Owner Security Portal
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Authorized access exclusively for the verified Career Alert India owner
          </p>
        </div>

        <div className="mt-6 bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-sm rounded-xl border border-[#E2E8F0]">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-300 flex items-start gap-2.5 text-xs text-red-900 animate-scale-in">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-[#071A3D] mb-1"
              >
                Verified Owner Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter owner email address"
                className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#071A3D] mb-1"
              >
                Owner Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter owner password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071A3D]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#071A3D] hover:bg-[#0D2758] disabled:opacity-60 text-white text-sm font-semibold transition-all btn-press cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#FF7A00] shrink-0" />
              <span>{loading ? 'Verifying Owner Identity...' : 'Authenticate Owner Session'}</span>
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-[#E2E8F0] flex-1" />
            <span className="text-[11px] font-semibold uppercase text-[#64748B] whitespace-nowrap">
              Or Verified Firebase OAuth
            </span>
            <div className="h-px bg-[#E2E8F0] flex-1" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold transition-all btn-press cursor-pointer"
          >
            Sign In with Verified Owner Google Account
          </button>

          <div className="mt-5 p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] text-xs text-[#64748B] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#071A3D]">
              <ShieldCheck className="w-4 h-4 text-[#138A36] shrink-0" />
              <span>Hardware & Session Protected Access</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Protected by HTTP-only signed session tokens, brute-force rate limiting, and strict Firestore owner-only security rules.
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#071A3D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Return to Career Alert India Public Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
