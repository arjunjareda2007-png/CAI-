import { Post } from '../types/cms';
import { computePostStatus, formatIndianDate } from './statusAndSanitize';

export const CATEGORY_SHARE_LABELS: Record<Post['category'], string> = {
  jobs: 'Government Job',
  exams: 'Competitive Exam',
  'admit-card': 'Admit Card',
  results: 'Official Result',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus & Pattern',
  notifications: 'Official Notification',
};

/**
 * Returns the active origin so shared links open the post directly in the current deployment
 * (e.g. https://cai.foldedpage.in in production or the active preview domain).
 */
export function getShareOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://cai.foldedpage.in';
}

/**
 * Builds the direct URL that opens a specific post directly.
 */
export function getDirectPostUrl(post: Post): string {
  const origin = getShareOrigin();
  const cleanSlug = encodeURIComponent(post.slug || post.id).replace(/%2F/g, '/');
  return `${origin}/${post.category}/${cleanSlug}`;
}

/**
 * Reliable clipboard copy utility that works across modern browsers, mobile webviews,
 * and restricted iframe environments (falls back to synchronous execCommand('copy')).
 */
export async function copyTextReliable(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Clipboard API first
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback (common inside cross-origin iframes)
    }
  }

  // 2. Synchronous DOM textarea fallback
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (ok) return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Builds a structured, clean text message with CAI branding and the direct post link
 * for WhatsApp, Telegram, Email, and student groups.
 */
export function buildFormattedShareMessage(
  post: Post,
  closingSoonThresholdDays = 7
): {
  directUrl: string;
  categoryLabel: string;
  statusLabel: string;
  shortText: string;
  fullText: string;
  whatsappUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  emailUrl: string;
} {
  const directUrl = getDirectPostUrl(post);
  const statusInfo = computePostStatus(post, closingSoonThresholdDays);
  const categoryLabel = CATEGORY_SHARE_LABELS[post.category] || post.category.toUpperCase();

  const bulletLines: string[] = [
    `• Organization: ${post.organization} (${post.state})`,
    `• Category: ${categoryLabel}`,
    `• Status: ${statusInfo.label}`,
  ];

  if (typeof post.totalVacancies === 'number' && post.totalVacancies > 0) {
    bulletLines.push(`• Vacancies: ${post.totalVacancies.toLocaleString('en-IN')} Posts`);
  }
  if (post.qualification) {
    bulletLines.push(`• Eligibility: ${post.qualification}`);
  }
  if (post.applicationEnd) {
    bulletLines.push(`• Last Date: ${formatIndianDate(post.applicationEnd)}`);
  }
  if (post.examDate) {
    bulletLines.push(`• Exam Date: ${post.examDate}`);
  }
  if (post.resultDate && post.category === 'results') {
    bulletLines.push(`• Result Date: ${post.resultDate}`);
  }

  const fullText = [
    `*CAREER ALERT INDIA (CAI)*`,
    `*${post.title}*`,
    ``,
    ...bulletLines,
    ``,
    `Open Direct Link:`,
    directUrl,
  ].join('\n');

  const shortText = `${post.title} (${post.organization} · ${statusInfo.label}) — Career Alert India (CAI)`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    directUrl
  )}&text=${encodeURIComponent(
    `Career Alert India (CAI)\n${post.title}\n${post.organization} · ${statusInfo.label}`
  )}`;
  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `${post.title} (${post.organization} · ${statusInfo.label})`
  )}&url=${encodeURIComponent(directUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    directUrl
  )}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `${post.title} | Career Alert India`
  )}&body=${encodeURIComponent(fullText.replace(/\*/g, ''))}`;

  return {
    directUrl,
    categoryLabel,
    statusLabel: statusInfo.label,
    shortText,
    fullText,
    whatsappUrl,
    telegramUrl,
    twitterUrl,
    linkedinUrl,
    emailUrl,
  };
}

/**
 * Universal rounded-rectangle helper for Canvas 2D so older browsers/webviews
 * without ctx.roundRect never throw.
 */
function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string,
  strokeStyle?: string,
  lineWidth = 1
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Loads an image safely with a timeout so canvas generation never hangs.
 */
function loadLogoImage(src: string, timeoutMs = 2500): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Draws the official CAI Emblem on Canvas (uses /images/brand/logo.png if loaded,
 * or draws a high-detail vector crest fallback).
 */
function drawCAIEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  logoImg: HTMLImageElement | null
) {
  ctx.save();

  // Outer tricolour ring
  const grad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  grad.addColorStop(0, '#FF7A00');
  grad.addColorStop(0.5, '#FFFFFF');
  grad.addColorStop(1, '#138A36');

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Crisp white circular plate
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, cx - radius + 2, cy - radius + 2, (radius - 2) * 2, (radius - 2) * 2);
    ctx.restore();
  } else {
    // Vector fallback crest
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#071A3D';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(radius * 0.62)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAI', cx, cy - 4);

    // Tricolour bar under CAI
    const barW = radius * 0.34;
    const barY = cy + radius * 0.36;
    ctx.fillStyle = '#FF7A00';
    ctx.fillRect(cx - barW * 1.5, barY, barW, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - barW * 0.5, barY, barW, 4);
    ctx.fillStyle = '#138A36';
    ctx.fillRect(cx + barW * 0.5, barY, barW, 4);
  }

  ctx.restore();
}

