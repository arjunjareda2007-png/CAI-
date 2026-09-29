import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Download,
  MessageCircle,
  Send,
  Mail,
  ArrowRight,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Post } from '../types/cms';
import { BrandLogo, CircularEmblemSVG } from './BrandLogo';
import { computePostStatus, formatIndianDate } from '../utils/statusAndSanitize';
import { useCMS } from '../context/CMSContext';
import {
  buildFormattedShareMessage,
  copyTextReliable,
  renderCAIShareCardCanvas,
  canvasToPngBlob,
} from '../utils/shareUtils';

interface ShareModalProps {
  post: Post | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ post, onClose }) => {
  const { settings, trackEvent, showToast } = useCMS();
  const location = useLocation();

  const [previewTab, setPreviewTab] = useState<'link' | 'card' | 'text'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Lock background scroll & bind Escape key
  useEffect(() => {
    if (!post) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [post, onClose]);

  // Pre-render the 1200x630 CAI Branded Share Card preview automatically
  useEffect(() => {
    if (!post) return;
    let active = true;
    renderCAIShareCardCanvas(post, settings.closingSoonThresholdDays).then((canvas) => {
      if (!active || !canvas) return;
      try {
        setCardDataUrl(canvas.toDataURL('image/png'));
      } catch {
        // Ignore dataURL error if any
      }
    });
    return () => {
      active = false;
    };
  }, [post, settings.closingSoonThresholdDays]);

  const sharePayload = useMemo(() => {
    if (!post) return null;
    return buildFormattedShareMessage(post, settings.closingSoonThresholdDays);
  }, [post, settings.closingSoonThresholdDays]);

  if (!post || !sharePayload || typeof document === 'undefined') return null;

  const statusInfo = computePostStatus(post, settings.closingSoonThresholdDays);
  const articleRelativePath = `/${post.category}/${post.slug}`;
  const isAlreadyOnPostPage = location.pathname === articleRelativePath;

  const handleCopyDirectLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await copyTextReliable(sharePayload.directUrl);
    if (ok) {
      setCopiedLink(true);
      trackEvent('share_click', `copy_link:${post.slug}`, post.category);
      showToast('Direct post link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      showToast('Select and copy the link from the box.', 'info');
    }
  };

  const handleCopyFullMessage = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await copyTextReliable(sharePayload.fullText);
    if (ok) {
      setCopiedFullText(true);
      trackEvent('share_click', `copy_full:${post.slug}`, post.category);
      showToast('Full post summary & direct link copied!', 'success');
      setTimeout(() => setCopiedFullText(false), 2500);
    } else {
      showToast('Unable to copy text automatically.', 'error');
    }
  };

  const handleDownloadCard = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsProcessingCard(true);
    try {
      const canvas = await renderCAIShareCardCanvas(post, settings.closingSoonThresholdDays);
      if (!canvas) {
        showToast('Could not generate share card.', 'error');
        return;
      }
      const blob = await canvasToPngBlob(canvas);
      if (!blob) {
        showToast('Could not export share card image.', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CAI-${post.slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await copyTextReliable(sharePayload.directUrl);
      trackEvent('share_click', `download_card:${post.slug}`, post.category);
      showToast('CAI Share Card downloaded & direct link copied!', 'success');
    } finally {
      setIsProcessingCard(false);
    }
  };

  const handleNativeDeviceShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsProcessingCard(true);
    try {
      // Try native share with image + link first if supported by device
      if (typeof navigator !== 'undefined' && navigator.share) {
        const canvas = await renderCAIShareCardCanvas(post, settings.closingSoonThresholdDays);
        const blob = canvas ? await canvasToPngBlob(canvas) : null;
        if (blob && navigator.canShare) {
          const file = new File([blob], `CAI-${post.slug}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${post.title} | Career Alert India`,
              text: sharePayload.fullText.replace(/\*/g, ''),
              url: sharePayload.directUrl,
              files: [file],
            });
            trackEvent('share_click', `native_file_share:${post.slug}`, post.category);
            return;
          }
        }
        await navigator.share({
          title: `${post.title} | Career Alert India`,
          text: `${post.title} (${post.organization} · ${statusInfo.label})`,
          url: sharePayload.directUrl,
        });
        trackEvent('share_click', `native_url_share:${post.slug}`, post.category);
        return;
      }
      // Fallback on desktop browsers without navigator.share
      await handleCopyDirectLink();
    } catch {
      // User dismissed native share sheet
    } finally {
      setIsProcessingCard(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cai-share-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#071A3D]/70 backdrop-blur-xs"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal Window */}
      <div
        className="relative w-full max-w-[540px] bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 animate-modal-pop flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Tricolour Accent */}
        <div className="h-1 w-full flex shrink-0">
          <div className="w-1/3 bg-[#FF7A00]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138A36]" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 bg-[#071A3D] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CircularEmblemSVG className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <h2 id="cai-share-modal-title" className="text-sm sm:text-base font-bold truncate">
                Share Career Update
              </h2>
              <p className="text-[11px] text-white/75 truncate">
                Official CAI Logo preview · Direct link opens this post directly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Segmented Preview Switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setPreviewTab('link')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTab === 'link'
                    ? 'bg-[#071A3D] text-white'
                    : 'text-[#64748B] hover:text-[#071A3D]'
                }`}
              >
                Link Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTab === 'card'
                    ? 'bg-[#071A3D] text-white'
                    : 'text-[#64748B] hover:text-[#071A3D]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>CAI Logo Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('text')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTab === 'text'
                    ? 'bg-[#071A3D] text-white'
                    : 'text-[#64748B] hover:text-[#071A3D]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Message Text</span>
              </button>
            </div>

            {!isAlreadyOnPostPage && (
              <Link
                to={articleRelativePath}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors whitespace-nowrap"
              >
                <span>Open Post</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* TAB 1: Rich Social Link Card Preview with CAI Logo */}
          {previewTab === 'link' && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] overflow-hidden">
              <div className="bg-[#071A3D] px-4 py-3 flex items-center justify-between gap-3">
                <BrandLogo variant="compact" theme="dark" />
                <span className="text-[11px] font-mono-tabular font-semibold text-[#FF7A00] shrink-0">
                  {sharePayload.categoryLabel}
                </span>
              </div>

              <div className="p-4 bg-white">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B] mb-1.5">
                  <strong className="text-[#071A3D]">{post.organization}</strong>
                  <span aria-hidden="true">·</span>
                  <span>{post.state}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-semibold ${statusInfo.textClass}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#071A3D] leading-snug break-words">
                  {post.title}
                </h3>

                <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-tabular text-[#64748B]">
                  {typeof post.totalVacancies === 'number' && post.totalVacancies > 0 && (
                    <span>
                      Vacancies:{' '}
                      <strong className="text-[#071A3D]">
                        {post.totalVacancies.toLocaleString('en-IN')}
                      </strong>
                    </span>
                  )}
                  {post.qualification && (
                    <span>
                      Eligibility: <strong className="text-[#071A3D]">{post.qualification}</strong>
                    </span>
                  )}
                  {post.applicationEnd && (
                    <span>
                      Last Date:{' '}
                      <strong className="text-[#071A3D]">
                        {formatIndianDate(post.applicationEnd)}
                      </strong>
                    </span>
                  )}
                  {post.examDate && (
                    <span>
                      Exam: <strong className="text-[#071A3D]">{post.examDate}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Rendered 1200x630 CAI Branded Image Card */}
          {previewTab === 'card' && (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#071A3D] overflow-hidden aspect-[1200/630] flex items-center justify-center">
                {cardDataUrl ? (
                  <img
                    src={cardDataUrl}
                    alt={`${post.title} CAI Share Card`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-white/80 font-medium">
                    Rendering CAI Logo Share Card...
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#64748B]">
                  1200×630 HD Card with CAI Logo &amp; Direct Link
                </span>
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isProcessingCard}
                  className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>{isProcessingCard ? 'Saving...' : 'Download PNG Card'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Full Formatted Share Message for Groups */}
          {previewTab === 'text' && (
            <div className="space-y-2">
              <pre className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] text-xs font-mono-tabular text-[#071A3D] whitespace-pre-wrap break-words max-h-44 overflow-y-auto leading-relaxed">
                {sharePayload.fullText}
              </pre>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyFullMessage}
                  className="btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
                >
                  {copiedFullText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span>Copied Full Text + Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>Copy Full Message + Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Direct Post Link Input & Instant Copy */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="cai-direct-share-url"
                className="text-xs font-bold text-[#071A3D]"
              >
                Direct Post Link
              </label>
              <span className="text-[11px] text-[#138A36] font-medium">
                Opens this {sharePayload.categoryLabel.toLowerCase()} directly
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cai-direct-share-url"
                type="text"
                readOnly
                value={sharePayload.directUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F6F8FB] text-xs font-mono-tabular text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
              />
              <button
                type="button"
                onClick={handleCopyDirectLink}
                className={`btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-colors ${
                  copiedLink
                    ? 'bg-[#138A36] text-white'
                    : 'bg-[#071A3D] hover:bg-[#0D2758] text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Instant Share Channels */}
          <div className="pt-1">
            <div className="text-xs font-bold text-[#071A3D] mb-2">Share Directly Via</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                href={sharePayload.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_click', `whatsapp:${post.slug}`, post.category)}
                className="btn-press flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#138A36] hover:bg-[#10752D] text-white text-xs font-semibold whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </a>

              <a
                href={sharePayload.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_click', `telegram:${post.slug}`, post.category)}
                className="btn-press flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0088CC] hover:bg-[#0077B5] text-white text-xs font-semibold whitespace-nowrap"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>Telegram</span>
              </a>

              <button
                type="button"
                onClick={handleCopyFullMessage}
                className="btn-press flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {copiedFullText ? (
                  <>
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                    <span>Copied Text!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#FF7A00] shrink-0" />
                    <span>Copy Notice</span>
                  </>
                )}
              </button>

              <a
                href={sharePayload.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_click', `twitter:${post.slug}`, post.category)}
                className="btn-press flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold whitespace-nowrap"
              >
                <span>Post on X</span>
                <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
              </a>

              <a
                href={sharePayload.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_click', `linkedin:${post.slug}`, post.category)}
                className="btn-press flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold whitespace-nowrap"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
              </a>

              <a
                href={sharePayload.emailUrl}
                onClick={() => trackEvent('share_click', `email:${post.slug}`, post.category)}
                className="btn-press flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Bottom Action Bar: Download CAI Card or Native Share */}
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isProcessingCard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Save CAI Logo Card (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleNativeDeviceShare}
              disabled={isProcessingCard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#071A3D] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Device Options</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
