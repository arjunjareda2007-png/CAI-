import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Download,
  Upload,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  FileText,
  FolderTree,
  Megaphone,
  Image as ImageIcon,
  Globe,
  Palette,
  BarChart3,
  Mail,
  History,
  ShieldAlert,
  Database,
  LayoutDashboard,
  Star,
  Lock,
  Calendar,
  Save,
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import {
  ClerkOwnerUserBadge,
  useClerkRuntime,
} from '../../context/ClerkProviderWrapper';
import {
  Post,
  PostCategorySlug,
  CategoryItem,
  SiteSettings,
  MediaLibraryItem,
} from '../../types/cms';
import { SEOHead } from '../../components/SEOHead';
import { BrandLogo } from '../../components/BrandLogo';
import { AdminPostEditorModal } from './AdminPostEditorModal';
import {
  computePostStatus,
  formatIndianDate,
  generateSlug,
} from '../../utils/statusAndSanitize';

type AdminTab =
  | 'overview'
  | 'posts'
  | 'calendar'
  | 'categories'
  | 'ticker_homepage'
  | 'media'
  | 'seo'
  | 'branding'
  | 'analytics'
  | 'inbox'
  | 'revisions'
  | 'audit'
  | 'backup';

const OWNER_EMAIL = 'arjunjareda2007@gmail.com';

