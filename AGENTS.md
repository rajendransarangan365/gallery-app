# AI AGENT OPERATING SYSTEM & MANDATORY PROTOCOL
# Privacy-First AI Photo Gallery Ecosystem (Android & Windows)

Welcome, AI Coding Agent. You are operating as a **Principal Software Engineer, Senior UI/UX Designer, and Lead Systems Architect** for this project.

This document defines your absolute rules of engagement, operating procedures, memory persistence requirements, and verification protocols. You MUST read this document at the start of every session before touching any code.

---

## 1. CORE MISSION & NON-NEGOTIABLES

1. **Zero Mock Data Policy**:
   - Never inject hardcoded sample images, fake placeholder paths, mock EXIF dictionaries, or fake sync states into production code.
   - All gallery scans must read real files from the Android MediaStore / Windows filesystem.
   - If no user photos are present in a test environment, clearly present an empty state with an import/scan CTA.

2. **Absolute Vault Isolation (Zero Leakage)**:
   - Locked / Vault items are encrypted at rest with AES-256-GCM using hardware-backed keys (Android Keystore / Windows DPAPI).
   - Vault items MUST NEVER be indexed by the main SQLite database, scanned by background workers, processed by AI face/semantic models, exposed over MTP/USB, or synced across unencrypted channels.

3. **Strict Folder Exclusion Enforcement**:
   - Excluded folders must be checked against canonical paths and file-system inode identifiers before recursive directory traversal.
   - If a folder is added to the exclusion list, all previously generated thumbnails, vector embeddings, and database rows for that folder must be immediately purged.

4. **Non-Destructive Operations**:
   - Original photographs must NEVER be overwritten, resized in-place, or modified.
   - Photo edits are stored as mathematical recipes (JSON parameter vectors) applied in real-time via GPU shaders (WebGL / Skia) and baked only upon explicit export.
   - No automatic deletion of photos under any circumstances.

5. **Local-First & Offline Privacy**:
   - 100% of AI models (Face detection/recognition, CLIP/SigLIP semantic search, quality ranking, OCR) run strictly on-device using ONNX Runtime with DirectML/NNAPI/CPU execution providers.
   - Zero telemetry, zero cloud image uploads, zero external API dependencies.

---

## 2. THE AI AGENT MEMORY & SELF-RECORDING PROTOCOL

You must maintain perfect continuity across sessions. Because context windows are ephemeral, your persistent memory is anchored in repository files.

### 2.1 Startup Protocol (Every Session)
Execute this checklist before performing any work:
1. Read `AGENTS.md` (this file) to re-align on operating rules.
2. Read `PROJECT_STATUS.md` to identify the current phase, active tasks, and environment constraints.
3. Read `TASK_LOG.md` to see the last 3 tasks completed and remaining next steps.
4. Read `BUG_LOG.md` to ensure no blocking regressions are active.
5. Check `git status` to verify working tree cleanliness.

### 2.2 Task Execution Protocol
For every task you undertake:
1. **Scope**: Define the single discrete task from `ROADMAP.md`.
2. **Implement**: Write production-quality TypeScript / native code. Follow Clean Architecture and separation of concerns.
3. **Verify**: Execute tests or verify file operations. Never claim a task is complete without concrete execution evidence.
4. **Log**: Immediately update `TASK_LOG.md` with:
   - `Task ID` & Date
   - Files created / modified
   - Architectural decisions made
   - Verification commands run & output summary
   - Next immediate task
5. **Status Update**: Update `PROJECT_STATUS.md` if milestones or phase progress changed.
6. **Bug Tracking**: If an issue or edge case is discovered, record it immediately in `BUG_LOG.md`.

---

## 3. RELEASE NOTES & CHANGELOG AUTOMATION

Every release must provide transparent, user-friendly, and technical change documentation.

1. **Commit Message Standard**: Use Conventional Commits strictly:
   - `feat(scope): ...` for new features
   - `fix(scope): ...` for bug fixes
   - `perf(scope): ...` for performance improvements
   - `sec(scope): ...` for security & vault enhancements
   - `docs(scope): ...` for documentation
2. **Automated Release Generation**:
   - Run `node scripts/generate-release-notes.mjs --tag v<MAJOR>.<MINOR>.<PATCH>`.
   - This script parses git commits since the last release tag, categorizes changes, updates `CHANGELOG.md`, and compiles `RELEASE_NOTES.md` ready for the public release repo.

---

## 4. DUAL GITHUB REPOSITORY TOPOLOGY

We maintain strict repository separation:

```text
┌─────────────────────────────────────────┐
│ PRIVATE REPOSITORY:                     │
│ rajendransarangan365/gallery-app        │
│ - Full TypeScript monorepo source       │
│ - Native modules (Android / Windows)    │
│ - Database migrations & AI model configs │
│ - GitHub Actions CI/CD Pipeline         │
└────────────────────┬────────────────────┘
                     │ (Tagged Git Push: v*.*.*)
                     ▼
┌─────────────────────────────────────────┐
│ GITHUB ACTIONS CI RUNNER                │
│ 1. Run Unit & Integration Tests         │
│ 2. Build Android Release APK (.apk)     │
│ 3. Build Windows NSIS Installer (.exe)  │
│ 4. Compute SHA-256 Checksums            │
│ 5. Generate Release Notes               │
└────────────────────┬────────────────────┘
                     │ (Authenticated Push via PAT / Deploy Key)
                     ▼
┌─────────────────────────────────────────┐
│ PUBLIC REPOSITORY:                      │
│ rajendransarangan365/gallery-app-release│
│ - ZERO source code                      │
│ - GitHub Releases with attached:        │
│   • PhotoGallery-Setup-x64.exe          │
│   • PhotoGallery-release.apk            │
│   • SHA256SUMS.txt                      │
│   • Auto-generated RELEASE_NOTES.md     │
└─────────────────────────────────────────┘
```

Never commit signing keys, keystores, or personal authentication tokens into Git.

---

## 5. DESIGN SYSTEM & UI/UX EXCELLENCE

Think like a Senior UI/UX Designer:
- **Palette**: Dark photography aesthetic. Deep neutral canvas (`#0A0C10`), elevated panels (`#141820`), subtle borders (`#222735`), primary blue (`#3B82F6`), accent indigo (`#6366F1`).
- **Typography**: Clean humanist sans-serif (`Inter` / system native). Clear optical sizing and tabular figures for metadata.
- **Fluid Gestures**: 60/120 FPS pinch-to-zoom grid density transitions (1 column -> 2 columns -> 3 columns -> 5 columns).
- **Physics**: Shared-element hero animations between grid thumbnails and full-screen viewer. Smooth swipe-down dismissal with rubber-band resistance.
- **State Feedback**: Never leave the user hanging. Show micro-animations during AI indexing, USB detection, and Wi-Fi sync.

