import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bookmark,
  Share2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileText,
  Printer,
  CalendarPlus,
} from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';
import { ShareModal } from '../components/ShareModal';
import {
  buildFormattedShareMessage,
  copyTextReliable,
} from '../utils/shareUtils';
import {
  computePostStatus,
  formatIndianDate,
  formatRelativeTime,
  sanitizeHtml,
} from '../utils/statusAndSanitize';
import { ImportantLinkItem } from '../types/cms';

const LINK_BUTTON_STYLES: Record<
  ImportantLinkItem['type'],
  { bg: string; labelPrefix: string }
> = {
  apply: { bg: 'bg-[#138A36] hover:bg-[#10752D] text-white', labelPrefix: 'Apply Online' },
  notification: {
    bg: 'bg-[#071A3D] hover:bg-[#0D2758] text-white',
    labelPrefix: 'Download Notification',
  },
  website: {
    bg: 'bg-slate-800 hover:bg-slate-900 text-white',
    labelPrefix: 'Official Website',
  },
  'admit-card': {
    bg: 'bg-[#FF7A00] hover:bg-[#E56D00] text-white',
    labelPrefix: 'Download Admit Card',
  },
  result: {
    bg: 'bg-purple-700 hover:bg-purple-800 text-white',
    labelPrefix: 'Check Result',
  },
  'answer-key': {
    bg: 'bg-blue-700 hover:bg-blue-800 text-white',
    labelPrefix: 'Download Answer Key',
  },
  syllabus: {
    bg: 'bg-teal-700 hover:bg-teal-800 text-white',
    labelPrefix: 'Download Syllabus PDF',
  },
  other: {
    bg: 'bg-[#071A3D] hover:bg-[#0D2758] text-white',
    labelPrefix: 'Open Official Link',
  },
};

