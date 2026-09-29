import { Post } from '../types/cms';

export interface ComputedStatusInfo {
  code:
    | 'OPEN'
    | 'CLOSING_SOON'
    | 'CLOSED'
    | 'RESULT_RELEASED'
    | 'RESULT_EXPECTED'
    | 'ADMIT_CARD_RELEASED'
    | 'ANSWER_KEY_OUT'
    | 'SYLLABUS_AVAILABLE'
    | 'UPCOMING'
    | 'ACTIVE_NOTICE';
  label: string;
  tone: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  dotClass: string;
  textClass: string;
  countdown?: {
    days: number;
    hours: number;
    minutes: number;
    totalMs: number;
    formatted: string;
  };
}

/**
 * Automatically calculates the status and live deadline countdown for a post
 * using Asia/Kolkata time context unless overridden by the administrator.
 */
export function computePostStatus(
  post: Post,
  closingSoonThresholdDays = 5,
  nowMs: number = Date.now()
): ComputedStatusInfo {
  if (post.statusOverride && post.statusOverride.trim().length > 0) {
    return {
      code: 'ACTIVE_NOTICE',
      label: post.statusOverride.trim(),
      tone: 'blue',
      dotClass: 'bg-[#071A3D]',
      textClass: 'text-[#071A3D]',
    };
  }

  if (post.category === 'results') {
    if (post.resultStatus === 'expected') {
      return {
        code: 'RESULT_EXPECTED',
        label: 'Result Expected',
        tone: 'amber',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-800',
      };
    }
    return {
      code: 'RESULT_RELEASED',
      label: 'Result Released',
      tone: 'green',
      dotClass: 'bg-[#138A36]',
      textClass: 'text-[#138A36]',
    };
  }

  if (post.category === 'admit-card') {
    return {
      code: 'ADMIT_CARD_RELEASED',
      label: 'Admit Card Released',
      tone: 'purple',
      dotClass: 'bg-purple-700',
      textClass: 'text-purple-800',
    };
  }

  if (post.category === 'answer-key') {
    const typeLabel =
      post.answerKeyType === 'final'
        ? 'Final Answer Key'
        : post.answerKeyType === 'provisional'
        ? 'Provisional Answer Key'
        : 'Answer Key Available';
    return {
      code: 'ANSWER_KEY_OUT',
      label: typeLabel,
      tone: 'blue',
      dotClass: 'bg-blue-700',
      textClass: 'text-blue-800',
    };
  }

  if (post.category === 'syllabus') {
    return {
      code: 'SYLLABUS_AVAILABLE',
      label: 'Official Syllabus',
      tone: 'slate',
      dotClass: 'bg-[#071A3D]',
      textClass: 'text-[#071A3D]',
    };
  }

  // Deadline-driven logic for Jobs, Exams, Notifications
  if (post.applicationEnd) {
    const parsedEnd = parseDeadlineToMs(post.applicationEnd);
    if (!Number.isNaN(parsedEnd)) {
      const diffMs = parsedEnd - nowMs;
      if (diffMs <= 0) {
        return {
          code: 'CLOSED',
          label: 'Applications Closed',
          tone: 'red',
          dotClass: 'bg-[#DC2626]',
          textClass: 'text-[#DC2626]',
        };
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${pad(days)} Days ${pad(hours)} Hours ${pad(minutes)} Minutes`;

      const thresholdMs = closingSoonThresholdDays * 24 * 60 * 60 * 1000;
      if (diffMs <= thresholdMs) {
        return {
          code: 'CLOSING_SOON',
          label: 'Closing Soon',
          tone: 'amber',
          dotClass: 'bg-[#FF7A00]',
          textClass: 'text-[#B45309]',
          countdown: { days, hours, minutes, totalMs: diffMs, formatted },
        };
      }

      return {
        code: 'OPEN',
        label: 'Applications Open',
        tone: 'green',
        dotClass: 'bg-[#138A36]',
        textClass: 'text-[#138A36]',
        countdown: { days, hours, minutes, totalMs: diffMs, formatted },
      };
    }
  }

  return {
    code: 'OPEN',
    label: 'Active Update',
    tone: 'green',
    dotClass: 'bg-[#138A36]',
    textClass: 'text-[#138A36]',
  };
}

export function parseDeadlineToMs(dateStr?: string): number {
  if (!dateStr) return NaN;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59+05:30`).getTime();
  }
  return new Date(trimmed).getTime();
}

export function formatIndianDate(dateInput?: string): string {
  if (!dateInput) return '—';
  const ms = Date.parse(dateInput);
  if (Number.isNaN(ms)) return dateInput;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(ms));
  } catch {
    return dateInput;
  }
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '';
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'Updated just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Updated ${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  return `Updated on ${formatIndianDate(isoString)}`;
}

/**
 * Sanitizes HTML submitted through the Admin Rich Text Editor to prevent XSS,
 * script injection, and unsafe attributes or protocols.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  let clean = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '');
  return clean.trim();
}

/**
 * Validates and sanitizes external URLs to allow only safe https://, http://, or relative / paths.
 */
export function sanitizeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140);
}
