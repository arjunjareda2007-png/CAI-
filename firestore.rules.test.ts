/**
 * Firestore Security Rules Specification Tests ("Dirty Dozen" Payloads Verification)
 * Verifies that all 12 adversarial payloads described in security_spec.md are blocked.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Post Creation',
    collection: 'posts',
    docId: 'ssc-cgl-2026',
    operation: 'create',
    auth: null,
    payload: { title: 'SSC CGL 2026', status: 'published' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Email Spoofing Attack (email_verified: false)',
    collection: 'posts',
    docId: 'ssc-cgl-2026',
    operation: 'create',
    auth: { uid: 'spoof-uid', email: 'arjunjareda2007@gmail.com', email_verified: false },
    payload: { title: 'Spoofed Admin Post', status: 'published' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Post',
    collection: 'posts',
    docId: 'ssc-cgl-2026',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'arjunjareda2007@gmail.com', email_verified: true },
    payload: {
      title: 'SSC CGL 2026',
      slug: 'ssc-cgl-2026',
      category: 'jobs',
      organization: 'SSC',
      state: 'All India',
      summary: 'Valid summary text here',
      status: 'published',
      authorUid: 'admin-uid',
      createdAt: '2026-09-29T00:00:00Z',
      updatedAt: '2026-09-29T00:00:00Z',
      isSuperVerified: true, // Undeclared shadow key blocked by hasOnly()
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Draft Scraping by Public User',
    collection: 'posts',
    docId: 'secret-draft-post',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'PII Leak on Contact Messages by Non-Admin',
    collection: 'contactMessages',
    docId: 'msg-001',
    operation: 'get',
    auth: { uid: 'regular-user', email: 'student@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning Attack with Invalid Characters',
    collection: 'contactMessages',
    docId: 'invalid$id!with@spaces',
    operation: 'create',
    auth: null,
    payload: {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      subject: 'Exam Query',
      message: 'When will the notification release?',
      status: 'unread',
      createdAt: '2026-09-29T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial-of-Wallet Oversized Contact Message String',
    collection: 'contactMessages',
    docId: 'msg-oversized',
    operation: 'create',
    auth: null,
    payload: {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      subject: 'Exam Query',
      message: 'A'.repeat(5000), // Exceeds 3000 max length
      status: 'unread',
      createdAt: '2026-09-29T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Status Manipulation on Contact Message Creation',
    collection: 'contactMessages',
    docId: 'msg-status-bypass',
    operation: 'create',
    auth: null,
    payload: {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      subject: 'Exam Query',
      message: 'Attempting to pre-mark message as archived.',
      status: 'archived', // Must be 'unread' on create
      createdAt: '2026-09-29T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable createdAt Tampering on Post Update',
    collection: 'posts',
    docId: 'ssc-cgl-2026',
    operation: 'update',
    auth: { uid: 'admin-uid', email: 'arjunjareda2007@gmail.com', email_verified: true },
    payload: {
      createdAt: '1999-01-01T00:00:00Z', // Mutating immutable createdAt
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Tampering (Delete Attempt)',
    collection: 'auditLogs',
    docId: 'log-001',
    operation: 'delete',
    auth: { uid: 'admin-uid', email: 'arjunjareda2007@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Injection on Post Tags',
    collection: 'posts',
    docId: 'ssc-cgl-2026',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'arjunjareda2007@gmail.com', email_verified: true },
    payload: {
      tags: Array.from({ length: 25 }, (_, i) => `tag-${i}`), // Exceeds max 15
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Executable MIME Upload in Media Library',
    collection: 'media',
    docId: 'malicious-exe',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'arjunjareda2007@gmail.com', email_verified: true },
    payload: {
      name: 'payload.exe',
      url: 'https://example.com/payload.exe',
      mimeType: 'application/x-msdownload', // Blocked by allowlist
      sizeBytes: 1024,
      altText: 'Malicious file',
      uploadedBy: 'admin-uid',
      createdAt: '2026-09-29T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
