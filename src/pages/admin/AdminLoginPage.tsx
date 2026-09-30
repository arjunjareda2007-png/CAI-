import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignIn, SignUp, Show, UserButton, useAuth } from '@clerk/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { SEOHead } from '../../components/SEOHead';
import { BrandLogo } from '../../components/BrandLogo';

export const AdminLoginPage: React.FC = () => {
  const { adminUser } = useCMS();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  useEffect(() => {
    if (isLoaded && (isSignedIn || adminUser)) {
      navigate('/8233538355', { replace: true });
    }
  }, [isLoaded, isSignedIn, adminUser, navigate]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6F8FB] flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6">
      <SEOHead title="Admin Portal Authentication" canonicalPath="/8233538355/login" noIndex />

      <div className="w-full max-w-md mx-auto my-auto animate-fade-in-up">
        {/* Subtle Tricolour Strip */}
        <div className="h-1 w-24 mx-auto flex mb-5 rounded overflow-hidden">
          <div className="w-1/3 bg-[#FF7A00]" />
          <div className="w-1/3 bg-white border-y border-slate-200" />
          <div className="w-1/3 bg-[#138A36]" />
        </div>

        {/* Brand Identity Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-3 shadow-xs mb-3">
            <BrandLogo variant="header" size="md" theme="light" />
          </div>
          <h1 className="text-xs font-bold uppercase tracking-widest text-[#071A3D] mt-1">
            Admin Command Center Authentication
          </h1>
        </div>

        {/* Mode Switcher Tabs: Sign In / Sign Up */}
        <Show when="signed-out">
          <div className="mt-6 grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs">
            <button
              type="button"
              onClick={() => setAuthMode('sign-in')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'sign-in'
                  ? 'bg-[#071A3D] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#071A3D]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('sign-up')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'sign-up'
                  ? 'bg-[#FF7A00] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#071A3D]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            {authMode === 'sign-in' ? (
              <SignIn
                routing="hash"
                forceRedirectUrl="/8233538355"
                fallbackRedirectUrl="/8233538355"
              />
            ) : (
              <SignUp
                routing="hash"
                forceRedirectUrl="/8233538355"
                fallbackRedirectUrl="/8233538355"
              />
            )}
          </div>
        </Show>

        <Show when="signed-in">
          <div className="mt-6 bg-white py-6 px-6 shadow-sm rounded-xl border border-[#E2E8F0] space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#138A36]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Authenticated. Redirecting...</span>
              </div>
              <UserButton />
            </div>
            <Link
              to="/8233538355"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold transition-colors"
            >
              Open Admin Dashboard
            </Link>
          </div>
        </Show>

        <div className="mt-5 text-center space-y-3">
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
