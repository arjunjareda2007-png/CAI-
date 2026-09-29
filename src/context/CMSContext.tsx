import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  db,
  auth,
  googleProvider,
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

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AdminUser {
  uid: string;
  email: string;
  authMode: 'server-cookie' | 'firebase-oauth';
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
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  trackEvent: (
    eventType: AnalyticsEventRecord['eventType'],
    target: string,
    category?: string
  ) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
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
  purgeDemoContent: () => Promise<number>;
  restoreDemoContent: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const CMSContext = createContext<CMSContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  BOOKMARKS: 'cai_saved_bookmarks_v2',
  SEARCHES: 'cai_recent_searches_v2',
  CACHE: 'cai_cms_cache_v3',
};

function cleanLegacyDemoPost(p: Post): Post {
  return {
    ...p,
    title: (p.title || '').replace(/\s*\(Demo Sample\)/gi, '').replace(/\s*\(Demo\)/gi, '').trim(),
    summary: (p.summary || '').replace(/^\[DEMO DATA\]\s*/i, '').trim(),
    content: (p.content || '').replace(/<div class="notice-info">.*?<\/div>\s*/gis, ''),
    seoTitle: p.seoTitle ? p.seoTitle.replace(/\s*\(Demo\)/gi, '').trim() : p.seoTitle,
    seoDescription: p.seoDescription ? p.seoDescription.replace(/\bsample\s+/gi, '') : p.seoDescription,
    isDemo: false,
  };
}

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [media, setMedia] = useState<MediaLibraryItem[]>(INITIAL_MEDIA);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [revisions, setRevisions] = useState<RevisionRecord[]>(INITIAL_REVISIONS);
  const [contactMessages, setContactMessages] = useState<ContactSubmission[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);

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

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
        if (Array.isArray(parsed.posts) && parsed.posts.length > 0) setPosts(parsed.posts);
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0)
          setCategories(parsed.categories);
        if (parsed.settings) setSettings(parsed.settings);
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  const persistCache = useCallback(
    (next: {
      posts?: Post[];
      categories?: CategoryItem[];
      settings?: SiteSettings;
    }) => {
      try {
        const current = {
          posts: next.posts ?? posts,
          categories: next.categories ?? categories,
          settings: next.settings ?? settings,
        };
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(current));
      } catch {
        // ignore quota errors
      }
    },
    [posts, categories, settings]
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
        await fetch('/api/cms/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Server sync fallback handled gracefully
      }
    },
    [csrfToken]
  );

  // Fetch initial state from Server API & Firestore
  const refreshData = useCallback(async () => {
    setError(null);
    try {
      // 1. Check server session & bootstrap data
      const [sessionRes, bootRes] = await Promise.all([
        fetch('/api/admin/auth/session').catch(() => null),
        fetch('/api/cms/bootstrap').catch(() => null),
      ]);

      let hasServerSession = false;
      if (sessionRes && sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.authenticated && sessionData.admin) {
          hasServerSession = true;
          setAdminUser({
            uid: sessionData.admin.uid,
            email: sessionData.admin.email,
            authMode: 'server-cookie',
          });
          setCsrfToken(sessionData.csrfToken || '');
        }
      }

      if (bootRes && bootRes.ok) {
        const bootData = await bootRes.json();
        if (Array.isArray(bootData.posts) && bootData.posts.length > 0) {
          setPosts(bootData.posts.map(cleanLegacyDemoPost));
        }
        if (Array.isArray(bootData.categories) && bootData.categories.length > 0) {
          setCategories(bootData.categories);
        }
        if (bootData.settings) {
          setSettings(bootData.settings);
        }
        if (hasServerSession) {
          if (Array.isArray(bootData.media)) setMedia(bootData.media);
          if (Array.isArray(bootData.auditLogs)) setAuditLogs(bootData.auditLogs);
          if (Array.isArray(bootData.revisions)) setRevisions(bootData.revisions);
          if (Array.isArray(bootData.contactMessages))
            setContactMessages(bootData.contactMessages);
          if (Array.isArray(bootData.analyticsEvents))
            setAnalyticsEvents(bootData.analyticsEvents);
        }
      }

      // 2. Also query Firestore for published posts & global settings
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('status', '==', 'published')
        );
        const snap = await getDocs(postsQuery);
        if (!snap.empty) {
          const fsPosts = snap.docs.map((d) =>
            cleanLegacyDemoPost({
              ...(d.data() as Post),
              id: d.id,
            })
          );
          setPosts((prev) => {
            const byId = new Map<string, Post>();
            prev.forEach((p) => byId.set(p.id, cleanLegacyDemoPost(p)));
            fsPosts.forEach((p) => byId.set(p.id, cleanLegacyDemoPost(p)));
            return Array.from(byId.values()).sort(
              (a, b) =>
                new Date(b.updatedAt || b.createdAt).getTime() -
                new Date(a.updatedAt || a.createdAt).getTime()
            );
          });
        }
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SiteSettings);
        }
      } catch {
        // Firestore query optional fallback if empty or offline
      }
    } catch (err: any) {
      console.error('Error refreshing CMS data:', err);
      setError('We could not refresh the latest updates right now. Showing cached updates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Listen to Firebase Auth state for verified Google Admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email?.toLowerCase() === 'arjunjareda2007@gmail.com' && user.emailVerified) {
        setAdminUser({
          uid: user.uid,
          email: user.email,
          authMode: 'firebase-oauth',
        });
        // Sync with server session cookie as well
        try {
          const res = await fetch('/api/admin/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.csrfToken) setCsrfToken(data.csrfToken);
          }
        } catch {
          // ignore
        }

        // Seed Firestore if empty and admin is logged in via Firebase
        try {
          const snap = await getDocs(
            query(collection(db, 'posts'), where('status', '==', 'published'))
          );
          if (snap.empty) {
            for (const post of INITIAL_POSTS) {
              await setDoc(doc(db, 'posts', post.id), sanitizeFirestorePostPayload(post));
            }
            for (const cat of INITIAL_CATEGORIES) {
              const { id: _catId, ...catData } = cat;
              await setDoc(doc(db, 'categories', cat.id), catData);
            }
            await setDoc(doc(db, 'settings', 'global'), DEFAULT_SITE_SETTINGS);
          }
        } catch {
          // Non-fatal fallback if Firestore rules are still propagating
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Scheduled Posts Auto-Publish Check
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPosts((prev) => {
        let changed = false;
        const updated = prev.map((p) => {
          if (
            p.status === 'scheduled' &&
            p.scheduledFor &&
            new Date(p.scheduledFor).getTime() <= now
          ) {
            changed = true;
            return {
              ...p,
              status: 'published' as const,
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
        if (changed) {
          syncToServer({ posts: updated });
        }
        return changed ? updated : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [syncToServer]);

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
          exists ? 'Removed from your saved updates.' : 'Saved to your bookmarked updates.',
          'info'
        );
        return next;
      });
    },
    [showToast]
  );

  const addRecentSearch = useCallback((term: string) => {
    const clean = term.trim().slice(0, 80);
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
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

  const trackEvent = useCallback(
    async (
      eventType: AnalyticsEventRecord['eventType'],
      target: string,
      category?: string
    ) => {
      const cleanTarget = target.trim().slice(0, 250);
      if (!cleanTarget) return;
      const newEvent: AnalyticsEventRecord = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventType,
        target: cleanTarget,
        ...(category ? { category: category.slice(0, 100) } : {}),
        createdAt: new Date().toISOString(),
      };
      setAnalyticsEvents((prev) => [newEvent, ...prev].slice(0, 500));

      fetch('/api/public/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, target: cleanTarget, category }),
      }).catch(() => {});

      try {
        await setDoc(doc(db, 'analyticsEvents', newEvent.id), {
          eventType: newEvent.eventType,
          target: newEvent.target,
          ...(newEvent.category ? { category: newEvent.category } : {}),
          createdAt: newEvent.createdAt,
        });
      } catch {
        // Ignore telemetry write error if offline
      }
    },
    []
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.authenticated) {
          return { ok: false, error: data.error || 'Invalid credentials.' };
        }
        setAdminUser({
          uid: data.admin.uid,
          email: data.admin.email,
          authMode: 'server-cookie',
        });
        setCsrfToken(data.csrfToken || '');
        await refreshData();
        showToast('Signed in to Career Alert India Admin CMS.', 'success');
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Authentication request failed.' };
      }
    },
    [refreshData, showToast]
  );

  const loginWithGoogle = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (user.email?.toLowerCase() !== 'arjunjareda2007@gmail.com') {
        await signOut(auth);
        return {
          ok: false,
          error: `Account ${user.email} is not authorized as an administrator.`,
        };
      }
      setAdminUser({
        uid: user.uid,
        email: user.email,
        authMode: 'firebase-oauth',
      });
      await fetch('/api/admin/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email }),
      });
      await refreshData();
      showToast('Signed in with Google Admin account.', 'success');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Google Sign-In failed or was cancelled.' };
    }
  }, [refreshData, showToast]);

  const logoutAdmin = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAdminUser(null);
    setCsrfToken('');
    showToast('Logged out of Admin CMS.', 'info');
  }, [showToast]);

  const recordAudit = useCallback(
    async (action: string, target: string, details?: string) => {
      const log: AuditLogRecord = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminEmail: adminUser?.email || 'admin@careeralertindia.in',
        adminUid: adminUser?.uid || 'admin-server-uid',
        action: action.slice(0, 80),
        target: target.slice(0, 250),
        ...(details ? { details: details.slice(0, 500) } : {}),
        createdAt: new Date().toISOString(),
      };
      setAuditLogs((prev) => [log, ...prev]);
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'auditLogs', log.id), {
            adminEmail: log.adminEmail,
            adminUid: log.adminUid,
            action: log.action,
            target: log.target,
            ...(log.details ? { details: log.details } : {}),
            createdAt: log.createdAt,
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `auditLogs/${log.id}`);
        }
      }
      return log;
    },
    [adminUser]
  );

  const savePost = useCallback(
    async (
      postInput: Partial<Post> & { title: string; category: Post['category'] },
      changeSummary = 'Updated post content and metadata'
    ): Promise<Post> => {
      const nowIso = new Date().toISOString();
      const existingPost = postInput.id ? posts.find((p) => p.id === postInput.id) : undefined;
      const cleanSlug =
        generateSlug(postInput.slug || postInput.title) || `update-${Date.now()}`;
      const id = existingPost?.id || postInput.id || cleanSlug;

      const sanitizedPost: Post = {
        id,
        title: postInput.title.trim().slice(0, 250),
        slug: cleanSlug,
        category: postInput.category,
        subcategory: (postInput.subcategory || '').trim().slice(0, 120),
        organization: (postInput.organization || 'Other').trim().slice(0, 120),
        state: (postInput.state || 'All India').trim().slice(0, 80),
        summary: (postInput.summary || postInput.title).trim().slice(0, 1000),
        content: sanitizeHtml(postInput.content || ''),
        status: postInput.status || 'draft',
        badge: postInput.badge || 'NONE',
        featured: Boolean(postInput.featured),
        isDemo: Boolean(postInput.isDemo),
        featuredImage: sanitizeUrl(postInput.featuredImage),
        qualification: (postInput.qualification || '').trim().slice(0, 150),
        jobType: (postInput.jobType || '').trim().slice(0, 100),
        totalVacancies: Number(postInput.totalVacancies) || 0,
        location: (postInput.location || 'All India').trim().slice(0, 150),
        salary: (postInput.salary || '').trim().slice(0, 300),
        applicationStart: (postInput.applicationStart || '').trim().slice(0, 40),
        applicationEnd: (postInput.applicationEnd || '').trim().slice(0, 40),
        examDate: (postInput.examDate || '').trim().slice(0, 80),
        admitCardDate: (postInput.admitCardDate || '').trim().slice(0, 80),
        resultDate: (postInput.resultDate || '').trim().slice(0, 80),
        resultStatus: postInput.resultStatus || 'none',
        answerKeyType: postInput.answerKeyType || 'none',
        objectionDeadline: (postInput.objectionDeadline || '').trim().slice(0, 80),
        officialSourceUrl: sanitizeUrl(postInput.officialSourceUrl),
        statusOverride: (postInput.statusOverride || '').trim().slice(0, 80),
        importantDates: (postInput.importantDates || []).slice(0, 20),
        vacancies: (postInput.vacancies || []).slice(0, 30),
        eligibility: postInput.eligibility || {
          education: '',
          ageMin: '',
          ageMax: '',
          ageRelaxation: '',
          nationality: 'Citizen of India',
        },
        fees: (postInput.fees || []).slice(0, 15),
        selectionProcess: (postInput.selectionProcess || []).slice(0, 15),
        howToApply: (postInput.howToApply || []).slice(0, 15),
        importantLinks: (postInput.importantLinks || [])
          .map((l) => ({
            ...l,
            url: sanitizeUrl(l.url),
          }))
          .filter((l) => l.label.trim().length > 0 && l.url.length > 0)
          .slice(0, 15),
        faqs: (postInput.faqs || []).slice(0, 15),
        syllabusSections: (postInput.syllabusSections || []).slice(0, 20),
        seoTitle: (postInput.seoTitle || postInput.title).trim().slice(0, 160),
        seoDescription: (postInput.seoDescription || postInput.summary || '')
          .trim()
          .slice(0, 320),
        canonicalUrl: sanitizeUrl(postInput.canonicalUrl),
        ogImage: sanitizeUrl(postInput.ogImage),
        tags: (postInput.tags || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 15),
        authorUid: existingPost?.authorUid || adminUser?.uid || 'admin-server-uid',
        scheduledFor: (postInput.scheduledFor || '').trim().slice(0, 50),
        publishedAt:
          postInput.status === 'published'
            ? existingPost?.publishedAt || nowIso
            : existingPost?.publishedAt || '',
        createdAt: existingPost?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const nextPosts = existingPost
        ? posts.map((p) => (p.id === id ? sanitizedPost : p))
        : [sanitizedPost, ...posts];

      // Create Revision Record
      const revRecord: RevisionRecord = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        postId: id,
        postTitle: sanitizedPost.title,
        changedBy: adminUser?.email || 'admin@careeralertindia.in',
        changeSummary: existingPost ? changeSummary : 'Created post record',
        snapshot: {
          title: sanitizedPost.title,
          slug: sanitizedPost.slug,
          category: sanitizedPost.category,
          organization: sanitizedPost.organization,
          summary: sanitizedPost.summary,
          content: sanitizedPost.content,
          status: sanitizedPost.status,
          applicationEnd: sanitizedPost.applicationEnd,
          examDate: sanitizedPost.examDate,
          totalVacancies: sanitizedPost.totalVacancies,
          importantDates: sanitizedPost.importantDates,
          importantLinks: sanitizedPost.importantLinks,
        },
        createdAt: nowIso,
      };

      const nextRevisions = [revRecord, ...revisions];
      const auditAction = !existingPost
        ? `Created (${sanitizedPost.status})`
        : sanitizedPost.status === 'published' && existingPost.status !== 'published'
        ? 'Published Post'
        : 'Edited Post';

      const newLog = await recordAudit(auditAction, sanitizedPost.title, changeSummary);
      const nextLogs = [newLog, ...auditLogs];

      setPosts(nextPosts);
      setRevisions(nextRevisions);
      persistCache({ posts: nextPosts });

      await syncToServer({
        posts: nextPosts,
        revisions: nextRevisions,
        auditLogs: nextLogs,
      });

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'posts', id), sanitizeFirestorePostPayload(sanitizedPost));
          await setDoc(doc(db, 'revisions', revRecord.id), {
            postId: revRecord.postId,
            postTitle: revRecord.postTitle,
            changedBy: revRecord.changedBy,
            changeSummary: revRecord.changeSummary,
            snapshot: revRecord.snapshot,
            createdAt: revRecord.createdAt,
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `posts/${id}`);
        }
      }

      showToast(
        sanitizedPost.status === 'published'
          ? 'Update published live and timestamp updated.'
          : `Saved as ${sanitizedPost.status}.`,
        'success'
      );
      return sanitizedPost;
    },
    [posts, revisions, auditLogs, adminUser, recordAudit, persistCache, syncToServer, showToast]
  );

  const duplicatePost = useCallback(
    async (postId: string): Promise<Post | null> => {
      const source = posts.find((p) => p.id === postId);
      if (!source) return null;
      const suffix = Math.random().toString(36).slice(2, 6);
      const newSlug = `${source.slug}-copy-${suffix}`.slice(0, 140);
      const newPost = await savePost(
        {
          ...source,
          id: newSlug,
          title: `${source.title} (Copy)`.slice(0, 250),
          slug: newSlug,
          status: 'draft',
          featured: false,
          publishedAt: '',
        },
        `Duplicated from ${source.slug}`
      );
      showToast('Created safe draft duplicate.', 'success');
      return newPost;
    },
    [posts, savePost, showToast]
  );

  const deleteOrArchivePost = useCallback(
    async (postId: string, permanent = false) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;

      if (!permanent && target.status !== 'archived') {
        await savePost({ ...target, status: 'archived' }, 'Moved post to Archive');
        showToast('Post archived safely.', 'info');
        return;
      }

      const nextPosts = posts.filter((p) => p.id !== postId);
      setPosts(nextPosts);
      persistCache({ posts: nextPosts });
      const log = await recordAudit('Deleted Post Permanently', target.title);
      await syncToServer({ posts: nextPosts, auditLogs: [log, ...auditLogs] });

      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'posts', postId));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `posts/${postId}`);
        }
      }
      showToast('Post permanently deleted.', 'info');
    },
    [posts, auditLogs, savePost, persistCache, recordAudit, syncToServer, showToast]
  );

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      const rev = revisions.find((r) => r.id === revisionId);
      if (!rev) return;
      const target = posts.find((p) => p.id === rev.postId);
      if (!target) {
        showToast('Original post record not found.', 'error');
        return;
      }
      const snap = rev.snapshot as Partial<Post>;
      await savePost(
        {
          ...target,
          ...snap,
          id: target.id,
          title: snap.title || target.title,
          category: (snap.category as Post['category']) || target.category,
        },
        `Restored revision from ${new Date(rev.createdAt).toLocaleString('en-IN')}`
      );
      showToast('Revision restored successfully.', 'success');
    },
    [revisions, posts, savePost, showToast]
  );

  const saveCategory = useCallback(
    async (catInput: Partial<CategoryItem> & { name: string; type: CategoryItem['type'] }) => {
      const nowIso = new Date().toISOString();
      const existing = catInput.id ? categories.find((c) => c.id === catInput.id) : undefined;
      const slug = generateSlug(catInput.slug || catInput.name);
      const id = existing?.id || catInput.id || `cat-${slug}-${Date.now().toString(36)}`;

      const item: CategoryItem = {
        id,
        name: catInput.name.trim().slice(0, 80),
        slug,
        description: (catInput.description || '').trim().slice(0, 300),
        type: catInput.type,
        order: existing?.order ?? catInput.order ?? categories.length + 1,
        enabled: catInput.enabled ?? true,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const nextCategories = existing
        ? categories.map((c) => (c.id === id ? item : c))
        : [...categories, item];

      setCategories(nextCategories);
      persistCache({ categories: nextCategories });
      const log = await recordAudit(
        existing ? 'Updated Category' : 'Created Category',
        item.name
      );
      await syncToServer({ categories: nextCategories, auditLogs: [log, ...auditLogs] });

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'categories', id), item);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `categories/${id}`);
        }
      }
      showToast(`Category "${item.name}" saved.`, 'success');
    },
    [categories, auditLogs, persistCache, recordAudit, syncToServer, showToast]
  );

  const reorderCategory = useCallback(
    async (categoryId: string, direction: 'up' | 'down') => {
      const target = categories.find((c) => c.id === categoryId);
      if (!target) return;
      const sameType = categories
        .filter((c) => c.type === target.type)
        .sort((a, b) => a.order - b.order);
      const idx = sameType.findIndex((c) => c.id === categoryId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sameType.length) return;

      const neighbor = sameType[swapIdx];
      const nextCategories = categories.map((c) => {
        if (c.id === target.id) return { ...c, order: neighbor.order };
        if (c.id === neighbor.id) return { ...c, order: target.order };
        return c;
      });
      setCategories(nextCategories);
      await syncToServer({ categories: nextCategories });
    },
    [categories, syncToServer]
  );

  const deleteCategory = useCallback(
    async (
      categoryId: string,
      reassignToSlug?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const target = categories.find((c) => c.id === categoryId);
      if (!target) return { ok: false, error: 'Category not found.' };

      const dependentPosts = posts.filter(
        (p) =>
          p.category === target.slug ||
          p.organization.toLowerCase() === target.name.toLowerCase()
      );

      if (dependentPosts.length > 0 && !reassignToSlug) {
        return {
          ok: false,
          error: `${dependentPosts.length} post(s) currently depend on "${target.name}". Please select a reassignment category first.`,
        };
      }

      let nextPosts = posts;
      if (dependentPosts.length > 0 && reassignToSlug) {
        const replacement = categories.find((c) => c.slug === reassignToSlug);
        nextPosts = posts.map((p) => {
          if (target.type === 'section' && p.category === target.slug) {
            return { ...p, category: reassignToSlug as Post['category'] };
          }
          if (
            target.type === 'domain' &&
            p.organization.toLowerCase() === target.name.toLowerCase()
          ) {
            return { ...p, organization: replacement?.name || 'Other' };
          }
          return p;
        });
        setPosts(nextPosts);
      }

      const nextCategories = categories.filter((c) => c.id !== categoryId);
      setCategories(nextCategories);
      const log = await recordAudit('Deleted Category', target.name);
      await syncToServer({
        posts: nextPosts,
        categories: nextCategories,
        auditLogs: [log, ...auditLogs],
      });

      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'categories', categoryId));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `categories/${categoryId}`);
        }
      }
      showToast(`Category "${target.name}" removed.`, 'info');
      return { ok: true };
    },
    [categories, posts, auditLogs, recordAudit, syncToServer, showToast]
  );

  const uploadMediaItem = useCallback(
    async (item: {
      name: string;
      url: string;
      mimeType: MediaLibraryItem['mimeType'];
      sizeBytes: number;
      altText: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
      ];
      if (!allowedMimes.includes(item.mimeType)) {
        return {
          ok: false,
          error: 'Invalid file type. Only JPG, PNG, WebP, SVG, and PDF files are permitted.',
        };
      }
      if (item.sizeBytes > 5 * 1024 * 1024) {
        return {
          ok: false,
          error: 'File size exceeds the 5 MB security limit.',
        };
      }

      const record: MediaLibraryItem = {
        id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name.trim().slice(0, 150),
        url: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        altText: item.altText.trim().slice(0, 250) || item.name,
        uploadedBy: adminUser?.email || 'admin@careeralertindia.in',
        createdAt: new Date().toISOString(),
      };

      const nextMedia = [record, ...media];
      setMedia(nextMedia);
      const log = await recordAudit('Uploaded Media', record.name);
      await syncToServer({ media: nextMedia, auditLogs: [log, ...auditLogs] });

      if (auth.currentUser && record.url.length <= 190000) {
        try {
          await setDoc(doc(db, 'media', record.id), record);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `media/${record.id}`);
        }
      }
      showToast('Media asset added to library.', 'success');
      return { ok: true };
    },
    [media, auditLogs, adminUser, recordAudit, syncToServer, showToast]
  );

  const deleteMediaItem = useCallback(
    async (mediaId: string): Promise<{ ok: boolean; error?: string }> => {
      const target = media.find((m) => m.id === mediaId);
      if (!target) return { ok: false, error: 'Media item not found.' };

      const inUse = posts.some(
        (p) => p.featuredImage === target.url || p.ogImage === target.url
      );
      if (inUse) {
        return {
          ok: false,
          error: 'This media asset is currently used as a featured/OG image in an existing post.',
        };
      }

      const nextMedia = media.filter((m) => m.id !== mediaId);
      setMedia(nextMedia);
      const log = await recordAudit('Deleted Media Asset', target.name);
      await syncToServer({ media: nextMedia, auditLogs: [log, ...auditLogs] });

      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'media', mediaId));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `media/${mediaId}`);
        }
      }
      showToast('Media asset deleted.', 'info');
      return { ok: true };
    },
    [media, posts, auditLogs, recordAudit, syncToServer, showToast]
  );

  const updateSiteSettings = useCallback(
    async (newSettings: Partial<SiteSettings>) => {
      const updated: SiteSettings = {
        ...settings,
        ...newSettings,
        whatsappChannelUrl:
          sanitizeUrl(newSettings.whatsappChannelUrl ?? settings.whatsappChannelUrl) ||
          settings.whatsappChannelUrl,
        isPublic: true,
        updatedAt: new Date().toISOString(),
      };
      setSettings(updated);
      persistCache({ settings: updated });
      const log = await recordAudit('Updated Site Settings', 'Global Configuration');
      await syncToServer({ settings: updated, auditLogs: [log, ...auditLogs] });

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'settings', 'global'), updated);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, 'settings/global');
        }
      }
      showToast('Site settings saved and published.', 'success');
    },
    [settings, auditLogs, persistCache, recordAudit, syncToServer, showToast]
  );

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
          return { ok: false, error: data.error || 'Could not submit inquiry.' };
        }
        if (data.record) {
          setContactMessages((prev) => [data.record, ...prev]);
          try {
            await setDoc(doc(db, 'contactMessages', data.record.id), {
              name: data.record.name,
              email: data.record.email,
              subject: data.record.subject,
              message: data.record.message,
              status: 'unread',
              createdAt: data.record.createdAt,
            });
          } catch {
            // ignore offline firestore error on public contact
          }
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message || 'Failed to submit contact form.' };
      }
    },
    []
  );

  const updateContactMessageStatus = useCallback(
    async (msgId: string, status: ContactSubmission['status']) => {
      const next = contactMessages.map((m) => (m.id === msgId ? { ...m, status } : m));
      setContactMessages(next);
      await syncToServer({ contactMessages: next });
      showToast(`Inquiry marked as ${status}.`, 'info');
    },
    [contactMessages, syncToServer, showToast]
  );

  const purgeDemoContent = useCallback(async (): Promise<number> => {
    const demoCount = posts.filter((p) => p.isDemo).length;
    const nextPosts = posts.filter((p) => !p.isDemo);
    setPosts(nextPosts);
    persistCache({ posts: nextPosts });
    const log = await recordAudit(
      'Purged Demo Content',
      `Removed ${demoCount} sample verification posts`
    );
    await syncToServer({ posts: nextPosts, auditLogs: [log, ...auditLogs] });
    showToast(`Removed ${demoCount} demo sample posts.`, 'success');
    return demoCount;
  }, [posts, auditLogs, persistCache, recordAudit, syncToServer, showToast]);

  const restoreDemoContent = useCallback(async () => {
    const existingIds = new Set(posts.map((p) => p.id));
    const missingDemos = INITIAL_POSTS.filter((p) => !existingIds.has(p.id));
    const nextPosts = [...posts, ...missingDemos];
    setPosts(nextPosts);
    persistCache({ posts: nextPosts });
    const log = await recordAudit('Restored Demo Content', 'Sample Verification Posts');
    await syncToServer({ posts: nextPosts, auditLogs: [log, ...auditLogs] });
    showToast('Sample demo posts restored.', 'success');
  }, [posts, auditLogs, persistCache, recordAudit, syncToServer, showToast]);

  const publishedPosts = React.useMemo(
    () =>
      posts
        .filter((p) => p.status === 'published')
        .sort(
          (a, b) =>
            new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime() -
            new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime()
        ),
    [posts]
  );

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
        addRecentSearch,
        clearRecentSearches,
        trackEvent,
        loginWithCredentials,
        loginWithGoogle,
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

