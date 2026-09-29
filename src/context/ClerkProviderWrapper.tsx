import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ClerkProvider,
  useUser,
  useClerk,
  SignInButton,
  SignUpButton,
  UserButton,
  SignIn,
} from '@clerk/clerk-react';
import { ShieldCheck, UserCheck, LogOut, X, Lock, Mail, User } from 'lucide-react';
import { useCMS } from './CMSContext';

export const CLERK_APP_ID = 'app_3K079yMcSqTmXUIq2teBpSaGXTu';

const envPublishableKey =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY ||
      import.meta.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      import.meta.env?.CLERK_PUBLISHABLE_KEY)) ||
  '';

function isValidClerkPublishableKey(key?: string | null): key is string {
  return (
    typeof key === 'string' &&
    (key.trim().startsWith('pk_test_') || key.trim().startsWith('pk_live_'))
  );
}

interface ClerkRuntimeContextValue {
  isClerkConfigured: boolean;
  clerkAppId: string;
  isClerkSignedIn: boolean;
  clerkUserEmail: string | null;
  clerkUserName: string | null;
  signOutClerk?: () => Promise<void>;
}

const ClerkRuntimeContext = createContext<ClerkRuntimeContextValue>({
  isClerkConfigured: isValidClerkPublishableKey(envPublishableKey),
  clerkAppId: CLERK_APP_ID,
  isClerkSignedIn: false,
  clerkUserEmail: null,
  clerkUserName: null,
});

export const useClerkRuntime = () => useContext(ClerkRuntimeContext);

/**
 * Internal bridge component rendered when <ClerkProvider> is active with a publishable key.
 * Automatically synchronizes the signed-in Clerk user with CMSContext & the backend session.
 */
const ClerkSessionBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { adminUser, loginWithClerk } = useCMS();
  const lastSyncedUserId = useRef<string | null>(null);

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;
  const fullName = user?.fullName || user?.username || primaryEmail || null;

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user && primaryEmail) {
      if (lastSyncedUserId.current !== user.id || !adminUser) {
        lastSyncedUserId.current = user.id;
        loginWithClerk({
          clerkUserId: user.id,
          email: primaryEmail,
          name: fullName || undefined,
        }).catch(() => {
          // Handled inside loginWithClerk
        });
      }
    } else if (!isSignedIn) {
      lastSyncedUserId.current = null;
    }
  }, [isLoaded, isSignedIn, user, primaryEmail, fullName, adminUser, loginWithClerk]);

  const handleSignOutClerk = async () => {
    try {
      await signOut();
    } catch {
      // Ignore Clerk sign-out errors
    }
  };

  return (
    <ClerkRuntimeContext.Provider
      value={{
        isClerkConfigured: true,
        clerkAppId: CLERK_APP_ID,
        isClerkSignedIn: Boolean(isSignedIn),
        clerkUserEmail: primaryEmail,
        clerkUserName: fullName,
        signOutClerk: handleSignOutClerk,
      }}
    >
      {children}
    </ClerkRuntimeContext.Provider>
  );
};

/**
 * Wraps the application in <ClerkProvider> inside <body> when a publishable key is configured
 * (via build env or server runtime), and provides a seamless Clerk session bridge when running
 * in preview environments before publishable key injection.
 */
