import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ExternalLink,
  Calendar,
  Bookmark,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';
import { BrandLogo } from '../components/BrandLogo';
import {
  computePostStatus,
  formatIndianDate,
  parseDeadlineToMs,
} from '../utils/statusAndSanitize';

export const HomePage: React.FC = () => {
  const {
    publishedPosts,
    categories,
    settings,
    isLoading,
    error,
    refreshData,
    addRecentSearch,
    trackEvent,
  } = useCMS();

  const [heroSearch, setHeroSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const navigate = useNavigate();

  const domainCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'domain' && c.enabled)
        .sort((a, b) => a.order - b.order),
    [categories]
  );

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    const lower = q.toLowerCase();
    if (
      lower === 'admin' ||
      lower === 'owner' ||
      lower === 'caiowner' ||
      lower === '8233538355'
    ) {
      navigate('/8233538355');
      return;
    }
    if (q) {
      addRecentSearch(q);
      trackEvent('search', q, 'home_hero');
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Filtered feed by selected organization/domain
  const filteredFeed = useMemo(() => {
    if (selectedOrg === 'ALL') return publishedPosts;
    return publishedPosts.filter(
      (p) =>
        p.organization.toLowerCase() === selectedOrg.toLowerCase() ||
        p.tags?.some((t) => t.toLowerCase().includes(selectedOrg.toLowerCase()))
    );
  }, [publishedPosts, selectedOrg]);

  // Quick-access columns for immediate student scanning
  const jobsAndClosingSoon = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.category === 'jobs' || p.category === 'exams')
        .sort((a, b) => {
          const endA = parseDeadlineToMs(a.applicationEnd) || Infinity;
          const endB = parseDeadlineToMs(b.applicationEnd) || Infinity;
          return endA - endB;
        })
        .slice(0, 5),
    [publishedPosts]
  );

  const resultsAndKeys = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.category === 'results' || p.category === 'answer-key')
        .slice(0, 5),
    [publishedPosts]
  );

  const admitCardsAndSyllabus = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.category === 'admit-card' || p.category === 'syllabus')
        .slice(0, 5),
    [publishedPosts]
  );

  const sectionCards = [
    {
      title: 'Latest Jobs',
      desc: 'Government and public sector recruitment opportunities.',
      href: '/jobs',
      count: publishedPosts.filter((p) => p.category === 'jobs').length,
      accent: 'border-t-4 border-t-[#071A3D]',
    },
    {
      title: 'Exams',
      desc: 'Competitive and central/state government examinations.',
      href: '/exams',
      count: publishedPosts.filter((p) => p.category === 'exams').length,
      accent: 'border-t-4 border-t-[#FF7A00]',
    },
    {
      title: 'Admit Card',
      desc: 'Latest hall tickets, city slips, and exam entry instructions.',
      href: '/admit-card',
      count: publishedPosts.filter((p) => p.category === 'admit-card').length,
      accent: 'border-t-4 border-t-[#138A36]',
    },
    {
      title: 'Results',
      desc: 'Official merit lists, cut-offs, and scorecard declarations.',
      href: '/results',
      count: publishedPosts.filter((p) => p.category === 'results').length,
      accent: 'border-t-4 border-t-[#071A3D]',
    },
    {
      title: 'Answer Key',
      desc: 'Official provisional and final answer keys with objection windows.',
      href: '/answer-key',
      count: publishedPosts.filter((p) => p.category === 'answer-key').length,
      accent: 'border-t-4 border-t-[#FF7A00]',
    },
    {
      title: 'Syllabus',
      desc: 'Subject-wise syllabus, exam patterns, and marking schemes.',
      href: '/syllabus',
      count: publishedPosts.filter((p) => p.category === 'syllabus').length,
      accent: 'border-t-4 border-t-[#138A36]',
    },
    {
      title: 'Exam Calendar',
      desc: 'Upcoming exam schedule, application dates, and timeline.',
      href: '/calendar',
      count: publishedPosts.filter((p) => Boolean(p.examDate)).length,
      accent: 'border-t-4 border-t-[#071A3D]',
    },
    {
      title: 'Notifications',
      desc: 'Important official announcements and commission notices.',
      href: '/latest',
      count: publishedPosts.length,
      accent: 'border-t-4 border-t-[#FF7A00]',
    },
  ];

  return (
    <>
      <SEOHead
        title="Exams | Jobs | Opportunities"
        description={settings.defaultSeoDescription}
        canonicalPath="/"
      />

      {/* Institutional Hero Section with Official Logo & CAI Wordmark Lockup */}
      <section className="bg-[#071A3D] text-white border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 min-w-0">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#FF7A00] mb-2">
                {settings.siteName} · {settings.tagline}
              </p>
              <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-tight">
                Your Career Starts With The Right Information.
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-3 leading-relaxed max-w-2xl">
                Get the latest government exams, jobs, results, admit cards, answer keys and career opportunities — all in one place.
              </p>

              {/* Primary Search Bar inside Hero */}
              <form
                onSubmit={handleHeroSearch}
                className="mt-5 flex flex-col sm:flex-row gap-2 max-w-2xl"
              >
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search exam or job (e.g., SSC CGL, Railway NTPC, IBPS PO, CTET)..."
                    aria-label="Search exams and jobs"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-[#071A3D] text-sm placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-press px-5 py-2.5 rounded-md bg-[#FF7A00] hover:bg-[#E56D00] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
                >
                  Search Updates
                </button>
              </form>

              {/* Primary & Secondary Hero CTAs */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/latest"
                  className="btn-press inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-[#071A3D] hover:bg-slate-100 text-xs sm:text-sm font-semibold whitespace-nowrap"
                >
                  <span>Explore Latest Updates</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>

                <Link
                  to="/calendar"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/85 hover:text-white underline underline-offset-4 whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
                  <span>View 2026–27 Exam Calendar</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Official Emblem & CAI Wordmark Showcase Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-md bg-white rounded-xl p-5 sm:p-6 shadow-xl border border-white/20 text-[#071A3D] flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-4 w-full pb-4 border-b border-[#E2E8F0]">
                  <BrandLogo variant="emblem" size="lg" />
                  <BrandLogo variant="wordmark" theme="light" size="md" className="max-w-[210px] sm:max-w-[230px]" />
                </div>
                <div className="pt-3 grid grid-cols-3 gap-2 w-full text-center font-mono-tabular">
                  <div>
                    <div className="text-lg sm:text-xl font-bold text-[#071A3D]">
                      {publishedPosts.length}
                    </div>
                    <div className="text-[10px] font-sans font-semibold text-[#64748B] uppercase">
                      Active Notices
                    </div>
                  </div>
                  <div className="border-x border-[#E2E8F0]">
                    <div className="text-lg sm:text-xl font-bold text-[#FF7A00]">
                      {domainCategories.length}
                    </div>
                    <div className="text-[10px] font-sans font-semibold text-[#64748B] uppercase">
                      Exam Sectors
                    </div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold text-[#138A36]">100%</div>
                    <div className="text-[10px] font-sans font-semibold text-[#64748B] uppercase">
                      Official Links
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Error State Banner if any */}
        {error && (
          <div className="bg-white border border-[#DC2626]/40 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#071A3D]">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#071A3D] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Visually Distinct Category Cards */}
        <section aria-labelledby="categories-heading">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
            <div>
              <h2
                id="categories-heading"
                className="text-xl sm:text-2xl font-bold text-[#071A3D] tracking-tight"
              >
                Browse By Career Category
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                Direct access to verified recruitment notifications, hall tickets, results, and syllabi.
              </p>
            </div>
            <Link
              to="/saved"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
              <span>View Saved Bookmarks →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectionCards.map((card) => (
              <Link
                key={card.title}
                to={card.href}
                onClick={() => trackEvent('category_click', card.title)}
                className={`card-interactive group bg-white border border-[#E2E8F0] ${card.accent} rounded-lg p-4 hover:border-[#071A3D]/40 flex flex-col justify-between min-w-0`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#071A3D] group-hover:text-[#FF7A00] transition-colors">
                      {card.title}
                    </h3>
                    <span className="font-mono-tabular text-xs font-semibold text-[#64748B] shrink-0">
                      {card.count} {card.count === 1 ? 'Update' : 'Updates'}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]/60 flex items-center justify-between text-xs font-semibold text-[#071A3D] group-hover:text-[#FF7A00]">
                  <span>Open Section</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* High-Utility 3-Column Quick Access Board (Jobs / Results / Admit Cards) */}
        <section aria-labelledby="quick-board-heading">
          <div className="mb-5">
            <h2
              id="quick-board-heading"
              className="text-xl sm:text-2xl font-bold text-[#071A3D] tracking-tight"
            >
              Priority Action Board
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Check active application deadlines, recently declared results, and released admit cards at a glance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Active Jobs & Deadlines */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col justify-between min-w-0">
              <div>
                <div className="px-4 py-3 bg-[#071A3D] text-white flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Latest Jobs &amp; Deadlines</h3>
                  <Link
                    to="/jobs"
                    className="text-xs text-[#FF7A00] hover:underline font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {jobsAndClosingSoon.length === 0 ? (
                    <p className="p-4 text-xs text-[#64748B]">No active job postings yet.</p>
                  ) : (
                    jobsAndClosingSoon.map((post, idx) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <div key={post.id || `${post.slug}-${idx}`} className="p-3.5 hover:bg-[#F6F8FB] transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] font-mono-tabular">
                            <span>
                              <strong className="text-[#071A3D] font-sans">{post.organization}</strong>{' '}
                              · Last Date: {formatIndianDate(post.applicationEnd)}
                            </span>
                            <span className={`font-sans font-semibold ${st.textClass}`}>
                              {st.label}
                            </span>
                          </div>
                          <Link
                            to={`/${post.category}/${post.slug}`}
                            onClick={() => trackEvent('article_open', post.title, post.category)}
                            className="block text-sm font-semibold text-[#071A3D] hover:text-[#FF7A00] mt-1 leading-snug break-words transition-colors"
                          >
                            {post.title}
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="p-3 bg-[#F6F8FB] border-t border-[#E2E8F0] text-center">
                <Link
                  to="/jobs"
                  className="text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors"
                >
                  Browse All Active Recruitment Notifications →
                </Link>
              </div>
            </div>

            {/* Column 2: Results & Answer Keys */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col justify-between min-w-0">
              <div>
                <div className="px-4 py-3 bg-[#071A3D] text-white flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Results &amp; Answer Keys</h3>
                  <Link
                    to="/results"
                    className="text-xs text-[#FF7A00] hover:underline font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {resultsAndKeys.length === 0 ? (
                    <p className="p-4 text-xs text-[#64748B]">No result declarations yet.</p>
                  ) : (
                    resultsAndKeys.map((post, idx) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <div key={post.id || `${post.slug}-${idx}`} className="p-3.5 hover:bg-[#F6F8FB] transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] font-mono-tabular">
                            <span>
                              <strong className="text-[#071A3D] font-sans">{post.organization}</strong>{' '}
                              · {post.resultDate || formatIndianDate(post.publishedAt)}
                            </span>
                            <span className={`font-sans font-semibold ${st.textClass}`}>
                              {st.label}
                            </span>
                          </div>
                          <Link
                            to={`/${post.category}/${post.slug}`}
                            onClick={() => trackEvent('article_open', post.title, post.category)}
                            className="block text-sm font-semibold text-[#071A3D] hover:text-[#FF7A00] mt-1 leading-snug break-words transition-colors"
                          >
                            {post.title}
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="p-3 bg-[#F6F8FB] border-t border-[#E2E8F0] text-center">
                <Link
                  to="/results"
                  className="text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors"
                >
                  Check All Exam Results &amp; Answer Keys →
                </Link>
              </div>
            </div>

            {/* Column 3: Admit Cards & Syllabus */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col justify-between min-w-0">
              <div>
                <div className="px-4 py-3 bg-[#071A3D] text-white flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Admit Cards &amp; Syllabus</h3>
                  <Link
                    to="/admit-card"
                    className="text-xs text-[#FF7A00] hover:underline font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {admitCardsAndSyllabus.length === 0 ? (
                    <p className="p-4 text-xs text-[#64748B]">No admit card updates yet.</p>
                  ) : (
                    admitCardsAndSyllabus.map((post, idx) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <div key={post.id || `${post.slug}-${idx}`} className="p-3.5 hover:bg-[#F6F8FB] transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] font-mono-tabular">
                            <span>
                              <strong className="text-[#071A3D] font-sans">{post.organization}</strong>{' '}
                              · {post.examDate || 'Official PDF'}
                            </span>
                            <span className={`font-sans font-semibold ${st.textClass}`}>
                              {st.label}
                            </span>
                          </div>
                          <Link
                            to={`/${post.category}/${post.slug}`}
                            onClick={() => trackEvent('article_open', post.title, post.category)}
                            className="block text-sm font-semibold text-[#071A3D] hover:text-[#FF7A00] mt-1 leading-snug break-words transition-colors"
                          >
                            {post.title}
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="p-3 bg-[#F6F8FB] border-t border-[#E2E8F0] text-center">
                <Link
                  to="/admit-card"
                  className="text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors"
                >
                  Download Hall Tickets &amp; Official Syllabi →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Organization Filter + Latest Updates Feed */}
        <section aria-labelledby="latest-feed-heading">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h2
                id="latest-feed-heading"
                className="text-xl sm:text-2xl font-bold text-[#071A3D] tracking-tight"
              >
                Latest Career Updates
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                Filter by Recruiting Body or Exam Commission to see relevant notifications.
              </p>
            </div>
            <Link
              to="/latest"
              className="text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] whitespace-nowrap transition-colors"
            >
              View Complete Archive →
            </Link>
          </div>

          {/* Interactive Organization/Commission Filter Controls */}
          <div
            role="tablist"
            aria-label="Filter updates by recruiting organization"
            className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-5 border-b border-[#E2E8F0]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedOrg === 'ALL'}
              onClick={() => setSelectedOrg('ALL')}
              className={`btn-press px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                selectedOrg === 'ALL'
                  ? 'bg-[#071A3D] text-white'
                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#071A3D]'
              }`}
            >
              All Commissions ({publishedPosts.length})
            </button>
            {domainCategories.map((org, idx) => (
              <button
                key={org.id || `${org.slug}-${idx}`}
                type="button"
                role="tab"
                aria-selected={selectedOrg === org.name}
                onClick={() => {
                  setSelectedOrg(org.name);
                  trackEvent('category_click', org.name, 'org_filter');
                }}
                className={`btn-press px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                  selectedOrg === org.name
                    ? 'bg-[#071A3D] text-white font-semibold'
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#071A3D]'
                }`}
              >
                {org.name}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#E2E8F0] rounded-lg p-5 h-44 animate-pulse space-y-3"
                >
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-1/2 pt-4" />
                </div>
              ))}
            </div>
          ) : filteredFeed.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center">
              <h3 className="text-base font-bold text-[#071A3D]">
                No updates published in this category yet.
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-md mx-auto">
                Important career updates for {selectedOrg} will appear here as soon as official notifications are verified.
              </p>
              {selectedOrg !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedOrg('ALL')}
                  className="btn-press mt-4 px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold cursor-pointer"
                >
                  Show All Updates
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeed.slice(0, visibleCount).map((post, idx) => (
                  <UpdateCard key={post.id || `${post.slug}-${idx}`} post={post} />
                ))}
              </div>

              {filteredFeed.length > visibleCount && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 6)}
                    className="btn-press px-5 py-2.5 rounded-md bg-white border border-[#E2E8F0] hover:border-[#071A3D] text-xs font-semibold text-[#071A3D] cursor-pointer"
                  >
                    Load More Updates ({filteredFeed.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Prominent WhatsApp Channel CTA with Brand Emblem */}
        <section
          aria-labelledby="whatsapp-cta-heading"
          className="bg-[#071A3D] text-white rounded-xl p-6 sm:p-8 border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-xl">
            <BrandLogo variant="emblem" size="md" className="shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#FF7A00]">
                Instant Mobile Alerts
              </p>
              <h2
                id="whatsapp-cta-heading"
                className="text-xl sm:text-2xl font-bold text-white mt-1"
              >
                Join Career Alert India on WhatsApp
              </h2>
              <p className="text-xs sm:text-sm text-white/80 mt-1.5 leading-relaxed">
                Get important exam dates, new government job notifications, admit card links, and official results directly on WhatsApp without spam.
              </p>
            </div>
          </div>
          <a
            href={settings.whatsappChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('whatsapp_click', 'Homepage Banner CTA')}
            className="btn-press inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#138A36] hover:bg-[#10752D] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <span>Join WhatsApp Channel →</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        </section>
      </div>
    </>
  );
};