export const AdminDashboardPage: React.FC = () => {
  const {
    posts,
    categories,
    settings,
    media,
    contactMessages,
    revisions,
    auditLogs,
    analyticsEvents,
    adminUser,
    isLoading,
    logoutAdmin,
    savePost,
    deleteOrArchivePost,
    duplicatePost,
    saveCategory,
    deleteCategory,
    updateSiteSettings,
    uploadMediaItem,
    deleteMediaItem,
    updateContactMessageStatus,
    deleteContactMessage,
    restoreRevision,
    restoreDemoContent,
    refreshData,
  } = useCMS();

  const navigate = useNavigate();
  const { signOutClerk } = useClerkRuntime();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const qTab = searchParams.get('tab') as AdminTab | null;
    return qTab || 'overview';
  });
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // Post Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

  // Exam Calendar Inline Edit State
  const [calSearch, setCalSearch] = useState('');
  const [calOrgFilter, setCalOrgFilter] = useState('all');
  const [calEdits, setCalEdits] = useState<
    Record<
      string,
      {
        applicationStart: string;
        applicationEnd: string;
        examDate: string;
        admitCardDate: string;
        resultDate: string;
        statusOverride: string;
      }
    >
  >({});

  // Posts Management Filters & Bulk Selection
  const [postSearch, setPostSearch] = useState('');
  const [postCatFilter, setPostCatFilter] = useState<string>('all');
  const [postStatusFilter, setPostStatusFilter] = useState<string>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catType, setCatType] = useState<'section' | 'domain'>('domain');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Media Form State
  const [mediaName, setMediaName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaMimeType, setMediaMimeType] =
    useState<MediaLibraryItem['mimeType']>('image/jpeg');

  // Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(settings);

  // Backup Import JSON State
  const [importJsonText, setImportJsonText] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!isLoading && !adminUser) {
      navigate('/8233538355/login', { replace: true });
    }
  }, [isLoading, adminUser, navigate]);

  const showNotice = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Filtered Admin Posts
  const filteredAdminPosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    return posts.filter((p) => {
      if (postCatFilter !== 'all' && p.category !== postCatFilter) return false;
      if (postStatusFilter !== 'all' && p.status !== postStatusFilter) return false;
      if (q) {
        const match =
          p.title.toLowerCase().includes(q) ||
          p.organization.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [posts, postSearch, postCatFilter, postStatusFilter]);

  // Dashboard Summary Metrics
  const kpis = useMemo(() => {
    const published = posts.filter((p) => p.status === 'published').length;
    const drafts = posts.filter((p) => p.status === 'draft').length;
    const scheduled = posts.filter((p) => p.status === 'scheduled').length;
    const closingSoon = posts.filter(
      (p) =>
        p.status === 'published' &&
        computePostStatus(p, settings.closingSoonThresholdDays).code === 'CLOSING_SOON'
    ).length;
    const unreadMessages = contactMessages.filter((m) => m.status === 'unread').length;

    return {
      total: posts.length,
      published,
      drafts,
      scheduled,
      closingSoon,
      unreadMessages,
      categoriesCount: categories.filter((c) => c.enabled).length,
    };
  }, [posts, categories, contactMessages, settings.closingSoonThresholdDays]);

  // Computed Analytics Metrics from analyticsEvents
  const analytics = useMemo(() => {
    let articleOpens = 0;
    let officialLinkClicks = 0;
    let whatsappClicks = 0;
    const searchMap: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    analyticsEvents.forEach((ev) => {
      if (ev.eventType === 'article_open') articleOpens += 1;
      if (ev.eventType === 'official_link_click') officialLinkClicks += 1;
      if (ev.eventType === 'whatsapp_click') whatsappClicks += 1;
      if (ev.eventType === 'search' && ev.target) {
        const term = ev.target.trim();
        searchMap[term] = (searchMap[term] || 0) + 1;
      }
      if (ev.category) {
        categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
      }
    });

    const topSearches = Object.entries(searchMap)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      articleOpens,
      officialLinkClicks,
      whatsappClicks,
      topSearches,
      categoryCounts,
    };
  }, [analyticsEvents]);

  if (isLoading && !adminUser) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6F8FB] flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-[#071A3D] animate-pulse">
          Verifying Owner Session...
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  const toggleSelectPost = (id: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedPostIds.length === filteredAdminPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(filteredAdminPosts.map((p) => p.id));
    }
  };

  const handleBulkAction = async (
    action: 'publish' | 'draft' | 'archive' | 'feature' | 'unfeature' | 'delete'
  ) => {
    if (selectedPostIds.length === 0) return;
    try {
      if (action === 'delete') {
        setConfirmDeleteIds(selectedPostIds);
        return;
      }
      for (const id of selectedPostIds) {
        const existing = posts.find((p) => p.id === id);
        if (!existing) continue;
        if (action === 'publish') {
          await savePost({ ...existing, status: 'published' }, 'Bulk published');
        } else if (action === 'draft') {
          await savePost({ ...existing, status: 'draft' }, 'Bulk moved to draft');
        } else if (action === 'archive') {
          await savePost({ ...existing, status: 'archived' }, 'Bulk archived');
        } else if (action === 'feature') {
          await savePost({ ...existing, featured: true }, 'Bulk featured');
        } else if (action === 'unfeature') {
          await savePost({ ...existing, featured: false }, 'Bulk unfeatured');
        }
      }
      setSelectedPostIds([]);
      showNotice(true, `Bulk action (${action}) completed for ${selectedPostIds.length} items.`);
    } catch (err) {
      showNotice(false, err instanceof Error ? err.message : 'Bulk operation failed.');
    }
  };

  const handleSaveSettingsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSiteSettings(settingsDraft);
      showNotice(true, 'Site settings and configuration saved.');
    } catch (err) {
      showNotice(false, err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await saveCategory({
        id: editingCatId || undefined,
        name: catName.trim(),
        slug: catSlug.trim() || generateSlug(catName),
        description: catDesc.trim(),
        type: catType,
        enabled: true,
      });
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setEditingCatId(null);
      showNotice(true, editingCatId ? 'Category updated.' : 'New category created.');
    } catch (err) {
      showNotice(false, err instanceof Error ? err.message : 'Could not save category.');
    }
  };

  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      showNotice(false, 'Image file size should be under 800 KB for fast performance.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const mime: MediaLibraryItem['mimeType'] =
          file.type === 'image/png' ||
          file.type === 'image/webp' ||
          file.type === 'image/svg+xml' ||
          file.type === 'application/pdf'
            ? (file.type as MediaLibraryItem['mimeType'])
            : 'image/jpeg';
        await uploadMediaItem({
          name: file.name,
          url: reader.result,
          mimeType: mime,
          sizeBytes: file.size,
          altText: file.name.replace(/\.[^/.]+$/, ''),
        });
        showNotice(true, `Uploaded ${file.name} to Media Library.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExternalMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaName.trim() || !mediaUrl.trim()) return;
    await uploadMediaItem({
      name: mediaName.trim(),
      url: mediaUrl.trim(),
      mimeType: mediaMimeType,
      sizeBytes: 102400,
      altText: mediaAlt.trim() || mediaName.trim(),
    });
    setMediaName('');
    setMediaUrl('');
    setMediaAlt('');
    showNotice(true, 'Added asset to Media Library.');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBackupJson = () => {
    return JSON.stringify(
      {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        settings,
        categories,
        posts,
        media,
      },
      null,
      2
    );
  };

  const exportPostsCsv = () => {
    const headers = [
      'id',
      'title',
      'slug',
      'category',
      'organization',
      'state',
      'status',
      'applicationEnd',
      'examDate',
      'officialSourceUrl',
    ];
    const rows = posts.map((p) =>
      headers
        .map((h) => {
          const val = String((p as unknown as Record<string, unknown>)[h] ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const handleImportBackupJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed || !Array.isArray(parsed.posts)) {
        showNotice(false, 'Backup JSON must contain a valid "posts" array.');
        return;
      }
      for (const p of parsed.posts) {
        if (p && p.title && p.category) {
          await savePost(p, 'Restored from JSON backup');
        }
      }
      if (parsed.settings) {
        await updateSiteSettings(parsed.settings);
      }
      await refreshData();
      setImportJsonText('');
      showNotice(true, `Imported ${parsed.posts.length} posts from JSON backup.`);
    } catch (err) {
      showNotice(false, err instanceof Error ? err.message : 'Invalid JSON format.');
    }
  };

  const NAV_TABS: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'posts', label: 'Posts & Bulk', icon: <FileText className="w-4 h-4 shrink-0" />, badge: posts.length },
    {
      id: 'calendar',
      label: 'Exam Calendar',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      badge: posts.filter((p) => Boolean(p.examDate || p.applicationEnd || p.admitCardDate || p.resultDate)).length,
    },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4 shrink-0" /> },
    { id: 'ticker_homepage', label: 'Ticker & Layout', icon: <Megaphone className="w-4 h-4 shrink-0" /> },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4 shrink-0" /> },
    { id: 'seo', label: 'SEO & Sitemap', icon: <Globe className="w-4 h-4 shrink-0" /> },
    { id: 'branding', label: 'Brand & Settings', icon: <Palette className="w-4 h-4 shrink-0" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <Mail className="w-4 h-4 shrink-0" />,
      badge: kpis.unreadMessages > 0 ? kpis.unreadMessages : undefined,
    },
    { id: 'revisions', label: 'Revisions', icon: <History className="w-4 h-4 shrink-0" /> },
    { id: 'audit', label: 'Audit Logs', icon: <ShieldAlert className="w-4 h-4 shrink-0" /> },
    { id: 'backup', label: 'Backup & Export', icon: <Database className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6F8FB] text-[#071A3D] flex flex-col">
      <SEOHead title="Owner Command Center" canonicalPath="/8233538355" noIndex />

      {/* Top Tricolour Bar */}
      <div className="h-1 w-full flex shrink-0">
        <div className="w-1/3 bg-[#FF7A00]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138A36]" />
      </div>

      {/* Top Owner Header (Responsive on all screens) */}
      <header className="bg-[#071A3D] text-white border-b border-white/15 sticky top-0 z-30 w-full">
        <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link to="/" className="inline-flex items-center focus:outline-none min-w-0">
              <BrandLogo variant="header" size="sm" theme="dark" />
            </Link>
            <div className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/10 border border-white/15 text-[11px] font-semibold text-white/90 leading-none truncate">
              <Lock className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
              <span className="truncate leading-none">Owner Command Center · {adminUser.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-md bg-[#FF7A00] hover:bg-[#E56D00] text-white text-xs font-bold leading-none shadow-xs transition-all btn-press cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="leading-none">New Post</span>
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white leading-none transition-colors"
            >
              <span className="leading-none">Public Site</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <ClerkOwnerUserBadge />

            <button
              type="button"
              onClick={async () => {
                if (signOutClerk) {
                  await signOutClerk();
                }
                await logoutAdmin();
                navigate('/8233538355/login');
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-md bg-red-600/80 hover:bg-red-600 text-xs font-semibold text-white leading-none transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline leading-none">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Section Navigation */}
        <div className="bg-[#0B224F] border-t border-white/10 w-full overflow-x-auto">
          <div className="max-w-[1440px] w-full mx-auto px-2 sm:px-6 flex items-center gap-1 py-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'border-[#FF7A00] text-white bg-white/10 rounded-t'
                    : 'border-transparent text-white/75 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#FF7A00] text-white text-[10px] font-mono-tabular font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 pt-4">
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-scale-in ${
              toast.ok
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              )}
              <span className="break-words">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs underline opacity-75 hover:opacity-100 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Workspace */}
      <main className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 flex-1 space-y-6 min-w-0 overflow-x-hidden">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Total Updates
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#071A3D] mt-1">
                  {kpis.total}
                </div>
                <div className="text-[11px] text-[#138A36] font-medium mt-1 truncate">
                  {kpis.published} Live on Portal
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Published
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#16A34A] mt-1">
                  {kpis.published}
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  Indexed & Searchable
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Drafts / Scheduled
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#D97706] mt-1">
                  {kpis.drafts} / {kpis.scheduled}
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  Editorial Queue
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Closing Soon
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#DC2626] mt-1">
                  {kpis.closingSoon}
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  Within {settings.closingSoonThresholdDays} days
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Active Categories
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#071A3D] mt-1">
                  {kpis.categoriesCount}
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  Content & Commissions
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-[#64748B] truncate">
                  Unread Messages
                </div>
                <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#FF7A00] mt-1">
                  {kpis.unreadMessages}
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  {contactMessages.length} Total in Inbox
                </div>
              </div>
            </div>

            {/* Quick Publishing Templates Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#071A3D]">
                    Quick Structured Content Templates
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Launch the post editor pre-configured with standard Indian recruitment tables and sections.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { cat: 'jobs', title: '+ New Job Recruitment', sub: 'Vacancies, Dates, Fee & Apply Links' },
                  { cat: 'results', title: '+ Declare Exam Result', sub: 'Merit List PDF, Cut-Off & Scorecard' },
                  { cat: 'admit-card', title: '+ Release Admit Card', sub: 'Hall Ticket Link, Shift & Exam Date' },
                  { cat: 'answer-key', title: '+ Publish Answer Key', sub: 'Response Sheet & Objection Window' },
                  { cat: 'syllabus', title: '+ Add Exam Syllabus', sub: 'Paper Pattern & Subject Topics' },
                ].map((item) => (
                  <button
                    key={item.cat}
                    type="button"
                    onClick={() => {
                      setEditingPost({ category: item.cat as PostCategorySlug });
                      setEditorOpen(true);
                    }}
                    className="p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#071A3D] bg-[#F6F8FB] hover:bg-white text-left transition-all card-interactive cursor-pointer min-w-0"
                  >
                    <div className="text-xs font-bold text-[#071A3D] truncate">{item.title}</div>
                    <div className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Posts & Recent Audit Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden min-w-0">
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#071A3D]">Recently Updated Posts</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('posts')}
                    className="text-xs font-semibold text-[#FF7A00] hover:underline shrink-0"
                  >
                    Manage All ({posts.length}) →
                  </button>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {posts.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#F6F8FB] min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                          <span className="font-bold text-[#071A3D] uppercase">{p.category}</span>
                          <span>·</span>
                          <span className="truncate">{p.organization}</span>
                          <span>·</span>
                          <span
                            className={`font-semibold ${
                              p.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-[#071A3D] truncate mt-0.5">
                          {p.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(p);
                          setEditorOpen(true);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-xs font-semibold text-[#071A3D] shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden min-w-0">
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#071A3D]">Recent Owner Audit Log</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-semibold text-[#FF7A00] hover:underline shrink-0"
                  >
                    Full Log →
                  </button>
                </div>
                <div className="divide-y divide-[#E2E8F0] max-h-[360px] overflow-y-auto">
                  {auditLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="p-3.5 text-xs space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#071A3D] truncate">{log.action}</span>
                        <span className="font-mono-tabular text-[11px] text-[#64748B] shrink-0">
                          {formatIndianDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#64748B] break-words">{log.details || log.target}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POSTS MANAGEMENT & BULK OPERATIONS */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fade-in-up min-w-0">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-[#071A3D]">
                    All Career Updates & Notifications ({filteredAdminPosts.length})
                  </h1>
                  <p className="text-xs text-[#64748B]">
                    Create, edit, duplicate, schedule, or perform bulk actions across posts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(null);
                    setEditorOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span>Create New Post</span>
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 min-w-0">
                <div className="sm:col-span-6 relative min-w-0">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="Search posts by title, organization, slug, or state..."
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
                <div className="sm:col-span-3 min-w-0">
                  <select
                    value={postCatFilter}
                    onChange={(e) => setPostCatFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] bg-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="jobs">Jobs</option>
                    <option value="exams">Exams</option>
                    <option value="results">Results</option>
                    <option value="admit-card">Admit Card</option>
                    <option value="answer-key">Answer Key</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="notifications">Notifications</option>
                  </select>
                </div>
                <div className="sm:col-span-3 min-w-0">
                  <select
                    value={postStatusFilter}
                    onChange={(e) => setPostStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] bg-white"
                  >
                    <option value="all">All Publication Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              {selectedPostIds.length > 0 && (
                <div className="p-3 rounded-lg bg-[#071A3D] text-white flex flex-wrap items-center justify-between gap-2.5 text-xs animate-scale-in">
                  <span className="font-semibold">
                    {selectedPostIds.length} {selectedPostIds.length === 1 ? 'post' : 'posts'}{' '}
                    selected
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkAction('publish')}
                      className="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] font-semibold"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('draft')}
                      className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 font-semibold"
                    >
                      Move to Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('feature')}
                      className="px-2.5 py-1 rounded bg-[#FF7A00] hover:bg-[#E56D00] font-semibold"
                    >
                      Feature
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('unfeature')}
                      className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 font-semibold"
                    >
                      Unfeature
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('delete')}
                      className="px-2.5 py-1 rounded bg-[#DC2626] hover:bg-red-700 font-semibold"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}

              {/* Posts Table (Responsive Horizontal Container) */}
              <div className="w-full max-w-full overflow-x-auto border border-[#E2E8F0] rounded-lg">
                <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F6F8FB] border-b border-[#E2E8F0] text-[#071A3D]">
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredAdminPosts.length > 0 &&
                            selectedPostIds.length === filteredAdminPosts.length
                          }
                          onChange={toggleSelectAllFiltered}
                          aria-label="Select all posts"
                        />
                      </th>
                      <th className="py-3 px-3 font-bold">Title & Slug</th>
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold">Organization</th>
                      <th className="py-3 px-3 font-bold">Lifecycle Status</th>
                      <th className="py-3 px-3 font-bold">Visibility</th>
                      <th className="py-3 px-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredAdminPosts.map((post) => {
                      const st = computePostStatus(post, settings.closingSoonThresholdDays);
                      return (
                        <tr key={post.id} className="hover:bg-[#F6F8FB]/70">
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={selectedPostIds.includes(post.id)}
                              onChange={() => toggleSelectPost(post.id)}
                              aria-label={`Select ${post.title}`}
                            />
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-bold text-[#071A3D] line-clamp-1">
                              {post.title}
                            </div>
                            <div className="font-mono-tabular text-[11px] text-[#64748B] truncate">
                              /{post.category}/{post.slug}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {post.featured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  <Star className="w-2.5 h-2.5" /> Featured
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 uppercase font-bold text-[11px] text-[#071A3D] whitespace-nowrap">
                            {post.category}
                          </td>
                          <td className="py-3 px-3 font-medium text-[#071A3D]">
                            {post.organization}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                              <span className={st.textClass}>{st.label}</span>
                            </span>
                            {post.applicationEnd && (
                              <div className="font-mono-tabular text-[11px] text-[#64748B]">
                                Ends: {formatIndianDate(post.applicationEnd)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                                post.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : post.status === 'draft'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {post.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPost(post);
                                  setEditorOpen(true);
                                }}
                                title="Edit Post"
                                className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D]"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await duplicatePost(post.id);
                                  showNotice(true, `Duplicated "${post.title}" as draft.`);
                                }}
                                title="Duplicate Post"
                                className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D]"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                to={`/${post.category}/${post.slug}`}
                                target="_blank"
                                title="View Live Page"
                                className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[#071A3D]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteIds([post.id])}
                                title="Delete Post"
                                className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#DC2626] text-[#DC2626]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2B: EXAM CALENDAR MANAGER */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 animate-fade-in-up min-w-0">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-[#071A3D]">
                    Exam Calendar Schedule Manager (2026–27)
                  </h1>
                  <p className="text-xs text-[#64748B]">
                    Directly edit application windows, exam dates, admit card dates, and result schedules shown on the public /calendar page, or add new exam calendar entries.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to="/calendar"
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] text-xs font-semibold text-[#071A3D]"
                  >
                    <span>View Live Calendar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPost({
                        category: 'exams',
                        badge: 'NEW',
                        examDate: 'November 2026',
                      });
                      setEditorOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#FF7A00] shrink-0" />
                    <span>Add Exam to Calendar</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 min-w-0">
                <div className="sm:col-span-8 relative min-w-0">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    placeholder="Filter calendar by exam title, commission, or date..."
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
                <div className="sm:col-span-4 min-w-0">
                  <select
                    value={calOrgFilter}
                    onChange={(e) => setCalOrgFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D] bg-white"
                  >
                    <option value="all">All Commissions / Organizations</option>
                    {categories
                      .filter((c) => c.type === 'domain')
                      .map((c, idx) => (
                        <option key={c.id || `${c.slug}-${idx}`} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Editable Exam Calendar Table */}
              <div className="w-full max-w-full overflow-x-auto border border-[#E2E8F0] rounded-lg">
                <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#071A3D] text-white">
                      <th className="py-3 px-3 font-semibold">Exam / Recruitment</th>
                      <th className="py-3 px-2.5 font-semibold">App Start (YYYY-MM-DD)</th>
                      <th className="py-3 px-2.5 font-semibold">Last Date (YYYY-MM-DD)</th>
                      <th className="py-3 px-2.5 font-semibold">Exam Date / Window</th>
                      <th className="py-3 px-2.5 font-semibold">Admit Card Schedule</th>
                      <th className="py-3 px-2.5 font-semibold">Result Schedule</th>
                      <th className="py-3 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {posts
                      .filter((p) => {
                        if (
                          calOrgFilter !== 'all' &&
                          p.organization.toLowerCase() !== calOrgFilter.toLowerCase()
                        ) {
                          return false;
                        }
                        if (calSearch.trim()) {
                          const q = calSearch.trim().toLowerCase();
                          return (
                            p.title.toLowerCase().includes(q) ||
                            p.organization.toLowerCase().includes(q) ||
                            (p.examDate || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((post, idx) => {
                        const draft = calEdits[post.id] || {
                          applicationStart: post.applicationStart || '',
                          applicationEnd: post.applicationEnd || '',
                          examDate: post.examDate || '',
                          admitCardDate: post.admitCardDate || '',
                          resultDate: post.resultDate || '',
                          statusOverride: post.statusOverride || '',
                        };
                        const hasChanges = Boolean(calEdits[post.id]);
                        const updateField = (
                          field: keyof typeof draft,
                          val: string
                        ) => {
                          setCalEdits((prev) => ({
                            ...prev,
                            [post.id]: {
                              ...draft,
                              [field]: val,
                            },
                          }));
                        };

                        return (
                          <tr
                            key={post.id || `${post.slug}-${idx}`}
                            className="hover:bg-[#F6F8FB]/80"
                          >
                            <td className="py-3 px-3 max-w-[240px]">
                              <div className="font-bold text-[#071A3D] line-clamp-1">
                                {post.title}
                              </div>
                              <div className="text-[11px] text-[#64748B]">
                                {post.organization} · {post.category.toUpperCase()}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5">
                              <input
                                type="date"
                                value={draft.applicationStart}
                                onChange={(e) =>
                                  updateField('applicationStart', e.target.value)
                                }
                                className="w-32 px-2 py-1 rounded border border-[#E2E8F0] font-mono-tabular text-[11px]"
                              />
                            </td>
                            <td className="py-2.5 px-2.5">
                              <input
                                type="date"
                                value={draft.applicationEnd}
                                onChange={(e) =>
                                  updateField('applicationEnd', e.target.value)
                                }
                                className="w-32 px-2 py-1 rounded border border-[#E2E8F0] font-mono-tabular text-[11px]"
                              />
                            </td>
                            <td className="py-2.5 px-2.5">
                              <input
                                type="text"
                                value={draft.examDate}
                                onChange={(e) => updateField('examDate', e.target.value)}
                                placeholder="e.g., 15–24 Nov 2026"
                                className="w-36 px-2 py-1 rounded border border-[#E2E8F0] font-mono-tabular text-[11px]"
                              />
                            </td>
                            <td className="py-2.5 px-2.5">
                              <input
                                type="text"
                                value={draft.admitCardDate}
                                onChange={(e) =>
                                  updateField('admitCardDate', e.target.value)
                                }
                                placeholder="e.g., 10 Days Before Exam"
                                className="w-36 px-2 py-1 rounded border border-[#E2E8F0] font-mono-tabular text-[11px]"
                              />
                            </td>
                            <td className="py-2.5 px-2.5">
                              <input
                                type="text"
                                value={draft.resultDate}
                                onChange={(e) => updateField('resultDate', e.target.value)}
                                placeholder="e.g., Jan 2027"
                                className="w-32 px-2 py-1 rounded border border-[#E2E8F0] font-mono-tabular text-[11px]"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {hasChanges && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await savePost(
                                        {
                                          ...post,
                                          applicationStart: draft.applicationStart,
                                          applicationEnd: draft.applicationEnd,
                                          examDate: draft.examDate,
                                          admitCardDate: draft.admitCardDate,
                                          resultDate: draft.resultDate,
                                        },
                                        'Updated exam calendar dates'
                                      );
                                      setCalEdits((prev) => {
                                        const next = { ...prev };
                                        delete next[post.id];
                                        return next;
                                      });
                                      showNotice(
                                        true,
                                        `Saved Exam Calendar schedule for "${post.title}".`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#138A36] hover:bg-[#10752D] text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>Save Dates</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPost(post);
                                    setEditorOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:border-[#071A3D] text-[11px] font-semibold text-[#071A3D] cursor-pointer"
                                >
                                  Full Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES & EXAM DOMAINS */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up min-w-0">
            <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 h-fit min-w-0">
              <h2 className="text-base font-bold text-[#071A3D] mb-3">
                {editingCatId ? 'Edit Category / Commission' : 'Add Category or Exam Domain'}
              </h2>
              <form onSubmit={handleSaveCategoryForm} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      if (!editingCatId) setCatSlug(generateSlug(e.target.value));
                    }}
                    placeholder="e.g., DRDO / ISRO Recruitment"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={catSlug}
                    onChange={(e) => setCatSlug(generateSlug(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Type</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as 'section' | 'domain')}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] bg-white"
                  >
                    <option value="domain">Commission / Sector Domain (SSC, UPSC, Banking...)</option>
                    <option value="section">Primary Content Section</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Brief description of exams covered..."
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded bg-[#071A3D] text-white font-bold"
                  >
                    {editingCatId ? 'Update Category' : 'Add Category'}
                  </button>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatSlug('');
                        setCatDesc('');
                      }}
                      className="py-2 px-3 rounded border border-[#E2E8F0] font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 min-w-0">
              <h2 className="text-base font-bold text-[#071A3D] mb-3">
                Active Content Sections & Exam Domains ({categories.length})
              </h2>
              <div className="divide-y divide-[#E2E8F0]">
                {categories.map((cat: CategoryItem) => (
                  <div
                    key={cat.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#071A3D]">{cat.name}</span>
                        <span className="font-mono-tabular text-[11px] text-[#64748B]">
                          /{cat.slug}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F6F8FB] border border-[#E2E8F0] text-[10px] font-semibold uppercase">
                          {cat.type}
                        </span>
                      </div>
                      <p className="text-[#64748B] mt-0.5 break-words">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await saveCategory({ ...cat, enabled: !cat.enabled });
                          showNotice(true, `Toggled visibility for ${cat.name}.`);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          cat.enabled
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cat.enabled ? 'Enabled' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatName(cat.name);
                          setCatSlug(cat.slug);
                          setCatDesc(cat.description || '');
                          setCatType(cat.type);
                        }}
                        className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#071A3D]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {cat.type === 'domain' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteCategory(cat.id);
                            showNotice(true, `Deleted category ${cat.name}.`);
                          }}
                          className="p-1.5 rounded border border-[#E2E8F0] hover:border-[#DC2626] text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKER & HOMEPAGE LAYOUT */}
        {activeTab === 'ticker_homepage' && (
          <form
            onSubmit={handleSaveSettingsForm}
            className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 space-y-6 max-w-4xl animate-fade-in-up min-w-0"
          >
            <div>
              <h2 className="text-lg font-bold text-[#071A3D]">
                Breaking Ticker & Public Visibility Controls
              </h2>
              <p className="text-xs text-[#64748B]">
                Manage the live announcement bar and custom breaking alerts on the public portal.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <label className="inline-flex items-center gap-2 font-bold text-[#071A3D]">
                <input
                  type="checkbox"
                  checked={settingsDraft.tickerEnabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, tickerEnabled: e.target.checked })
                  }
                />
                <span>Enable Breaking Updates Ticker Bar on Public Website</span>
              </label>

              <div>
                <label className="block font-bold text-[#071A3D] mb-1">
                  Custom Ticker Announcements (One per line: Label | Target Path)
                </label>
                <textarea
                  rows={5}
                  value={(settingsDraft.customTickerItems || [])
                    .map((i) => `${i.label} | ${i.href}`)
                    .join('\n')}
                  onChange={(e) => {
                    const items = e.target.value
                      .split('\n')
                      .map((line) => {
                        const [label, href] = line.split('|').map((s) => s.trim());
                        return { label: label || '', href: href || '/latest' };
                      })
                      .filter((i) => i.label.length > 0);
                    setSettingsDraft({ ...settingsDraft, customTickerItems: items });
                  }}
                  placeholder="SSC CGL 2026 Notification Out – Apply Online | /jobs/ssc-cgl-2026-notification"
                  className="w-full p-3 rounded border border-[#E2E8F0] font-mono-tabular text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-bold cursor-pointer"
            >
              Save Ticker Configuration
            </button>
          </form>
        )}

        {/* TAB 5: MEDIA LIBRARY */}
        {activeTab === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up min-w-0">
            <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-5 h-fit min-w-0">
              <h2 className="text-base font-bold text-[#071A3D]">Add Media Asset</h2>

              <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] space-y-2 text-xs">
                <label className="block font-bold text-[#071A3D]">
                  Upload Image from Device (Under 800 KB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMediaFileUpload}
                  className="w-full text-xs"
                />
              </div>

              <form onSubmit={handleAddExternalMedia} className="space-y-3 text-xs">
                <div className="font-bold text-[#071A3D]">Or Register Image / PDF URL</div>
                <div>
                  <label className="block text-[#64748B] mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={mediaName}
                    onChange={(e) => setMediaName(e.target.value)}
                    placeholder="SSC CGL 2026 Banner"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1">URL (https:// or /images/...) *</label>
                  <input
                    type="text"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1">Alt Text (Accessibility & SEO)</label>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={(e) => setMediaAlt(e.target.value)}
                    placeholder="Descriptive alt text"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1">Media Type</label>
                  <select
                    value={mediaMimeType}
                    onChange={(e) =>
                      setMediaMimeType(e.target.value as MediaLibraryItem['mimeType'])
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] bg-white"
                  >
                    <option value="image/jpeg">JPEG Image</option>
                    <option value="image/png">PNG Image</option>
                    <option value="image/svg+xml">SVG Vector</option>
                    <option value="image/webp">WebP Image</option>
                    <option value="application/pdf">PDF Document</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded bg-[#071A3D] text-white font-bold"
                >
                  Save to Media Library
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 min-w-0">
              <h2 className="text-base font-bold text-[#071A3D] mb-4">
                Media Library Assets ({media.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {media.map((item: MediaLibraryItem) => (
                  <div
                    key={item.id}
                    className="border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col justify-between bg-[#F6F8FB] min-w-0"
                  >
                    <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden p-2">
                      <img
                        src={item.url}
                        alt={item.altText}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="p-3 space-y-1.5 text-xs bg-white min-w-0">
                      <div className="font-bold text-[#071A3D] truncate">{item.name}</div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        Alt: {item.altText}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(item.url);
                            showNotice(true, 'Copied asset URL to clipboard.');
                          }}
                          className="text-[11px] font-semibold text-[#071A3D] hover:underline"
                        >
                          Copy URL
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMediaItem(item.id)}
                          className="text-[11px] font-semibold text-[#DC2626] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SEO & SITEMAP */}
        {activeTab === 'seo' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 space-y-6 max-w-4xl animate-fade-in-up min-w-0">
            <div>
              <h2 className="text-lg font-bold text-[#071A3D]">
                SEO Metadata, Structured Schema & Dynamic Sitemap
              </h2>
              <p className="text-xs text-[#64748B]">
                Configure default meta titles, meta descriptions, and inspect live XML sitemaps.
              </p>
            </div>

            <form onSubmit={handleSaveSettingsForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#071A3D] mb-1">
                  Default Homepage SEO Title
                </label>
                <input
                  type="text"
                  value={settingsDraft.defaultSeoTitle}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, defaultSeoTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#071A3D] mb-1">
                  Default Homepage Meta Description
                </label>
                <textarea
                  rows={3}
                  value={settingsDraft.defaultSeoDescription}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      defaultSeoDescription: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-[#071A3D]">Live Server Endpoints</div>
                  <div className="text-[#64748B] mt-0.5">
                    Dynamic XML Sitemap and Robots.txt are automatically served from your published updates.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded border border-[#E2E8F0] bg-white font-semibold text-[#071A3D] hover:border-[#071A3D]"
                  >
                    View /sitemap.xml
                  </a>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded border border-[#E2E8F0] bg-white font-semibold text-[#071A3D] hover:border-[#071A3D]"
                  >
                    View /robots.txt
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#071A3D] text-white font-bold cursor-pointer"
              >
                Save SEO Settings
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: BRANDING & SITE SETTINGS */}
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-4xl animate-fade-in-up min-w-0">
            {/* Official Brand Logo & Wordmark Preview Showcase */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#071A3D]">
                  Active Official Brand Identity (Logo & Wordmark)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Live vector-crisp Career Alert India circular emblem and CAI wordmark deployed across headers, footers, and social cards.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] flex flex-col items-center justify-center gap-3 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Official Circular Emblem (logo.png)
                  </span>
                  <BrandLogo variant="emblem" size="xl" />
                </div>

                <div className="p-4 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] flex flex-col items-center justify-center gap-3 text-center overflow-hidden">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Official CAI Wordmark (wordmark.png)
                  </span>
                  <BrandLogo variant="wordmark" size="md" theme="light" />
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSaveSettingsForm}
              className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 space-y-5 min-w-0"
            >
              <div>
                <h2 className="text-lg font-bold text-[#071A3D]">
                  Brand Identity, Social Channels & Lifecycle Rules
                </h2>
                <p className="text-xs text-[#64748B]">
                  Update site name, tagline, WhatsApp/Telegram links, and automatic &quot;Closing Soon&quot; threshold days.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Site Name</label>
                  <input
                    type="text"
                    value={settingsDraft.siteName}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, siteName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settingsDraft.tagline}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, tagline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={settingsDraft.contactEmail}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, contactEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">
                    &quot;Closing Soon&quot; Threshold (Days before Application End)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settingsDraft.closingSoonThresholdDays}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        closingSoonThresholdDays: Number(e.target.value) || 7,
                      })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">
                    WhatsApp Channel URL
                  </label>
                  <input
                    type="url"
                    value={settingsDraft.whatsappChannelUrl}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, whatsappChannelUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#071A3D] mb-1">
                    Telegram Channel URL
                  </label>
                  <input
                    type="url"
                    value={settingsDraft.telegramUrl || ''}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, telegramUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#071A3D] mb-1">
                    Footer Disclaimer Text
                  </label>
                  <textarea
                    rows={2}
                    value={settingsDraft.footerText}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, footerText: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-bold cursor-pointer"
              >
                Save Brand & Site Settings
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: ANALYTICS & SEARCH TELEMETRY */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in-up min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 min-w-0">
                <div className="text-xs font-semibold text-[#64748B] uppercase">
                  Total Article Views
                </div>
                <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#071A3D] mt-1">
                  {analytics.articleOpens}
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 min-w-0">
                <div className="text-xs font-semibold text-[#64748B] uppercase">
                  Official Link Clicks
                </div>
                <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#138A36] mt-1">
                  {analytics.officialLinkClicks}
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 min-w-0">
                <div className="text-xs font-semibold text-[#64748B] uppercase">
                  WhatsApp Channel Clicks
                </div>
                <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#FF7A00] mt-1">
                  {analytics.whatsappClicks}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 min-w-0">
                <h3 className="text-sm font-bold text-[#071A3D] mb-3">
                  Top Candidate Search Queries
                </h3>
                {analytics.topSearches.length === 0 ? (
                  <p className="text-xs text-[#64748B]">
                    Search queries performed by visitors will appear here automatically.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] text-xs">
                    {analytics.topSearches.map((item) => (
                      <div key={item.term} className="py-2.5 flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#071A3D] truncate">{item.term}</span>
                        <span className="font-mono-tabular font-bold text-[#FF7A00] shrink-0">
                          {item.count} searches
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 min-w-0">
                <h3 className="text-sm font-bold text-[#071A3D] mb-3">
                  Engagement by Category
                </h3>
                <div className="divide-y divide-[#E2E8F0] text-xs">
                  {Object.entries(analytics.categoryCounts).map(([cat, count]) => (
                    <div key={cat} className="py-2.5 flex items-center justify-between gap-2">
                      <span className="font-bold uppercase text-[#071A3D]">{cat}</span>
                      <span className="font-mono-tabular font-semibold text-[#64748B]">
                        {String(count)} interactions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: CONTACT INBOX */}
        {activeTab === 'inbox' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in-up min-w-0">
            <h2 className="text-base font-bold text-[#071A3D]">
              Candidate Contact Submissions ({contactMessages.length})
            </h2>
            {contactMessages.length === 0 ? (
              <p className="text-xs text-[#64748B] py-8 text-center">
                No contact messages received yet. Submissions from the public /contact form are stored here.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {contactMessages.map((msg) => (
                  <div key={msg.id} className="py-4 space-y-2 text-xs min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            msg.status === 'unread'
                              ? 'bg-[#FF7A00] text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {msg.status}
                        </span>
                        <span className="font-bold text-[#071A3D]">{msg.subject}</span>
                        <span className="text-[#64748B] break-all">
                          from {msg.name} ({msg.email})
                        </span>
                      </div>
                      <span className="font-mono-tabular text-[11px] text-[#64748B]">
                        {formatIndianDate(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#071A3D]/90 bg-[#F6F8FB] p-3 rounded border border-[#E2E8F0] whitespace-pre-line break-words">
                      {msg.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {msg.status === 'unread' && (
                        <button
                          type="button"
                          onClick={() => updateContactMessageStatus(msg.id, 'read')}
                          className="text-xs font-semibold text-[#138A36] hover:underline cursor-pointer"
                        >
                          Mark as Read
                        </button>
                      )}
                      {msg.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => updateContactMessageStatus(msg.id, 'archived')}
                          className="text-xs font-semibold text-[#64748B] hover:underline cursor-pointer"
                        >
                          Archive Message
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteContactMessage(msg.id)}
                        className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                      >
                        Delete Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: REVISION HISTORY & ROLLBACK */}
        {activeTab === 'revisions' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in-up min-w-0">
            <h2 className="text-base font-bold text-[#071A3D]">
              Article Revision Snapshots & One-Click Rollback ({revisions.length})
            </h2>
            {revisions.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Every time you edit or publish a post, a snapshot is recorded here so you can roll back changes anytime.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] text-xs">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-3 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#071A3D] truncate">{rev.postTitle}</div>
                      <div className="text-[#64748B] mt-0.5 break-words">
                        Note: {rev.changeSummary} · Edited by {rev.changedBy} on{' '}
                        {formatIndianDate(rev.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await restoreRevision(rev.id);
                        showNotice(true, `Restored "${rev.postTitle}" to selected snapshot.`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#071A3D] text-[#071A3D] hover:bg-[#071A3D] hover:text-white font-semibold transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Snapshot</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 11: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in-up min-w-0">
            <h2 className="text-base font-bold text-[#071A3D]">
              Security & Editorial Audit Trail ({auditLogs.length})
            </h2>
            <div className="divide-y divide-[#E2E8F0] text-xs">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[#071A3D]">{log.action}</span>
                    <span className="mx-2 text-[#64748B]">·</span>
                    <span className="text-[#071A3D]/90 break-words">
                      {log.details || log.target}
                    </span>
                  </div>
                  <div className="font-mono-tabular text-[11px] text-[#64748B] shrink-0">
                    {log.adminEmail} · {formatIndianDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 12: BACKUP, EXPORT & RESTORE */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up min-w-0">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 min-w-0">
              <h2 className="text-base font-bold text-[#071A3D]">
                Export CMS Backup (JSON & CSV)
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Download a complete snapshot of all posts, categories, settings, media library items, and logs for safekeeping or spreadsheet analysis.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const json = exportBackupJson();
                    downloadFile(
                      json,
                      `career-alert-india-backup-${new Date().toISOString().slice(0, 10)}.json`,
                      'application/json'
                    );
                    showNotice(true, 'Downloaded full JSON backup.');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span>Download Full JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const csv = exportPostsCsv();
                    downloadFile(
                      csv,
                      `career-alert-india-posts-${new Date().toISOString().slice(0, 10)}.csv`,
                      'text/csv'
                    );
                    showNotice(true, 'Downloaded Posts CSV export.');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#071A3D] text-[#071A3D] text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Export Posts to CSV</span>
                </button>
              </div>

              <div className="pt-6 border-t border-[#E2E8F0]">
                <h3 className="text-sm font-bold text-[#071A3D]">
                  Restore Verified Baseline Dataset
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Reset the portal to the initial 12 verified Indian recruitment and exam notifications.
                </p>
                {!confirmResetOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="mt-3 px-4 py-2 rounded border border-[#DC2626] text-[#DC2626] text-xs font-bold hover:bg-red-50"
                  >
                    Reset to Baseline Dataset...
                  </button>
                ) : (
                  <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-bold text-red-900">
                      Confirm restoring the baseline dataset?
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await restoreDemoContent();
                        setConfirmResetOpen(false);
                        showNotice(true, 'Restored baseline dataset.');
                      }}
                      className="px-3 py-1.5 rounded bg-[#DC2626] text-white font-bold"
                    >
                      Yes, Restore Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 min-w-0">
              <h2 className="text-base font-bold text-[#071A3D]">Import JSON Backup</h2>
              <p className="text-xs text-[#64748B]">
                Paste a previously exported Career Alert India JSON backup below to restore posts and settings.
              </p>
              <textarea
                rows={7}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"version": "2.0", "posts": [...]}'
                className="w-full p-3 rounded border border-[#E2E8F0] font-mono-tabular text-xs"
              />
              <button
                type="button"
                onClick={handleImportBackupJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#138A36] text-white text-xs font-bold cursor-pointer"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Validate & Restore JSON Backup</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 max-w-md w-full space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-[#071A3D]">Confirm Permanent Deletion</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong>{confirmDeleteIds.length}</strong> selected{' '}
              {confirmDeleteIds.length === 1 ? 'post' : 'posts'}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  for (const id of confirmDeleteIds) {
                    await deleteOrArchivePost(id, true);
                  }
                  setSelectedPostIds((prev) =>
                    prev.filter((id) => !confirmDeleteIds.includes(id))
                  );
                  setConfirmDeleteIds(null);
                  showNotice(true, 'Deleted selected post(s).');
                }}
                className="px-4 py-2 rounded bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Post Editor Modal */}
      {editorOpen && (
        <AdminPostEditorModal
          initialPost={editingPost}
          onClose={() => {
            setEditorOpen(false);
            setEditingPost(null);
          }}
          onSave={async (postData, changeSummary) => {
            await savePost(postData, changeSummary);
            showNotice(
              true,
              editingPost?.id
                ? `Updated "${postData.title}".`
                : `Published "${postData.title}".`
            );
          }}
        />
      )}
    </div>
  );
};
