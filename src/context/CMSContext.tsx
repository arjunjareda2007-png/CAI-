import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  Post,
  CategoryItem,
  SiteSettings,
  MediaLibraryItem,
  AuditLogRecord,
  RevisionRecord,
  ContactSubmission,
  AnalyticsEventRecord,
} from '../types/cms';
import {
  INITIAL_POSTS,
  INITIAL_CATEGORIES,
  DEFAULT_SITE_SETTINGS,
  INITIAL_MEDIA,
  INITIAL_AUDIT_LOGS,
  INITIAL_REVISIONS,
} from '../data/seedData';
import { sanitizeHtml, sanitizeUrl, generateSlug } from '../utils/statusAndSanitize';

export const CLERK_APP_ID = 'app_3K0GFtslkGHTmSBGO2kYp3S8qNI';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AdminUser {
  id: string;
  uid: string;
  appId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  imageUrl?: string;
  authMode: 'clerk';
}

interface CMSContextValue {
  posts: Post[];
  publishedPosts: Post[];
  categories: CategoryItem[];
  settings: SiteSettings;
  media: MediaLibraryItem[];
  auditLogs: AuditLogRecord[];
  revisions: RevisionRecord[];
  contactMessages: ContactSubmission[];
  analyticsEvents: AnalyticsEventRecord[];
  bookmarks: string[];
  recentSearches: string[];
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  toggleBookmark: (postId: string) => void;
  clearBookmarks: () => void;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  trackEvent: (
    eventType: AnalyticsEventRecord['eventType'],
    target: string,
    category?: string
  ) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  savePost: (
    postInput: Partial<Post> & { title: string; category: Post['category'] },
    changeSummary?: string
  ) => Promise<Post>;
  duplicatePost: (postId: string) => Promise<Post | null>;
  deleteOrArchivePost: (postId: string, permanent?: boolean) => Promise<void>;
  restoreRevision: (revisionId: string) => Promise<void>;
  saveCategory: (catInput: Partial<CategoryItem> & { name: string; type: CategoryItem['type'] }) => Promise<void>;
  reorderCategory: (categoryId: string, direction: 'up' | 'down') => Promise<void>;
  deleteCategory: (categoryId: string, reassignToSlug?: string) => Promise<{ ok: boolean; error?: string }>;
  uploadMediaItem: (item: {
    name: string;
    url: string;
    mimeType: MediaLibraryItem['mimeType'];
    sizeBytes: number;
    altText: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteMediaItem: (mediaId: string) => Promise<{ ok: boolean; error?: string }>;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  submitContactMessage: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    website_hp?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateContactMessageStatus: (msgId: string, status: ContactSubmission['status']) => Promise<void>;
  deleteContactMessage: (msgId: string) => Promise<void>;
  purgeDemoContent: () => Promise<number>;
  restoreDemoContent: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const CMSContext = createContext<CMSContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  BOOKMARKS: 'cai_saved_bookmarks_v2',
  SEARCHES: 'cai_recent_searches_v2',
  CACHE: 'cai_cms_cache_v4',
  CLERK_TOKEN: 'cai_clerk_session_token_v1',
};

function cleanLegacyDemoPost(p: Post, fallbackId?: string): Post {
  const resolvedId =
    p.id || fallbackId || p.slug || `post-${Math.random().toString(36).slice(2, 9)}`;
  return {
    ...p,
    id: resolvedId,
    title: (p.title || '').replace(/\s*\(Demo Sample\)/gi, '').replace(/\s*\(Demo\)/gi, '').trim(),
    summary: (p.summary || '').replace(/^\[DEMO DATA\]\s*/i, '').trim(),
    content: (p.content || '').replace(/<div class="notice-info">.*?<\/div>\s*/gis, ''),
    seoTitle: p.seoTitle ? p.seoTitle.replace(/\s*\(Demo\)/gi, '').trim() : p.seoTitle,
    seoDescription: p.seoDescription ? p.seoDescription.replace(/\bsample\s+/gi, '') : p.seoDescription,
    isDemo: false,
  };
}

function normalizePosts(rawPosts: Post[]): Post[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const out: Post[] = [];
  rawPosts.forEach((raw, idx) => {
    const cleaned = cleanLegacyDemoPost(raw, raw.id || raw.slug || `post-${idx}`);
    let uniqueId = cleaned.id;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${uniqueId}-${idx}`;
    }
    if (cleaned.slug && seenSlugs.has(cleaned.slug) && seenIds.has(cleaned.id)) {
      return;
    }
    seenIds.add(uniqueId);
    if (cleaned.slug) seenSlugs.add(cleaned.slug);
    out.push({ ...cleaned, id: uniqueId });
  });
  return out;
}

function normalizeCategories(rawCats: CategoryItem[]): CategoryItem[] {
  const seenIds = new Set<string>();
  const seenTypeSlugs = new Set<string>();
  const out: CategoryItem[] = [];
  rawCats.forEach((c, idx) => {
    const resolvedId = c.id || `${c.type === 'section' ? 'sec' : 'dom'}-${c.slug || idx}`;
    const typeSlugKey = `${c.type}:${c.slug}`;
    if (seenTypeSlugs.has(typeSlugKey)) {
      return;
    }
    let uniqueId = resolvedId;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${uniqueId}-${idx}`;
    }
    seenIds.add(uniqueId);
    seenTypeSlugs.add(typeSlugKey);
    out.push({ ...c, id: uniqueId });
  });
  return out;
}

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPostsState] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategoriesState] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [settings, setSettingsState] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [media, setMediaState] = useState<MediaLibraryItem[]>(INITIAL_MEDIA);
  const [auditLogs, setAuditLogsState] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [revisions, setRevisionsState] = useState<RevisionRecord[]>(INITIAL_REVISIONS);
  const [contactMessages, setContactMessagesState] = useState<ContactSubmission[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);

  // Synchronous refs so bulk loops and rapid sequential actions never read stale closures
  const postsRef = useRef<Post[]>(INITIAL_POSTS);
  const categoriesRef = useRef<CategoryItem[]>(INITIAL_CATEGORIES);
  const settingsRef = useRef<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const mediaRef = useRef<MediaLibraryItem[]>(INITIAL_MEDIA);
  const auditLogsRef = useRef<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const revisionsRef = useRef<RevisionRecord[]>(INITIAL_REVISIONS);
  const contactMessagesRef = useRef<ContactSubmission[]>([]);

  const setPosts = useCallback((next: Post[]) => {
    const normalized = normalizePosts(next);
    postsRef.current = normalized;
    setPostsState(normalized);
  }, []);

  const setCategories = useCallback((next: CategoryItem[]) => {
    const normalized = normalizeCategories(next);
    categoriesRef.current = normalized;
    setCategoriesState(normalized);
  }, []);

  const setSettings = useCallback((next: SiteSettings) => {
    settingsRef.current = next;
    setSettingsState(next);
  }, []);

  const setMedia = useCallback((next: MediaLibraryItem[]) => {
    mediaRef.current = next;
    setMediaState(next);
  }, []);

  const setAuditLogs = useCallback((next: AuditLogRecord[]) => {
    auditLogsRef.current = next;
    setAuditLogsState(next);
  }, []);

  const setRevisions = useCallback((next: RevisionRecord[]) => {
    revisionsRef.current = next;
    setRevisionsState(next);
  }, []);

  const setContactMessages = useCallback((next: ContactSubmission[]) => {
    contactMessagesRef.current = next;
    setContactMessagesState(next);
  }, []);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEARCHES);
      return raw ? JSON.parse(raw) : ['SSC CGL 2026', 'Railway NTPC', 'IBPS PO Admit Card'];
    } catch {
      return ['SSC CGL 2026', 'Railway NTPC', 'IBPS PO Admit Card'];
    }
  });

  const { user: clerkUser, isLoaded: isClerkUserLoaded, isSignedIn } = useUser();
  const { isLoaded: isClerkAuthLoaded } = useAuth();
  const { signOut } = useClerk();

  const adminUser = React.useMemo<AdminUser | null>(() => {
    if (!isClerkUserLoaded || !isSignedIn || !clerkUser) {
      return null;
    }
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      '';
    const firstName = clerkUser.firstName || email.split('@')[0] || 'Admin';
    const lastName = clerkUser.lastName || '';
    const fullName =
      clerkUser.fullName ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      email ||
      'Admin';

    return {
      id: clerkUser.id,
      uid: clerkUser.id,
      appId: CLERK_APP_ID,
      email,
      firstName,
      lastName,
      fullName,
      name: fullName,
      imageUrl: clerkUser.imageUrl,
      authMode: 'clerk',
    };
  }, [isClerkUserLoaded, isSignedIn, clerkUser]);

  const [sessionToken, setSessionTokenState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CLERK_TOKEN) || '';
    } catch {
      return '';
    }
  });
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isDataLoading, setIsLoading] = useState<boolean>(true);
  const isLoading = isDataLoading || !isClerkUserLoaded || !isClerkAuthLoaded;
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setSessionToken = useCallback((token: string) => {
    setSessionTokenState(token);
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEYS.CLERK_TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CLERK_TOKEN);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load local cache immediately if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
          setPosts(parsed.posts);
        }
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          setCategories(parsed.categories);
        }
        if (parsed.settings) {
          setSettings(parsed.settings);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, [setPosts, setCategories, setSettings]);

  const persistCache = useCallback(
    (next: {
      posts?: Post[];
      categories?: CategoryItem[];
      settings?: SiteSettings;
    }) => {
      try {
        const current = {
          posts: next.posts ?? postsRef.current,
          categories: next.categories ?? categoriesRef.current,
          settings: next.settings ?? settingsRef.current,
        };
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(current));
      } catch {
        // ignore quota errors
      }
    },
    []
  );

  // Sync to Server API (/api/cms/sync)
  const syncToServer = useCallback(
    async (payload: {
      posts?: Post[];
      categories?: CategoryItem[];
      settings?: SiteSettings;
      media?: MediaLibraryItem[];
      auditLogs?: AuditLogRecord[];
      revisions?: RevisionRecord[];
      contactMessages?: ContactSubmission[];
    }) => {
      try {
        const storedToken =
          sessionToken ||
          (typeof localStorage !== 'undefined'
            ? localStorage.getItem(STORAGE_KEYS.CLERK_TOKEN) || ''
            : '');
        await fetch('/api/cms/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Server sync fallback handled gracefully
      }
    },
    [csrfToken, sessionToken]
  );

  // Fetch initial state from Clerk Session API, CMS Bootstrap & Firestore
  const refreshData = useCallback(async () => {
    setError(null);
    try {
      const storedToken =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(STORAGE_KEYS.CLERK_TOKEN) || ''
          : '';
      const authHeaders: Record<string, string> = storedToken
        ? { Authorization: `Bearer ${storedToken}` }
        : {};

      const [sessionRes, bootRes] = await Promise.all([
        fetch('/api/clerk/session', { headers: authHeaders }).catch(() => null),
        fetch('/api/cms/bootstrap', { headers: authHeaders }).catch(() => null),
      ]);

      let hasClerkSession = Boolean(adminUser);
      if (sessionRes && sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => null);
        if (sessionData && sessionData.authenticated && sessionData.user) {
          hasClerkSession = true;
          if (sessionData.csrfToken) {
            setCsrfToken(sessionData.csrfToken);
          }
        }
      }

      let bootPosts: Post[] = [];
      if (bootRes && bootRes.ok) {
        const bootData = await bootRes.json().catch(() => null);
        if (bootData) {
          if (Array.isArray(bootData.posts) && bootData.posts.length > 0) {
            bootPosts = bootData.posts.map(cleanLegacyDemoPost);
            setPosts(bootPosts);
            persistCache({ posts: bootPosts });
          }
          if (Array.isArray(bootData.categories) && bootData.categories.length > 0) {
            setCategories(bootData.categories);
          }
          if (bootData.settings) {
            setSettings(bootData.settings);
          }
          if (Array.isArray(bootData.analyticsEvents)) {
            setAnalyticsEvents(bootData.analyticsEvents);
          }
          if (hasClerkSession || bootData.isAdmin) {
            if (Array.isArray(bootData.media)) setMedia(bootData.media);
            if (Array.isArray(bootData.auditLogs)) setAuditLogs(bootData.auditLogs);
            if (Array.isArray(bootData.revisions)) setRevisions(bootData.revisions);
            if (Array.isArray(bootData.contactMessages))
              setContactMessages(bootData.contactMessages);
          }
        }
      }

      // Query Firestore for public/CMS data if online and merge with server bootstrap
      try {
        const postsCollection = collection(db, 'posts');
        const postsQuery = hasClerkSession
          ? postsCollection
          : query(postsCollection, where('status', '==', 'published'));

        const [postsSnap, catsSnap, settingsSnap] = await Promise.all([
          getDocs(postsQuery),
          getDocs(collection(db, 'categories')),
          getDoc(doc(db, 'settings', 'global')),
        ]);

        if (!postsSnap.empty && bootPosts.length === 0) {
          const fsPosts = postsSnap.docs
            .map((d) => {
              const raw = d.data() as Post;
              return cleanLegacyDemoPost({ ...raw, id: raw.id || d.id }, d.id);
            })
            .sort((a, b) =>
              (b.publishedAt || b.updatedAt || '').localeCompare(
                a.publishedAt || a.updatedAt || ''
              )
            );
          setPosts(fsPosts);
          persistCache({ posts: fsPosts });
        }

        if (!catsSnap.empty) {
          const fsCats = catsSnap.docs
            .map((d) => {
              const raw = d.data() as CategoryItem;
              return { ...raw, id: raw.id || d.id };
            })
            .sort((a, b) => a.order - b.order);
          setCategories(fsCats);
          persistCache({ categories: fsCats });
        }

        if (settingsSnap.exists()) {
          const fsSettings = settingsSnap.data() as SiteSettings;
          setSettings(fsSettings);
          persistCache({ settings: fsSettings });
        }
      } catch {
        // Firestore offline or restricted; server bootstrap + local seed keeps app running smoothly
      }
    } catch {
      setError('Unable to reach server. Displaying cached career updates.');
    } finally {
      setIsLoading(false);
    }
  }, [
    adminUser,
    persistCache,
    setPosts,
    setCategories,
    setSettings,
    setMedia,
    setAuditLogs,
    setRevisions,
    setContactMessages,
  ]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Bookmark & Search History helpers
  const toggleBookmark = useCallback(
    (postId: string) => {
      setBookmarks((prev) => {
        const exists = prev.includes(postId);
        const next = exists ? prev.filter((id) => id !== postId) : [postId, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(next));
        } catch {
          // ignore
        }
        showToast(
          exists ? 'Removed from Saved Updates' : 'Saved to your Bookmarks',
          exists ? 'info' : 'success'
        );
        return next;
      });
    },
    [showToast]
  );

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
    } catch {
      // ignore
    }
    showToast('Cleared all saved bookmarks', 'info');
  }, [showToast]);

  const addRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        6
      );
      try {
        localStorage.setItem(STORAGE_KEYS.SEARCHES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCHES);
    } catch {
      // ignore
    }
  }, []);

  // Analytics Event Tracker
  const trackEvent = useCallback(
    async (
      eventType: AnalyticsEventRecord['eventType'],
      target: string,
      category?: string
    ) => {
      const evt: AnalyticsEventRecord = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventType,
        target,
        category,
        createdAt: new Date().toISOString(),
      };
      setAnalyticsEvents((prev) => [evt, ...prev].slice(0, 500));
      try {
        await fetch('/api/public/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, target, category }),
        });
      } catch {
        // ignore offline analytics errors
      }
    },
    []
  );

  // Audit Log helper
  const appendAuditLog = useCallback(
    async (
      action: string,
      _entityType: string,
      _entityId: string,
      entityTitle: string,
      details?: string
    ) => {
      const log: AuditLogRecord = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminEmail: adminUser?.email || 'owner@careeralertindia.in',
        adminUid: adminUser?.uid || 'admin-owner',
        action,
        target: entityTitle,
        details: details || entityTitle,
        createdAt: new Date().toISOString(),
      };
      const nextLogs = [log, ...auditLogsRef.current].slice(0, 300);
      setAuditLogs(nextLogs);
      await syncToServer({ auditLogs: nextLogs });
    },
    [adminUser, setAuditLogs, syncToServer]
  );

  // Sync authenticated Clerk SDK user session with backend API
  useEffect(() => {
    try {
      localStorage.removeItem('cai_owner_user');
      localStorage.removeItem('cai_owner_session_token');
      localStorage.removeItem('cai_clerk_active_user_v1');
      localStorage.removeItem('cai_clerk_accounts_v1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isClerkUserLoaded) return;
    if (isSignedIn && adminUser) {
      fetch('/api/clerk/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          fullName: adminUser.fullName,
          imageUrl: adminUser.imageUrl,
        }),
      })
        .then((res) => res.json().catch(() => null))
        .then((data) => {
          if (data?.sessionToken) setSessionToken(data.sessionToken);
          if (data?.csrfToken) setCsrfToken(data.csrfToken);
          refreshData();
        })
        .catch(() => {});
    }
  }, [isClerkUserLoaded, isSignedIn, adminUser, refreshData, setSessionToken]);

  const logoutAdmin = useCallback(async () => {
    try {
      await fetch('/api/clerk/signout', {
        method: 'POST',
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      });
    } catch {
      // ignore
    }
    setSessionToken('');
    setCsrfToken('');
    try {
      await signOut({ redirectUrl: '/8233538355/login' });
    } catch {
      // ignore
    }
    showToast('Signed out successfully', 'info');
  }, [sessionToken, setSessionToken, signOut, showToast]);

  // Post CRUD + Revision + Sanitization + Unique Slug
  const savePost = useCallback(
    async (
      postInput: Partial<Post> & { title: string; category: Post['category'] },
      changeSummary = 'Updated post content and metadata'
    ): Promise<Post> => {
      const now = new Date().toISOString();
      const currentPosts = postsRef.current;
      const existingIndex = postInput.id
        ? currentPosts.findIndex((p) => p.id === postInput.id)
        : -1;
      const existing = existingIndex >= 0 ? currentPosts[existingIndex] : null;

      // Generate unique slug
      let baseSlug = generateSlug(postInput.slug || postInput.title);
      if (!baseSlug) baseSlug = `update-${Date.now()}`;
      let finalSlug = baseSlug;
      let counter = 2;
      while (
        currentPosts.some(
          (p) => p.slug === finalSlug && (!existing || p.id !== existing.id)
        )
      ) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Sanitize links & HTML content
      const cleanLinks = (postInput.importantLinks ?? existing?.importantLinks ?? [])
        .map((l) => ({
          ...l,
          label: l.label.trim(),
          url: sanitizeUrl(l.url),
        }))
        .filter((l) => l.label && l.url);

      const newStatus = postInput.status ?? existing?.status ?? 'published';

      const savedPost: Post = {
        id: existing?.id || postInput.id || `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: postInput.title.trim(),
        slug: finalSlug,
        category: postInput.category,
        subcategory: postInput.subcategory ?? existing?.subcategory ?? 'central-govt-jobs',
        state: postInput.state ?? existing?.state ?? 'All India',
        organization: (postInput.organization ?? existing?.organization ?? 'Government of India').trim(),
        summary: (postInput.summary ?? existing?.summary ?? '').trim(),
        content: sanitizeHtml(postInput.content ?? existing?.content ?? ''),
        featuredImage: postInput.featuredImage ?? existing?.featuredImage ?? '',
        featured: Boolean(postInput.featured ?? existing?.featured ?? false),
        status: newStatus,
        badge: postInput.badge ?? existing?.badge ?? 'NONE',
        isDemo: false,
        totalVacancies:
          typeof postInput.totalVacancies === 'number'
            ? postInput.totalVacancies
            : existing?.totalVacancies ?? 0,
        qualification: postInput.qualification ?? existing?.qualification ?? 'Graduate',
        jobType: postInput.jobType ?? existing?.jobType ?? 'Permanent Government Job',
        salary: postInput.salary ?? existing?.salary ?? '',
        location: postInput.location ?? existing?.location ?? 'All India',
        applicationStart: postInput.applicationStart ?? existing?.applicationStart ?? '',
        applicationEnd: postInput.applicationEnd ?? existing?.applicationEnd ?? '',
        examDate: postInput.examDate ?? existing?.examDate ?? '',
        admitCardDate: postInput.admitCardDate ?? existing?.admitCardDate ?? '',
        resultDate: postInput.resultDate ?? existing?.resultDate ?? '',
        resultStatus: postInput.resultStatus ?? existing?.resultStatus ?? 'none',
        answerKeyType: postInput.answerKeyType ?? existing?.answerKeyType ?? 'none',
        objectionDeadline: postInput.objectionDeadline ?? existing?.objectionDeadline ?? '',
        statusOverride: postInput.statusOverride ?? existing?.statusOverride ?? '',
        officialSourceUrl: sanitizeUrl(
          postInput.officialSourceUrl ?? existing?.officialSourceUrl ?? ''
        ),
        importantDates: postInput.importantDates ?? existing?.importantDates ?? [],
        fees: postInput.fees ?? existing?.fees ?? [],
        eligibility: postInput.eligibility ??
          existing?.eligibility ?? {
            education: '',
            ageMin: '',
            ageMax: '',
            ageRelaxation: '',
            nationality: 'Indian Citizen',
          },
        vacancies: postInput.vacancies ?? existing?.vacancies ?? [],
        selectionProcess: postInput.selectionProcess ?? existing?.selectionProcess ?? [],
        howToApply: postInput.howToApply ?? existing?.howToApply ?? [],
        importantLinks: cleanLinks,
        faqs: postInput.faqs ?? existing?.faqs ?? [],
        syllabusSections: postInput.syllabusSections ?? existing?.syllabusSections ?? [],
        tags: postInput.tags ?? existing?.tags ?? [],
        seoTitle: (postInput.seoTitle || postInput.title).trim(),
        seoDescription: (postInput.seoDescription || postInput.summary || '').trim(),
        canonicalUrl: postInput.canonicalUrl ?? existing?.canonicalUrl ?? '',
        ogImage: postInput.ogImage ?? existing?.ogImage ?? '',
        scheduledFor: postInput.scheduledFor ?? existing?.scheduledFor ?? '',
        publishedAt:
          newStatus === 'published'
            ? existing?.publishedAt || postInput.publishedAt || now
            : existing?.publishedAt || '',
        updatedAt: now,
        createdAt: existing?.createdAt || now,
        authorUid: adminUser?.uid || existing?.authorUid || 'admin-owner',
      };

      const nextPosts =
        existingIndex >= 0
          ? currentPosts.map((p, idx) => (idx === existingIndex ? savedPost : p))
          : [savedPost, ...currentPosts];

      setPosts(nextPosts);
      persistCache({ posts: nextPosts });

      try {
        await setDoc(doc(db, 'posts', savedPost.id), savedPost);
      } catch {
        // Firestore sync optional fallback
      }

      // Save revision snapshot
      const newRevision: RevisionRecord = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        postId: savedPost.id,
        postTitle: savedPost.title,
        snapshot: savedPost as unknown as Record<string, unknown>,
        changedBy: adminUser?.email || 'owner@careeralertindia.in',
        createdAt: now,
        changeSummary,
      };
      const nextRevisions = [newRevision, ...revisionsRef.current].slice(0, 200);
      setRevisions(nextRevisions);

      await syncToServer({ posts: nextPosts, revisions: nextRevisions });

      await appendAuditLog(
        existing ? (newStatus === 'published' ? 'publish' : 'update') : 'create',
        'post',
        savedPost.id,
        savedPost.title,
        changeSummary
      );

      showToast(
        existing ? `Updated "${savedPost.title}"` : `Created "${savedPost.title}"`,
        'success'
      );
      return savedPost;
    },
    [
      adminUser,
      appendAuditLog,
      persistCache,
      setPosts,
      setRevisions,
      showToast,
      syncToServer,
    ]
  );

  const duplicatePost = useCallback(
    async (postId: string): Promise<Post | null> => {
      const target = postsRef.current.find((p) => p.id === postId);
      if (!target) return null;
      const copy = await savePost(
        {
          ...target,
          id: undefined,
          title: `${target.title} (Copy)`,
          slug: `${target.slug}-copy`,
          status: 'draft',
          featured: false,
        },
        `Duplicated from ${target.title}`
      );
      return copy;
    },
    [savePost]
  );

  const deleteOrArchivePost = useCallback(
    async (postId: string, permanent = false) => {
      const currentPosts = postsRef.current;
      const target = currentPosts.find((p) => p.id === postId);
      if (!target) return;

      if (!permanent && target.status !== 'archived') {
        const archived: Post = {
          ...target,
          status: 'archived',
          updatedAt: new Date().toISOString(),
        };
        const nextPosts = currentPosts.map((p) => (p.id === postId ? archived : p));
        setPosts(nextPosts);
        persistCache({ posts: nextPosts });
        await syncToServer({ posts: nextPosts });
        await appendAuditLog('archive', 'post', postId, target.title, 'Moved post to archive');
        showToast(`Archived "${target.title}"`, 'info');
        return;
      }

      const nextPosts = currentPosts.filter((p) => p.id !== postId);
      setPosts(nextPosts);
      persistCache({ posts: nextPosts });
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch {
        // ignore if Firestore restricted
      }
      await syncToServer({ posts: nextPosts });
      await appendAuditLog('delete', 'post', postId, target.title, 'Permanently deleted post');
      showToast(`Deleted "${target.title}"`, 'info');
    },
    [appendAuditLog, persistCache, setPosts, showToast, syncToServer]
  );

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      const rev = revisionsRef.current.find((r) => r.id === revisionId);
      if (!rev) return;
      try {
        const snapshot = rev.snapshot as unknown as Post;
        await savePost(
          {
            ...snapshot,
            updatedAt: new Date().toISOString(),
          },
          `Restored revision from ${new Date(rev.createdAt).toLocaleString('en-IN')}`
        );
        showToast(`Restored revision for "${snapshot.title}"`, 'success');
      } catch {
        showToast('Failed to parse revision snapshot', 'error');
      }
    },
    [savePost, showToast]
  );

  // Category CRUD & Reordering
  const saveCategory = useCallback(
    async (catInput: Partial<CategoryItem> & { name: string; type: CategoryItem['type'] }) => {
      const now = new Date().toISOString();
      const currentCategories = categoriesRef.current;
      const existingIndex = catInput.id
        ? currentCategories.findIndex((c) => c.id === catInput.id)
        : -1;
      const existing = existingIndex >= 0 ? currentCategories[existingIndex] : null;

      const slug = generateSlug(catInput.slug || catInput.name);
      const savedCat: CategoryItem = {
        id: existing?.id || catInput.id || `cat-${Date.now()}`,
        name: catInput.name.trim(),
        slug,
        type: catInput.type,
        description: (catInput.description ?? existing?.description ?? '').trim(),
        order:
          typeof catInput.order === 'number'
            ? catInput.order
            : existing?.order ?? currentCategories.length + 1,
        enabled: catInput.enabled ?? existing?.enabled ?? true,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      const nextCats =
        existingIndex >= 0
          ? currentCategories.map((c, idx) => (idx === existingIndex ? savedCat : c))
          : [...currentCategories, savedCat];

      setCategories(nextCats);
      persistCache({ categories: nextCats });
      await syncToServer({ categories: nextCats });

      await appendAuditLog(
        existing ? 'update' : 'create',
        'category',
        savedCat.id,
        savedCat.name,
        `Saved ${savedCat.type} category`
      );
      showToast(`Saved category "${savedCat.name}"`, 'success');
    },
    [appendAuditLog, persistCache, setCategories, showToast, syncToServer]
  );

  const reorderCategory = useCallback(
    async (categoryId: string, direction: 'up' | 'down') => {
      const sorted = [...categoriesRef.current].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((c) => c.id === categoryId);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const tempOrder = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
      sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };

      const nextCats = sorted.sort((a, b) => a.order - b.order);
      setCategories(nextCats);
      persistCache({ categories: nextCats });
      await syncToServer({ categories: nextCats });
    },
    [persistCache, setCategories, syncToServer]
  );

  const deleteCategory = useCallback(
    async (
      categoryId: string,
      reassignToSlug?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const currentCategories = categoriesRef.current;
      const currentPosts = postsRef.current;
      const target = currentCategories.find((c) => c.id === categoryId);
      if (!target) return { ok: false, error: 'Category not found.' };

      const dependentPosts = currentPosts.filter(
        (p) => p.category === target.slug || p.subcategory === target.slug
      );

      if (dependentPosts.length > 0 && !reassignToSlug) {
        return {
          ok: false,
          error: `Cannot delete "${target.name}" because ${dependentPosts.length} posts use it. Please select a reassignment category first.`,
        };
      }

      let nextPosts = currentPosts;
      if (dependentPosts.length > 0 && reassignToSlug) {
        nextPosts = currentPosts.map((p) => {
          if (target.type === 'section' && p.category === target.slug) {
            return { ...p, category: reassignToSlug as Post['category'] };
          }
          if (target.type === 'domain' && p.subcategory === target.slug) {
            return { ...p, subcategory: reassignToSlug };
          }
          return p;
        });
        setPosts(nextPosts);
        persistCache({ posts: nextPosts });
      }

      const nextCats = currentCategories.filter((c) => c.id !== categoryId);
      setCategories(nextCats);
      persistCache({ categories: nextCats });
      await syncToServer({ categories: nextCats, posts: nextPosts });

      await appendAuditLog('delete', 'category', categoryId, target.name, 'Deleted category');
      showToast(`Deleted category "${target.name}"`, 'info');
      return { ok: true };
    },
    [appendAuditLog, persistCache, setCategories, setPosts, showToast, syncToServer]
  );

  // Media Library Validation, Upload & In-Use Protection
  const uploadMediaItem = useCallback(
    async (item: {
      name: string;
      url: string;
      mimeType: MediaLibraryItem['mimeType'];
      sizeBytes: number;
      altText: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
      ];
      if (!allowedTypes.includes(item.mimeType)) {
        return {
          ok: false,
          error: 'Invalid file type. Allowed: JPG, PNG, WebP, SVG, and PDF.',
        };
      }
      const maxBytes = item.mimeType === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (item.sizeBytes > maxBytes) {
        return {
          ok: false,
          error: `File size exceeds maximum limit (${
            item.mimeType === 'application/pdf' ? '10MB' : '5MB'
          }).`,
        };
      }

      const newMedia: MediaLibraryItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: item.name.trim(),
        url: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        altText: item.altText.trim() || item.name.trim(),
        createdAt: new Date().toISOString(),
        uploadedBy: adminUser?.email || 'owner@careeralertindia.in',
      };

      const nextMedia = [newMedia, ...mediaRef.current];
      setMedia(nextMedia);
      await syncToServer({ media: nextMedia });

      await appendAuditLog('create', 'media', newMedia.id, newMedia.name, 'Uploaded media asset');
      showToast(`Uploaded "${newMedia.name}" to Media Library`, 'success');
      return { ok: true };
    },
    [adminUser, appendAuditLog, setMedia, showToast, syncToServer]
  );

  const deleteMediaItem = useCallback(
    async (mediaId: string): Promise<{ ok: boolean; error?: string }> => {
      const currentMedia = mediaRef.current;
      const currentPosts = postsRef.current;
      const target = currentMedia.find((m) => m.id === mediaId);
      if (!target) return { ok: false, error: 'Media asset not found.' };

      const usedByPost = currentPosts.find(
        (p) =>
          p.featuredImage === target.url ||
          p.ogImage === target.url ||
          (p.importantLinks || []).some((l) => l.url === target.url)
      );

      if (usedByPost) {
        return {
          ok: false,
          error: `Cannot delete "${target.name}" because it is currently used in "${usedByPost.title}".`,
        };
      }

      const nextMedia = currentMedia.filter((m) => m.id !== mediaId);
      setMedia(nextMedia);
      await syncToServer({ media: nextMedia });

      await appendAuditLog('delete', 'media', mediaId, target.name, 'Deleted media asset');
      showToast(`Deleted "${target.name}"`, 'info');
      return { ok: true };
    },
    [appendAuditLog, setMedia, showToast, syncToServer]
  );

  // Site Settings
  const updateSiteSettings = useCallback(
    async (newSettings: Partial<SiteSettings>) => {
      const updated: SiteSettings = {
        ...settingsRef.current,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      setSettings(updated);
      persistCache({ settings: updated });
      await syncToServer({ settings: updated });

      await appendAuditLog(
        'settings_update',
        'settings',
        'global',
        updated.siteName,
        'Updated global site & brand settings'
      );
      showToast('Site & Brand Settings updated', 'success');
    },
    [appendAuditLog, persistCache, setSettings, showToast, syncToServer]
  );

  // Contact Form Submission
  const submitContactMessage = useCallback(
    async (payload: {
      name: string;
      email: string;
      subject: string;
      message: string;
      website_hp?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/public/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Failed to submit message.' };
        }

        const msg: ContactSubmission = {
          id: `msg-${Date.now()}`,
          name: payload.name.trim(),
          email: payload.email.trim(),
          subject: payload.subject.trim(),
          message: payload.message.trim(),
          status: 'unread',
          createdAt: new Date().toISOString(),
        };
        const nextMessages = [msg, ...contactMessagesRef.current];
        setContactMessages(nextMessages);

        try {
          await setDoc(doc(db, 'contact_messages', msg.id), msg);
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.CREATE, `contact_messages/${msg.id}`);
          } catch {
            // ignore if offline
          }
        }

        return { ok: true };
      } catch {
        return { ok: false, error: 'Unable to send message right now. Please try again.' };
      }
    },
    [setContactMessages]
  );

  const updateContactMessageStatus = useCallback(
    async (msgId: string, status: ContactSubmission['status']) => {
      const next = contactMessagesRef.current.map((m) =>
        m.id === msgId ? { ...m, status } : m
      );
      setContactMessages(next);
      await syncToServer({ contactMessages: next });
      showToast(`Marked message as ${status}`, 'info');
    },
    [setContactMessages, showToast, syncToServer]
  );

  const deleteContactMessage = useCallback(
    async (msgId: string) => {
      const target = contactMessagesRef.current.find((m) => m.id === msgId);
      const next = contactMessagesRef.current.filter((m) => m.id !== msgId);
      setContactMessages(next);
      await syncToServer({ contactMessages: next });
      if (target) {
        await appendAuditLog(
          'delete',
          'contact',
          msgId,
          target.subject || target.name,
          `Deleted inquiry from ${target.email}`
        );
      }
      showToast('Deleted contact message', 'info');
    },
    [appendAuditLog, setContactMessages, showToast, syncToServer]
  );

  // Content Management Utilities
  const purgeDemoContent = useCallback(async (): Promise<number> => {
    const currentPosts = postsRef.current;
    const demoPosts = currentPosts.filter((p) => p.isDemo);
    const nextPosts = currentPosts.filter((p) => !p.isDemo);
    setPosts(nextPosts);
    persistCache({ posts: nextPosts });
    await syncToServer({ posts: nextPosts });

    await appendAuditLog(
      'delete',
      'post',
      'batch-purge',
      'Batch Purge',
      `Purged ${demoPosts.length} tagged posts`
    );
    showToast(`Removed ${demoPosts.length} tagged posts`, 'success');
    return demoPosts.length;
  }, [appendAuditLog, persistCache, setPosts, showToast, syncToServer]);

  const restoreDemoContent = useCallback(async () => {
    const currentPosts = postsRef.current;
    const existingIds = new Set(currentPosts.map((p) => p.id));
    const missing = INITIAL_POSTS.filter((p) => !existingIds.has(p.id));
    const nextPosts = [...missing, ...currentPosts];
    setPosts(nextPosts);
    persistCache({ posts: nextPosts });
    await syncToServer({ posts: nextPosts });

    await appendAuditLog(
      'create',
      'post',
      'restore-defaults',
      'Restore Default Posts',
      `Restored ${missing.length} default posts`
    );
    showToast(`Restored ${missing.length} default posts`, 'success');
  }, [appendAuditLog, persistCache, setPosts, showToast, syncToServer]);

  // Published posts computed list (auto-publishes scheduled posts whose time has arrived)
  const publishedPosts = React.useMemo(() => {
    const now = new Date().toISOString();
    return posts
      .filter(
        (p) =>
          p.status === 'published' ||
          (p.status === 'scheduled' && p.scheduledFor && p.scheduledFor <= now)
      )
      .sort((a, b) =>
        (b.publishedAt || b.updatedAt || '').localeCompare(a.publishedAt || a.updatedAt || '')
      );
  }, [posts]);

  return (
    <CMSContext.Provider
      value={{
        posts,
        publishedPosts,
        categories,
        settings,
        media,
        auditLogs,
        revisions,
        contactMessages,
        analyticsEvents,
        bookmarks,
        recentSearches,
        adminUser,
        isLoading,
        error,
        toasts,
        showToast,
        dismissToast,
        toggleBookmark,
        clearBookmarks,
        addRecentSearch,
        clearRecentSearches,
        trackEvent,
        logoutAdmin,
        savePost,
        duplicatePost,
        deleteOrArchivePost,
        restoreRevision,
        saveCategory,
        reorderCategory,
        deleteCategory,
        uploadMediaItem,
        deleteMediaItem,
        updateSiteSettings,
        submitContactMessage,
        updateContactMessageStatus,
        deleteContactMessage,
        purgeDemoContent,
        restoreDemoContent,
        refreshData,
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

export function useCMS(): CMSContextValue {
  const ctx = useContext(CMSContext);
  if (!ctx) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return ctx;
}
