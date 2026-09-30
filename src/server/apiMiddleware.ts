import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_POSTS,
  INITIAL_CATEGORIES,
  DEFAULT_SITE_SETTINGS,
  INITIAL_MEDIA,
  INITIAL_AUDIT_LOGS,
  INITIAL_REVISIONS,
} from '../data/seedData';

export const CLERK_APP_ID = process.env.CLERK_APP_ID || 'app_3K0GFtslkGHTmSBGO2kYp3S8qNI';

const CLERK_SESSION_SECRET =
  process.env.CLERK_SECRET_KEY ||
  `clerk-hmac-${CLERK_APP_ID}-9f8e7d6c5b4a3928172635`;

export interface ClerkSessionPayload {
  sub: string;
  appId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl?: string;
  csrfToken: string;
  exp: number;
}

function signClerkSessionToken(payload: ClerkSessionPayload): string {
  const dataB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', CLERK_SESSION_SECRET)
    .update(dataB64)
    .digest('base64url');
  return `clk_sess_${dataB64}.${sig}`;
}

function verifyClerkSessionToken(rawToken?: string): ClerkSessionPayload | null {
  if (!rawToken) return null;
  const cleaned = rawToken.startsWith('clk_sess_') ? rawToken.slice(9) : rawToken;
  if (!cleaned.includes('.')) return null;
  const [dataB64, sig] = cleaned.split('.');
  const expectedSig = crypto
    .createHmac('sha256', CLERK_SESSION_SECRET)
    .update(dataB64)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(dataB64, 'base64url').toString('utf-8')
    ) as ClerkSessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

const contactRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// Persistent server store (.data/cms-store.json)
const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'cms-store.json');

export interface ServerCMSStore {
  posts: typeof INITIAL_POSTS;
  categories: typeof INITIAL_CATEGORIES;
  settings: typeof DEFAULT_SITE_SETTINGS;
  media: typeof INITIAL_MEDIA;
  auditLogs: typeof INITIAL_AUDIT_LOGS;
  revisions: typeof INITIAL_REVISIONS;
  contactMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read' | 'archived';
    createdAt: string;
  }>;
  analyticsEvents: Array<{
    id: string;
    eventType: string;
    target: string;
    category?: string;
    createdAt: string;
  }>;
}