/**
 * Generates a high-resolution 1200x630 CAI Branded Share Card Canvas with the
 * official CAI Logo, post title, key facts, and direct post link.
 */
export async function renderCAIShareCardCanvas(
  post: Post,
  closingSoonThresholdDays = 7
): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const directUrl = getDirectPostUrl(post);
  const statusInfo = computePostStatus(post, closingSoonThresholdDays);
  const categoryLabel = CATEGORY_SHARE_LABELS[post.category] || post.category.toUpperCase();
  const logoImg = await loadLogoImage('/images/brand/logo.png');

  // 1. Deep Navy Outer Background
  ctx.fillStyle = '#071A3D';
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Top Tricolour Bar
  ctx.fillStyle = '#FF7A00';
  ctx.fillRect(0, 0, 400, 10);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(400, 0, 400, 10);
  ctx.fillStyle = '#138A36';
  ctx.fillRect(800, 0, 400, 10);

  // 3. Main White Editorial Sheet
  fillRoundRect(ctx, 40, 38, 1120, 554, 18, '#FFFFFF');

  // 4. Top Brand Header Strip inside Card
  fillRoundRect(ctx, 40, 38, 1120, 118, 18, '#071A3D');
  ctx.fillStyle = '#071A3D';
  ctx.fillRect(40, 130, 1120, 26); // Square off bottom corners of header strip

  // Draw CAI Logo Emblem
  drawCAIEmblem(ctx, 112, 97, 40, logoImg);

  // Brand Title Lockup
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('CAREER ', 168, 92);
  const careerW = ctx.measureText('CAREER ').width;
  ctx.fillStyle = '#FF7A00';
  ctx.fillText('ALERT ', 168 + careerW, 92);
  const alertW = ctx.measureText('ALERT ').width;
  ctx.fillStyle = '#22C55E';
  ctx.fillText('INDIA', 168 + careerW + alertW, 92);

  ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('EXAMS  •  JOBS  •  OPPORTUNITIES', 168, 118);

  // Right Header Status & Category
  ctx.textAlign = 'right';
  ctx.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#FF7A00';
  ctx.fillText(categoryLabel.toUpperCase(), 1120, 88);

  ctx.font = '700 15px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${post.organization}  ·  ${statusInfo.label}`, 1120, 116);

  // 5. Kicker Line above Headline
  ctx.textAlign = 'left';
  ctx.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    `${post.organization.toUpperCase()}   ·   ${post.state.toUpperCase()}   ·   ${statusInfo.label.toUpperCase()}`,
    76,
    202
  );

  // 6. Post Headline (Word-wrapped up to 3 lines)
  ctx.fillStyle = '#071A3D';
  ctx.font = '800 36px "Plus Jakarta Sans", system-ui, sans-serif';
  const words = (post.title || '').split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > 1040) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  lines.slice(0, 3).forEach((line, idx) => {
    const textLine = idx === 2 && lines.length > 3 ? `${line.slice(0, -3)}...` : line;
    ctx.fillText(textLine, 76, 256 + idx * 48);
  });

  // 7. Key Structured Facts Row
  fillRoundRect(ctx, 76, 396, 1048, 72, 12, '#F6F8FB', '#E2E8F0', 1.5);

  const facts: string[] = [];
  if (typeof post.totalVacancies === 'number' && post.totalVacancies > 0) {
    facts.push(`Vacancies: ${post.totalVacancies.toLocaleString('en-IN')}`);
  }
  if (post.qualification) {
    facts.push(`Eligibility: ${post.qualification}`);
  }
  if (post.applicationEnd) {
    facts.push(`Last Date: ${formatIndianDate(post.applicationEnd)}`);
  } else if (post.examDate) {
    facts.push(`Exam Date: ${post.examDate}`);
  } else if (post.resultDate) {
    facts.push(`Result Date: ${post.resultDate}`);
  } else {
    facts.push(`Region: ${post.state}`);
  }

  ctx.font = '700 20px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#071A3D';
  const factsStr = facts.join('   |   ');
  ctx.fillText(factsStr.length > 76 ? `${factsStr.slice(0, 73)}...` : factsStr, 100, 439);

  // 8. Direct Post Link Bar at Bottom of Card
  fillRoundRect(ctx, 76, 488, 1048, 74, 12, '#071A3D');

  ctx.fillStyle = '#FF7A00';
  ctx.font = '800 13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('DIRECT POST LINK (OPENS UPDATE DIRECTLY):', 100, 515);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  const displayUrl = directUrl.length > 74 ? `${directUrl.slice(0, 71)}...` : directUrl;
  ctx.fillText(displayUrl, 100, 544);

  return canvas;
}

/**
 * Converts a canvas to a PNG Blob reliably.
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // Fallback via dataURL if toBlob returns null
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const parts = dataUrl.split(',');
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          resolve(new Blob([ab], { type: 'image/png' }));
        } catch {
          resolve(null);
        }
      }, 'image/png');
    } catch {
      resolve(null);
    }
  });
}
