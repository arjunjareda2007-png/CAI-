import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ExternalLink,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { Post } from '../types/cms';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';
import {
  computePostStatus,
  formatIndianDate,
  parseDeadlineToMs,
} from '../utils/statusAndSanitize';

interface CategoryListingPageProps {
  sectionSlug:
    | 'all'
    | 'jobs'
    | 'exams'
    | 'results'
    | 'admit-card'
    | 'answer-key'
    | 'syllabus'
    | 'notifications'
    | 'search';
  title: string;
  subtitle: string;
}

const INDIAN_STATES = [
  'All India',
  'Rajasthan',
  'Uttar Pradesh',
  'Bihar',
  'Madhya Pradesh',
  'Maharashtra',
  'Delhi',
  'Haryana',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
  'West Bengal',
];

const QUALIFICATIONS = [
  'All',
  '10th Pass',
  '12th Pass',
  'Graduate',
  'Post Graduate',
  'D.El.Ed / B.Ed',
  'Engineering / Diploma',
];

export const CategoryListingPage: React.FC<CategoryListingPageProps> = ({
  sectionSlug,
  title,
  subtitle,
}) => {
  const {
    publishedPosts,
    categories,
    settings,
    bookmarks,
    toggleBookmark,
    addRecentSearch,
    trackEvent,
  } = useCMS();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCat = searchParams.get('category') || 'all';

  const [keyword, setKeyword] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    sectionSlug === 'all' || sectionSlug === 'search' ? initialCat : sectionSlug
  );
  const [selectedOrg, setSelectedOrg] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedQualification, setSelectedQualification] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline'>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) setKeyword(qParam);
    if (sectionSlug !== 'all' && sectionSlug !== 'search') {
      setSelectedCategory(sectionSlug);
    }
    setPage(1);
  }, [sectionSlug, searchParams]);

  const domainOrgs = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'domain' && c.enabled)
        .sort((a, b) => a.order - b.order),
    [categories]
  );

  const filteredPosts = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const matches = publishedPosts.filter((post) => {
      if (
        sectionSlug !== 'all' &&
        sectionSlug !== 'search' &&
        post.category !== sectionSlug
      ) {
        return false;
      }
      if (
        (sectionSlug === 'all' || sectionSlug === 'search') &&
        selectedCategory !== 'all' &&
        post.category !== selectedCategory
      ) {
        return false;
      }

      if (
        selectedOrg !== 'All' &&
        post.organization.toLowerCase() !== selectedOrg.toLowerCase()
      ) {
        return false;
      }

      if (
        selectedState !== 'All' &&
        post.state.toLowerCase() !== selectedState.toLowerCase()
      ) {
        return false;
      }

      if (selectedQualification !== 'All') {
        const qual = (post.qualification || '').toLowerCase();
        if (!qual.includes(selectedQualification.split(' ')[0].toLowerCase())) {
          return false;
        }
      }

      if (selectedStatus !== 'All') {
        const st = computePostStatus(post, settings.closingSoonThresholdDays);
        if (selectedStatus === 'OPEN' && st.code !== 'OPEN' && st.code !== 'CLOSING_SOON') {
          return false;
        }
        if (selectedStatus === 'CLOSING_SOON' && st.code !== 'CLOSING_SOON') {
          return false;
        }
        if (selectedStatus === 'CLOSED' && st.code !== 'CLOSED') {
          return false;
        }
        if (selectedStatus === 'RELEASED' && st.code !== 'RESULT_RELEASED') {
          return false;
        }
      }

      if (q) {
        const haystack = [
          post.title,
          post.organization,
          post.subcategory,
          post.state,
          post.summary,
          post.qualification,
          ...(post.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return matches.sort((a, b) => {
      if (sortBy === 'deadline') {
        const endA = parseDeadlineToMs(a.applicationEnd) || Infinity;
        const endB = parseDeadlineToMs(b.applicationEnd) || Infinity;
        return endA - endB;
      }
      return (
        new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime()
      );
    });
  }, [
    publishedPosts,
    sectionSlug,
    selectedCategory,
    selectedOrg,
    selectedState,
    selectedQualification,
    selectedStatus,
    keyword,
    sortBy,
    settings.closingSoonThresholdDays,
  ]);

  const paginatedPosts = useMemo(
    () => filteredPosts.slice(0, page * PAGE_SIZE),
    [filteredPosts, page]
  );

  const resetFilters = () => {
    setKeyword('');
    if (sectionSlug === 'all' || sectionSlug === 'search') setSelectedCategory('all');
    setSelectedOrg('All');
    setSelectedState('All');
    setSelectedQualification('All');
    setSelectedStatus('All');
    setSortBy('newest');
    if (searchParams.has('q')) setSearchParams({});
  };

  const activeFilterCount = [
    selectedOrg !== 'All',
    selectedState !== 'All',
    selectedQualification !== 'All',
    selectedStatus !== 'All',
    (sectionSlug === 'all' || sectionSlug === 'search') && selectedCategory !== 'all',
  ].filter(Boolean).length;

  return (
    <>
      <SEOHead
        title={title}
        description={subtitle}
        canonicalPath={sectionSlug === 'all' ? '/latest' : `/${sectionSlug}`}
      />

      {/* Page Header */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-[#64748B] mb-2">
            <Link to="/" className="hover:text-[#071A3D]">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-[#071A3D] font-medium">{title}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D] tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-2xl">{subtitle}</p>
            </div>

            <div className="text-xs font-mono-tabular text-[#64748B]">
              Showing <strong className="text-[#071A3D]">{filteredPosts.length}</strong> verified{' '}
              {filteredPosts.length === 1 ? 'update' : 'updates'}
            </div>
          </div>

          {/* Search & Mobile Filter Trigger Bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                onBlur={() => {
                  if (keyword.trim()) {
                    addRecentSearch(keyword.trim());
                    trackEvent('search', keyword.trim(), sectionSlug);
                  }
                }}
                placeholder={`Search within ${title} (e.g., SSC, Railway, UPSC, Graduate)...`}
                className="w-full pl-10 pr-9 py-2 rounded-md border border-[#E2E8F0] bg-[#F6F8FB] focus:bg-white text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  aria-label="Clear search query"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071A3D]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Filter & Sort Button (Requirement 68) */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#FF7A00]" />
              <span>
                Filter & Sort {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </span>
            </button>

            {/* Desktop Sort Dropdown */}
            <div className="hidden lg:flex items-center gap-2">
              <label htmlFor="desktop-sort" className="text-xs font-medium text-[#64748B]">
                Sort by:
              </label>
              <select
                id="desktop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline')}
                className="px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
              >
                <option value="newest">Newest Published</option>
                <option value="deadline">Application Deadline (Closing Soonest)</option>
              </select>
            </div>
          </div>

          {/* Desktop Filter Row */}
          <div className="hidden lg:grid grid-cols-5 gap-3 mt-3 pt-3 border-t border-[#E2E8F0]">
            {(sectionSlug === 'all' || sectionSlug === 'search') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
                >
                  <option value="all">All Categories</option>
                  <option value="jobs">Jobs</option>
                  <option value="exams">Exams</option>
                  <option value="results">Results</option>
                  <option value="admit-card">Admit Card</option>
                  <option value="answer-key">Answer Key</option>
                  <option value="syllabus">Syllabus</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Organization / Commission
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
              >
                <option value="All">All Organizations</option>
                {domainOrgs.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                State / Region
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
              >
                <option value="All">All States & All India</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Qualification
              </label>
              <select
                value={selectedQualification}
                onChange={(e) => setSelectedQualification(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
              >
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q === 'All' ? 'All Qualifications' : q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                Status
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
                >
                  <option value="All">All Statuses</option>
                  <option value="OPEN">Applications Open</option>
                  <option value="CLOSING_SOON">Closing Soon</option>
                  <option value="CLOSED">Applications Closed</option>
                  <option value="RELEASED">Result Released</option>
                </select>
                {(activeFilterCount > 0 || keyword) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-semibold text-[#DC2626] hover:underline whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Listing */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {filteredPosts.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-12 text-center max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-[#071A3D]">No Results Found</h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
              We couldn&apos;t find any updates matching your current search or filter criteria. Try another keyword or reset the active filters.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
              >
                Reset All Filters
              </button>
              <Link
                to="/latest"
                className="px-4 py-2 rounded-md border border-[#E2E8F0] bg-white text-[#071A3D] text-xs font-semibold hover:border-[#071A3D]"
              >
                Browse All Updates
              </Link>
            </div>
          </div>
        ) : sectionSlug === 'results' ||
          sectionSlug === 'admit-card' ||
          sectionSlug === 'answer-key' ||
          sectionSlug === 'syllabus' ? (
          /* Specialized Structured Cards + Table View for Results, Admit Cards, Answer Keys, Syllabus */
          <div className="space-y-4">
            {paginatedPosts.map((post) => (
              <SpecializedSectionRow
                key={post.id}
                post={post}
                sectionSlug={sectionSlug}
                isSaved={bookmarks.includes(post.id)}
                onToggleBookmark={() => toggleBookmark(post.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedPosts.map((post) => (
              <UpdateCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Pagination / Load More */}
        {filteredPosts.length > paginatedPosts.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-2.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold transition-colors"
            >
              Load More Updates ({filteredPosts.length - paginatedPosts.length} more)
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet / Modal for Filters & Sort (Requirement 68) */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#071A3D]">Filter & Sort Updates</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#071A3D] mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline')}
                  className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                >
                  <option value="newest">Newest Published</option>
                  <option value="deadline">Application Deadline (Closing Soonest)</option>
                </select>
              </div>

              {(sectionSlug === 'all' || sectionSlug === 'search') && (
                <div>
                  <label className="block font-semibold text-[#071A3D] mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="jobs">Latest Jobs</option>
                    <option value="exams">Exams</option>
                    <option value="results">Results</option>
                    <option value="admit-card">Admit Card</option>
                    <option value="answer-key">Answer Key</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#071A3D] mb-1">
                  Organization / Commission
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                >
                  <option value="All">All Organizations</option>
                  {domainOrgs.map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#071A3D] mb-1">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                >
                  <option value="All">All States & All India</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#071A3D] mb-1">
                  Minimum Qualification
                </label>
                <select
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                >
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q === 'All' ? 'All Qualifications' : q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#071A3D] mb-1">
                  Application Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2.5 rounded border border-[#E2E8F0] bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="OPEN">Applications Open</option>
                  <option value="CLOSING_SOON">Closing Soon</option>
                  <option value="CLOSED">Applications Closed</option>
                  <option value="RELEASED">Result Released</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 rounded-md border border-[#E2E8F0] text-xs font-semibold text-[#071A3D]"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
              >
                Apply ({filteredPosts.length} Results)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SpecializedSectionRow: React.FC<{
  post: Post;
  sectionSlug: 'results' | 'admit-card' | 'answer-key' | 'syllabus';
  isSaved: boolean;
  onToggleBookmark: () => void;
}> = ({ post, sectionSlug, isSaved, onToggleBookmark }) => {
  const { settings, trackEvent } = useCMS();
  const statusInfo = computePostStatus(post, settings.closingSoonThresholdDays);
  const articlePath = `/${post.category}/${post.slug}`;
  const officialAction = post.importantLinks?.[0];

  return (
    <article className="bg-white border border-[#E2E8F0] rounded-lg p-4 sm:p-5 hover:border-[#071A3D]/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B]">
          <span className="font-semibold text-[#071A3D]">{post.organization}</span>
          <span aria-hidden="true">·</span>
          <span>{post.subcategory || post.jobType || post.state}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
            <span className={statusInfo.textClass}>{statusInfo.label}</span>
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-[#071A3D] hover:text-[#FF7A00] transition-colors">
          <Link
            to={articlePath}
            onClick={() => trackEvent('article_open', post.title, post.category)}
          >
            {post.title}
          </Link>
        </h2>

        <p className="text-xs sm:text-sm text-[#64748B] line-clamp-2">{post.summary}</p>

        {/* Specialized Metadata by Section (Tabular Numerals) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono-tabular text-[#64748B]">
          {sectionSlug === 'results' && (
            <>
              <span>
                Result Date:{' '}
                <strong className="text-[#071A3D]">
                  {post.resultDate || formatIndianDate(post.publishedAt)}
                </strong>
              </span>
              <span>
                Exam Level: <strong className="text-[#071A3D]">{post.subcategory || 'All India'}</strong>
              </span>
            </>
          )}

          {sectionSlug === 'admit-card' && (
            <>
              <span>
                Release Date:{' '}
                <strong className="text-[#071A3D]">
                  {post.admitCardDate || formatIndianDate(post.publishedAt)}
                </strong>
              </span>
              <span>
                Exam Date: <strong className="text-[#071A3D]">{post.examDate || 'See Notice'}</strong>
              </span>
            </>
          )}

          {sectionSlug === 'answer-key' && (
            <>
              <span>
                Key Type:{' '}
                <strong className="text-[#071A3D] uppercase">
                  {post.answerKeyType === 'none' ? 'Official' : post.answerKeyType || 'Provisional'}
                </strong>
              </span>
              {post.objectionDeadline && (
                <span>
                  Objection Window Closes:{' '}
                  <strong className="text-[#DC2626]">{post.objectionDeadline}</strong>
                </span>
              )}
            </>
          )}

          {sectionSlug === 'syllabus' && (
            <>
              <span>
                Qualification: <strong className="text-[#071A3D]">{post.qualification || 'Graduate'}</strong>
              </span>
              {post.syllabusSections && post.syllabusSections.length > 0 && (
                <span>
                  Modules Covered:{' '}
                  <strong className="text-[#071A3D]">{post.syllabusSections.length} Subjects</strong>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E2E8F0]">
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark update'}
          className={`p-2 rounded border ${
            isSaved
              ? 'border-[#FF7A00] text-[#FF7A00] bg-[#FF7A00]/10'
              : 'border-[#E2E8F0] text-[#64748B] hover:text-[#071A3D]'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {officialAction && (
          <a
            href={officialAction.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('official_link_click', officialAction.label, post.category)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#138A36] hover:bg-[#10752D] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <span>{officialAction.label}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <Link
          to={articlePath}
          onClick={() => trackEvent('article_open', post.title, post.category)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <span>Full Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
