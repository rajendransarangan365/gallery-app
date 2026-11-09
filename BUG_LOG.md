# DEFECT & BUG REGISTRY
# Privacy-First AI Photo Gallery Ecosystem

This file tracks all defects, regressions, unexpected behaviors, and edge cases discovered during development and testing.

| Bug ID | Date | Severity | Component | Summary | Status | Resolution / Fix Details |
|---|---|---|---|---|---|---|
| **BUG-001** | 2026-11-08 | P1 - Critical | Android CI / Autolinking | `PackageList.java` autolinking generated `import expo.core.ExpoModulesPackage;` causing compilation failure | Resolved | Configured `apps/android/react-native.config.js` and `react-native.config.js` with explicit `packageImportPath: 'import expo.modules.ExpoModulesPackage;'` and `packageInstance: 'new ExpoModulesPackage()'`. Verified via CLI autolinking generator. |
| **BUG-002** | 2026-11-08 | P1 - Critical | Android CI / Keystore | `Task :app:validateSigningRelease FAILED` due to missing `debug.keystore` (ignored by `.gitignore` per security policy) | Resolved | Added automated on-the-fly debug keystore creation via JDK `keytool` in workflow step and programmatic fallback in `app/build.gradle`. Fully complies with Zero-Key-Commit rule. |
| **BUG-003** | 2026-11-09 | P1 - Critical | Android & Sync Engine | Mobile was not querying MediaStore photos/videos and device-to-device sync lacked live HTTP transport | Resolved | Authored native Kotlin `MediaStoreModule` querying real photos & videos asynchronously, built native stream uploader `uploadMediaToDesktop`, built live `DesktopSyncServer` on port 41236, and redesigned UI to OriginOS aesthetic with custom icons. |
| **BUG-004** | 2026-11-09 | P2 - Major | CI/CD Infrastructure | Gradle distribution and electron-builder tool downloads failed with HTTP 504 Gateway Timeout during GitHub upstream anonymous surge incident | Resolved | Switched Gradle wrapper to binary distribution (`-bin.zip`), increased networkTimeout to 120s, and pointed distributionUrl to verified mirror (`mirrors.cloud.tencent.com`). Configured `ELECTRON_BUILDER_BINARIES_MIRROR` and `ELECTRON_MIRROR` to use `npmmirror.com` in workflow. |
| **BUG-005** | 2026-11-09 | P1 - Critical | SyncFlow & MTP Engine | Mobile phone failed to connect to desktop exe via Wi-Fi (due to Android 9+ cleartext HTTP block & desktop selecting virtual IP) and via USB (due to broken PowerShell quote escaping & missing WPD traversal) | Resolved | Added cleartext HTTP policy & network security config in Android; filtered virtual adapters in desktop sync server; implemented native UDP discovery probe in Kotlin; migrated MTP scripts to `-EncodedCommand` with Shell.Application WPD traversal. |
| **BUG-006** | 2026-11-09 | P1 - Critical | SyncFlow UI / App Routing | SyncFlow Center tab rendered empty gallery placeholder instead of SyncCenter radar and pairing controls when photo count was 0 | Resolved | Restructured view tab hierarchy in `App.tsx` so `activeTab === 'sync'`, `inspector`, `map`, and `people` evaluate before `photos.length === 0`. Added direct USB MTP phone transfer card, 3-step connection guide, and direct phone Wi-Fi ping tool into `SyncCenter.tsx`. |



---

## Bug Severity Definitions
- **P0 - Blocker**: Data loss, security breach, vault key leakage, crash on launch, or infinite recursion.
- **P1 - Critical**: Core feature malfunction (e.g., photo scanner skips valid files, MTP detection fails, sync integrity check fails).
- **P2 - Major**: UI layout breakdown, animation stutter below 30 FPS, missing EXIF parsing on certain cameras.
- **P3 - Minor**: Visual cosmetic glitch, typos in release notes, non-critical translation string missing.