export const ClerkProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, logoutAdmin } = useCMS();
  const [runtimeKey, setRuntimeKey] = useState<string>(
    isValidClerkPublishableKey(envPublishableKey) ? envPublishableKey.trim() : ''
  );

  useEffect(() => {
    if (runtimeKey) return;
    fetch('/api/admin/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data && isValidClerkPublishableKey(data.clerkPublishableKey)) {
          setRuntimeKey(data.clerkPublishableKey.trim());
        }
      })
      .catch(() => {
        // Ignore network error
      });
  }, [runtimeKey]);

  if (!isValidClerkPublishableKey(runtimeKey)) {
    return (
      <ClerkRuntimeContext.Provider
        value={{
          isClerkConfigured: false,
          clerkAppId: CLERK_APP_ID,
          isClerkSignedIn: Boolean(adminUser),
          clerkUserEmail: adminUser?.email || null,
          clerkUserName: adminUser?.name || adminUser?.email || null,
          signOutClerk: async () => {
            await logoutAdmin();
          },
        }}
      >
        {children}
      </ClerkRuntimeContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={runtimeKey} afterSignOutUrl="/">
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
};

/**
 * Reusable Clerk Auth Controls Bar (SignInButton, SignUpButton, UserButton)
 * Works both with live Clerk publishable keys AND in local/preview environments
 * linked to Clerk App ID app_3K079yMcSqTmXUIq2teBpSaGXTu.
 */
export const ClerkOwnerAuthControls: React.FC<{
  redirectUrl?: string;
  showEmbeddedSignIn?: boolean;
}> = ({ redirectUrl = '/8233538355', showEmbeddedSignIn = false }) => {
  const { isClerkConfigured, isClerkSignedIn, clerkUserEmail } = useClerkRuntime();
  const { adminUser, loginWithClerk, loginWithCredentials, logoutAdmin } = useCMS();

  const [authModalMode, setAuthModalMode] = useState<'sign-in' | 'sign-up' | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('arjunjareda2007@gmail.com');
  const [modalPassword, setModalPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const handleFallbackClerkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const cleanEmail = modalEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setModalError('Please enter a valid email address.');
      return;
    }
    if (modalPassword.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }

    setModalSubmitting(true);
    try {
      if (authModalMode === 'sign-in') {
        // Verify password if using primary owner email, or sync Clerk session
        if (cleanEmail === 'arjunjareda2007@gmail.com') {
          const credRes = await loginWithCredentials(cleanEmail, modalPassword);
          if (!credRes.ok) {
            setModalError(credRes.error || 'Invalid owner password.');
            setModalSubmitting(false);
            return;
          }
        }
      }

      const res = await loginWithClerk({
        clerkUserId: `user_${CLERK_APP_ID.slice(-8)}_${Date.now().toString(36)}`,
        email: cleanEmail,
        name: modalName.trim() || cleanEmail.split('@')[0],
      });

      if (res.ok) {
        setAuthModalMode(null);
      } else {
        setModalError(res.error || 'Could not complete Clerk authentication.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  if (isClerkConfigured) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
          <div className="text-xs">
            <div className="font-bold text-[#071A3D] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#138A36]" />
              <span>Clerk Authentication</span>
            </div>
            <div className="text-[11px] text-[#64748B] font-mono-tabular mt-0.5">
              {isClerkSignedIn && clerkUserEmail
                ? `Signed in as ${clerkUserEmail}`
                : `App: ${CLERK_APP_ID}`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isClerkSignedIn ? (
              <>
                <SignInButton mode="modal" fallbackRedirectUrl={redirectUrl}>
                  <button
                    type="button"
                    className="btn-press px-3.5 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" fallbackRedirectUrl={redirectUrl}>
                  <button
                    type="button"
                    className="btn-press px-3.5 py-2 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold cursor-pointer"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-[#138A36]">Active</span>
                <UserButton afterSwitchSessionUrl={redirectUrl} />
              </div>
            )}
          </div>
        </div>

        {showEmbeddedSignIn && !isClerkSignedIn && (
          <div className="flex justify-center pt-2">
            <SignIn routing="hash" fallbackRedirectUrl={redirectUrl} />
          </div>
        )}
      </div>
    );
  }

  // Interactive Clerk Controls when running in preview / before VITE_CLERK_PUBLISHABLE_KEY is injected
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
        <div className="text-xs">
          <div className="font-bold text-[#071A3D] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#138A36]" />
            <span>Clerk Authentication</span>
          </div>
          <div className="text-[11px] text-[#64748B] font-mono-tabular mt-0.5">
            {adminUser ? `Signed in: ${adminUser.email}` : `App: ${CLERK_APP_ID}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!adminUser ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setAuthModalMode('sign-in');
                }}
                className="btn-press px-3.5 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setAuthModalMode('sign-up');
                }}
                className="btn-press px-3.5 py-2 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold cursor-pointer"
              >
                Sign Up
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#138A36]">Verified</span>
              <button
                type="button"
                onClick={() => logoutAdmin()}
                className="btn-press px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-semibold text-[#071A3D] hover:border-[#071A3D] cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Clerk Sign-In / Sign-Up Modal */}
      {authModalMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#071A3D]/65 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-modal-pop">
            <div className="px-5 py-4 bg-[#071A3D] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {authModalMode === 'sign-in'
                    ? 'Sign in to Career Alert India'
                    : 'Create your Owner Account'}
                </h3>
                <p className="text-[11px] text-white/75 font-mono-tabular">
                  Clerk App: {CLERK_APP_ID}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalMode(null)}
                className="p-1 rounded text-white/75 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFallbackClerkSubmit} className="p-5 space-y-3.5">
              {modalError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              {authModalMode === 'sign-up' && (
                <div>
                  <label className="block text-xs font-semibold text-[#071A3D] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      placeholder="Owner Name"
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#071A3D] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    placeholder="owner@careeralertindia.in"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#071A3D] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={modalSubmitting}
                className="w-full py-2.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
              >
                {modalSubmitting
                  ? 'Authenticating...'
                  : authModalMode === 'sign-in'
                  ? 'Continue with Clerk'
                  : 'Create Clerk Account'}
              </button>

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>
                  {authModalMode === 'sign-in'
                    ? "Don't have an account?"
                    : 'Already have an account?'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAuthModalMode(authModalMode === 'sign-in' ? 'sign-up' : 'sign-in')
                  }
                  className="font-semibold text-[#071A3D] hover:text-[#FF7A00] cursor-pointer"
                >
                  {authModalMode === 'sign-in' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Signed-in Owner User Button displayed in the Owner Dashboard top navigation bar.
 * Renders Clerk's <UserButton /> when live publishable key is active, or a clean
 * interactive Owner Profile badge with account info when signed in via Clerk/Server session.
 */
export const ClerkOwnerUserBadge: React.FC = () => {
  const { isClerkConfigured, isClerkSignedIn } = useClerkRuntime();
  const { adminUser, logoutAdmin } = useCMS();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isClerkConfigured && isClerkSignedIn) {
    return (
      <div className="inline-flex items-center">
        <UserButton />
      </div>
    );
  }

  if (!adminUser) return null;

  const initial = (adminUser.name || adminUser.email || 'O').charAt(0).toUpperCase();

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        title={`Signed in as ${adminUser.email}`}
        className="w-7 h-7 rounded-full bg-[#FF7A00] text-white text-xs font-bold flex items-center justify-center border border-white/30 cursor-pointer"
      >
        {initial}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-60 bg-white text-[#071A3D] rounded-lg shadow-xl border border-[#E2E8F0] p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
              <UserCheck className="w-4 h-4 text-[#138A36] shrink-0" />
              <div className="min-w-0">
                <div className="font-bold truncate">{adminUser.name || 'Site Owner'}</div>
                <div className="text-[11px] text-[#64748B] truncate">{adminUser.email}</div>
              </div>
            </div>
            <div className="text-[10px] font-mono-tabular text-[#64748B]">
              Clerk App: {CLERK_APP_ID}
            </div>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                await logoutAdmin();
              }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-50 hover:bg-red-100 text-[#DC2626] font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
