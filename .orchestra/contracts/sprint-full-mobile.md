# Multi-Agent Orchestra Sprint Contract

## 1. Metadata
- **Sprint ID:** `SPRINT-FULL-MOBILE-TRANSFORMATION`
- **Feature Name:** Full-Stack Mobile Transformation & PWA Conversion
- **Topology:** Planner (Spec Architect) -> Generator (Fullstack Builder) <-> Evaluator (Harsh QA Critic)
- **Target Viewports:** 320px, 360px, 375px, 393px, 430px, 480px, 768px, 1024px+
- **Quality Gate:** Minimum 90/100 score across all 4 pillars (Design Quality, Originality, Craft, Functionality).

---

## 2. Testable Acceptance Criteria

### Phase 1: Frontend Mobile Ergonomics & PWA
- [x] **Criterion 1 (320px–480px Zero-Blowout):** All dashboard views, auth routes, and tables reflow cleanly with zero horizontal scroll clipping.
- [x] **Criterion 2 (Touch Targets):** 100% of interactive buttons, links, inputs, and tabs meet the minimum 44×44px touch target requirement.
- [x] **Criterion 3 (iOS Auto-Zoom Defense):** All input fields apply `text-base` (16px) on mobile viewports to prevent iOS Safari auto-zoom.
- [x] **Criterion 4 (PWA Capabilities):** Web app manifest (`manifest.json`) and Service Worker (`sw.js`) with stale-while-revalidate caching and offline fallback (`offline.html`).
- [x] **Criterion 5 (Offline Banner):** Real-time online/offline detector banner (`OfflineBanner.tsx`) rendering status updates gracefully.
- [x] **Criterion 6 (Fixed Bottom Nav):** 5-tab fixed `MobileBottomNav` with safe-area padding (`env(safe-area-inset-bottom)`).

### Phase 2: Backend, API & Network Optimization
- [x] **Criterion 7 (Paginated Lightweight APIs):** `/api/courses`, `/api/announcements`, `/api/assignments`, `/api/leaderboard` provide pagination parameters (`page`, `limit`) and lightweight Prisma field selections.
- [x] **Criterion 8 (Response Caching Headers):** Read-heavy API endpoints return `Cache-Control: private, s-maxage=60, stale-while-revalidate=300`.
- [x] **Criterion 9 (Push Notification Infrastructure):** `/api/notifications/subscribe` endpoint and `sendNotificationToUser` helper for instant push/in-app alerting.
- [x] **Criterion 10 (Network Resilience):** `fetchWithRetry` utility with exponential backoff (3 attempts) and 10s abort timeouts.
- [x] **Criterion 11 (Image Compression):** Client-side canvas compression pipeline reducing upload payload weights.

---

## 3. Strict Quality Floor & Non-Negotiables
- **No Placeholders:** All components and routes must be fully functional.
- **Strict Typing:** No `any` types in Prisma database operations or route parameters.
- **Zero Lint / Build Failures:** Production build must pass cleanly.
