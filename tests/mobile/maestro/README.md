# Native fixture flows

These flows target only a development app built with `EXPO_PUBLIC_ICS_UI_V2=true` and `EXPO_PUBLIC_API_URL=http://10.0.2.2:4010` on the Android emulator. Run `node tests/mobile/fixture-server.cjs` in the repo root. Metro must use the same variables. Use `adb reverse tcp:8081 tcp:8081` for a localhost Metro server.

Install Maestro separately on a supported runner. Run `maestro test tests/mobile/maestro/student.yaml`, `teacher.yaml`, `grade.yaml`, and `upload-draft.yaml` individually. Before the upload flow, run `adb push tests/mobile/maestro/synthetic-answer.txt /sdcard/Download/synthetic-answer.txt`; the Android document picker must show Downloads. Reset the shared fixture state with `POST http://127.0.0.1:4010/__fixture/reset` between flows. Do not run these stateful flows concurrently. The `login.yaml` file is a helper, not an independent test.

Synthetic credentials: student@example.invalid or teacher@example.invalid / SyntheticPassword1. They are accepted only by the local fixture server; they are not real accounts. The implementing engineer owns this fixture corpus and its reset state. The browser fixture harness imports the same corpus.

The flows cover native dashboard/tool navigation, joining, course reorder, appearance changes, one-tap sign-out, account clearing and professor enrollment decisions. They are authored test assets; a flow counts as passed only after an actual Maestro run. No Maestro executable is currently installed on this Windows host.

Native file-picker/upload/draft-relaunch and grade-entry/return flows are authored but unexecuted; OS picker details and assertions must be validated on the runner. Cancel/retry/interruption scenarios remain a native execution gate. Existing Node tests cover identity isolation, interrupted drafts, upload cancellation/progress and receipt replay at the logic boundary. Neither those tests nor these flow files establish passed native end-to-end coverage. Record unresolved gates in `docs/quality/ics-mobile-ui-overhaul.md`.

For iOS use a Mac/Xcode simulator with a reachable fixture origin in its build configuration. Physical iPhone/Android checks are still required for VoiceOver/TalkBack, gestures and performance. Never point these synthetic flow definitions at the production LMS.

## Android checkpoint reproduction on Windows

The 4 November checkpoint used the real x86_64 debug APK, ADB-driven interaction and the same synthetic transport, not Maestro. To reproduce embedded workspaces, first run the CodeLab layout and mobile embedded Playwright specs; their setup writes the real component bundles/CSS to `tmp/native-embedded-fixtures`. Keep the local fixture server running. This fixture covers representative CodeLab, Knowledge Exchange and Ohmward primer screens, not live progress/database integration.

On this host the old CMake/Ninja pair failed under pnpm's long paths. Installing official Android SDK CMake 3.31.6 (Ninja 1.12.1) and supplying the version to Gradle resolved it. From `apps/mobile/android`, with the normal Android SDK/JDK environment configured:

```powershell
.\gradlew.bat ':app:assembleDebug' '-Pandroid.cmakeVersion=3.31.6' '-PreactNativeArchitectures=x86_64' '-x' 'lint' '-x' 'test' '--console=plain'
```

This is a local SDK/process setting; no patched native dependency is required. Generated native directories remain ignored. Install `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Use Metro with the fixture origin and enabled flag only in that test process. If using `http://127.0.0.1:4010`, also reverse port 4010. On Node 25 this host needed `NODE_OPTIONS=--dns-result-order=ipv4first` for localhost Metro to bind consistently with ADB forwarding.

Configure emulator size/density **before** launching the app. Expo's image-picker launcher can become unregistered if density changes recreate the activity while retaining the React host; force-stop/reopen the app after such changes. The product displays recovery guidance for this condition. For cover testing push a non-sensitive PNG/JPEG into the emulator photo library, choose/crop/save it, and inspect `/__fixture/image-requests` for an authorized private-image GET. Never use real learner photos or credentials. Clear task-created app data/photos, restore display overrides and remove task port forwards afterward.

Current checkpoint evidence and its remaining gates are in `docs/quality/mobile-plan-reconciliation.md`.
