# Sprint Contract: SPRINT-MOBILE-V2 — Complete Deployment-Grade Native Overhaul

**Sprint Target:** Full 100/100 Mobile Parity, Offline Cache, Classwork Creation, Gamification & Push Infrastructure  
**Target App:** apps/mobile (Expo SDK 55, React Native 0.83, Reanimated 4) & Monorepo shared packages (@lms/api-client, @lms/types, @lms/ui)  
**Evaluation Standard:** 4 Pillars (Design Quality, Originality, Craft, Functionality) >= 95/100 score floor.

---

### Non-Negotiable Contract Guarantees

1. **Monorepo Invariants**:
   - Zero any in TypeScript; strictly typed DTOs across API client & screens.
   - Dynamic institute theming with full **Dark Mode** toggle support (ICS, IBE, ITE).
   - Touch targets: Minimum 48dp on Android and 44pt on iOS.
   - Safe input font-size >= 16px to avoid iOS auto-zoom bugs.
   - Zero stubs or placeholders (<UnderDevelopment /> replaced with live screens).

2. **Core Feature Parity**:
   - 4-tab Course Workspace (Stream, Classwork, People, Grades) with interactive Student submission AND Teacher classwork creation & inline grading.
   - 5 Category Achievements & Badges (achievements/index.tsx).
   - Active recall Flashcards Study Mode with 3D Reanimated card flip.
   - Personal Workspace with Notes, Tasks, and Calendar.
   - Daily Login Streak Modal with EXP award animation.
   - Background Study Timer with live heartbeats.

3. **Academic Integrity & Offline Resilience**:
   - Stale-while-revalidate read cache via React Query.
   - High-stakes submissions are online-only with UUID Idempotency-Key and durable server submission receipts.
   - Auto-saved submission drafts surviving app crash / reload.

4. **Security & Notification**:
   - Biometric FaceID/Fingerprint gate via expo-local-authentication.
   - Expo Push Token registration and session auto-refresh.
   - PII redaction on Sentry error reports.
