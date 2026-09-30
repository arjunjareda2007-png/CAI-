import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ExternalLink } from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { PostCategorySlug } from '../types/cms';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';
import { computePostStatus, parseDeadlineToMs } from '../utils/statusAndSanitize';

interface DirectoryPageProps {
  section?: PostCategorySlug | 'latest' | 'search';
}

const SECTION_META: Record<
  string,
  { title: string; subtitle: string; seoDesc: string }
> = {
  latest: {
    title: 'Latest Career Updates & Notifications',
    subtitle:
      'Chronological feed of verified Indian government jobs, exams, admit cards, answer keys, syllabi, and results.',
    seoDesc:
      'Browse all latest government job notifications, exam dates, admit cards, answer keys, and official results on Career Alert India.',
  },
  jobs: {
    title: 'Government Jobs & Recruitment Notifications',
    subtitle:
      'Active central and state government vacancies across SSC, Railway, Banking, Defence, Police, PSU, and Teaching sectors.',
    seoDesc:
      'Find latest Indian government jobs, post-wise vacancies, qualification requirements, application deadlines, and official apply online links.',
  },
  exams: {
    title: 'Competitive & Government Examinations',
    subtitle:
      'Upcoming all-India and state competitive exams, active registration windows, and official exam schedules.',
    seoDesc:
      'Track upcoming UPSC, SSC, Railway, Banking, CTET, Defence, and State PSC competitive examinations and application dates.',
  },
  results: {
    title: 'Exam Results, Merit Lists & Scorecards',
    subtitle:
      'Verified result declarations, roll-number-wise merit PDFs, cut-off marks, and expected result updates.',
    seoDesc:
      'Check official exam results, merit lists, and cut-off marks for SSC, UPSC, Railway, IBPS, and State Government exams.',
  },
  'admit-card': {
    title: 'Admit Cards & Exam City Intimations',
    subtitle:
      'Direct links to download official hall tickets, call letters, and exam shift instructions.',
    seoDesc:
      'Download official admit cards and hall tickets for upcoming SSC, Railway, Banking, UPSC, and State Government examinations.',
  },
  'answer-key': {
    title: 'Official Provisional & Final Answer Keys',
    subtitle:
      'Check candidate response sheets, provisional answer keys, and objection window deadlines.',
    seoDesc:
      'Download official provisional and final answer keys, response sheets, and objection links for government exams.',
  },
  syllabus: {
    title: 'Exam Syllabus, Pattern & Marking Scheme',
    subtitle:
      'Subject-wise syllabus breakdowns, negative marking rules, selection stages, and official syllabus PDFs.',
    seoDesc:
      'Explore updated exam syllabus, paper pattern, and marking schemes for SSC, UPSC, Railway, Banking, and State exams.',
  },
  notifications: {
    title: 'Official Commission Announcements & Notices',
    subtitle:
      'Important corrigendums, exam date notices, and official updates from recruiting authorities.',
    seoDesc: 'Official announcements and commission notices on Career Alert India.',
  },
  search: {
    title: 'Search Exams, Jobs & Career Updates',
    subtitle:
      'Search across all verified jobs, competitive exams, admit cards, answer keys, syllabi, and results.',
    seoDesc: 'Search Career Alert India for government jobs, exams, admit cards, and results.',
  },
};

