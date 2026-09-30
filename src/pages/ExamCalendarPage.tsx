import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, List, ArrowRight, Share2, Edit3, Search, Download, X } from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { ShareModal } from '../components/ShareModal';
import { Post } from '../types/cms';
import { computePostStatus, formatIndianDate } from '../utils/statusAndSanitize';

export const ExamCalendarPage: React.FC = () => {
  const { publishedPosts, categories, settings, adminUser, showToast } = useCMS();
  const [viewMode, setViewMode] = useState<'list' | 'monthly'>('list');
  const [selectedOrg, setSelectedOrg] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sharePost, setSharePost] = useState<Post | null>(null);

  const domainOrgs = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'domain' && c.enabled)
        .sort((a, b) => a.order - b.order),
    [categories]
  );

  const calendarEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedPosts.filter((p) => {
      if (selectedOrg !== 'All' && p.organization.toLowerCase() !== selectedOrg.toLowerCase()) {
        return false;
      }
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.organization.toLowerCase().includes(q) &&
        !p.state.toLowerCase().includes(q)
      ) {
        return false;
      }
      return Boolean(p.examDate || p.applicationEnd || p.admitCardDate || p.resultDate);
    });
  }, [publishedPosts, selectedOrg, searchQuery]);

  const handleExportCalendarCsv = () => {
    const headers = [
      'Exam / Recruitment',
      'Organization',
      'Application Start',
      'Application End',
      'Exam Date',
      'Admit Card Date',
      'Result Date',
    ];
    const rows = calendarEntries.map((p) =>
      [
        p.title,
        p.organization,
        p.applicationStart || '',
        p.applicationEnd || '',
        p.examDate || 'To Be Notified',
        p.admitCardDate || '',
        p.resultDate || '',
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Career-Alert-India-Exam-Calendar-2026-27.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Exam Calendar CSV schedule', 'success');
  };

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, typeof calendarEntries> = {
      'September – October 2026': [],
      'November – December 2026': [],
      'January – March 2027 & Upcoming': [],
    };
    calendarEntries.forEach((p) => {
      const ex = (p.examDate || p.applicationEnd || '').toLowerCase();
      if (ex.includes('sep') || ex.includes('oct') || ex.includes('-09-') || ex.includes('-10-')) {
        groups['September – October 2026'].push(p);
      } else if (
        ex.includes('nov') ||
        ex.includes('dec') ||
        ex.includes('-11-') ||
        ex.includes('-12-')
      ) {
        groups['November – December 2026'].push(p);
      } else {
        groups['January – March 2027 & Upcoming'].push(p);
      }
    });
    return groups;
  }, [calendarEntries]);

  return (
    <>
      <SEOHead
        title="Exam Calendar 2026–27 – SSC, UPSC, Railway, Banking & State Exams"
        description="Complete 2026–27 Indian Government Exam Calendar with application start/end dates, exam schedules, admit card release dates, and result timelines."
        canonicalPath="/calendar"
      />

      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-[#64748B] mb-2">
            <Link to="/" className="hover:text-[#071A3D]">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-[#071A3D] font-medium">Exam Calendar</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
                National & State Exam Calendar (2026–27)
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Track application windows, examination dates, admit cards, and result schedules across major commissions.
              </p>
            </div>

            {/* View Toggle + Org Filter */}
            <div className="flex flex-wrap items-center gap-3">
              {adminUser && (
                <Link
                  to="/8233538355?tab=calendar"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FF7A00] hover:bg-[#E56D00] text-white text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Exam Calendar</span>
                </Link>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exam schedule..."
                  aria-label="Search exam schedule"
                  className="pl-8 pr-6 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F6F8FB] text-xs text-[#071A3D] placeholder:text-[#64748B] focus:outline-none focus:border-[#071A3D] focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071A3D] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                aria-label="Filter by organization"
                className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-[#071A3D]"
              >
                <option value="All">All Commissions</option>
                {domainOrgs.map((o, idx) => (
                  <option key={o.id || `${o.slug}-${idx}`} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCalendarCsv}
                title="Download Exam Calendar CSV"
                className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-xs font-semibold text-[#071A3D] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <div className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F6F8FB] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#071A3D] text-white'
                      : 'text-[#64748B] hover:text-[#071A3D]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-[#071A3D] text-white'
                      : 'text-[#64748B] hover:text-[#071A3D]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Monthly Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {viewMode === 'list' ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#071A3D] text-white">
                    <th className="py-3.5 px-4 font-semibold">Exam / Recruitment</th>
                    <th className="py-3.5 px-4 font-semibold">Organization</th>
                    <th className="py-3.5 px-4 font-semibold">Application Window</th>
                    <th className="py-3.5 px-4 font-semibold">Exam Date</th>
                    <th className="py-3.5 px-4 font-semibold">Admit Card</th>
                    <th className="py-3.5 px-4 font-semibold">Result Date</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {calendarEntries.map((post, idx) => {
                    const st = computePostStatus(post, settings.closingSoonThresholdDays);
                    return (
                      <tr key={post.id || `${post.slug}-${idx}`} className="hover:bg-[#F6F8FB]">
                        <td className="py-3.5 px-4 font-semibold text-[#071A3D]">
                          <Link
                            to={`/${post.category}/${post.slug}`}
                            className="hover:text-[#FF7A00] transition-colors"
                          >
                            {post.title}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#071A3D]">
                          {post.organization}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#64748B]">
                          {post.applicationStart ? formatIndianDate(post.applicationStart) : '—'} to{' '}
                          <strong className="text-[#071A3D]">
                            {post.applicationEnd ? formatIndianDate(post.applicationEnd) : '—'}
                          </strong>
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#071A3D]">
                          {post.examDate || 'To Be Notified'}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#64748B]">
                          {post.admitCardDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#64748B]">
                          {post.resultDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                            <span className={st.textClass}>{st.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSharePost(post)}
                            title="Share"
                            className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#64748B] hover:text-[#071A3D] cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByMonth).map(([monthGroup, items]) => (
              <div
                key={monthGroup}
                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-[#071A3D] text-white flex items-center justify-between">
                  <h2 className="text-base font-bold">{monthGroup}</h2>
                  <span className="font-mono-tabular text-xs text-[#FF7A00]">
                    {items.length} Scheduled {items.length === 1 ? 'Event' : 'Events'}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="p-5 text-xs text-[#64748B]">
                    No exams currently listed in this window for the selected filter.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {items.map((post, idx) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <div
                          key={post.id || `${post.slug}-${idx}`}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F6F8FB]"
                        >
                          <div>
                            <div className="text-xs text-[#64748B]">
                              <strong className="text-[#071A3D]">{post.organization}</strong> ·{' '}
                              {post.state} · <span className={st.textClass}>{st.label}</span>
                            </div>
                            <Link
                              to={`/${post.category}/${post.slug}`}
                              className="text-base font-bold text-[#071A3D] hover:text-[#FF7A00] mt-0.5 block"
                            >
                              {post.title}
                            </Link>
                            <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono-tabular text-[#64748B]">
                              <span>
                                Application Ends:{' '}
                                <strong className="text-[#071A3D]">
                                  {formatIndianDate(post.applicationEnd)}
                                </strong>
                              </span>
                              <span>
                                Exam Date:{' '}
                                <strong className="text-[#071A3D]">
                                  {post.examDate || 'TBA'}
                                </strong>
                              </span>
                              <span>
                                Admit Card:{' '}
                                <strong className="text-[#071A3D]">
                                  {post.admitCardDate || 'TBA'}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start md:self-center">
                            <button
                              type="button"
                              onClick={() => setSharePost(post)}
                              title="Share"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] text-xs font-semibold text-[#071A3D] cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                              <span>Share</span>
                            </button>
                            <Link
                              to={`/${post.category}/${post.slug}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold whitespace-nowrap"
                            >
                              <span>View Schedule</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}
    </>
  );
};