export const ArticleDetailPage: React.FC = () => {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const {
    posts,
    publishedPosts,
    settings,
    bookmarks,
    toggleBookmark,
    trackEvent,
    showToast,
    adminUser,
  } = useCMS();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);

  // Allow admins to preview draft/scheduled posts directly; match by slug or id so direct links always open
  const post = useMemo(() => {
    const pool = adminUser ? posts : publishedPosts;
    return pool.find((p) => p.slug === slug || p.id === slug);
  }, [posts, publishedPosts, slug, adminUser]);

  useEffect(() => {
    if (!post?.applicationEnd) return;
    const interval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [post?.applicationEnd]);

  // Related Content (3-6 posts based on same organization, category, or tags)
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return publishedPosts
      .filter((p) => p.id !== post.id)
      .map((candidate) => {
        let score = 0;
        if (candidate.organization.toLowerCase() === post.organization.toLowerCase()) score += 4;
        if (candidate.category === post.category) score += 2;
        if (candidate.state === post.state) score += 1;
        return { candidate, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.candidate);
  }, [post, publishedPosts]);

  const shareData = useMemo(() => {
    if (!post) return null;
    return buildFormattedShareMessage(post, settings.closingSoonThresholdDays);
  }, [post, settings.closingSoonThresholdDays]);

  const shareUrl = shareData?.directUrl || '';

  // Build Schema.org Structured Data (BreadcrumbList + Article/JobPosting + FAQPage)
  const structuredData = useMemo(() => {
    if (!post) return undefined;
    const graph: Array<Record<string, unknown>> = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: typeof window !== 'undefined' ? window.location.origin : '',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: post.category.toUpperCase(),
            item:
              typeof window !== 'undefined'
                ? `${window.location.origin}/${post.category}`
                : `/${post.category}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: shareUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.seoTitle || post.title,
        description: post.seoDescription || post.summary,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt,
        author: {
          '@type': 'Organization',
          name: settings.siteName,
        },
        publisher: {
          '@type': 'Organization',
          name: settings.siteName,
        },
      },
    ];

    if (post.category === 'jobs' && post.applicationEnd) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: post.title,
        description: post.summary,
        datePosted: post.publishedAt || post.createdAt,
        validThrough: post.applicationEnd,
        hiringOrganization: {
          '@type': 'Organization',
          name: post.organization,
          sameAs: post.officialSourceUrl || undefined,
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressRegion: post.state,
            addressCountry: 'IN',
          },
        },
      });
    }

    if (post.faqs && post.faqs.length > 0) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      });
    }

    return graph;
  }, [post, shareUrl, settings.siteName]);

  if (!post) {
    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-16 text-center">
        <SEOHead title="Update Not Found" />
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
          Update Not Found or Archived
        </h1>
        <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">
          The career update you are looking for may have been moved, archived, or does not exist at this URL.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
          >
            Go Home
          </Link>
          <Link
            to="/latest"
            className="px-4 py-2 rounded-md border border-[#E2E8F0] bg-white text-[#071A3D] text-xs font-semibold"
          >
            Browse Latest Updates
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = computePostStatus(post, settings.closingSoonThresholdDays, nowMs);
  const isSaved = bookmarks.includes(post.id);

  const handleCopyLink = async () => {
    const ok = await copyTextReliable(shareUrl);
    if (ok) {
      setCopiedInline(true);
      trackEvent('share_click', `copy:${post.slug}`, post.category);
      showToast('Direct post link copied to clipboard!', 'success');
      setTimeout(() => setCopiedInline(false), 2500);
    } else {
      setShareModalOpen(true);
    }
  };

  const handleDownloadCalendarIcs = () => {
    const rawDate = post.applicationEnd || post.examDate || post.publishedAt;
    const parsed = rawDate ? new Date(rawDate) : new Date();
    const validDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const y = validDate.getUTCFullYear();
    const m = String(validDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(validDate.getUTCDate()).padStart(2, '0');
    const dtStr = `${y}${m}${d}`;
    const nextDate = new Date(validDate.getTime() + 86400000);
    const ny = nextDate.getUTCFullYear();
    const nm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const nd = String(nextDate.getUTCDate()).padStart(2, '0');
    const dtEndStr = `${ny}${nm}${nd}`;
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Career Alert India//Exam & Job Reminder//EN',
      'BEGIN:VEVENT',
      `UID:cai-${post.id}@cai.foldedpage.in`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${dtStr}`,
      `DTEND;VALUE=DATE:${dtEndStr}`,
      `SUMMARY:${post.title.replace(/[,;]/g, ' ')} (${post.organization})`,
      `DESCRIPTION:${(post.summary || '').replace(/\r?\n/g, ' ')} - Direct Link: ${shareUrl}`,
      `URL:${shareUrl}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAI-Reminder-${post.slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Added deadline reminder (.ics) to downloads', 'success');
  };

  const quickJumpSections = [
    post.importantDates && post.importantDates.length > 0
      ? { id: 'section-dates', label: 'Important Dates' }
      : null,
    post.fees && post.fees.length > 0
      ? { id: 'section-fees', label: 'Application Fee' }
      : null,
    post.eligibility &&
    (post.eligibility.education || post.eligibility.ageMin || post.eligibility.ageMax)
      ? { id: 'section-eligibility', label: 'Eligibility' }
      : null,
    post.vacancies && post.vacancies.length > 0
      ? { id: 'section-vacancies', label: 'Vacancy Details' }
      : null,
    post.syllabusSections && post.syllabusSections.length > 0
      ? { id: 'section-syllabus', label: 'Syllabus & Pattern' }
      : null,
    post.importantLinks && post.importantLinks.length > 0
      ? { id: 'section-links', label: 'Official Links' }
      : null,
    post.faqs && post.faqs.length > 0
      ? { id: 'section-faqs', label: 'FAQs' }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <>
      <SEOHead
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.summary}
        canonicalPath={`/${post.category}/${post.slug}`}
        ogImage={post.ogImage || post.featuredImage}
        ogType="article"
        structuredData={structuredData}
      />

      <div className="max-w-[1040px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 overflow-x-hidden">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-[#64748B] mb-4 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-[#071A3D] transition-colors">
            Home
          </Link>
          <span>→</span>
          <Link
            to={`/${category || post.category}`}
            className="hover:text-[#071A3D] capitalize transition-colors"
          >
            {(category || post.category).replace('-', ' ')}
          </Link>
          <span>→</span>
          <span className="text-[#071A3D] font-medium truncate max-w-[240px] sm:max-w-md">
            {post.title}
          </span>
        </nav>

        {/* Article Header Card */}
        <header className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-8 mb-6">
          {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#071A3D]">
                Organization: {post.organization}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">Category: {post.category.replace('-', ' ')}</span>
              <span aria-hidden="true">·</span>
              <span>Region: {post.state}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#071A3D] tracking-tight leading-snug break-words">
            {post.title}
          </h1>

          {/* Timestamps & Live Status + Countdown Bar */}
          <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] font-mono-tabular">
              <span>
                Published: <strong className="text-[#071A3D]">{formatIndianDate(post.publishedAt || post.createdAt)}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Last Updated: <strong className="text-[#071A3D]">{formatIndianDate(post.updatedAt)}</strong>
              </span>
              {formatRelativeTime(post.updatedAt) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans text-[#138A36] font-medium">
                    ({formatRelativeTime(post.updatedAt)})
                  </span>
                </>
              )}
            </div>

            {/* Status & Live Countdown */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotClass}`} />
                <span className={statusInfo.textClass}>{statusInfo.label}</span>
              </span>

              {statusInfo.countdown && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#F6F8FB] border border-[#E2E8F0] text-xs font-mono-tabular text-[#071A3D]">
                  <Clock className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Application closes in: </span>
                  <strong className="text-[#DC2626]">{statusInfo.countdown.formatted}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Intro Summary */}
          <p className="mt-5 text-sm sm:text-base text-[#071A3D]/90 leading-relaxed bg-[#F6F8FB] p-4 rounded-lg border-l-4 border-[#071A3D]">
            {post.summary}
          </p>

          {/* Share & Bookmark Bar */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>Share</span>
              </button>
              {shareData && (
                <>
                  <a
                    href={shareData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('share_click', `whatsapp:${post.slug}`, post.category)}
                    className="btn-press px-3 py-1.5 rounded bg-[#138A36] hover:bg-[#10752D] text-white text-xs font-semibold transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={shareData.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('share_click', `telegram:${post.slug}`, post.category)}
                    className="btn-press px-3 py-1.5 rounded bg-[#0088CC] hover:bg-[#0077B5] text-white text-xs font-semibold transition-colors"
                  >
                    Telegram
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                  copiedInline
                    ? 'border-[#138A36] bg-[#138A36]/10 text-[#138A36]'
                    : 'border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D]'
                }`}
              >
                {copiedInline ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>

              {(post.applicationEnd || post.examDate) && (
                <button
                  type="button"
                  onClick={handleDownloadCalendarIcs}
                  title="Add deadline or exam date to Calendar"
                  className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span className="hidden sm:inline">Set Reminder</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => toggleBookmark(post.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                isSaved
                  ? 'bg-[#FF7A00]/10 border-[#FF7A00] text-[#FF7A00]'
                  : 'bg-white border-[#E2E8F0] text-[#071A3D] hover:border-[#071A3D]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
              <span>{isSaved ? 'Saved in Bookmarks' : 'Save Update'}</span>
            </button>
          </div>

          {quickJumpSections.length > 1 && (
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-semibold text-[#64748B] shrink-0">Jump to:</span>
              {quickJumpSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="px-2.5 py-1 rounded bg-[#F6F8FB] hover:bg-[#071A3D] text-[#071A3D] hover:text-white font-medium whitespace-nowrap transition-colors"
                >
                  {sec.label}
                </a>
              ))}
            </div>
          )}
        </header>

        {/* Main Structured Article Sections */}
        <div className="space-y-6">
          {/* Quick Key Metrics Bar */}
          {(post.totalVacancies || post.qualification || post.salary || post.location) && (
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {typeof post.totalVacancies === 'number' && post.totalVacancies > 0 && (
                <div>
                  <div className="text-xs text-[#64748B]">Total Vacancies</div>
                  <div className="text-lg font-bold font-mono-tabular text-[#071A3D] mt-0.5">
                    {post.totalVacancies.toLocaleString('en-IN')} Posts
                  </div>
                </div>
              )}
              {post.qualification && (
                <div>
                  <div className="text-xs text-[#64748B]">Minimum Qualification</div>
                  <div className="text-sm font-bold text-[#071A3D] mt-0.5">
                    {post.qualification}
                  </div>
                </div>
              )}
              {post.salary && (
                <div>
                  <div className="text-xs text-[#64748B]">Pay Scale / Salary</div>
                  <div className="text-xs sm:text-sm font-bold text-[#071A3D] mt-0.5">
                    {post.salary}
                  </div>
                </div>
              )}
              {post.location && (
                <div>
                  <div className="text-xs text-[#64748B]">Job / Exam Location</div>
                  <div className="text-sm font-bold text-[#071A3D] mt-0.5">{post.location}</div>
                </div>
              )}
            </section>
          )}

          {/* Important Dates & Application Fee Side-by-Side on Desktop */}
          {((post.importantDates && post.importantDates.length > 0) ||
            (post.fees && post.fees.length > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Important Dates Table */}
              {post.importantDates && post.importantDates.length > 0 && (
                <section id="section-dates" className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden scroll-mt-20">
                  <div className="px-5 py-3.5 bg-[#071A3D] text-white">
                    <h2 className="text-base font-bold">Important Dates</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#F6F8FB] border-b border-[#E2E8F0] text-[#64748B]">
                          <th className="py-2.5 px-4 font-semibold">Event / Milestone</th>
                          <th className="py-2.5 px-4 font-semibold">Date / Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {post.importantDates.map((d) => (
                          <tr key={d.id} className="hover:bg-[#F6F8FB]/60">
                            <td className="py-3 px-4 font-medium text-[#071A3D]">{d.label}</td>
                            <td
                              className={`py-3 px-4 font-mono-tabular ${
                                d.isHighlight
                                  ? 'font-bold text-[#DC2626]'
                                  : 'font-semibold text-[#071A3D]'
                              }`}
                            >
                              {d.dateValue || 'To Be Notified'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Application Fee Table */}
              {post.fees && post.fees.length > 0 && (
                <section id="section-fees" className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden scroll-mt-20">
                  <div className="px-5 py-3.5 bg-[#071A3D] text-white">
                    <h2 className="text-base font-bold">Application Fee</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#F6F8FB] border-b border-[#E2E8F0] text-[#64748B]">
                          <th className="py-2.5 px-4 font-semibold">Candidate Category</th>
                          <th className="py-2.5 px-4 font-semibold">Fee Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {post.fees.map((f) => (
                          <tr key={f.id} className="hover:bg-[#F6F8FB]/60">
                            <td className="py-3 px-4 font-medium text-[#071A3D]">{f.category}</td>
                            <td className="py-3 px-4 font-mono-tabular font-bold text-[#071A3D]">
                              {f.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2.5 bg-[#F6F8FB] border-t border-[#E2E8F0] text-xs text-[#64748B]">
                    Payment Mode: Online via UPI, Net Banking, Debit/Credit Card, or e-Challan as specified in the official notification.
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Eligibility Criteria */}
          {post.eligibility &&
            (post.eligibility.education ||
              post.eligibility.ageMin ||
              post.eligibility.ageMax) && (
              <section id="section-eligibility" className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden scroll-mt-20">
                <div className="px-5 py-3.5 bg-[#071A3D] text-white">
                  <h2 className="text-base font-bold">Eligibility Criteria & Age Limit</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                  {post.eligibility.education && (
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
                      <div className="text-xs font-semibold text-[#64748B] mb-1">
                        Educational Qualification
                      </div>
                      <div className="text-[#071A3D] font-medium leading-relaxed">
                        {post.eligibility.education}
                      </div>
                    </div>
                  )}

                  {(post.eligibility.ageMin || post.eligibility.ageMax) && (
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
                      <div className="text-xs font-semibold text-[#64748B] mb-1">
                        Age Limit & Relaxation
                      </div>
                      <div className="text-[#071A3D] font-mono-tabular font-bold">
                        Minimum Age: {post.eligibility.ageMin || 'N/A'} · Maximum Age:{' '}
                        {post.eligibility.ageMax || 'As per rules'}
                      </div>
                      {post.eligibility.ageRelaxation && (
                        <p className="text-xs text-[#64748B] mt-1">
                          {post.eligibility.ageRelaxation}
                        </p>
                      )}
                    </div>
                  )}

                  {post.eligibility.nationality && (
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
                      <div className="text-xs font-semibold text-[#64748B] mb-1">Nationality</div>
                      <div className="text-[#071A3D] font-medium">
                        {post.eligibility.nationality}
                      </div>
                    </div>
                  )}

                  {post.eligibility.otherRequirements && (
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
                      <div className="text-xs font-semibold text-[#64748B] mb-1">
                        Physical / Other Requirements
                      </div>
                      <div className="text-[#071A3D] font-medium">
                        {post.eligibility.otherRequirements}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

          {/* Vacancy Details Responsive Table */}
          {post.vacancies && post.vacancies.length > 0 && (
            <section id="section-vacancies" className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-3.5 bg-[#071A3D] text-white flex items-center justify-between">
                <h2 className="text-base font-bold">Post-Wise Vacancy Details</h2>
                {typeof post.totalVacancies === 'number' && post.totalVacancies > 0 && (
                  <span className="font-mono-tabular text-xs font-semibold text-[#FF7A00]">
                    Total: {post.totalVacancies.toLocaleString('en-IN')} Vacancies
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F6F8FB] border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="py-3 px-4 font-semibold">Post Name</th>
                      <th className="py-3 px-4 font-semibold">Department / Cadre</th>
                      <th className="py-3 px-4 font-semibold text-right">Vacancies</th>
                      <th className="py-3 px-4 font-semibold">Qualification</th>
                      <th className="py-3 px-4 font-semibold">Age Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {post.vacancies.map((v) => (
                      <tr key={v.id} className="hover:bg-[#F6F8FB]/60">
                        <td className="py-3 px-4 font-semibold text-[#071A3D]">{v.postName}</td>
                        <td className="py-3 px-4 text-[#64748B]">{v.department}</td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-bold text-[#071A3D]">
                          {Number(v.vacancies).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-[#071A3D]">{v.qualification}</td>
                        <td className="py-3 px-4 font-mono-tabular text-[#64748B]">
                          {v.ageLimit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Subject-Wise Syllabus Table (for Syllabus posts or Exam posts) */}
          {post.syllabusSections && post.syllabusSections.length > 0 && (
            <section id="section-syllabus" className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-3.5 bg-[#071A3D] text-white">
                <h2 className="text-base font-bold">Subject-Wise Syllabus & Exam Pattern</h2>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {post.syllabusSections.map((sec) => (
                  <div key={sec.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-sm sm:text-base font-bold text-[#071A3D]">
                        {sec.subject}
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-mono-tabular text-[#64748B]">
                        {sec.marks && <span>Weightage: {sec.marks}</span>}
                        {sec.duration && <span>Duration: {sec.duration}</span>}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                      {sec.topics}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Editorial Rich Text Body Content */}
          {post.content && (
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6">
              <div
                className="prose prose-sm sm:prose-base max-w-none text-[#071A3D] space-y-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:leading-relaxed [&_ .notice-info]:p-3.5 [&_.notice-info]:bg-[#F6F8FB] [&_.notice-info]:border-l-4 [&_.notice-info]:border-[#FF7A00] [&_.notice-info]:text-xs"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
              />
            </section>
          )}

          {/* Selection Process Timeline & How to Apply */}
          {((post.selectionProcess && post.selectionProcess.length > 0) ||
            (post.howToApply && post.howToApply.length > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {post.selectionProcess && post.selectionProcess.length > 0 && (
                <section className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                  <h2 className="text-base font-bold text-[#071A3D] mb-4">
                    Selection Process Timeline
                  </h2>
                  <ol className="space-y-3">
                    {post.selectionProcess.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                        <span className="w-6 h-6 rounded-full bg-[#071A3D] text-white font-mono-tabular text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-[#071A3D] font-medium leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {post.howToApply && post.howToApply.length > 0 && (
                <section className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                  <h2 className="text-base font-bold text-[#071A3D] mb-4">
                    How to Apply (Step-by-Step)
                  </h2>
                  <ol className="space-y-3">
                    {post.howToApply.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                        <span className="w-6 h-6 rounded-full bg-[#138A36] text-white font-mono-tabular text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-[#071A3D] leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}

          {/* Section 22: Important Official Links (Only shown when links exist) */}
          {post.importantLinks && post.importantLinks.length > 0 && (
            <section id="section-links" className="bg-white border-2 border-[#071A3D] rounded-xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-3.5 bg-[#071A3D] text-white flex items-center justify-between">
                <h2 className="text-base font-bold">Important Official Links</h2>
                <span className="text-xs text-white/80">Direct Verified Portals</span>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {post.importantLinks.map((link) => {
                  const style = LINK_BUTTON_STYLES[link.type] || LINK_BUTTON_STYLES.other;
                  return (
                    <div
                      key={link.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F6F8FB]"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#071A3D]">{link.label}</div>
                        <div className="text-xs text-[#64748B] font-mono-tabular truncate max-w-md">
                          {link.url}
                        </div>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackEvent('official_link_click', `${post.slug}:${link.label}`, post.category)
                        }
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${style.bg}`}
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 23: Official Source & Trust Verification Section */}
          <section className="bg-amber-50/90 border border-amber-300 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs sm:text-sm text-[#071A3D]">
                <p className="font-bold">
                  ⚠️ Important: Information can change. Always verify eligibility, dates, fees and other details from the official notification before applying.
                </p>
                {post.officialSourceUrl && (
                  <p className="text-xs text-[#64748B]">
                    Official Source Portal:{' '}
                    <a
                      href={post.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackEvent('official_link_click', `source:${post.officialSourceUrl}`, post.category)
                      }
                      className="font-mono-tabular font-semibold text-[#071A3D] underline hover:text-[#FF7A00]"
                    >
                      {post.officialSourceUrl}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 73: Frequently Asked Questions (FAQ) */}
          {post.faqs && post.faqs.length > 0 && (
            <section id="section-faqs" className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 scroll-mt-20">
              <h2 className="text-base sm:text-lg font-bold text-[#071A3D] mb-4">
                Frequently Asked Questions (FAQs)
              </h2>
              <div className="space-y-3">
                {post.faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="p-4 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]"
                  >
                    <h3 className="text-sm font-bold text-[#071A3D]">{faq.question}</h3>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 27: WhatsApp Channel CTA inside Article */}
          <section className="bg-[#071A3D] text-white rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Join Career Alert India on WhatsApp
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                Get instant admit card, answer key, and result updates for {post.organization} directly on WhatsApp.
              </p>
            </div>
            <a
              href={settings.whatsappChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('whatsapp_click', `article:${post.slug}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#138A36] hover:bg-[#10752D] text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              <span>Join WhatsApp Channel →</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>

          {/* Section 26: Related Content ("You May Also Like") */}
          {relatedPosts.length > 0 && (
            <section className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#071A3D]">
                  You May Also Like
                </h2>
                <Link
                  to={`/${post.category}`}
                  className="text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00]"
                >
                  More in {post.organization} →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedPosts.map((rel, idx) => (
                  <UpdateCard key={rel.id || `${rel.slug}-${idx}`} post={rel} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {shareModalOpen && (
        <ShareModal post={post} onClose={() => setShareModalOpen(false)} />
      )}
    </>
  );
};
