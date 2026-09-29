import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight, ExternalLink } from 'lucide-react';
import { Post } from '../types/cms';
import {
  computePostStatus,
  formatIndianDate,
  formatRelativeTime,
} from '../utils/statusAndSanitize';
import { useCMS } from '../context/CMSContext';

interface UpdateCardProps {
  post: Post;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<Post['category'], string> = {
  jobs: 'Government Job',
  exams: 'Competitive Exam',
  'admit-card': 'Admit Card',
  results: 'Official Result',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus & Pattern',
  notifications: 'Official Notice',
};

export const UpdateCard: React.FC<UpdateCardProps> = ({ post, compact = false }) => {
  const { settings, bookmarks, toggleBookmark, trackEvent } = useCMS();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!post.applicationEnd) return;
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [post.applicationEnd]);

  const statusInfo = computePostStatus(post, settings.closingSoonThresholdDays, nowMs);
  const isSaved = bookmarks.includes(post.id);
  const articlePath = `/${post.category}/${post.slug}`;

  const primaryActionLink = post.importantLinks?.[0];

  return (
    <article className="card-interactive group bg-white border border-[#E2E8F0] rounded-lg p-4 sm:p-5 hover:border-[#071A3D]/40 flex flex-col justify-between min-w-0">
      <div className="min-w-0">
        {/* Quiet 1-line unboxed metadata kicker (Zero-Pill Discipline) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] mb-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[#071A3D]">{post.organization}</span>
            <span aria-hidden="true">·</span>
            <span>{CATEGORY_LABELS[post.category] || post.category}</span>
            <span aria-hidden="true">·</span>
            <span>{post.state}</span>
            {post.badge && post.badge !== 'NONE' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#FF7A00]">{post.badge}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleBookmark(post.id);
            }}
            aria-label={isSaved ? 'Remove from saved updates' : 'Save update for later'}
            className={`btn-press p-1.5 rounded shrink-0 cursor-pointer ${
              isSaved
                ? 'text-[#FF7A00] bg-[#FF7A00]/10'
                : 'text-[#64748B] hover:text-[#071A3D] hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Primary Title */}
        <h3 className="text-base sm:text-lg font-semibold text-[#071A3D] group-hover:text-[#FF7A00] transition-colors leading-snug mb-2 break-words">
          <Link
            to={articlePath}
            onClick={() => trackEvent('article_open', post.title, post.category)}
            className="focus:outline-none focus-visible:underline"
          >
            {post.title}
          </Link>
        </h3>

        {/* Summary */}
        {!compact && (
          <p className="text-sm text-[#64748B] line-clamp-2 leading-relaxed mb-3 break-words">
            {post.summary}
          </p>
        )}

        {/* Key Structured Facts Row (Tabular Numerals) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] font-mono-tabular py-2 border-t border-[#E2E8F0]/70">
          {typeof post.totalVacancies === 'number' && post.totalVacancies > 0 && (
            <span>
              Vacancies:{' '}
              <strong className="text-[#071A3D]">
                {post.totalVacancies.toLocaleString('en-IN')}
              </strong>
            </span>
          )}
          {post.qualification && (
            <>
              {typeof post.totalVacancies === 'number' && post.totalVacancies > 0 && (
                <span aria-hidden="true">·</span>
              )}
              <span>
                Eligibility: <strong className="text-[#071A3D]">{post.qualification}</strong>
              </span>
            </>
          )}
          {post.applicationEnd && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Last Date:{' '}
                <strong className="text-[#071A3D]">
                  {formatIndianDate(post.applicationEnd)}
                </strong>
              </span>
            </>
          )}
          {post.examDate && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Exam Date: <strong className="text-[#071A3D]">{post.examDate}</strong>
              </span>
            </>
          )}
          {post.resultDate && post.category === 'results' && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Result Date: <strong className="text-[#071A3D]">{post.resultDate}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Footer Status + Live Countdown + CTA */}
      <div className="pt-3 mt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
            <span className={statusInfo.textClass}>{statusInfo.label}</span>
          </span>

          {statusInfo.countdown && (
            <>
              <span className="text-[#64748B]" aria-hidden="true">
                ·
              </span>
              <span className="font-mono-tabular text-[11px] text-[#071A3D] font-medium">
                Closes in {statusInfo.countdown.formatted}
              </span>
            </>
          )}

          {!statusInfo.countdown && (
            <>
              <span className="text-[#64748B]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#64748B]">
                {formatRelativeTime(post.updatedAt) ||
                  `Published ${formatIndianDate(post.publishedAt || post.createdAt)}`}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {primaryActionLink &&
            (post.category === 'admit-card' ||
              post.category === 'results' ||
              post.category === 'answer-key') && (
              <a
                href={primaryActionLink.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('official_link_click', primaryActionLink.label, post.category)
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#138A36] hover:underline whitespace-nowrap"
              >
                <span>{primaryActionLink.label}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}

          <Link
            to={articlePath}
            onClick={() => trackEvent('article_open', post.title, post.category)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors whitespace-nowrap"
          >
            <span>Read More</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
