export type PostCategorySlug =
  | 'jobs'
  | 'exams'
  | 'admit-card'
  | 'results'
  | 'answer-key'
  | 'syllabus'
  | 'notifications';

export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type PostBadge =
  | 'NONE'
  | 'NEW'
  | 'IMPORTANT'
  | 'RESULT'
  | 'ADMIT CARD'
  | 'ANSWER KEY'
  | 'LAST DATE'
  | 'CLOSED'
  | 'UPDATED';

export interface ImportantDateItem {
  id: string;
  label: string;
  dateValue: string;
  isHighlight?: boolean;
}

export interface VacancyRow {
  id: string;
  postName: string;
  department: string;
  vacancies: number;
  qualification: string;
  ageLimit: string;
}

export interface EligibilityDetails {
  education: string;
  ageMin: string;
  ageMax: string;
  ageRelaxation: string;
  nationality: string;
  experience?: string;
  otherRequirements?: string;
}

export interface FeeRow {
  id: string;
  category: string;
  amount: string;
}

export interface ImportantLinkItem {
  id: string;
  label: string;
  url: string;
  type:
    | 'apply'
    | 'notification'
    | 'website'
    | 'admit-card'
    | 'result'
    | 'answer-key'
    | 'syllabus'
    | 'other';
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface SyllabusSectionItem {
  id: string;
  subject: string;
  topics: string;
  marks?: string;
  duration?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: PostCategorySlug;
  subcategory?: string;
  organization: string;
  state: string;
  summary: string;
  content?: string;
  status: PostStatus;
  badge?: PostBadge;
  featured?: boolean;
  isDemo?: boolean;
  featuredImage?: string;
  qualification?: string;
  jobType?: string;
  totalVacancies?: number;
  location?: string;
  salary?: string;
  applicationStart?: string;
  applicationEnd?: string;
  examDate?: string;
  admitCardDate?: string;
  resultDate?: string;
  resultStatus?: 'none' | 'released' | 'expected';
  answerKeyType?: 'none' | 'provisional' | 'final' | 'official';
  objectionDeadline?: string;
  officialSourceUrl?: string;
  statusOverride?: string;
  importantDates?: ImportantDateItem[];
  vacancies?: VacancyRow[];
  eligibility?: EligibilityDetails;
  fees?: FeeRow[];
  selectionProcess?: string[];
  howToApply?: string[];
  importantLinks?: ImportantLinkItem[];
  faqs?: FAQItem[];
  syllabusSections?: SyllabusSectionItem[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  tags?: string[];
  authorUid: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'section' | 'domain';
  order: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionRecord {
  id: string;
  postId: string;
  postTitle: string;
  changedBy: string;
  changeSummary: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  adminEmail: string;
  adminUid: string;
  action: string;
  target: string;
  details?: string;
  createdAt: string;
}

export interface MediaLibraryItem {
  id: string;
  name: string;
  url: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'application/pdf';
  sizeBytes: number;
  altText: string;
  uploadedBy: string;
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  whatsappChannelUrl: string;
  telegramUrl?: string;
  twitterUrl?: string;
  contactEmail: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  footerText: string;
  closingSoonThresholdDays: number;
  tickerEnabled: boolean;
  customTickerItems?: { label: string; href: string }[];
  isPublic: boolean;
  updatedAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
}

export interface AnalyticsEventRecord {
  id: string;
  eventType:
    | 'page_view'
    | 'search'
    | 'category_click'
    | 'article_open'
    | 'official_link_click'
    | 'whatsapp_click'
    | 'share_click';
  target: string;
  category?: string;
  createdAt: string;
}