const INDIAN_STATES = [
  'All India',
  'Andhra Pradesh',
  'Bihar',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

const QUALIFICATIONS = [
  '10th Pass',
  '12th Pass',
  'Graduate',
  'Post Graduate',
  'B.Tech / Engineering',
  'B.Ed / D.El.Ed',
  'Medical / Nursing',
];

export const DirectoryPage: React.FC<DirectoryPageProps> = ({ section = 'latest' }) => {
  const { publishedPosts, categories, settings, trackEvent } = useCMS();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get('category') ||
      (section !== 'latest' && section !== 'search' ? section : 'all')
  );
  const [orgFilter, setOrgFilter] = useState<string>(searchParams.get('org') || 'all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [qualificationFilter, setQualificationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'vacancies'>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const qParam = searchParams.get('q');
    const catParam = searchParams.get('category');
    const orgParam = searchParams.get('org');
    if (qParam !== null) setKeyword(qParam);
    if (orgParam !== null) setOrgFilter(orgParam);
    if (catParam !== null) {
      setCategoryFilter(catParam);
    } else if (section !== 'latest' && section !== 'search') {
      setCategoryFilter(section);
    } else {
      setCategoryFilter('all');
    }
  }, [section, searchParams]);

  const domainOrgs = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'domain' && c.enabled)
        .sort((a, b) => a.order - b.order),
    [categories]
  );

  const filteredPosts = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const list = publishedPosts.filter((post) => {
      if (categoryFilter !== 'all' && post.category !== categoryFilter) {
        return false;
      }
      if (
        orgFilter !== 'all' &&
        post.organization.toLowerCase() !== orgFilter.toLowerCase() &&
        !(post.tags && post.tags.some((t) => t.toLowerCase().includes(orgFilter.toLowerCase())))
      ) {
        return false;
      }
      if (stateFilter !== 'all' && post.state.toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }
      if (
        qualificationFilter !== 'all' &&
        (!post.qualification ||
          !post.qualification.toLowerCase().includes(qualificationFilter.toLowerCase()))
      ) {
        return false;
      }
      if (statusFilter !== 'all') {
        const st = computePostStatus(post, settings.closingSoonThresholdDays);
        if (statusFilter === 'open' && st.code !== 'OPEN' && st.code !== 'CLOSING_SOON') {
          return false;
        }
        if (statusFilter === 'closing_soon' && st.code !== 'CLOSING_SOON') {
          return false;
        }
        if (statusFilter === 'closed' && st.code !== 'CLOSED') {
          return false;
        }
        if (statusFilter === 'released' && st.code !== 'RESULT_RELEASED') {
          return false;
        }
        if (statusFilter === 'expected' && st.code !== 'RESULT_EXPECTED') {
          return false;
        }
      }
      if (q) {
        const matches =
          post.title.toLowerCase().includes(q) ||
          post.organization.toLowerCase().includes(q) ||
          post.summary.toLowerCase().includes(q) ||
          post.state.toLowerCase().includes(q) ||
          (post.subcategory && post.subcategory.toLowerCase().includes(q)) ||
          (post.qualification && post.qualification.toLowerCase().includes(q)) ||
          (post.tags && post.tags.some((t) => t.toLowerCase().includes(q)));
        if (!matches) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'vacancies') {
        return (b.totalVacancies || 0) - (a.totalVacancies || 0);
      }
      if (sortBy === 'deadline') {
        const da = parseDeadlineToMs(a.applicationEnd);
        const db = parseDeadlineToMs(b.applicationEnd);
        if (Number.isNaN(da) && Number.isNaN(db)) return 0;
        if (Number.isNaN(da)) return 1;
        if (Number.isNaN(db)) return -1;
        return da - db;
      }
      return (
        new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime()
      );
    });
  }, [
    publishedPosts,
    categoryFilter,
    orgFilter,
    stateFilter,
    qualificationFilter,
    statusFilter,
    keyword,
    sortBy,
    settings.closingSoonThresholdDays,
  ]);

  const resetAllFilters = () => {
    setKeyword('');
    if (section === 'latest' || section === 'search') {
      setCategoryFilter('all');
    } else {
      setCategoryFilter(section);
    }
    setOrgFilter('all');
    setStateFilter('all');
    setQualificationFilter('all');
    setStatusFilter('all');
    setSortBy('newest');
    setSearchParams({});
  };

  const activeFilterCount = [
    keyword.trim().length > 0,
    (section === 'latest' || section === 'search') && categoryFilter !== 'all',
    orgFilter !== 'all',
    stateFilter !== 'all',
    qualificationFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length;

  const meta = SECTION_META[section] || SECTION_META.latest;

  const renderFilterControls = () => (
    <div className="space-y-4">
      {(section === 'latest' || section === 'search') && (
        <div>
          <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">
            Information Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
          >
            <option value="all">All Categories</option>
            <option value="jobs">Government Jobs</option>
            <option value="exams">Competitive Exams</option>
            <option value="results">Exam Results</option>
            <option value="admit-card">Admit Cards</option>
            <option value="answer-key">Answer Keys</option>
            <option value="syllabus">Syllabus & Pattern</option>
            <option value="notifications">Notifications</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">
          Organization / Commission
        </label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
        >
          <option value="all">All Organizations</option>
          {domainOrgs.map((org) => (
            <option key={org.id} value={org.name}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">
          State / Region
        </label>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
        >
          <option value="all">All States & All India</option>
          {INDIAN_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">
          Minimum Qualification
        </label>
        <select
          value={qualificationFilter}
          onChange={(e) => setQualificationFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
        >
          <option value="all">Any Qualification</option>
          {QUALIFICATIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">
          Status Filter
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
        >
          <option value="all">All Statuses</option>
          <option value="open">Applications Open</option>
          <option value="closing_soon">Closing Soon</option>
          <option value="closed">Applications Closed</option>
          {section === 'results' && (
            <>
              <option value="released">Result Released</option>
              <option value="expected">Result Expected</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#071A3D] mb-1.5">Sort Order</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline' | 'vacancies')}
          className="w-full px-3 py-2 text-xs bg-[#F6F8FB] border border-[#E2E8F0] rounded-md text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
        >
          <option value="newest">Newest Published First</option>
          <option value="deadline">Nearest Application Deadline</option>
          <option value="vacancies">Highest Vacancies First</option>
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="w-full py-2 px-3 rounded border border-[#E2E8F0] text-xs font-semibold text-[#DC2626] hover:bg-red-50 transition-colors"
        >
          Reset All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      <SEOHead
        title={meta.title}
        description={meta.seoDesc}
        canonicalPath={`/${section === 'latest' ? 'latest' : section}`}
      />

      {/* Page Header */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-[#64748B] mb-2">
            <Link to="/" className="hover:text-[#071A3D]">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#071A3D] font-medium">{meta.title}</span>
          </nav>

          <h1 className="font-serif-display text-2xl sm:text-4xl text-[#071A3D]">{meta.title}</h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-2xl">{meta.subtitle}</p>

          {/* Search & Mobile Filter Trigger Bar */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Filter by exam name, post title, commission, or state..."
                aria-label="Filter updates by keyword"
                className="w-full pl-10 pr-8 py-2 rounded-md bg-[#F6F8FB] border border-[#E2E8F0] text-sm text-[#071A3D] placeholder:text-[#64748B] focus:outline-none focus:border-[#071A3D] focus:bg-white"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071A3D]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>
                Filter & Sort {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Directory Grid */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Filter Sidebar (3 Cols) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white border border-[#E2E8F0] rounded-lg p-5 sticky top-20">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-bold text-[#071A3D]">Filter & Sort</h2>
              <span className="font-mono-tabular text-xs text-[#64748B]">
                {filteredPosts.length} matches
              </span>
            </div>
            {renderFilterControls()}
          </aside>

          {/* Updates List (9 Cols) */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>
                Showing <strong className="text-[#071A3D] font-mono-tabular">{Math.min(visibleCount, filteredPosts.length)}</strong> of{' '}
                <strong className="text-[#071A3D] font-mono-tabular">{filteredPosts.length}</strong> verified updates
              </span>
              <div className="hidden sm:flex items-center gap-2">
                <span>Sort:</span>
                <button
                  type="button"
                  onClick={() => setSortBy('newest')}
                  className={`font-semibold ${
                    sortBy === 'newest' ? 'text-[#071A3D] underline' : 'hover:text-[#071A3D]'
                  }`}
                >
                  Newest
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setSortBy('deadline')}
                  className={`font-semibold cursor-pointer ${
                    sortBy === 'deadline' ? 'text-[#071A3D] underline' : 'hover:text-[#071A3D]'
                  }`}
                >
                  By Deadline
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setSortBy('vacancies')}
                  className={`font-semibold cursor-pointer ${
                    sortBy === 'vacancies' ? 'text-[#071A3D] underline' : 'hover:text-[#071A3D]'
                  }`}
                >
                  Most Vacancies
                </button>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center">
                <h2 className="text-base font-bold text-[#071A3D]">No Results Found</h2>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                  We couldn&apos;t find any updates matching your current search or filter criteria. Try another keyword or reset the filters.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="mt-4 px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold hover:bg-[#071A3D]/90"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3.5">
                  {filteredPosts.slice(0, visibleCount).map((post, idx) => (
                    <UpdateCard key={post.id || `${post.slug}-${idx}`} post={post} />
                  ))}
                </div>

                {visibleCount < filteredPosts.length && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="px-5 py-2.5 rounded-md bg-white border border-[#E2E8F0] hover:border-[#071A3D] text-xs font-semibold text-[#071A3D] transition-colors"
                    >
                      Load More Updates ({filteredPosts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Bottom WhatsApp Channel Reminder */}
            <div className="mt-8 bg-[#071A3D] text-white rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold">
                  Never Miss an Application Deadline or Result Declaration
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Join the official Career Alert India WhatsApp Channel for verified alerts.
                </p>
              </div>
              <a
                href={settings.whatsappChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('whatsapp_click', `Directory ${section} WhatsApp CTA`)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#138A36] hover:bg-[#10752D] text-xs font-semibold text-white whitespace-nowrap"
              >
                <span>Join WhatsApp Channel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Modal for Filter & Sort */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 z-10">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#071A3D]">Filter & Sort Updates</h2>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#071A3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderFilterControls()}

            <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
              >
                Show {filteredPosts.length} Matching Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
