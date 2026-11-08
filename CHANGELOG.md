# CHANGELOG
All notable changes to the Privacy-First AI Photo Gallery Ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Local On-Device AI Engine & "Photo of the Month" (Phases 7 & 8)**:
  - Created `@gallery/ai-engine` package implementing on-device face recognition, vector search, and aesthetic scoring with zero cloud dependencies or telemetry.
  - Implemented `FaceClusterer` computing cosine similarity between 512-dimensional ArcFace/MobileFaceNet embeddings, clustering detections into named Person albums, centroid updates, and cluster merging.
  - Implemented `SemanticSearchRanker` providing dot product and cosine vector ranking between natural language text embeddings and photo representations.
  - Implemented `AestheticAnalyzer` evaluating sharpness (Laplacian variance/sensor clarity), exposure balance, and golden ratio composition to calculate weighted quality scores.
  - Implemented `selectPhotoOfTheMonth` picking the monthly winning photograph with dynamic humanized AI reasoning.
  - Built `PeopleView.tsx` UI displaying recognized face albums with face counts, inline person renaming, and slide-up photo drawers.
  - Built `PhotoOfTheMonthCard.tsx` showcase banner featuring trophy badges, aesthetic score breakdown meters, and quick action shortcuts.
  - Added unit tests covering cosine similarity, face clustering, vector ranking, and monthly aesthetic scoring with 100% pass rate.
- **SyncFlow Local Wireless P2P Transfer Engine (Phase 6)**:
  - Created `@gallery/sync-engine` package implementing local-first zero-cloud device synchronization over local Wi-Fi.
  - Implemented `DiscoveryManager` providing UDP socket broadcast beacons on port 41235 with automatic TTL peer expiration and zero telemetry.
  - Implemented `PairingManager` with 6-digit cryptographic PIN generation, QR code payload generation, constant-time `timingSafeEqual` authentication, and trusted peer session tracking.
  - Implemented `SyncEngine` for content-addressable SHA-256 manifest comparison calculating symmetric delta (local missing vs remote missing), chunked streaming ingestion with integrity verification, and strict folder exclusion enforcement.
  - Built `SyncCenter.tsx` UI in `apps/windows` featuring animated radar sweep scanning, orbiting peer nodes, interactive PIN/QR pairing modal, live MB/s bandwidth speedometer, and real-time streaming progress logs.
  - Added unit tests covering invitation generation, PIN verification, manifest delta calculation, and tamper/exclusion rejection with 100% pass rate.
- **Windows MTP Phone Import Center (Phase 5)**:
  - Authored `MtpManager` in `@gallery/photo-engine` querying Windows Portable Devices (WPD) and PnPEntity for connected Android mobile devices over USB.
  - Implemented device directory traversal of camera folders (`DCIM/Camera`, `Pictures`) with strict `ExclusionManager` enforcement.
  - Implemented chunked streaming file transfer with SHA-256 integrity verification, EXIF/GPS parsing, and automatic gallery ingestion.
  - Connected native Electron IPC handlers (`mtp:detectDevices`, `mtp:scanDevicePhotos`, `mtp:transferPhotos`) through secure preload context bridge.
  - Built `MtpImportModal` component in `apps/windows` with candidate selection, batch check toggles, destination folder selector, real-time MB/s progress speedometer, and completion states.
  - Upgraded main window with dynamic USB MTP detection banner and live hardware sidebar status indicator.
  - Added unit and integration tests verifying safe device detection, traversal, exclusion skipping, and SHA-256 integrity transfer.
- **Gallery UI/UX & Motion System (Phase 4)**:
  - Built `clusterPhotosByLocation` in `@gallery/shared` to group photographs geographically by city and coordinate clusters, complete with automated unit tests.
  - Implemented `FullscreenViewer` component with 1x-3x pan & drag zoom, keyboard navigation (`ArrowLeft`, `ArrowRight`, `Esc`, `F`, `E`, `I`), double-click toggle, EXIF drawer, and responsive filmstrip thumbnail carousel.
  - Implemented `MapView` component displaying interactive geographic location cards, photo counts, coordinates, and an expandable photo drawer.
  - Implemented `MultiSelectTray` floating glassmorphism dock supporting Select All, Deselect All, Batch Favorite, Batch Move to Vault, and Batch Export.
  - Implemented `TimelineScrubber` sticky rail with year jump tooltips and smooth scroll targeting.
  - Enhanced `PhotoCard` with multi-select checkboxes, favorite heart badges, resolution indicators, and fullscreen zoom actions.
  - Integrated full Phase 4 suite into `apps/windows/src/renderer/App.tsx` with unified state management.
