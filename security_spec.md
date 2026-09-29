# Security Specification — Career Alert India (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched in `firestore.rules` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Admin Gate (`isAdmin`)**: Only an authenticated user whose email matches the bootstrapped admin (`arjunjareda2007@gmail.com`) with `request.auth.token.email_verified == true` OR whose UID exists in `/admins/{uid}` is granted administrative write/read privileges. Unverified emails are strictly rejected.
3. **Public Read Filtering Invariant**:
   - `/posts/{postId}`: Non-admins can only `get` or `list` posts where `existing().status == 'published'`. Drafts, scheduled posts, and archived posts are invisible to non-admins.
   - `/categories/{categoryId}`: Non-admins can only `get` or `list` categories where `existing().enabled == true`.
   - `/settings/{settingId}`: Non-admins can only `get` settings where `existing().isPublic == true`.
4. **PII Isolation Invariant**: `/contactMessages/{msgId}` contains user PII (`email`, `name`). Public visitors can only `create` valid messages; `get`, `list`, `update`, and `delete` are strictly restricted to `isAdmin()`.
5. **Immutable Audit & Revision Records**: `/revisions/{revisionId}` and `/auditLogs/{logId}` are append-only by admins (`allow update: if false;`) and require `incoming().createdAt == request.time`.
6. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(docId)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
7. **Strict Schema & Key Allowlisting**: Every `create` and `update` invokes `isValid[Entity](incoming())`, enforcing `.keys().hasAll(...)`, `.keys().hasOnly(...)`, type checks, string `.size()` bounds, and bounded list sizes.

---

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Post Creation**: Anonymous user attempts `create` on `/posts/ssc-cgl-2026`. -> `PERMISSION_DENIED`
2. **Email Spoofing Attack (`email_verified: false`)**: Attacker with `email: "arjunjareda2007@gmail.com"` but `email_verified: false` attempts to publish a post. -> `PERMISSION_DENIED`
3. **Shadow Field Injection on Post**: Admin or user sends a post payload with an undeclared field `"isSuperVerified": true`. -> `PERMISSION_DENIED`
4. **Draft Scraping by Public User**: Anonymous visitor attempts to `get` or `list` `/posts/draft-post` where `status == 'draft'`. -> `PERMISSION_DENIED`
5. **PII Leak on Contact Messages**: Authenticated non-admin attempts `get` or `list` on `/contactMessages/msg-1`. -> `PERMISSION_DENIED`
6. **ID Poisoning Attack**: User attempts `create` on `/contactMessages/invalid$id!with@spaces` or >128 chars. -> `PERMISSION_DENIED`
7. **Denial-of-Wallet Oversized String**: User submits a contact message with a 50,000-character `message` string (exceeding `maxLength: 3000`). -> `PERMISSION_DENIED`
8. **Timestamp Forgery on Contact Message**: User submits a contact message with a client-forged past `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
9. **Immutable `createdAt` Tampering on Post Update**: Admin attempts to modify `createdAt` or `authorUid` during an `update` on `/posts/post-1`. -> `PERMISSION_DENIED`
10. **Audit Log Tampering**: Admin attempts to `update` or `delete` an existing `/auditLogs/log-1` record. -> `PERMISSION_DENIED`
11. **Unbounded Array Injection**: Payload attempts to store 50 tags in `post.tags` (exceeding max 15). -> `PERMISSION_DENIED`
12. **Executable MIME Upload in Media Library**: Admin attempts to create a `/media/malicious-exe` item with `mimeType: "application/x-msdownload"`. -> `PERMISSION_DENIED`
