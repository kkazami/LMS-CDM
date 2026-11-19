# Expo SDK 58 migration and rollback

The mobile app uses Expo 58.0.26, Router 58.0.32, React and React DOM 19.3.0, and React Native 0.88.1. Native module selections follow Expo 58.0.26's bundled compatibility manifest. The resolved app graph includes Sentry 8.28.1, Gesture Handler 3.3, Reanimated 4.7.1, Worklets 0.13.0 and WebView 14.0.1. Android and iOS bundling use the SDK's resolver and Metro tooling. [Expo SDK 58 release notes](https://expo.dev/changelog/sdk-58)

The migration adapts the custom tab bars to Router's typed tab events and route keys, uses Router's resolved hidden tab option, and aligns affected React refs and types. `web.output: single` keeps the mobile web export a single-page app. The Next.js LMS remains the backend. Bundle identifiers, URL scheme, navigation paths, Google callback and native API contract remain as configured. Existing lucide React peer warnings and the optional web dependency's React Native peer mismatch are recorded as compatibility follow-ups. Web compilation exercised the installed graph, and visual/device behavior still needs device evidence.

## Release sequence

1. Build separate unsigned Android and iOS development candidates against the pinned lockfile and owner-approved synthetic endpoint. Record native tool versions, native permissions/config, runtime version, identifiers and archive checksums.
2. Exercise cold and warm app launches, deep links, notification and meeting links, Google sign-in and sign-out, native session restoration, tab navigation and WebView handoff on representative Android and iOS devices. Include iOS scene lifecycle coverage and accessibility. Keep historical blocked validation cases outside this ordinary workflow checklist.
3. Use `sdk58-1.0.0` only for the compatible SDK 58 binary. Review project-channel and runtime mapping before any update and use a synthetic channel for rollout rehearsal. Verify the older SDK 57 runtime and any signed fallback are available before releasing. The release owner controls signing and distribution.
4. If a regression affects SDK 58, halt its channel and repromote a known compatible SDK 58 update or roll back the binary distribution in the applicable store process. Keep SDK 57-compatible code on its own runtime, and never serve SDK 58 JavaScript to an SDK 57 binary.

The [Sprint 4 verification record](sprint-4-verification.json) contains the alignment, typecheck and bundle receipts. Expo Doctor 1.21.8 passed 18 of 20 checks in the isolated container. Its remote app-config schema and React Native Directory checks could not reach their services. Signed builds, simulator/device behavior, delivery channels and actual fallback availability remain open. [Expo runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
