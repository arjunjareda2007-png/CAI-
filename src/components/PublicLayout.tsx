import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Bookmark,
  Calendar,
  ExternalLink,
  Pause,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { computePostStatus } from '../utils/statusAndSanitize';
import { BrandLogo } from './BrandLogo';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    publishedPosts,
    settings,
    bookmarks,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    trackEvent,
    toasts,
    dismissToast,
    adminUser,
  } = useCMS();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [tickerPaused, setTickerPaused] = useState(false);

  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Secret owner 5-tap counter on copyright text for mobile owner access
  const secretTapCountRef = useRef<number>(0);
  const secretTapTimerRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setSearchModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    if (!moreDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreDropdownOpen]);

  // Keyboard shortcuts:
  // - Ctrl+K / Cmd+K -> Open global search
  // - Ctrl+Shift+L / Cmd+Shift+L -> Hidden Owner Portal navigation (/8233538355)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        navigate(adminUser ? '/8233538355' : '/8233538355/login');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setMoreDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminUser, navigate]);

  const handleSecretCopyrightTap = () => {
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) {
      window.clearTimeout(secretTapTimerRef.current);
    }
    if (secretTapCountRef.current >= 5) {
      secretTapCountRef.current = 0;
      navigate(adminUser ? '/8233538355' : '/8233538355/login');
      return;
    }
    secretTapTimerRef.current = window.setTimeout(() => {
      secretTapCountRef.current = 0;
    }, 2000);
  };

  // Ticker items derived from featured/latest published posts or custom ticker items
  const tickerItems = React.useMemo(() => {
    if (settings.customTickerItems && settings.customTickerItems.length > 0) {
      return settings.customTickerItems;
    }
    return publishedPosts.slice(0, 6).map((p) => {
      const st = computePostStatus(p, settings.closingSoonThresholdDays);
      return {
        label: `${p.title} (${st.label})`,
        href: `/${p.category}/${p.slug}`,
      };
    });
  }, [publishedPosts, settings]);

  // Live instant search results in modal
  const modalSearchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedPosts
      .filter((p) => {
        if (searchCategory !== 'all' && p.category !== searchCategory) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.organization.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q) ||
          (p.qualification && p.qualification.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
        );
      })
      .slice(0, 8);
  }, [publishedPosts, searchQuery, searchCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      trackEvent('search', searchQuery.trim(), searchCategory);
    }
    setSearchModalOpen(false);
    navigate(
      `/search?q=${encodeURIComponent(searchQuery.trim())}${
        searchCategory !== 'all' ? `&category=${searchCategory}` : ''
      }`
    );
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center h-9 px-0.5 leading-none transition-colors whitespace-nowrap border-b-2 ${
      isActive
        ? 'text-white border-[#FF7A00] font-semibold'
        : 'border-transparent hover:text-white hover:border-white/40'
    }`;

  const xlNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `hidden xl:inline-flex items-center h-9 px-0.5 leading-none transition-colors whitespace-nowrap border-b-2 ${
      isActive
        ? 'text-white border-[#FF7A00] font-semibold'
        : 'border-transparent hover:text-white hover:border-white/40'
    }`;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#F6F8FB] text-[#071A3D]">
      {/* Subtle 3px Indian Tricolour Accent Strip at very top */}
      <div className="h-1 w-full flex shrink-0" aria-hidden="true">
        <div className="w-1/3 bg-[#FF7A00]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138A36]" />
      </div>

      {/* Top Bar Contract: 3-Zone Responsive Header */}
      <header className="sticky top-0 z-40 bg-[#071A3D] text-white border-b border-white/10 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Mobile Left Menu Button + Zone 1: Brand Emblem & Wordmark Lockup */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 -ml-1 rounded-md text-white/90 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5 shrink-0" />
            </button>

            <Link
              to="/"
              aria-label="Career Alert India Home"
              className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] rounded-md py-1 min-w-0"
            >
              <BrandLogo variant="header" theme="dark" />
            </Link>
          </div>

          {/* Zone 2: Desktop Primary Navigation Links */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-5 text-sm font-medium text-white/85 shrink-0"
          >
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/latest" className={navLinkClass}>
              Latest
            </NavLink>
            <NavLink to="/jobs" className={navLinkClass}>
              Jobs
            </NavLink>
            <NavLink to="/exams" className={navLinkClass}>
              Exams
            </NavLink>
            <NavLink to="/results" className={navLinkClass}>
              Results
            </NavLink>
            <NavLink to="/admit-card" className={navLinkClass}>
              Admit Card
            </NavLink>
            <NavLink to="/answer-key" className={xlNavLinkClass}>
              Answer Key
            </NavLink>
            <NavLink to="/syllabus" className={xlNavLinkClass}>
              Syllabus
            </NavLink>

            {/* More Dropdown */}
            <div ref={moreDropdownRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setMoreDropdownOpen((prev) => !prev)}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 h-9 px-0.5 leading-none border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  moreDropdownOpen
                    ? 'text-white border-[#FF7A00] font-semibold'
                    : 'border-transparent text-white/85 hover:text-white hover:border-white/40'
                }`}
              >
                <span>More</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    moreDropdownOpen ? 'rotate-180 text-[#FF7A00]' : ''
                  }`}
                />
              </button>

              {moreDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 bg-white text-[#071A3D] rounded-lg shadow-xl border border-[#E2E8F0] py-1.5 z-50 animate-modal-pop"
                >
                  <Link
                    to="/answer-key"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="xl:hidden block px-4 py-2 text-sm hover:bg-[#F6F8FB] transition-colors"
                  >
                    Answer Key
                  </Link>
                  <Link
                    to="/syllabus"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="xl:hidden block px-4 py-2 text-sm hover:bg-[#F6F8FB] transition-colors"
                  >
                    Syllabus
                  </Link>
                  <Link
                    to="/calendar"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-[#F6F8FB] transition-colors"
                  >
                    <span>Exam Calendar</span>
                    <Calendar className="w-4 h-4 text-[#64748B] shrink-0" />
                  </Link>
                  <Link
                    to="/saved"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-[#F6F8FB] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>Saved Updates</span>
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-[#FF7A00]">
                      {bookmarks.length}
                    </span>
                  </Link>
                  <div className="my-1 border-t border-[#E2E8F0]" />
                  <Link
                    to="/about"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="block px-4 py-1.5 text-xs text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] transition-colors"
                  >
                    About Career Alert India
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="block px-4 py-1.5 text-xs text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] transition-colors"
                  >
                    Contact Editorial Desk
                  </Link>
                  <Link
                    to="/privacy-policy"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="block px-4 py-1.5 text-xs text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/terms"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="block px-4 py-1.5 text-xs text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] transition-colors"
                  >
                    Terms of Use
                  </Link>
                  <Link
                    to="/disclaimer"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="block px-4 py-1.5 text-xs text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] transition-colors"
                  >
                    Official Source Disclaimer
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Primary Actions (Search + WhatsApp CTA) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search exams, jobs, results, and notifications"
              className="btn-press inline-flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white leading-none whitespace-nowrap cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#FF7A00] shrink-0" />
              <span className="hidden sm:inline leading-none">Search Updates...</span>
              <kbd className="hidden md:inline-flex items-center justify-center text-[10px] font-mono-tabular px-1.5 h-5 bg-white/10 rounded leading-none">
                ⌘K
              </kbd>
            </button>

            <a
              href={settings.whatsappChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('whatsapp_click', 'Header WhatsApp CTA')}
              className="btn-press hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md bg-[#138A36] hover:bg-[#10752D] text-xs font-semibold text-white leading-none whitespace-nowrap"
            >
              <span className="leading-none">WhatsApp Channel</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>
      </header>

      {/* Compact Latest Update Ticker (Accessible with Pause/Play button) */}
      {settings.tickerEnabled && tickerItems.length > 0 && (
        <div className="bg-white border-b border-[#E2E8F0] text-xs">
          <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-9 flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#071A3D] shrink-0 pr-2.5 border-r border-[#E2E8F0] leading-none">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs tracking-wide">LATEST UPDATE</span>
            </span>

            <div className="flex-1 overflow-hidden relative min-w-0">
              <div className={`animate-ticker gap-8 ${tickerPaused ? 'ticker-paused' : ''}`}>
                {[...tickerItems, ...tickerItems].map((item, idx) => (
                  <Link
                    key={`${item.href}-${idx}`}
                    to={item.href}
                    className="inline-flex items-center gap-1.5 text-[#071A3D] hover:text-[#FF7A00] font-medium whitespace-nowrap mr-8 transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#FF7A00] shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTickerPaused((p) => !p)}
              aria-label={tickerPaused ? 'Resume update ticker' : 'Pause update ticker'}
              className="inline-flex items-center justify-center w-6 h-6 text-[#64748B] hover:text-[#071A3D] shrink-0 rounded cursor-pointer"
              title={tickerPaused ? 'Resume Ticker' : 'Pause Ticker'}
            >
              {tickerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with route transition animation & mobile nav clearance */}
      <main
        key={location.pathname}
        className="flex-1 w-full max-w-full overflow-x-hidden pb-20 lg:pb-12 animate-fade-in-up"
      >
        {children}
      </main>

      {/* Professional Footer with Full Brand Emblem & Wordmark Lockup */}
      <footer className="bg-[#071A3D] text-white border-t border-white/10 pb-16 lg:pb-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            {/* Column 1: Brand Identity Lockup */}
            <div className="space-y-3">
              <Link to="/" className="inline-flex items-center focus:outline-none">
                <BrandLogo variant="header" theme="dark" />
              </Link>
              <p className="text-xs text-white/75 leading-relaxed pt-1">
                {settings.footerText}
              </p>
              <div className="pt-1 text-xs text-white/70 break-words">
                Editorial Contact:{' '}
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="text-white underline hover:text-[#FF7A00] transition-colors"
                >
                  {settings.contactEmail}
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Quick Links</h2>
              <ul className="space-y-2 text-xs text-white/75">
                <li>
                  <Link to="/latest" className="hover:text-white transition-colors">
                    Latest Career Updates
                  </Link>
                </li>
                <li>
                  <Link to="/jobs" className="hover:text-white transition-colors">
                    Government Jobs
                  </Link>
                </li>
                <li>
                  <Link to="/exams" className="hover:text-white transition-colors">
                    Competitive Exams
                  </Link>
                </li>
                <li>
                  <Link to="/results" className="hover:text-white transition-colors">
                    Exam Results &amp; Cut-Offs
                  </Link>
                </li>
                <li>
                  <Link to="/admit-card" className="hover:text-white transition-colors">
                    Admit Cards &amp; Hall Tickets
                  </Link>
                </li>
                <li>
                  <Link to="/answer-key" className="hover:text-white transition-colors">
                    Official Answer Keys
                  </Link>
                </li>
                <li>
                  <Link to="/syllabus" className="hover:text-white transition-colors">
                    Syllabus &amp; Exam Pattern
                  </Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-white transition-colors">
                    Exam Calendar 2026–27
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Important & Legal */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Important Information</h2>
              <ul className="space-y-2 text-xs text-white/75">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About Us &amp; Editorial Policy
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact Us / Report Correction
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/disclaimer" className="hover:text-white transition-colors">
                    Official Verification Disclaimer
                  </Link>
                </li>
                <li>
                  <Link to="/saved" className="hover:text-white transition-colors">
                    Saved Bookmarks ({bookmarks.length})
                  </Link>
                </li>
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    XML Sitemap
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Connect */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Connect With Us</h2>
              <p className="text-xs text-white/75 leading-relaxed mb-4">
                Receive verified notifications for new vacancies, admit cards, and results directly on your phone.
              </p>
              <a
                href={settings.whatsappChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('whatsapp_click', 'Footer WhatsApp CTA')}
                className="btn-press inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-[#138A36] hover:bg-[#10752D] text-xs font-semibold text-white"
              >
                <span>Join Official WhatsApp Channel</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-white/75">
                {settings.telegramUrl && (
                  <a
                    href={settings.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white underline"
                  >
                    Telegram Channel
                  </a>
                )}
                {settings.twitterUrl && (
                  <a
                    href={settings.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white underline"
                  >
                    X (Twitter)
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/65 text-center sm:text-left">
            <p
              onClick={handleSecretCopyrightTap}
              className="select-none cursor-default"
            >
              © 2026 {settings.siteName}. All rights reserved.
            </p>
            <p>
              Always verify eligibility, dates, and fee details from the official government notification before applying.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation (<= 15% Viewport Sticky Governance) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white border-t border-[#E2E8F0] grid grid-cols-5 items-center text-[11px] font-medium text-[#64748B]"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full border-t-2 transition-colors ${
              isActive
                ? 'text-[#071A3D] font-semibold border-[#FF7A00]'
                : 'border-transparent hover:text-[#071A3D]'
            }`
          }
        >
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/latest"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full border-t-2 transition-colors ${
              isActive
                ? 'text-[#071A3D] font-semibold border-[#FF7A00]'
                : 'border-transparent hover:text-[#071A3D]'
            }`
          }
        >
          <span>Latest</span>
        </NavLink>
        <NavLink
          to="/jobs"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full border-t-2 transition-colors ${
              isActive
                ? 'text-[#071A3D] font-semibold border-[#FF7A00]'
                : 'border-transparent hover:text-[#071A3D]'
            }`
          }
        >
          <span>Jobs</span>
        </NavLink>
        <NavLink
          to="/results"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full border-t-2 transition-colors ${
              isActive
                ? 'text-[#071A3D] font-semibold border-[#FF7A00]'
                : 'border-transparent hover:text-[#071A3D]'
            }`
          }
        >
          <span>Results</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center h-full border-t-2 border-transparent text-[#64748B] hover:text-[#071A3D] cursor-pointer"
        >
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-fade-in">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full overflow-y-auto p-5 flex flex-col justify-between z-10 animate-slide-in-left shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center min-w-0"
                >
                  <BrandLogo variant="compact" theme="light" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#64748B] hover:text-[#071A3D] hover:bg-[#F6F8FB] shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              <div className="py-4 space-y-1 text-sm font-medium text-[#071A3D]">
                <Link to="/" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Home
                </Link>
                <Link to="/latest" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Latest Updates
                </Link>
                <Link to="/jobs" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Latest Jobs
                </Link>
                <Link to="/exams" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Competitive Exams
                </Link>
                <Link to="/results" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Exam Results
                </Link>
                <Link to="/admit-card" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Admit Cards
                </Link>
                <Link to="/answer-key" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Answer Keys
                </Link>
                <Link to="/syllabus" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Syllabus &amp; Exam Pattern
                </Link>
                <Link to="/calendar" className="block px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors">
                  Exam Calendar
                </Link>
                <Link
                  to="/saved"
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#F6F8FB] transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#FF7A00] shrink-0" />
                    <span>Saved Bookmarks</span>
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-[#FF7A00]">
                    {bookmarks.length}
                  </span>
                </Link>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] space-y-1 text-xs text-[#64748B]">
                <Link to="/about" className="block px-3 py-1.5 hover:text-[#071A3D] transition-colors">
                  About Us
                </Link>
                <Link to="/contact" className="block px-3 py-1.5 hover:text-[#071A3D] transition-colors">
                  Contact Us
                </Link>
                <Link to="/privacy-policy" className="block px-3 py-1.5 hover:text-[#071A3D] transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="block px-3 py-1.5 hover:text-[#071A3D] transition-colors">
                  Terms &amp; Conditions
                </Link>
                <Link to="/disclaimer" className="block px-3 py-1.5 hover:text-[#071A3D] transition-colors">
                  Official Disclaimer
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <a
                href={settings.whatsappChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md bg-[#138A36] text-white text-xs font-semibold"
              >
                <span>Join WhatsApp Channel</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-[#071A3D]/60 backdrop-blur-xs"
            onClick={() => setSearchModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 animate-modal-pop">
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-[#FF7A00] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SSC CGL, Railway NTPC, IBPS PO, Rajasthan Police, Syllabus..."
                  className="w-full min-w-0 text-sm sm:text-base text-[#071A3D] placeholder:text-[#64748B] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#64748B] hover:text-[#071A3D] shrink-0 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(false)}
                  aria-label="Close search modal"
                  className="inline-flex items-center justify-center w-7 h-7 rounded text-[#64748B] hover:text-[#071A3D] shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              {/* Interactive Filter Controls */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-[#E2E8F0]">
                {[
                  { id: 'all', label: 'All Updates' },
                  { id: 'jobs', label: 'Jobs' },
                  { id: 'exams', label: 'Exams' },
                  { id: 'results', label: 'Results' },
                  { id: 'admit-card', label: 'Admit Card' },
                  { id: 'answer-key', label: 'Answer Key' },
                  { id: 'syllabus', label: 'Syllabus' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSearchCategory(tab.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      searchCategory === tab.id
                        ? 'bg-[#071A3D] text-white'
                        : 'bg-[#F6F8FB] text-[#64748B] hover:text-[#071A3D]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </form>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {/* Recent & Popular Searches */}
              {!searchQuery.trim() && (
                <div className="space-y-3">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
                        <span className="font-semibold">Recent Searches</span>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          className="hover:text-[#071A3D] underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => setSearchQuery(term)}
                            className="px-2.5 py-1 text-xs bg-[#F6F8FB] hover:bg-[#E2E8F0]/60 text-[#071A3D] rounded transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-[#64748B] mb-2">
                      Popular Exam Queries
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'SSC CGL',
                        'Railway NTPC',
                        'IBPS PO',
                        'UPSC Result',
                        'Rajasthan Police',
                        'CTET',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setSearchQuery(suggestion)}
                          className="px-2.5 py-1 text-xs border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D] rounded transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Matching Results */}
              <div>
                <div className="text-xs font-semibold text-[#64748B] mb-2">
                  {searchQuery.trim()
                    ? `Matching Updates (${modalSearchResults.length})`
                    : 'Recent Verified Updates'}
                </div>

                {modalSearchResults.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-semibold text-[#071A3D]">No Results Found</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      We couldn&apos;t find any updates matching &ldquo;{searchQuery}&rdquo;. Try another keyword like SSC, Railway, Banking, or UPSC.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {modalSearchResults.map((post) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <Link
                          key={post.id}
                          to={`/${post.category}/${post.slug}`}
                          onClick={() => {
                            if (searchQuery.trim()) addRecentSearch(searchQuery.trim());
                            trackEvent('article_open', post.title, post.category);
                            setSearchModalOpen(false);
                          }}
                          className="block py-3 hover:bg-[#F6F8FB] px-2 -mx-2 rounded transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                            <span>
                              <strong className="text-[#071A3D]">{post.organization}</strong> ·{' '}
                              {post.category.toUpperCase()} · {post.state}
                            </span>
                            <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#071A3D] mt-0.5 break-words">
                            {post.title}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#F6F8FB] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>Press Enter to view full search page with filters</span>
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="font-semibold text-[#071A3D] hover:text-[#FF7A00] cursor-pointer"
              >
                Open Full Search →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-6 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 max-w-sm w-auto sm:w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border bg-[#071A3D] text-white border-white/15 text-xs font-medium animate-modal-pop"
            >
              <div className="flex items-center gap-2 min-w-0">
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />}
                {t.type === 'error' && <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-[#FF7A00] shrink-0" />}
                <span className="break-words">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-white/70 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
