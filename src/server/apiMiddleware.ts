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

const AUTH_SECRET =
  process.env.AUTH_SECRET || 'cai-hmac-secret-9f8e7d6c5b4a39281726354455667788';
const CONFIGURED_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'arjunjareda2007@gmail.com'
).toLowerCase();

// Pre-compute scrypt hash for fallback environment password if ADMIN_PASSWORD_HASH is not injected
const DEFAULT_SALT = 'cai_prod_salt_2026';
const DEFAULT_DERIVED_HASH = crypto
  .scryptSync(process.env.ADMIN_INITIAL_PASS || 'CareerAlert@2026', DEFAULT_SALT, 64)
  .toString('hex');

const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH || `${DEFAULT_SALT}:${DEFAULT_DERIVED_HASH}`;

function verifyPasswordHash(passwordInput: string, storedHash: string): boolean {
  try {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) return false;
    const derivedKey = crypto.scryptSync(passwordInput, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derivedKey.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuf);
  } catch {
    return false;
  }
}

interface SessionPayload {
  uid: string;
  email: string;
  csrfToken: string;
  exp: number;
}

function signSessionToken(payload: SessionPayload): string {
  const dataB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${sig}`;
}

function verifySessionToken(token?: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [dataB64, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataB64)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf-8')) as SessionPayload;
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

// Rate limit stores
const loginRateLimit = new Map<string, { count: number; resetAt: number }>();
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
          title: (p.title || '').replace(/\s*\(Demo Sample\)/gi, '').replace(/\s*\(Demo\)/gi, '').trim(),
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

function saveServerStore(store: ServerCMSStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
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

function sendJson(res: ServerResponse, status: number, data: unknown, extraHeaders?: Record<string, string | string[]>) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
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
    const baseUrl = process.env.APP_URL || `https://${req.headers.host || 'careeralertindia.in'}`;
    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /owner-portal-cai',
      'Disallow: /owner-portal-cai/',
      'Disallow: /admin',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
    ].join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(robotsTxt);
    return true;
  }

  // 2. Dynamic sitemap.xml
  if (pathname === '/sitemap.xml' && method === 'GET') {
    const store = loadServerStore();
    const baseUrl = (process.env.APP_URL || `https://${req.headers.host || 'careeralertindia.in'}`).replace(/\/$/, '');
    const staticRoutes = [
      '',
      '/latest',
      '/jobs',
      '/exams',
      '/results',
      '/admit-card',
      '/answer-key',
      '/syllabus',
      '/calendar',
      '/about',
      '/contact',
      '/privacy-policy',
      '/terms',
      '/disclaimer',
    ];
    const publishedPosts = store.posts.filter((p) => p.status === 'published');
    const urlsXml = [
      ...staticRoutes.map(
        (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
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

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
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
  const currentSession = verifySessionToken(cookies['cai_admin_session']);

  // Auth Session Check
  if (pathname === '/api/admin/auth/session' && method === 'GET') {
    if (!currentSession) {
      sendJson(res, 200, { authenticated: false });
      return true;
    }
    sendJson(res, 200, {
      authenticated: true,
      admin: {
        uid: currentSession.uid,
        email: currentSession.email,
      },
      csrfToken: currentSession.csrfToken,
    });
    return true;
  }

  // Admin Login (Server-Side Hash Verification + Rate Limiting + HTTP-Only Cookie)
  if (pathname === '/api/admin/auth/login' && method === 'POST') {
    const rate = checkRateLimit(loginRateLimit, clientIp, 6, 15 * 60 * 1000);
    if (!rate.allowed) {
      sendJson(res, 429, {
        error: `Too many login attempts. Please wait ${rate.retryAfterSec} seconds before retrying.`,
      });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      const isAllowedEmail = email === CONFIGURED_ADMIN_EMAIL;
      const isPasswordValid = verifyPasswordHash(password, ADMIN_PASSWORD_HASH);

      if (!isAllowedEmail || !isPasswordValid) {
        sendJson(res, 401, {
          error: 'Invalid administrator email or password.',
        });
        return true;
      }

      // Reset rate limit on success
      loginRateLimit.delete(clientIp);

      const csrfToken = crypto.randomBytes(24).toString('hex');
      const sessionPayload: SessionPayload = {
        uid: 'admin-server-uid',
        email,
        csrfToken,
        exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      };
      const signedCookie = signSessionToken(sessionPayload);

      const store = loadServerStore();
      store.auditLogs.unshift({
        id: `log-${Date.now()}`,
        adminEmail: email,
        adminUid: sessionPayload.uid,
        action: 'Admin Login',
        target: 'Admin Session (HTTP-Only Cookie)',
        details: 'Verified via server-side scrypt password hash.',
        createdAt: new Date().toISOString(),
      });
      saveServerStore(store);

      sendJson(
        res,
        200,
        {
          authenticated: true,
          admin: { uid: sessionPayload.uid, email },
          csrfToken,
        },
        {
          'Set-Cookie': [
            `cai_admin_session=${encodeURIComponent(signedCookie)}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax`,
          ],
        }
      );
      return true;
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Invalid login request' });
      return true;
    }
  }

  // Firebase Verified Google Sign-In Session Bridge
  if (pathname === '/api/admin/auth/firebase-sync' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const uid = String(body.uid || '').trim();
      if (!email || !uid || email !== 'arjunjareda2007@gmail.com') {
        sendJson(res, 403, {
          error: 'This Google account is not authorized as an administrator.',
        });
        return true;
      }
      const csrfToken = crypto.randomBytes(24).toString('hex');
      const sessionPayload: SessionPayload = {
        uid,
        email,
        csrfToken,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      };
      const signedCookie = signSessionToken(sessionPayload);

      const store = loadServerStore();
      store.auditLogs.unshift({
        id: `log-${Date.now()}`,
        adminEmail: email,
        adminUid: uid,
        action: 'Admin Login (Google OAuth)',
        target: 'Firebase Verified Admin',
        createdAt: new Date().toISOString(),
      });
      saveServerStore(store);

      sendJson(
        res,
        200,
        {
          authenticated: true,
          admin: { uid, email },
          csrfToken,
        },
        {
          'Set-Cookie': [
            `cai_admin_session=${encodeURIComponent(signedCookie)}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax`,
          ],
        }
      );
      return true;
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Failed to sync session' });
      return true;
    }
  }

  // Admin Logout
  if (pathname === '/api/admin/auth/logout' && method === 'POST') {
    if (currentSession) {
      const store = loadServerStore();
      store.auditLogs.unshift({
        id: `log-${Date.now()}`,
        adminEmail: currentSession.email,
        adminUid: currentSession.uid,
        action: 'Admin Logout',
        target: 'Admin Session Terminated',
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
          'cai_admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
        ],
      }
    );
    return true;
  }

  // Public Bootstrap Read (Returns published posts, enabled categories, settings, and full data if admin)
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
        // Silent spam rejection
        sendJson(res, 200, { success: true });
        return true;
      }

      if (name.length < 2 || !email.includes('@') || subject.length < 3 || message.length < 10) {
        sendJson(res, 400, {
          error: 'Please fill in a valid name, email address, subject, and message (at least 10 characters).',
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
  if ((pathname === '/api/public/analytics' || pathname === '/api/analytics/track') && method === 'POST') {
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

  // Protected Admin CMS Mutation Endpoint (/api/cms/sync)
  if (pathname === '/api/cms/sync' && method === 'POST') {
    if (!currentSession) {
      sendJson(res, 401, { error: 'Unauthorized: Valid administrator session required.' });
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
