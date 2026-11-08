# DEFECT & BUG REGISTRY
# Privacy-First AI Photo Gallery Ecosystem

This file tracks all defects, regressions, unexpected behaviors, and edge cases discovered during development and testing.

| Bug ID | Date | Severity | Component | Summary | Status | Resolution / Fix Details |
|---|---|---|---|---|---|---|
| **BUG-001** | 2026-11-08 | P1 - Critical | Android CI / Autolinking | `PackageList.java` autolinking generated `import expo.core.ExpoModulesPackage;` causing compilation failure | Resolved | Configured `apps/android/react-native.config.js` and `react-native.config.js` with explicit `packageImportPath: 'import expo.modules.ExpoModulesPackage;'` and `packageInstance: 'new ExpoModulesPackage()'`. Verified via CLI autolinking generator. |


---

## Bug Severity Definitions
- **P0 - Blocker**: Data loss, security breach, vault key leakage, crash on launch, or infinite recursion.
- **P1 - Critical**: Core feature malfunction (e.g., photo scanner skips valid files, MTP detection fails, sync integrity check fails).
- **P2 - Major**: UI layout breakdown, animation stutter below 30 FPS, missing EXIF parsing on certain cameras.
- **P3 - Minor**: Visual cosmetic glitch, typos in release notes, non-critical translation string missing.