- **Privacy Governance & Secure Vault Engine (Phase 3)**:
  - Created `@gallery/vault-engine` with `VaultManager` providing PBKDF2/SHA-512 Master Key derivation, constant-time `timingSafeEqual` authentication, AES-256-GCM payload encryption, and in-memory key scrubbing.
  - Implemented secure file import with overwrite scrubbing of original plaintext photos before unlinking.
  - Built `ExclusionRegistry` with the **Instant Purge Protocol** to automatically delete disk thumbnails and database rows whenever a directory is excluded.
  - Built desktop UI in `apps/windows` for PIN keypad unlock, vault session locking, and persistent directory exclusion management.
  - Added unit & integration tests covering zero-leakage locked access, key derivation, disk wiping, and thumbnail purging.
- **Native Photo Scanner & Metadata Engine (Phase 2)**:
  - Created `@gallery/metadata-engine` with streaming EXIF and GPS header extraction (`exifr`), camera model/lens/exposure parsing, and MIME detection.
  - Created `@gallery/photo-engine` with asynchronous filesystem directory scanning, cancellation tokens, progress callbacks, and deduplication.
  - Built content-addressable progressive thumbnail cache manager (`256px` grid and `1280px` preview).
  - Integrated Electron native folder dialog and scanning IPC handlers with secure preload bridge in `apps/windows`.
  - Added real-time scan progress overlay, calendar grouping view, and photo EXIF inspector sidebar.
  - Added unit and integration tests with 100% pass rate.
- **Monorepo Architecture (Phase 1)**: Established Turborepo + pnpm workspace managing 4 shared packages (`@gallery/shared`, `@gallery/ui-tokens`, `@gallery/security`, `@gallery/database`) and 2 apps (`@gallery/windows`, `@gallery/android`).
- **Core Security Engine**: Built `ExclusionManager` for canonical inode directory exclusion and `VaultCrypto` for AES-256-GCM hardware-backed vault isolation with 100% unit test coverage.
- **SQLite Database Schema**: High-performance DDL schema with WAL mode, indexing for 100,000+ photo libraries, and automated migration runner.
- **Windows Desktop Application Shell**: Vite 6 + React 18 + Tailwind CSS featuring MTP auto-detection banner, grid density switching, and creative studio non-destructive editor.
- **Android Mobile Application Shell**: React Native 0.76 + Expo 52 shell with Zero Mock Data empty state.
- **Master Architecture Specification** (`plan.md`): Upgraded with exhaustive technical breakdown for Android & Windows platforms.
- **Reference Analysis**: Deep architectural evaluation of Orchard Photos (`chaseleantj/orchard-photos`) and Reddit Claude Local Semantic Search.
- **AI Agent Memory System**: Initialized operational handbook (`AGENTS.md`), project tracker (`PROJECT_STATUS.md`), architecture records (`DECISIONS.md`), task ledger (`TASK_LOG.md`), and defect tracker (`BUG_LOG.md`).
- **Dual-Repository Topology & CI/CD**: Established GitHub Actions workflow (`release-to-public.yml`) for automated building and publishing of Windows EXE and Android APK to a public distribution repository.
- **Automated Release Notes Generator**: Created standalone Node.js utility (`scripts/generate-release-notes.mjs`) to parse Conventional Commits and generate release notes automatically.
- **Host Environment Audit**: Verified Node.js v23.6.1, pnpm 12.5.1, Python 3.12.10, and Git 2.52.0. Documented ADR-001 confirming React Native + Electron TypeScript monorepo as optimal architecture.

---

## [0.1.0-alpha] - 2026-11-08
### Added
- Initial project architecture and design system specifications.

