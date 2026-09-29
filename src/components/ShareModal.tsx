import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Download,
  MessageCircle,
  Send,
  Link as LinkIcon,
} from 'lucide-react';
import { Post } from '../types/cms';
import { BrandLogo } from './BrandLogo';
import { computePostStatus, formatIndianDate } from '../utils/statusAndSanitize';
import { useCMS } from '../context/CMSContext';

interface ShareModalProps {
  post: Post | null;
  onClose: () => void;
}

const CATEGORY_NAMES: Record<Post['category'], string> = {
  jobs: 'Government Job',
  exams: 'Competitive Exam',
  'admit-card': 'Admit Card',
  results: 'Exam Result',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus & Pattern',
  notifications: 'Official Notification',
};

export const ShareModal: React.FC<ShareModalProps> = ({ post, onClose }) => {
  const { settings, trackEvent, showToast } = useCMS();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  if (!post) return null;

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://cai.foldedpage.in';

  // Direct link that opens this exact post directly
  const directPostUrl = `${origin}/${post.category}/${post.slug}`;
  const statusInfo = computePostStatus(post, settings.closingSoonThresholdDays);
  const categoryLabel = CATEGORY_NAMES[post.category] || post.category.toUpperCase();

  // Key highlight line for share message
  const keyMetaParts: string[] = [
    `🏛️ *Authority:* ${post.organization} (${post.state})`,
    `📌 *Category:* ${categoryLabel}`,
    `🔔 *Status:* ${statusInfo.label}`,
  ];
  if (post.totalVacancies && post.totalVacancies > 0) {
    keyMetaParts.push(`👥 *Vacancies:* ${post.totalVacancies.toLocaleString('en-IN')} Posts`);
  }
  if (post.qualification) {
    keyMetaParts.push(`🎓 *Eligibility:* ${post.qualification}`);
  }
  if (post.applicationEnd) {
    keyMetaParts.push(`⏳ *Last Date:* ${formatIndianDate(post.applicationEnd)}`);
  }
  if (post.examDate) {
    keyMetaParts.push(`🗓️ *Exam Date:* ${post.examDate}`);
  }
  if (post.resultDate && post.category === 'results') {
    keyMetaParts.push(`📊 *Result Date:* ${post.resultDate}`);
  }

  // Formatted message with Direct Link for WhatsApp / Telegram / Copy
  const formattedShareText = [
    `🇮🇳 *CAREER ALERT INDIA (CAI)*`,
    `*${post.title}*`,
    ``,
    ...keyMetaParts,
    ``,
    `👉 *Open Direct Post Link:*`,
    directPostUrl,
  ].join('\n');

  const handleCopyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(directPostUrl);
      setCopiedLink(true);
      trackEvent('share_click', `copy_link:${post.slug}`, post.category);
      showToast('Direct post link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Unable to copy link automatically.', 'error');
    }
  };

  const handleCopyFormattedPost = async () => {
    try {
      await navigator.clipboard.writeText(formattedShareText);
      setCopiedFull(true);
      trackEvent('share_click', `copy_formatted:${post.slug}`, post.category);
      showToast('Post summary & direct link copied!', 'success');
      setTimeout(() => setCopiedFull(false), 2500);
    } catch {
      showToast('Unable to copy text automatically.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.title} | Career Alert India`,
          text: `${post.title} (${post.organization} • ${statusInfo.label}) — Check full details on Career Alert India:`,
          url: directPostUrl,
        });
        trackEvent('share_click', `native_share:${post.slug}`, post.category);
      } catch {
        // User cancelled native share sheet
      }
    } else {
      handleCopyDirectLink();
    }
  };

  // Render an official CAI Branded Share Card PNG with CAI Logo & Direct Link
  const generateCAICardBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background Navy
    ctx.fillStyle = '#071A3D';
    ctx.fillRect(0, 0, 1200, 630);

    // Top Tricolour Strip
    ctx.fillStyle = '#FF7A00';
    ctx.fillRect(0, 0, 400, 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(400, 0, 400, 10);
    ctx.fillStyle = '#138A36';
    ctx.fillRect(800, 0, 400, 10);

    // Subtle Inner Card Container
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(44, 42, 1112, 546, 20);
    ctx.fill();

    // Draw CAI Circular Emblem on Top Left of Card
    const cx = 125;
    const cy = 122;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#071A3D';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FF7A00';
    ctx.stroke();

    // CAI Monogram inside Emblem
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAI', cx, cy - 4);

    // Tricolour bar inside emblem
    ctx.fillStyle = '#FF7A00';
    ctx.fillRect(cx - 24, cy + 18, 16, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 8, cy + 18, 16, 4);
    ctx.fillStyle = '#138A36';
    ctx.fillRect(cx + 8, cy + 18, 16, 4);
    ctx.restore();

    // Brand Wordmark Lockup next to Emblem
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#071A3D';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CAREER ALERT INDIA', 192, 116);

    ctx.fillStyle = '#FF7A00';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('EXAMS  •  JOBS  •  OPPORTUNITIES', 192, 142);

    // Category & Status on Top Right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#071A3D';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${post.organization.toUpperCase()}  ·  ${categoryLabel.toUpperCase()}`, 1106, 114);

    ctx.fillStyle = '#138A36';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(statusInfo.label.toUpperCase(), 1106, 142);

    // Divider Line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 185);
    ctx.lineTo(1120, 185);
    ctx.stroke();

    // Post Title (Word-wrapped up to 3 lines)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#071A3D';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    const words = post.title.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > 1020) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    lines.slice(0, 3).forEach((line, idx) => {
      const displayLine = idx === 2 && lines.length > 3 ? `${line.slice(0, -3)}...` : line;
      ctx.fillText(displayLine, 80, 248 + idx * 48);
    });

    // Key Details Row
    const detailsY = 420;
    ctx.fillStyle = '#F6F8FB';
    ctx.beginPath();
    ctx.roundRect(80, detailsY - 36, 1040, 68, 10);
    ctx.fill();

    ctx.fillStyle = '#071A3D';
    ctx.font = 'bold 20px "IBM Plex Mono", monospace';
    const metaString = [
      post.totalVacancies ? `Vacancies: ${post.totalVacancies.toLocaleString('en-IN')}` : null,
      post.qualification ? `Eligibility: ${post.qualification}` : null,
      post.applicationEnd
        ? `Last Date: ${formatIndianDate(post.applicationEnd)}`
        : post.examDate
        ? `Exam: ${post.examDate}`
        : `State: ${post.state}`,
    ]
      .filter(Boolean)
      .join('   |   ');
    ctx.fillText(metaString.slice(0, 78), 104, detailsY + 5);

    // Direct Link Footer Bar inside Card
    ctx.fillStyle = '#071A3D';
    ctx.beginPath();
    ctx.roundRect(80, 488, 1040, 68, 12);
    ctx.fill();

    ctx.fillStyle = '#FF7A00';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('DIRECT POST LINK:', 108, 516);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 18px "IBM Plex Mono", monospace';
    ctx.fillText(
      directPostUrl.length > 68 ? `${directPostUrl.slice(0, 65)}...` : directPostUrl,
      108,
      542
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleShareOrDownloadCard = async () => {
    setGeneratingCard(true);
    try {
      const blob = await generateCAICardBlob();
      if (!blob) {
        showToast('Could not generate share card.', 'error');
        return;
      }
      const file = new File([blob], `CAI-${post.slug}.png`, { type: 'image/png' });

      // If Web Share API supports sharing files + direct URL, invoke it
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${post.title} | Career Alert India`,
          text: `${post.title}\nOpen Direct Post: ${directPostUrl}`,
          url: directPostUrl,
          files: [file],
        });
        trackEvent('share_click', `card_share:${post.slug}`, post.category);
        showToast('Shared CAI Logo Card & Direct Link!', 'success');
      } else {
        // Download the CAI Logo Share Card PNG and copy the direct link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CAI-${post.slug}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await navigator.clipboard.writeText(directPostUrl).catch(() => {});
        trackEvent('share_click', `card_download:${post.slug}`, post.category);
        showToast('Downloaded CAI Logo Share Card & copied direct link!', 'success');
      }
    } catch {
      // User cancelled share sheet
    } finally {
      setGeneratingCard(false);
    }
  };

  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(formattedShareText)}`;
  const telegramShareHref = `https://t.me/share/url?url=${encodeURIComponent(
    directPostUrl
  )}&text=${encodeURIComponent(
    `🇮🇳 Career Alert India (CAI)\n${post.title} (${post.organization} • ${statusInfo.label})`
  )}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${post.title} (${post.organization} - ${statusInfo.label}) via @CareerAlertIN`
  )}&url=${encodeURIComponent(directPostUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="fixed inset-0 bg-[#071A3D]/65 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 animate-modal-pop">
        {/* Top Tricolour Strip */}
        <div className="h-1 w-full flex">
          <div className="w-1/3 bg-[#FF7A00]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138A36]" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#071A3D] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-4 h-4 text-[#FF7A00] shrink-0" />
            <h2 id="share-modal-title" className="text-sm sm:text-base font-bold truncate">
              Share Update with CAI Logo &amp; Direct Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Live CAI Branded Link Preview Card */}
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] mb-2 flex items-center justify-between">
              <span>CAI Branded Link Preview (Opens Post Directly)</span>
              <span className="text-[#138A36] font-semibold">● Direct Link Active</span>
            </div>

            <div className="rounded-xl border-2 border-[#071A3D]/15 bg-[#F6F8FB] overflow-hidden shadow-xs">
              {/* Branded CAI Header inside Share Preview */}
              <div className="bg-[#071A3D] px-4 py-3 flex items-center justify-between gap-3">
                <BrandLogo variant="header" size="sm" theme="dark" />
                <span className="text-[11px] font-mono-tabular font-semibold text-[#FF7A00] shrink-0">
                  {categoryLabel}
                </span>
              </div>

              <div className="p-4 bg-white">
                <div className="text-xs text-[#64748B] mb-1">
                  <strong className="text-[#071A3D]">{post.organization}</strong> · {post.state} ·{' '}
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

                <div className="mt-2.5 px-2.5 py-1.5 rounded bg-[#F6F8FB] border border-[#E2E8F0] flex items-center gap-2 text-[11px] font-mono-tabular text-[#071A3D] truncate">
                  <LinkIcon className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
                  <span className="truncate">{directPostUrl}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Post Link Input & Copy */}
          <div>
            <label className="block text-xs font-bold text-[#071A3D] mb-1.5">
              Direct Post Link (Opens this {categoryLabel.toLowerCase()} directly)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directPostUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-md border border-[#E2E8F0] bg-[#F6F8FB] text-xs font-mono-tabular text-[#071A3D] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyDirectLink}
                className="btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={whatsappShareHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('share_click', `whatsapp:${post.slug}`, post.category)}
              className="btn-press flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#138A36] hover:bg-[#10752D] text-white text-xs font-semibold"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Share on WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </a>

            <a
              href={telegramShareHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('share_click', `telegram:${post.slug}`, post.category)}
              className="btn-press flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0088CC] hover:bg-[#0077B5] text-white text-xs font-semibold"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Share on Telegram</span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </a>

            <button
              type="button"
              onClick={handleShareOrDownloadCard}
              disabled={generatingCard}
              className="btn-press flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#FF7A00] hover:bg-[#E56D00] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {generatingCard ? 'Preparing CAI Card...' : 'Share / Save CAI Logo Card'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="btn-press flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#FF7A00] shrink-0" />
              <span>More Share Options</span>
            </button>
          </div>

          {/* Copy Full Formatted Message + X Share */}
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyFormattedPost}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#071A3D] hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              {copiedFull ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#138A36]" />
                  <span>Copied Full Details + Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Copy Summary + Direct Link for Groups</span>
                </>
              )}
            </button>

            <a
              href={twitterShareHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('share_click', `twitter:${post.slug}`, post.category)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#071A3D] transition-colors"
            >
              <span>Post on X (Twitter)</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