function loadServerStore(): ServerCMSStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as ServerCMSStore;
      if (Array.isArray(parsed.posts)) {
        parsed.posts = parsed.posts.map((p, idx) => ({
          ...p,
          id: p.id || p.slug || `post-${idx}`,
          title: (p.title || '')
            .replace(/\s*\(Demo Sample\)/gi, '')
            .replace(/\s*\(Demo\)/gi, '')
            .trim(),
          summary: (p.summary || '').replace(/^\[DEMO DATA\]\s*/i, '').trim(),
          content: (p.content || '').replace(/<div class="notice-info">.*?<\/div>\s*/gis, ''),
          isDemo: false,
        }));
      }
      if (Array.isArray(parsed.categories)) {
        parsed.categories = parsed.categories.map((c, idx) => ({
          ...c,
          id: c.id || `${c.type === 'section' ? 'sec' : 'dom'}-${c.slug || idx}`,
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to read server store, initializing defaults:', e);
  }
  const initial: ServerCMSStore = {
    posts: INITIAL_POSTS,
    categories: INITIAL_CATEGORIES,
    settings: DEFAULT_SITE_SETTINGS,
    media: INITIAL_MEDIA,
    auditLogs: INITIAL_AUDIT_LOGS,
    revisions: INITIAL_REVISIONS,
    contactMessages: [],
    analyticsEvents: [],
  };
  saveServerStore(initial);
  return initial;
}

function generateSitemapXml(store: ServerCMSStore, rawBaseUrl?: string): string {
  const baseUrl = (rawBaseUrl || process.env.APP_URL || 'https://cai.foldedpage.in').replace(/\/$/, '');
  const staticRoutes = [
    '',
    '/latest',
    '/jobs',
    '/exams',
    '/results',
    '/admit-card',
    '/answer-key',
    '/syllabus',
    '/notifications',
    '/calendar',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
    '/disclaimer',
  ];
  const nowIso = new Date().toISOString();
  const publishedPosts = (store.posts || []).filter((p) => p.status === 'published');
  const urlsXml = [
    ...staticRoutes.map(
      (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${route === '' ? 'hourly' : 'daily'}</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`
    ),
    ...publishedPosts.map(
      (post) => `  <url>
    <loc>${baseUrl}/${post.category}/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
    ),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

function saveServerStore(store: ServerCMSStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    // Keep background public/sitemap.xml synchronized automatically for search engines
    const publicSitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
    if (fs.existsSync(path.dirname(publicSitemapPath))) {
      fs.writeFileSync(publicSitemapPath, generateSitemapXml(store), 'utf-8');
    }
  } catch (e) {
    console.error('Failed to persist server store:', e);
  }
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 2_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
  extraHeaders?: Record<string, string | string[]>
) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function formatPublicClerkUser(user: {
  id: string;
  appId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl?: string;
}) {
  return {
    id: user.id,
    uid: user.id,
    appId: user.appId || CLERK_APP_ID,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    name: user.fullName,
    imageUrl: user.imageUrl || '',
    authMode: 'clerk' as const,
  };
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = urlObj.pathname;
  const method = req.method || 'GET';

  // 1. Dynamic robots.txt
  if (pathname === '/robots.txt' && method === 'GET') {
    const baseUrl = process.env.APP_URL || 'https://cai.foldedpage.in';
    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /8233538355',
      'Disallow: /8233538355/',
      'Disallow: /caiowner',
      'Disallow: /caiowner/',
      'Disallow: /owner-portal-cai',
      'Disallow: /owner-portal-cai/',
      'Disallow: /admin',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      'User-agent: Googlebot',
      'Allow: /',
      'Disallow: /8233538355',
      'Disallow: /caiowner',
      'Disallow: /owner-portal-cai',
      'Disallow: /admin',
      'Disallow: /api/',
      '',
      `Host: ${baseUrl.replace(/\/$/, '')}`,
      `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
    ].join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(robotsTxt);
    return true;
  }

  // 2. Dynamic background sitemap.xml for search engine crawlers
  if (pathname === '/sitemap.xml' && method === 'GET') {
    const store = loadServerStore();
    const sitemap = generateSitemapXml(store, process.env.APP_URL || 'https://cai.foldedpage.in');
    res.writeHead(200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
      'X-Robots-Tag': 'noindex, follow',
    });
    res.end(sitemap);
    return true;
  }

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-clerk-session'] as string) || '';
  const tokenCandidate = bearerToken || cookies['__clerk_cai_session'];
  const currentSession = verifyClerkSessionToken(tokenCandidate);

  const serverClerkPublishableKey =
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    '';

  // ============================================================================
  // CLERK AUTHENTICATION SYSTEM ENDPOINTS (/api/clerk/*)
  // Linked to Clerk Application: app_3K079yMcSqTmXUIq2teBpSaGXTu
  // ============================================================================

  // 1. GET /api/clerk/session — Inspect active Clerk session & config
  if (pathname === '/api/clerk/session' && method === 'GET') {
    if (!currentSession) {
      sendJson(res, 200, {
        authenticated: false,
        clerkAppId: CLERK_APP_ID,
        clerkPublishableKey: serverClerkPublishableKey,
      });
      return true;
    }

    sendJson(res, 200, {
      authenticated: true,
      user: formatPublicClerkUser({
        id: currentSession.sub,
        appId: currentSession.appId,
        email: currentSession.email,
        firstName: currentSession.firstName,
        lastName: currentSession.lastName,
        fullName: currentSession.fullName,
        imageUrl: currentSession.imageUrl,
      }),
      csrfToken: currentSession.csrfToken,
      clerkAppId: CLERK_APP_ID,
      clerkPublishableKey: serverClerkPublishableKey,
    });
    return true;
  }

  // 2. POST /api/clerk/oauth-sync — Bridge live @clerk/react SDK user with server session
  if (pathname === '/api/clerk/oauth-sync' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const clerkUserId = String(body.clerkUserId || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const firstName = String(body.firstName || '').trim() || email.split('@')[0] || 'Owner';
      const lastName = String(body.lastName || '').trim();
      const fullName =
        String(body.fullName || '').trim() ||
        [firstName, lastName].filter(Boolean).join(' ').trim() ||
        firstName;
      const imageUrl = String(body.imageUrl || '').trim();

      if (!clerkUserId || !email) {
        sendJson(res, 400, { error: 'Missing Clerk user ID or email.' });
        return true;
      }

      const csrfToken = crypto.randomBytes(24).toString('hex');
      const sessionPayload: ClerkSessionPayload = {
        sub: clerkUserId,
        appId: CLERK_APP_ID,
        email,
        firstName,
        lastName,
        fullName,
        imageUrl,
        csrfToken,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      const sessionToken = signClerkSessionToken(sessionPayload);

      const store = loadServerStore();
      store.auditLogs.unshift({
        id: `log-${Date.now()}`,
        adminEmail: email,
        adminUid: clerkUserId,
        action: 'Admin Sign In',
        target: 'Admin Portal',
        details: `Authenticated admin session for ${fullName} (${email})`,
        createdAt: new Date().toISOString(),
      });
      saveServerStore(store);

      sendJson(
        res,
        200,
        {
          authenticated: true,
          user: formatPublicClerkUser({
            id: clerkUserId,
            appId: CLERK_APP_ID,
            email,
            firstName,
            lastName,
            fullName,
            imageUrl,
          }),
          csrfToken,
          sessionToken,
          clerkAppId: CLERK_APP_ID,
        },
        {
          'Set-Cookie': [
            `__clerk_cai_session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
          ],
        }
      );
      return true;
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Failed to sync Clerk session.' });
      return true;
    }
  }

  // 3. POST /api/clerk/signout — Sign out of Admin session
  if (pathname === '/api/clerk/signout' && method === 'POST') {
    if (currentSession) {
      const store = loadServerStore();
      store.auditLogs.unshift({
        id: `log-${Date.now()}`,
        adminEmail: currentSession.email,
        adminUid: currentSession.sub,
        action: 'Admin Sign Out',
        target: 'Admin Portal',
        createdAt: new Date().toISOString(),
      });
      saveServerStore(store);
    }
    sendJson(
      res,
      200,
      { success: true },
      {
        'Set-Cookie': [
          '__clerk_cai_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
        ],
      }
    );
    return true;
  }

  // Public Bootstrap Read (Returns published posts, enabled categories, settings, and full data if signed in via Clerk)
  if (pathname === '/api/cms/bootstrap' && method === 'GET') {
    const store = loadServerStore();
    if (currentSession) {
      sendJson(res, 200, {
        isAdmin: true,
        posts: store.posts,
        categories: store.categories,
        settings: store.settings,
        media: store.media,
        auditLogs: store.auditLogs,
        revisions: store.revisions,
        contactMessages: store.contactMessages,
        analyticsEvents: store.analyticsEvents,
      });
      return true;
    }
    sendJson(res, 200, {
      isAdmin: false,
      posts: store.posts.filter((p) => p.status === 'published'),
      categories: store.categories.filter((c) => c.enabled),
      settings: store.settings,
      media: [],
      auditLogs: [],
      revisions: [],
      contactMessages: [],
      analyticsEvents: [],
    });
    return true;
  }

  // Public Contact Form Submission (with Rate Limiting & Validation)
  if ((pathname === '/api/public/contact' || pathname === '/api/contact') && method === 'POST') {
    const rate = checkRateLimit(contactRateLimit, clientIp, 5, 10 * 60 * 1000);
    if (!rate.allowed) {
      sendJson(res, 429, {
        error: `Rate limit reached. Please wait ${rate.retryAfterSec} seconds before submitting another message.`,
      });
      return true;
    }
    try {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim().slice(0, 100);
      const email = String(body.email || '').trim().slice(0, 150);
      const subject = String(body.subject || '').trim().slice(0, 200);
      const message = String(body.message || '').trim().slice(0, 3000);
      const honeypot = String(body.website_hp || '').trim();

      if (honeypot) {
        sendJson(res, 200, { success: true });
        return true;
      }

      if (name.length < 2 || !email.includes('@') || subject.length < 3 || message.length < 10) {
        sendJson(res, 400, {
          error:
            'Please fill in a valid name, email address, subject, and message (at least 10 characters).',
        });
        return true;
      }

      const store = loadServerStore();
      const record = {
        id: `msg-${Date.now()}`,
        name,
        email,
        subject,
        message,
        status: 'unread' as const,
        createdAt: new Date().toISOString(),
      };
      store.contactMessages.unshift(record);
      saveServerStore(store);
      sendJson(res, 200, { success: true, record });
      return true;
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Invalid submission' });
      return true;
    }
  }

  // Public Anonymous Analytics Event
  if (
    (pathname === '/api/public/analytics' || pathname === '/api/analytics/track') &&
    method === 'POST'
  ) {
    try {
      const body = await readJsonBody(req);
      const eventType = String(body.eventType || '').trim();
      const target = String(body.target || '').trim().slice(0, 250);
      const category = body.category ? String(body.category).trim().slice(0, 100) : undefined;
      if (!eventType || !target) {
        sendJson(res, 400, { error: 'Missing eventType or target' });
        return true;
      }
      const store = loadServerStore();
      store.analyticsEvents.unshift({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventType,
        target,
        category,
        createdAt: new Date().toISOString(),
      });
      if (store.analyticsEvents.length > 500) {
        store.analyticsEvents = store.analyticsEvents.slice(0, 500);
      }
      saveServerStore(store);
      sendJson(res, 200, { success: true });
      return true;
    } catch {
      sendJson(res, 200, { success: false });
      return true;
    }
  }

  // Protected CMS Mutation Endpoint (/api/cms/sync)
  if (pathname === '/api/cms/sync' && method === 'POST') {
    if (!currentSession) {
      sendJson(res, 401, { error: 'Unauthorized: Valid admin session required.' });
      return true;
    }
    const csrfHeader = req.headers['x-csrf-token'];
    if (csrfHeader && csrfHeader !== currentSession.csrfToken) {
      sendJson(res, 403, { error: 'Forbidden: Invalid CSRF token.' });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const store = loadServerStore();

      if (Array.isArray(body.posts)) store.posts = body.posts;
      if (Array.isArray(body.categories)) store.categories = body.categories;
      if (body.settings && typeof body.settings === 'object') store.settings = body.settings;
      if (Array.isArray(body.media)) store.media = body.media;
      if (Array.isArray(body.auditLogs)) store.auditLogs = body.auditLogs;
      if (Array.isArray(body.revisions)) store.revisions = body.revisions;
      if (Array.isArray(body.contactMessages)) store.contactMessages = body.contactMessages;

      saveServerStore(store);
      sendJson(res, 200, { success: true });
      return true;
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Failed to persist CMS state' });
      return true;
    }
  }

  sendJson(res, 404, { error: 'API route not found' });
  return true;
}