function sanitizeFirestorePostPayload(post: Post): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: post.title,
    slug: post.slug,
    category: post.category,
    organization: post.organization,
    state: post.state,
    summary: post.summary,
    status: post.status,
    authorUid: post.authorUid,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
  if (post.subcategory) payload.subcategory = post.subcategory;
  if (post.content) payload.content = post.content;
  if (post.badge) payload.badge = post.badge;
  if (typeof post.featured === 'boolean') payload.featured = post.featured;
  if (typeof post.isDemo === 'boolean') payload.isDemo = post.isDemo;
  if (post.featuredImage) payload.featuredImage = post.featuredImage;
  if (post.qualification) payload.qualification = post.qualification;
  if (post.jobType) payload.jobType = post.jobType;
  if (typeof post.totalVacancies === 'number') payload.totalVacancies = post.totalVacancies;
  if (post.location) payload.location = post.location;
  if (post.salary) payload.salary = post.salary;
  if (post.applicationStart) payload.applicationStart = post.applicationStart;
  if (post.applicationEnd) payload.applicationEnd = post.applicationEnd;
  if (post.examDate) payload.examDate = post.examDate;
  if (post.admitCardDate) payload.admitCardDate = post.admitCardDate;
  if (post.resultDate) payload.resultDate = post.resultDate;
  if (post.resultStatus) payload.resultStatus = post.resultStatus;
  if (post.answerKeyType) payload.answerKeyType = post.answerKeyType;
  if (post.objectionDeadline) payload.objectionDeadline = post.objectionDeadline;
  if (post.officialSourceUrl) payload.officialSourceUrl = post.officialSourceUrl;
  if (post.statusOverride) payload.statusOverride = post.statusOverride;
  if (post.importantDates) payload.importantDates = post.importantDates.slice(0, 20);
  if (post.vacancies) payload.vacancies = post.vacancies.slice(0, 30);
  if (post.eligibility) payload.eligibility = post.eligibility;
  if (post.fees) payload.fees = post.fees.slice(0, 15);
  if (post.selectionProcess) payload.selectionProcess = post.selectionProcess.slice(0, 15);
  if (post.howToApply) payload.howToApply = post.howToApply.slice(0, 15);
  if (post.importantLinks) payload.importantLinks = post.importantLinks.slice(0, 15);
  if (post.faqs) payload.faqs = post.faqs.slice(0, 15);
  if (post.syllabusSections) payload.syllabusSections = post.syllabusSections.slice(0, 20);
  if (post.seoTitle) payload.seoTitle = post.seoTitle;
  if (post.seoDescription) payload.seoDescription = post.seoDescription;
  if (post.canonicalUrl) payload.canonicalUrl = post.canonicalUrl;
  if (post.ogImage) payload.ogImage = post.ogImage;
  if (post.tags) payload.tags = post.tags.slice(0, 15);
  if (post.scheduledFor) payload.scheduledFor = post.scheduledFor;
  if (post.publishedAt) payload.publishedAt = post.publishedAt;
  return payload;
}
