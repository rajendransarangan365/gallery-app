# MASTER PROJECT PLAN
# AI-Powered Private Photo Gallery Ecosystem
## Android Mobile + Windows Desktop

**Document Type:** Product Requirements + Technical Architecture + Implementation Roadmap  
**Project Status:** Planning  
**Architecture:** Local-First, AI-Powered, Cross-Platform  
**Primary Platforms:** Android and Windows 10/11  
**Development Approach:** Modular, Incremental, Test-Driven  
**Source Control:** Private GitHub Repository  
**Distribution:** Public GitHub Releases  
**Cloud Dependency:** Not required for core functionality

---

# 1. PROJECT VISION

Build a premium, intelligent, privacy-first photo management ecosystem for Android smartphones and Windows desktop computers.

The application must provide a unified experience across both devices.

The goal is not simply to build a photo gallery.

The goal is to develop an advanced personal photo management system combining:

- Intelligent photo gallery.
- Calendar-based photo browsing.
- Location-based photo browsing.
- Local AI face recognition.
- Object and scene recognition.
- Semantic photo search.
- Automatic photo quality analysis.
- Best photo of the month.
- Professional photo editor.
- Secure private photo vault.
- Folder exclusion and privacy management.
- Mobile-to-desktop photo transfer.
- Two-way device synchronization.
- Animated upload and download experience.
- Intelligent duplicate detection.
- Memories and slideshow generation.
- Social media sharing.
- Complete offline functionality.

The application must work without requiring cloud storage or external AI services.

## Core Product Principles

1. Privacy first.
2. Local-first architecture.
3. Original photographs must remain protected.
4. No mandatory cloud dependency.
5. No mock gallery data.
6. No automatic deletion.
7. No unauthorized folder access.
8. No external AI processing of personal photos.
9. Android and Windows feature parity.
10. Professional UI/UX.
11. Smooth animations.
12. Maintainable and documented architecture.
13. Reliable synchronization.
14. Automated testing and releases.

---

# 2. PRODUCT EXPERIENCE

The user should experience the application as one personal photo ecosystem.

Example:

A user captures 100 photographs using an Android smartphone.

The Android application detects new photographs and indexes them locally.

AI analyzes accessible photographs and identifies:

- People.
- Objects.
- Places.
- Scenes.
- Image quality.
- Similar photographs.
- Text inside images.

The user can browse the gallery by date, location, people, albums or AI search.

When the user connects the phone to a Windows computer, the desktop application detects the device and displays new photographs.

The user selects which photographs to transfer.

The synchronization engine transfers and verifies the selected photographs.

The Windows gallery then indexes the newly imported photographs and makes them available through its own local AI engine.

Both applications maintain independent local databases.

Synchronization transfers permitted files and metadata according to user preferences.

The secure vault and excluded folders are never included in ordinary scanning or synchronization.

---

## 2.1 PRIMARY USER JOURNEYS & INTERACTION FLOWS

### Journey A: The Instant USB Phone-to-Desktop Import
1. User plugs Android smartphone into Windows 10/11 laptop via USB cable.
2. Windows background watcher detects Android Portable Device (WPD MTP interface).
3. The desktop app immediately triggers a non-intrusive, sleek toast / banner:
   > *"📱 Samsung Galaxy S24 Ultra connected. Scanning for new memories..."*
4. The scanner reads `DCIM/Camera` and `Pictures`, extracting file hashes and timestamps without scanning excluded folders or secure vaults.
5. In under 2 seconds, a refined modal emerges:
   > *"Found 47 new photographs taken since your last sync (Nov 2). Shall I transfer them now?"*
6. User clicks **"Transfer All (47 Photos - 312 MB)"** or **"Review & Select"**.
7. Chunked streaming transfer initiates with circular progress, live MB/s speedometer, and animated floating photo thumbnails moving from phone icon to laptop icon.
8. Every photo undergoes SHA-256 integrity verification upon landing on disk.
9. Newly transferred photos are immediately staged for desktop local AI indexing.

### Journey B: Local AI Semantic Search & Face Discovery
1. User navigates to Search bar and types: *"family picnic in the park with golden retriever"*.
2. SigLIP vision-language text-encoder runs locally on DirectML / NNAPI (35ms execution).
3. Query embedding is matched against SQLite vector index (`sqlite-vec`) using cosine similarity.
4. Top 15 photos rank instantaneously with confidence scores.
5. User taps a person's face in the photo: an animated tray slides up revealing all 184 photos featuring that person across the last 5 years.
6. User types their name *"Elena"*; all past and future photos matching that face embedding cluster are automatically indexed under Elena's People album.

### Journey C: Mobile Photoshop-Grade Non-Destructive Editing
1. User selects a sunset landscape in the Android gallery.
2. Taps **Edit**; photo viewer transitions fluidly into the Creative Studio.
3. User applies adjustments: Brightness (+15), Shadows (+25), Warmth (+10), Vignette (12%).
4. Switches to **Tone Curve**: drags Highlights up and Shadows into an S-curve.
5. All adjustments render at 120 FPS via GPU fragment shaders (Skia on mobile, WebGL2 on desktop).
6. User can toggle "Hold to compare before/after" at any time.
7. Taps **Save Copy**; the engine applies the recipe matrix to the full-resolution RAW/JPEG image in background, leaving the original file completely untouched.

---

## 2.2 REFERENCE ARCHITECTURAL BENCHMARKS & LESSONS LEARNED

### Benchmark 1: Orchard Photos (`chaseleantj/orchard-photos`)
**Overview:** A modern, local-first photo management architecture emphasizing privacy, local indexing, and vector embeddings.

**Key Strengths Adopted:**
- **Local-First SQLite Metadata Store:** Storing all photo paths, hashes, and EXIF attributes in SQLite with Write-Ahead Logging (WAL) enabled allows instant reads without blocking background ingest.
- **Two-Tier Thumbnail Caching Pipeline:** Generating small low-res thumbnails (256x256 WebP) for lightning-fast 120 FPS grid scrolling, and higher-res preview cache (1280x1280 WebP) for detail view.
- **Separation of Scanner from Ingest Worker:** Background scanning only identifies changed files by `(size, mtime)` before pushing items into an AI inference queue, keeping UI 100% responsive.

**Architectural Improvements Over Orchard:**
- **Zero-Knowledge Hardware-Backed Vault:** While Orchard focuses on general library browsing, our system introduces a cryptographically isolated Vault with AES-256-GCM and Android Keystore / Windows DPAPI hardware binding.
- **Direct USB MTP Auto-Detection:** Native Windows WPD integration to prompt for photo transfer upon cable connection.
- **Embedded Mobile Photoshop Shaders:** Full-featured non-destructive tone curves and HSL mixer implemented via Skia/WebGL shaders.

---

### Benchmark 2: Local Claude / CLIP Desktop Semantic Search App
*(Reference: reddit.com/r/ClaudeAI/comments/1x9uwwg/i_made_an_app_to_find_any_photo_on_my_laptop_with/)*

**Overview:** A proof-of-concept demonstrating how modern quantized vision-language models (CLIP ViT-B/32 or SigLIP) can index tens of thousands of personal photos on a consumer laptop in minutes without internet access or high-end GPUs.

**Key Strengths Adopted:**
- **Zero-Cloud Privacy:** Embeddings are generated entirely on-device; images never leave local storage.
- **Natural Language Matching:** Allows searches for concepts, colors, objects, locations, and moods without explicit user tagging (e.g. *"red car parked in rain"*, *"receipt from restaurant"*, *"sunset at snowy mountain"*).
- **Quantized INT8 Inference:** Running quantized models reduces RAM footprint to <150MB and accelerates DirectML inference by 4x.

**Architectural Improvements Over the PoC:**
- **Seamless Vector Search Engine:** Instead of storing raw `.npy` flat arrays that require linear array scanning in Python, we integrate `sqlite-vec` directly inside SQLite, enabling sub-millisecond indexed KNN cosine distance queries alongside standard SQL `WHERE` filters (e.g., `WHERE capture_date > '2025-01-01'`).
- **Unified Cross-Platform Core:** Extending the desktop capability to Android mobile devices using ONNX Runtime mobile with NNAPI / XNNPACK CPU acceleration.

---

# 3. TECHNOLOGY STACK

## 3.1 Android Application

Recommended:

- React Native.
- TypeScript.
- Expo development build with custom native modules.
- React Navigation.
- React Native Reanimated.
- React Native Gesture Handler.
- Native Android MediaStore integration.
- Storage Access Framework.
- Android Keystore.
- Native image-processing integrations.

Important: Do not rely on Expo Go for features requiring native modules.

Use custom native Android modules where required.

## 3.2 Windows Desktop Application

Recommended:

- Electron.
- React.js.
- TypeScript.
- Vite.
- Electron Builder.
- Native Windows filesystem integration.
- Windows MTP integration.
- Windows DPAPI.
- Windows Hello integration.
- Native image processing.

Electron is recommended because it provides a shared React-based development experience while supporting Windows-specific functionality.

## 3.3 Shared Application Architecture

Use:

- pnpm workspaces.
- Turborepo.
- TypeScript.
- Shared business logic.
- Shared validation schemas.
- Shared database definitions.
- Shared AI interfaces.
- Shared synchronization protocol.
- Shared design tokens.

Do not force identical implementations for Android and Windows.

Use platform-specific adapters.

## 3.4 UI Libraries

Android:

- React Native Paper or a custom component library.
- React Native Reanimated.
- React Native Gesture Handler.
- Lucide React Native icons.

Windows:

- Tailwind CSS.
- Radix UI.
- Motion.
- Lucide React.

Create a shared design-token system.

Do not combine multiple UI libraries unnecessarily.

## 3.5 Database

Primary database:

SQLite.

Use SQLCipher for sensitive database information.

Responsibilities:

- Photo metadata.
- Albums.
- Favorites.
- AI classifications.
- Face clusters.
- Search indexes.
- Edit history.
- Sync history.
- Device registry.
- Folder exclusions.
- Application settings.

MongoDB is not required for the core application.

Do not introduce an online database as a mandatory dependency.

## 3.6 Local AI Engine

Recommended technologies:

- ONNX Runtime.
- OpenCV.
- DirectML for Windows acceleration.
- Android NNAPI or supported native acceleration.
- CPU fallback.
- Model-specific native optimizations.

All AI inference must happen locally.

## 3.7 ARCHITECTURAL DECISION: REACT ECOSYSTEM VS FLUTTER (DART)

### Local Environment Verification (November 2026 Audit)
The developer environment was audited directly on this Windows host:
- **Node.js**: `v23.6.1` (Active & Ready)
- **pnpm**: `12.5.1` (Active & Ready)
- **npm**: `10.9.2` (Active & Ready)
- **Python**: `3.12.10` (Active & Ready)
- **Git**: `2.52.0.windows.1` (Active & Ready)
- **Flutter SDK**: *Not Installed* (Command not recognized)

### In-Depth Trade-Off Analysis

| Architectural Dimension | React Ecosystem (React Native + Electron) | Flutter (Dart) |
|---|---|---|
| **Immediate Toolchain Compatibility** | **Superior (100% Ready)**: Zero installation overhead. Developers and AI agents can build, test, and run scripts immediately with existing Node v23 and pnpm 12. | **Requires Heavy Setup**: Would require multi-gigabyte Flutter SDK download, Android SDK cmdline-tools, Visual Studio 2022 C++ desktop workload, and PATH configuration. |
| **Windows Desktop & Native Hardware** | **Superior**: Electron provides direct access to Node.js native C++ addons (`node-mtp`, Windows Portable Devices COM APIs, Windows DPAPI for keystore, DirectML for ONNX Runtime). | **Moderate**: Requires custom Win32 C++ FFI / Platform Channels for MTP and Windows Portable Devices; smaller desktop package ecosystem. |
| **Code Sharing & Monorepo** | **75-80% Code Reuse**: All database migrations, schemas (Kysely/Drizzle), sync protocols (SyncFlow), EXIF parsers, AI interfaces, and validation logic live in shared TypeScript packages. | **85-90% Code Reuse**: Single language (Dart), but desktop window management, multi-pane navigation, and mouse cursors still require separate UI trees. |
| **Local AI & On-Device ML** | **Battle-Tested**: `onnxruntime-node` with DirectML acceleration on Windows and `onnxruntime-react-native` with NNAPI on Android. | **Developing**: `onnxruntime_flutter` exists, but custom DirectML Windows builds require manual CMake linking. |
| **UI Performance & Animations** | **High (60-120 FPS)**: React Native Reanimated 3 runs on UI thread with worklets; Electron uses Chromium GPU hardware acceleration with Tailwind CSS and Radix UI. | **High (60-120 FPS)**: Skia / Impeller rendering engine provides consistent 120 FPS frame timing. |

### Architectural Conclusion
Standardize on the **React Ecosystem (React Native for Android + Electron & React for Windows Desktop)** packaged within a **pnpm + Turborepo monorepo**. This decision delivers instant development velocity on this machine, native access to Windows MTP USB subsystems, and reliable DirectML on-device AI execution.

---

# 4. MONOREPO ARCHITECTURE

Maintain one private source-code monorepo.

Suggested structure:

```text
photo-gallery/
│
├── apps/
│   ├── android/
│   └── windows/
│
├── packages/
│   ├── shared/
│   ├── ui-tokens/
│   ├── database/
│   ├── photo-engine/
│   ├── metadata-engine/
│   ├── ai-core/
│   ├── face-engine/
│   ├── vision-engine/
│   ├── search-engine/
│   ├── image-editor/
│   ├── security/
│   ├── vault-engine/
│   ├── sync-engine/
│   ├── import-engine/
│   ├── storage-engine/
│   └── notification-engine/
│
├── native/
│   ├── android/
│   └── windows/
│
├── models/
│
├── scripts/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   ├── performance/
│   └── e2e/
│
├── docs/
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── PROJECT_STATUS.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── CHANGELOG.md
├── RELEASE_NOTES.md
├── DECISIONS.md
├── TASK_LOG.md
├── BUG_LOG.md
├── TEST_REPORT.md
├── SECURITY.md
├── DATABASE.md
├── AI_MODELS.md
├── UI_UX_GUIDELINES.md
├── BUILD_GUIDE.md
├── GIT_WORKFLOW.md
└── KNOWN_ISSUES.md
```

The architecture must support independent development and testing of every module.

---

# 5. COMPLETE FEATURE REQUIREMENTS

## MODULE 01: INTELLIGENT PHOTO GALLERY

### Features

- Calendar-based photo browsing.
- Daily view.
- Monthly view.
- Yearly view.
- Timeline navigation.
- Grid view.
- List view.
- Masonry view.
- Infinite scrolling.
- Virtualized rendering.
- Multi-selection.
- Favorites.
- Recently added.
- Recently viewed.
- Albums.
- Custom albums.
- Smart albums.
- Sorting and filtering.
- Photo and video support.
- RAW image support where feasible.
- EXIF information.

### Photo viewer

- Full-screen viewing.
- Pinch to zoom.
- Double-tap zoom.
- Swipe navigation.
- Image information.
- Favorite toggle.
- Share.
- Edit.
- Move or organize.
- Compare similar photographs.

### Requirements

Never load every full-resolution image simultaneously.

Generate thumbnails progressively.

Use background processing.

Preserve original files.

---

## MODULE 02: CALENDAR AND TIMELINE

Display photographs based on:

- Capture date.
- Modified date as fallback.
- Import date.
- Year.
- Month.
- Day.

Provide a timeline navigation system.

Allow jumping directly to a specific year or month.

Support photos with missing EXIF dates.

Handle timezone differences carefully.

Do not change original file timestamps during indexing.

---

## MODULE 03: LOCATION-BASED GALLERY

Features:

- Interactive map.
- GPS extraction.
- Location markers.
- Country grouping.
- State grouping.
- City grouping.
- Travel albums.
- Location-based search.
- Manual location correction.
- Unknown location collection.

Use GPS metadata from the photograph.

Reverse geocoding can be optional.

The application must not require internet connectivity for basic location browsing using stored coordinates.

Do not upload GPS information externally.

---

## MODULE 04: AI FACE RECOGNITION

Implement:

- Face detection.
- Face embeddings.
- Similar-face matching.
- Face clustering.
- People albums.
- User-defined names.
- Cluster merging.
- Cluster splitting.
- Multiple face detection.
- Face confidence thresholds.
- Incorrect-match correction.
- Face data deletion.

Suggested technologies:

- SCRFD or RetinaFace.
- ArcFace.
- ONNX Runtime.

### AI Learning Workflow

1. Detect faces in accessible photographs.
2. Generate face embeddings locally.
3. Compare embeddings.
4. Group similar faces.
5. Display suggested people groups.
6. Ask the user to name groups.
7. Allow manual corrections.
8. Reuse approved grouping information.

Do not automatically identify real-world people.

The user must control person naming.

Treat face embeddings as sensitive biometric-like information.

---

## MODULE 05: AI PHOTO CLASSIFICATION

Recognize:

- Animals.
- Birds.
- Vehicles.
- Cars.
- Motorcycles.
- Buildings.
- Nature.
- Mountains.
- Beaches.
- Food.
- Documents.
- Screenshots.
- Memes.
- Receipts.
- Products.
- Indoor and outdoor scenes.
- Events.

Use appropriate local models.

Store classification results in SQLite.

Allow users to correct inaccurate tags.

Avoid running unnecessary inference repeatedly.

---

## MODULE 06: AI SEMANTIC SEARCH

Build a natural-language photo search engine.

Examples:

- Find my motorcycle photos.
- Find photos with my family.
- Show photographs taken at the beach.
- Find pictures containing a red car.
- Find screenshots containing a particular word.
- Show photographs from my Ooty trip.
- Find similar photographs.
- Find pictures with mountains and cloudy weather.

Suggested approach:

- SigLIP 2 or another compatible vision-language embedding model.
- Local embedding database.
- Similarity search.
- Metadata filtering.
- OCR integration.

Use actual indexed photographs.

Do not send photographs to an external AI service.

---

## MODULE 07: PERFECT PHOTO OF THE MONTH

Create an AI feature called:

**Photo of the Month**

Analyze:

- Sharpness.
- Focus.
- Exposure.
- Composition.
- Face visibility.
- Facial expressions.
- Noise.
- Resolution.
- Subject clarity.

Initial scoring configuration:

| Parameter | Weight |
|---|---:|
| Sharpness | 20% |
| Composition | 20% |
| Exposure | 15% |
| Face quality | 20% |
| Noise | 10% |
| Subject clarity | 15% |

These weights must be configurable.

### Workflow

1. Identify photographs from the selected month.
2. Group similar and burst photographs.
3. Identify technically poor photographs.
4. Analyze remaining photographs.
5. Generate quality scores.
6. Rank candidates.
7. Explain why each photograph was selected.
8. Let the user compare candidates.
9. Allow manual winner selection.
10. Save the selected photograph as a monthly highlight.

Never modify original photographs.

---

## MODULE 08: PROFESSIONAL PHOTO EDITOR

Create a mobile Photoshop/Lightroom-inspired editing experience.

### Basic editing

- Crop.
- Rotate.
- Straighten.
- Flip.
- Perspective correction.
- Brightness.
- Contrast.
- Exposure.
- Highlights.
- Shadows.
- Saturation.
- Temperature.
- Tint.

### Advanced editing

- HSL.
- Curves.
- Sharpening.
- Noise reduction.
- Vignette.
- Blur.
- Selective adjustments where feasible.
- Filters.
- Presets.
- Color grading.

### Editing workflow

- Before/after comparison.
- Undo/redo.
- Edit history.
- Reset adjustments.
- Nondestructive editing.
- Export settings.
- Resolution selection.
- JPEG quality selection.
- PNG export where appropriate.

Maintain original images separately.

Store edit parameters as a versioned editing recipe.

Do not overwrite the original photograph.

---

## MODULE 09: SECURE PHOTO VAULT

Create a separate encrypted photo storage system.

Features:

- Password.
- PIN.
- Biometric unlock.
- Windows Hello where supported.
- Automatic locking.
- Separate vault database.
- Encrypted thumbnails.
- Encrypted metadata.
- Recovery key.
- Manual recovery procedure.

Security technologies:

- AES-256-GCM.
- Android Keystore.
- Windows DPAPI.
- OS-protected key storage.

### Absolute restrictions

Vault content must never:

- Appear in normal gallery.
- Appear in AI indexing.
- Appear in face recognition.
- Appear in semantic search.
- Appear in USB import.
- Appear in normal synchronization.
- Appear in desktop scanning.

Never use simple folder hiding as the security implementation.

Vault content must be isolated from the normal photo engine.

Do not transfer vault keys between devices automatically.

---

## MODULE 10: EXCLUDED FOLDER MANAGEMENT

Create a persistent exclusion manager.

Users must be able to:

- Add excluded folders.
- Remove excluded folders from the exclusion list.
- Exclude parent directories.
- Exclude nested directories.
- View exclusion status.

### Strict exclusion rules

Excluded folders must never be:

- Scanned.
- Read.
- Hashed.
- Indexed.
- Analyzed.
- Thumbnailed.
- Classified.
- Processed by OCR.
- Processed by face recognition.
- Imported.
- Synchronized.

Check exclusion rules before directory traversal.

Apply exclusions before accessing image contents.

If a folder is newly excluded, purge its existing normal-index metadata, thumbnails, embeddings and caches.

If the application cannot establish whether access is permitted, skip the content.

Apply these rules consistently on Android and Windows.

---

## MODULE 11: PHONE-TO-WINDOWS IMPORT CENTER

Create a dedicated Windows Phone Import Center.

### USB workflow

1. Connect Android phone.
2. Detect MTP device.
3. Read accessible media.
4. Compare with desktop library.
5. Identify new photographs.
6. Identify new videos.
7. Display thumbnail previews.
8. Display file sizes.
9. Display total import size.
10. Ask user for confirmation.
11. Allow individual or bulk selection.
12. Transfer selected files.
13. Verify transferred content.
14. Update desktop library.
15. Display completion summary.

### Important

MTP is not equivalent to unrestricted filesystem access.

Use Android MTP for accessible media import.

For bidirectional USB synchronization, investigate a companion connection over USB networking or an optional ADB-based development/power-user mode.

Do not promise unrestricted USB read/write access without a verified implementation.

### Import options

- Copy into desktop library.
- Copy into a selected directory.
- Import selected albums.
- Import only new files.
- Import selected date ranges.

Never delete the phone's original files after import.

---

# 6. DEVICE SYNCHRONIZATION ECOSYSTEM

Create a dedicated synchronization system named:

**SyncFlow**

It must support Android and Windows.

## 6.1 Supported Connections

- USB.
- Wi-Fi LAN.
- Mobile hotspot.
- Direct local device connection.

Internet connectivity must not be required for local synchronization.

## 6.2 Synchronization Operations

- Android to Windows.
- Windows to Android.
- Two-way synchronization.
- Selective synchronization.
- Album synchronization.
- Folder synchronization.
- Incremental synchronization.
- Manual synchronization.
- User-configured automatic synchronization.

## 6.3 Device Pairing

Implement:

- Device discovery.
- QR-code pairing.
- Approval on both devices.
- Device identity.
- Authentication.
- Encrypted connections.
- Trusted device management.
- Revoke device access.
- Disconnect.
- Reconnect.

Use authenticated local connections.

Use TLS with device identity and proper certificate validation.

Avoid exposing the sync service publicly.

## 6.4 Synchronization Manifest

Each device must maintain a local synchronization manifest.

Track:

- Device ID.
- File identity.
- Content hash.
- File size.
- Modification metadata.
- Synchronization status.
- Transfer direction.
- Last successful transfer.
- Transfer progress.
- Conflict status.

Do not use filenames alone to identify photographs.

## 6.5 Transfer Engine

Implement:

- Chunk-based transfer.
- SHA-256 verification.
- Temporary transfer files.
- Atomic finalization.
- Resume interrupted transfers.
- Retry.
- Pause.
- Cancel.
- Error reporting.
- Transfer history.

Never mark a transfer successful before checksum verification.

## 6.6 Conflict Management

Never silently overwrite original files.

When conflicting versions are detected, offer:

- Keep Android version.
- Keep Windows version.
- Keep both.
- Review manually.

Maintain a conflict history.

## 6.7 Synchronization Restrictions

- Excluded folders are never traversed.
- Vault content is never synchronized.
- No automatic deletion.
- No automatic overwriting.
- No automatic destructive changes.
- No unrestricted filesystem sharing.

Use explicit user consent.

---

# 7. ANIMATED SYNC CENTER

Create a premium synchronization interface.

### Required animations

| Event | Animation |
|---|---|
| Device discovery | Radar scanning |
| Pairing | Animated device connection |
| Connected | Illuminated connection line |
| Upload | Thumbnail travelling to destination |
| Download | Thumbnail travelling to destination |
| Two-way sync | Bidirectional animated arrows |
| Verification | Circular verification indicator |
| Duplicate detection | Thumbnail grouping |
| Paused | Pause animation |
| Connection lost | Broken connection |
| Reconnecting | Reconnection sequence |
| Failed transfer | Error animation |
| Completed transfer | Success animation |
| Sync resumed | Progress continuation |

### Sync Dashboard

Display:

- Connected devices.
- Device names.
- Connection type.
- Upload speed.
- Download speed.
- Files transferred.
- Total transfer size.
- Remaining files.
- Estimated time.
- Active transfers.
- Failed transfers.
- Completed transfers.
- Last synchronization.

Controls:

- Pause.
- Resume.
- Cancel.
- Retry.
- Disconnect.
- Manage devices.

Animations must reflect actual transfer state.

Never show a successful transfer animation before successful verification.

Respect reduced-motion settings.

---

# 8. SOCIAL MEDIA SHARING

Implement native sharing.

Support:

- WhatsApp.
- Instagram.
- Facebook.
- Telegram.
- Windows Share.

Features:

- Single-image sharing.
- Multi-image sharing.
- Resizing.
- Compression.
- Export quality.
- Preserve original.
- Share edited copy.
- Temporary export files with appropriate cleanup.

Use native platform share interfaces.

---

# 9. SMART STORAGE MANAGEMENT

Build a Storage Intelligence dashboard.

Display:

- Total gallery size.
- Image storage.
- Video storage.
- Large files.
- Duplicate photographs.
- Similar photographs.
- Screenshots.
- Blurry photographs.
- Old downloads.
- Cache usage.

Provide cleanup suggestions.

Never automatically delete.

Require explicit confirmation for every destructive operation.

---

# 10. MEMORIES AND SLIDESHOW

Implement:

- On this day.
- Monthly memories.
- Yearly memories.
- Travel memories.
- Event grouping.
- Automatic albums.
- Slideshow.
- Cinematic transitions.
- Animated album covers.

Memories must be generated from actual user content.

Allow exclusion of private albums.

Never include vault photographs.

---

# 11. UI/UX DESIGN SYSTEM

The product should look like premium photography software.

Design direction:

- Dark-first interface.
- Light theme.
- Minimal visual clutter.
- Large photography previews.
- Clear typography.
- Professional controls.
- Responsive layouts.
- Smooth transitions.
- Accessible interactions.

## Android Navigation

Bottom navigation:

1. Photos.
2. Search.
3. Memories.
4. Albums.
5. Settings.

Additional sections:

- People.
- Places.
- Favorites.
- Secure Vault.
- Sync Center.

## Windows Navigation

Left sidebar:

- Photos.
- Calendar.
- People.
- Places.
- Albums.
- Favorites.
- Memories.
- Secure Vault.
- Sync Center.

Main content:

- Photo grid.
- Timeline.
- Search results.
- Map.
- Editor.

Right inspector:

- EXIF information.
- AI tags.
- Location.
- Dimensions.
- File details.
- Edit history.

Top toolbar:

- Search.
- Import.
- Sync.
- Filter.
- Sort.
- Grid/list switch.

## Responsive Requirements

Android:

- Small phones.
- Large phones.
- Tablets.
- Portrait.
- Landscape.

Windows:

- Small desktop screens.
- Full HD.
- 2K.
- 4K.
- Resizable windows.

Do not use fixed-width layouts that break at different resolutions.

---

# 12. COMPLETE ANIMATION SYSTEM

Create a shared motion design specification.

Required animations:

- Logo reveal.
- Startup animation.
- Gallery loading.
- Thumbnail shimmer.
- Shared-element image transitions.
- Album opening.
- Timeline navigation.
- Image viewer.
- Face scanning.
- AI analysis.
- Search result transitions.
- Photo editing.
- Favorites.
- Vault locking.
- Vault unlocking.
- USB device discovery.
- Upload.
- Download.
- Two-way synchronization.
- Verification.
- Memories slideshow.
- Import progress.
- Notifications.

Use React Native Reanimated on Android.

Use Motion on Windows.

Animations must be efficient and must not affect scrolling or image rendering.

---

# 13. LOCAL AI ARCHITECTURE

Create independent AI engines.

| Capability | Candidate technology |
|---|---|
| Face detection | SCRFD / RetinaFace |
| Face recognition | ArcFace |
| Object classification | MobileNet / EfficientNet |
| Semantic image search | SigLIP 2 |
| OCR | PaddleOCR / Tesseract |
| Image similarity | ONNX embeddings |
| Blur detection | OpenCV |
| Quality assessment | NIMA-style model |
| Image enhancement | OpenCV / ONNX |

Validate model licensing before distribution.

Provide CPU fallback.

Do not assume every device has GPU acceleration.

Use background processing and inference queues.

Do not process excluded or vault photographs.

---

# 14. DATABASE ARCHITECTURE

Use SQLite with versioned migrations.

Suggested tables:

## photos

- id
- content_hash
- file_uri
- filename
- file_size
- mime_type
- width
- height
- capture_date
- imported_date
- latitude
- longitude
- camera_model
- orientation
- indexing_status

## albums

- id
- name
- description
- created_at
- updated_at

## album_photos

- album_id
- photo_id
- sort_order

## faces

- id
- photo_id
- face_embedding_reference
- bounding_box
- confidence
- cluster_id

## people

- id
- display_name
- representative_photo_id
- created_at

## ai_tags

- id
- photo_id
- category
- label
- confidence
- model_version

## photo_edits

- id
- photo_id
- edit_version
- edit_parameters
- created_at

## exclusions

- id
- canonical_location
- exclusion_type
- recursive
- created_at

## devices

- id
- device_name
- device_type
- public_identity
- trusted_status
- last_seen

## sync_manifest

- id
- device_id
- content_hash
- file_reference
- transfer_status
- transfer_direction
- last_verified

## sync_history

- id
- device_id
- operation
- status
- started_at
- completed_at
- transferred_bytes

## app_settings

- id
- setting_key
- setting_value

Vault metadata and encryption keys must be isolated from normal gallery data.

Use appropriate encryption and separate storage boundaries.

Do not store raw biometric embeddings unprotected.

Implement database migration and backup tests.

---

# 15. PERFORMANCE ENGINEERING

Target large personal photo libraries.

Design for:

- 10,000 photographs.
- 50,000 photographs.
- 100,000 photographs.
- Large video collections.

These are target test sizes, not guaranteed performance claims.

Implement:

- Incremental scanning.
- Background jobs.
- Thumbnail caching.
- Lazy loading.
- Virtualized lists.
- Batch AI inference.
- Cancellation.
- Resumable indexing.
- Memory management.
- Progressive image decoding.
- Duplicate detection.
- Database indexing.

Do not decode thousands of original photographs simultaneously.

Do not run AI inference on the UI thread.

Avoid unnecessary model execution.

Measure performance on low-, mid- and high-end hardware.

---

# 16. SECURITY ARCHITECTURE

Security must be designed before implementing the gallery scanner and sync engine.

Requirements:

- Encrypted sensitive data.
- Secure key storage.
- Secure IPC.
- Electron context isolation.
- No Node integration in renderer.
- Input validation.
- Path traversal prevention.
- Symbolic-link handling.
- Secure file access.
- Safe database migrations.
- Dependency auditing.
- No embedded credentials.
- No uncontrolled network listeners.
- No sensitive diagnostic logging.

### Privacy policy

Never transmit photographs, face embeddings, GPS information, OCR results or private filenames externally without explicit, separate consent.

Core AI features must remain local.

---

# 17. AI CODING AGENT MEMORY SYSTEM

The coding agent must maintain project knowledge across sessions.

Create these mandatory files:

| File | Purpose |
|---|---|
| AGENTS.md | Master instructions |
| PROJECT_STATUS.md | Current implementation status |
| ARCHITECTURE.md | Technical architecture |
| ROADMAP.md | Development roadmap |
| CHANGELOG.md | Technical changes |
| RELEASE_NOTES.md | User-facing releases |
| DECISIONS.md | Architecture decisions |
| TASK_LOG.md | Agent work history |
| BUG_LOG.md | Bug history |
| TEST_REPORT.md | Test results |
| SECURITY.md | Security policies |
| DATABASE.md | Database design |
| AI_MODELS.md | Model versions and licenses |
| UI_UX_GUIDELINES.md | Design specifications |
| BUILD_GUIDE.md | Build instructions |
| GIT_WORKFLOW.md | Git procedures |
| KNOWN_ISSUES.md | Known limitations |

## Session startup workflow

At every new session:

1. Read AGENTS.md.
2. Read PROJECT_STATUS.md.
3. Read ARCHITECTURE.md.
4. Read ROADMAP.md.
5. Read CHANGELOG.md.
6. Read KNOWN_ISSUES.md.
7. Inspect Git status.
8. Inspect recent commits.
9. Inspect incomplete tasks.
10. Identify the next task.

## After every meaningful task

Record:

- Task ID.
- Date.
- Implementation summary.
- Files changed.
- Architectural decisions.
- Tests performed.
- Test results.
- Bugs identified.
- Remaining work.
- Next task.

Do not erase historical records.

Do not fabricate completion.

Do not mark a feature complete merely because code was generated.

Require successful tests and acceptance criteria.

---

# 18. TWO GITHUB REPOSITORIES

## Repository 1: Private Source Code

Example:

photo-gallery-core

Contains:

- Android source.
- Windows source.
- Shared packages.
- AI integrations.
- Database migrations.
- Tests.
- Documentation.
- Build scripts.
- CI/CD workflows.

Never make this repository public.

## Repository 2: Public Releases

Example:

photo-gallery-releases

Contains only:

- Windows EXE installers.
- Android APK installers.
- Release notes.
- Version history.
- SHA-256 checksums.
- Signatures.
- Installation instructions.

Never upload the complete private source repository here.

## Automated Release Pipeline

Private repository:

1. Developer or AI agent commits code following Conventional Commits (`feat:`, `fix:`, `perf:`, `sec:`).
2. Push tags matching `v*.*.*` (e.g., `git tag v1.0.0 && git push origin v1.0.0`).
3. GitHub Actions triggers `.github/workflows/release-to-public.yml`.
4. Automated steps:
   - Lint, type-check, and unit test execution across all workspaces.
   - Build Windows NSIS installer (`PhotoGallery-Setup-x64.exe`).
   - Build Android Universal Release APK (`PhotoGallery-release.apk`).
   - Run `scripts/generate-release-notes.mjs --version $TAG` to parse commit delta.
   - Calculate SHA-256 cryptographic hashes for all build artifacts into `SHA256SUMS.txt`.
   - Publish tagged GitHub Release directly to the public repository (`photo-gallery-releases`) using `PUBLIC_REPO_TOKEN`.
   - Zero source code is uploaded to the public repository.

Use GitHub Actions with semantic versioning:
`MAJOR.MINOR.PATCH` (e.g., `1.0.0`, `1.1.0`, `1.1.1`).

Do not publish if critical tests fail.
Never expose signing keys or credentials.

---

# 19. RELEASE NOTES AUTOMATION

The AI agent must automatically update release documentation without manual formatting overhead.

### Automation Tooling
The standalone Node.js automation utility is located at:
`scripts/generate-release-notes.mjs`

### Execution Syntax
```bash
# Dry run to preview output in console
node scripts/generate-release-notes.mjs --dry-run

# Production update for target release version
node scripts/generate-release-notes.mjs --version 1.0.0
```

### Commit Parsing Standard
The script parses commits between the previous tag and `HEAD` according to Conventional Commits:
- `feat(...)`: Added to **🚀 New Features**
- `fix(...)`: Added to **🐛 Bug Fixes**
- `sec(...)`: Added to **🔒 Security & Privacy**
- `perf(...)`: Added to **⚡ Performance Improvements**
- `docs(...)`: Added to **📚 Documentation**
- `refactor(...)`: Added to **🛠️ Maintenance & Refactoring**

The script automatically prepends the changelog entry into `CHANGELOG.md` under `## [Unreleased]` and writes the release body directly into `RELEASE_NOTES.md`.
- Identify security improvements.
- Identify performance improvements.
- Identify breaking changes.
- Identify known limitations.

Generate user-friendly release notes.

Example:

# Version 1.2.0

## New Features
- Added AI people grouping.
- Added Wi-Fi device synchronization.
- Added photo quality ranking.

## Improvements
- Improved gallery loading.
- Reduced thumbnail memory usage.

## Bug Fixes
- Fixed duplicate import detection.
- Fixed calendar timezone handling.

## Security
- Improved vault isolation.

## Known Issues
- RAW preview support is limited for selected formats.

Do not claim functionality that was not implemented and verified.

---

# 20. TESTING STRATEGY

Implement:

- Unit testing.
- Integration testing.
- End-to-end testing.
- Security testing.
- Performance testing.
- Database migration testing.
- AI model testing.
- Device compatibility testing.

Test these critical areas:

1. Photo scanning.
2. Calendar grouping.
3. EXIF extraction.
4. GPS extraction.
5. Face clustering.
6. Semantic search.
7. Duplicate detection.
8. Image editing.
9. Secure vault isolation.
10. Excluded-folder enforcement.
11. USB importing.
12. Wi-Fi synchronization.
13. Interrupted transfers.
14. Checksum verification.
15. Conflict resolution.
16. Offline functionality.
17. Release installation.
18. Application updates.

Use test fixtures in isolated test environments.

Never introduce fake photographs into the production gallery.

---

# 21. DEVELOPMENT ROADMAP

Development must happen incrementally.

## PHASE 0: Architecture and Planning

Tasks:

- Requirement analysis.
- Reference analysis.
- Technical architecture.
- Security architecture.
- Database schema.
- UI/UX design.
- Monorepo creation.
- Git repository setup.
- AI agent instructions.
- Documentation creation.

Deliverable:

Approved technical architecture and working development environment.

## PHASE 1: Application Foundation

Tasks:

- Android application shell.
- Windows application shell.
- Shared TypeScript packages.
- Design tokens.
- Navigation.
- Theme management.
- Local SQLite.
- Logging.
- Error handling.
- CI setup.

Deliverable:

Both applications launch successfully.

## PHASE 2: Photo Scanning Engine

Tasks:

- Android media scanning.
- Windows directory scanning.
- EXIF extraction.
- Thumbnail generation.
- Database indexing.
- Incremental scanning.
- Progress reporting.
- Cancellation.
- Exclusion registry.

Deliverable:

Real photographs appear in both galleries.

## PHASE 3: Privacy and Vault

Tasks:

- Excluded-folder enforcement.
- Secure storage.
- Key management.
- PIN/password.
- Biometric integration.
- Windows Hello.
- Vault database.
- Vault isolation.
- Security tests.

Deliverable:

Verified private photo management foundation.

## PHASE 4: Gallery Experience

Tasks:

- Calendar.
- Grid.
- List.
- Masonry.
- Timeline.
- Albums.
- Favorites.
- Photo viewer.
- Multi-selection.
- Filtering.
- Sorting.

Deliverable:

Fully functional basic photo gallery on both platforms.

## PHASE 5: Import Center

Tasks:

- MTP detection.
- Phone identification.
- Accessible media listing.
- New-photo comparison.
- Duplicate detection.
- Import preview.
- Selective transfer.
- Verification.
- Resume.
- Import history.

Deliverable:

Reliable Android-to-Windows importing.

## PHASE 6: Device Synchronization

Tasks:

- Device discovery.
- QR pairing.
- Device authentication.
- Wi-Fi connection.
- Hotspot connection.
- USB companion connection investigation and implementation.
- Manifest.
- Chunk transfer.
- Upload.
- Download.
- Two-way sync.
- Conflict handling.
- Resume.
- Verification.
- Sync Center.
- Animated transfer states.

Deliverable:

Reliable local device synchronization.

## PHASE 7: AI Intelligence

Tasks:

- ONNX Runtime.
- Model management.
- Face detection.
- Face embeddings.
- Clustering.
- People albums.
- Object recognition.
- Scene classification.
- OCR.
- Similarity search.
- Semantic search.

Deliverable:

Fully local AI photo intelligence.

## PHASE 8: Photo Quality Intelligence

Tasks:

- Sharpness detection.
- Exposure evaluation.
- Composition analysis.
- Face quality.
- Burst grouping.
- Duplicate grouping.
- Monthly ranking.
- User selection.
- Monthly highlights.

Deliverable:

Photo of the Month.

## PHASE 9: Professional Editor

Tasks:

- Crop.
- Rotate.
- Exposure.
- Color adjustments.
- HSL.
- Curves.
- Filters.
- Presets.
- Undo/redo.
- Edit history.
- Nondestructive export.

Deliverable:

Professional mobile and desktop editor.

## PHASE 10: Memories and Sharing

Tasks:

- Travel memories.
- Monthly memories.
- Yearly memories.
- Slideshow.
- Cinematic transitions.
- Social sharing.
- Export optimization.

Deliverable:

Complete photo memory experience.

## PHASE 11: Performance and Polish

Tasks:

- Large-library testing.
- Memory optimization.
- Animation optimization.
- Battery optimization.
- Low-end device testing.
- UI consistency.
- Accessibility.
- Reduced-motion support.

Deliverable:

Production-quality experience.

## PHASE 12: Production Release

Tasks:

- Full regression testing.
- Security audit.
- Build automation.
- APK signing.
- EXE signing.
- Release automation.
- Changelog generation.
- Public GitHub releases.
- Installation verification.
- Upgrade verification.

Deliverable:

First stable public release.

---

# 22. MVP DEFINITION

Do not attempt to release every feature in the first version.

The first usable version should contain:

### Android
- Photo scanning.
- Calendar.
- Grid and list.
- Albums.
- Favorites.
- Excluded folders.
- Secure vault.

### Windows
- Photo scanning.
- Calendar.
- Grid and list.
- Albums.
- Favorites.
- Excluded folders.
- Secure vault.
- Android USB import.

### Shared
- Local database.
- Duplicate detection.
- Original-file protection.
- Documentation.
- Error handling.
- Basic animations.

After the MVP, implement SyncFlow and local AI incrementally.

Do not compromise vault security or exclusion enforcement to accelerate the MVP.

---

# 23. ACCEPTANCE CRITERIA

The application is production-ready only when:

- Android and Windows applications install successfully.
- Both applications work offline.
- Actual user photographs are displayed.
- No mock gallery data exists.
- Calendar grouping works.
- GPS grouping works where metadata is available.
- Excluded folders are never scanned.
- Secure vault content remains isolated.
- AI inference works locally.
- Original images remain unchanged.
- Editing is nondestructive.
- Duplicate detection works.
- USB import works.
- Wi-Fi synchronization works.
- Transfer integrity is verified.
- Interrupted transfers resume.
- Conflicts are handled safely.
- Sync animations reflect actual states.
- No automatic destructive actions occur.
- Database migrations are safe.
- Security tests pass.
- Documentation is current.
- Release notes are generated correctly.
- APK and EXE installation tests pass.

---

# 24. FIRST INSTRUCTION TO THE AI CODING AGENT

Do not generate the complete application immediately.

Start by inspecting the repository and environment.

Then:

1. Analyze the entire project requirement.
2. Evaluate the Orchard Photos reference architecture.
3. Prepare a detailed system architecture.
4. Identify Android native requirements.
5. Identify Windows native requirements.
6. Define the shared application architecture.
7. Define database schemas.
8. Design AI processing pipelines.
9. Design secure vault architecture.
10. Design excluded-folder enforcement.
11. Design the synchronization protocol.
12. Design the animation system.
13. Create the UI/UX design system.
14. Create the monorepo.
15. Create all mandatory documentation.
16. Prepare a detailed task breakdown.
17. Define acceptance criteria.
18. Present the architecture for review.

After completing planning, begin Phase 1.

Work incrementally.

Do not skip tasks.

Do not silently replace required functionality with mock implementations.

Do not claim completion without verification.

---

## 24.1 MASTER SYSTEM PROMPT FOR AI CODING AGENTS

When launching an AI coding agent session to work on this codebase, provide the following verbatim prompt:

```text
You are the Lead Systems Architect, Senior Software Engineer, and Senior UI/UX Designer for the Privacy-First AI Photo Gallery Ecosystem (Android + Windows).

Your objective is to build a production-grade, offline-first personal photo ecosystem across Android (React Native) and Windows Desktop (Electron + React) using the blueprint defined in D:\gallery app\plan.md.

### MANDATORY RULES OF ENGAGEMENT:
1. ZERO MOCK DATA: Never introduce fake photographs, placeholder arrays, hardcoded EXIF metadata, or simulated sync states into production code. Real files must be discovered, scanned, and indexed from the device storage.
2. ABSOLUTE VAULT ISOLATION: Locked photos must be encrypted with AES-256-GCM using hardware-backed keys (Android Keystore / Windows DPAPI) in an isolated database. They must NEVER be scanned by background indexers, processed by AI models, exposed to desktop MTP USB connections, or transferred over sync channels.
3. STRICT FOLDER EXCLUSION: Excluded folders must be validated by canonical path and file-system inode before traversal. When a folder is excluded, instantly purge all existing thumbnails, embeddings, and database rows for that path.
4. NON-DESTRUCTIVE PHOTO PROCESSING: Original user photos must NEVER be modified or overwritten. All edits are stored as mathematical recipe parameters rendered via GPU shaders (Skia/WebGL) and exported only to a separate file copy upon explicit user command.
5. LOCAL-FIRST AI INFERENCE: 100% of face recognition (SCRFD + ArcFace), semantic search (SigLIP), and quality scoring must execute locally on-device via ONNX Runtime (DirectML / NNAPI). No photos leave the device.
6. AUTOMATIC MEMORY LOGGING: At the start of every session, read AGENTS.md, PROJECT_STATUS.md, and TASK_LOG.md. At the end of every discrete task, record your work, files modified, architectural decisions, and test outputs in TASK_LOG.md, and track any issues in BUG_LOG.md. Never delete historical entries.
7. AUTOMATED RELEASE NOTES: For each version release, execute `node scripts/generate-release-notes.mjs --version <TAG>` to parse Conventional Commits and auto-update CHANGELOG.md and RELEASE_NOTES.md.
8. DUAL-REPOSITORY RELEASES: Ensure CI/CD workflows (.github/workflows/release-to-public.yml) build Windows installers (.exe) and Android APKs (.apk) and publish only binaries, checksums, and release notes to the public distribution repo, keeping all source code strictly in the private repo.

Start by inspecting D:\gallery app\PROJECT_STATUS.md and D:\gallery app\ROADMAP.md, pick the next uncompleted task, execute with thorough tests, and log your progress.
```

---

# 25. FINAL PRODUCT OBJECTIVE

Deliver a premium, secure, offline-first, AI-powered personal photo ecosystem.

The Android and Windows applications must provide:

- Intelligent photo organization.
- Local AI recognition.
- Natural-language photo search.
- Professional photo editing.
- Secure photo storage.
- Folder exclusion.
- Device discovery.
- Uploading.
- Downloading.
- Two-way synchronization.
- Animated transfer experiences.
- Memories.
- Social sharing.
- Reliable automated releases.

The software must be maintainable by future AI coding agents and human developers.

The architecture, implementation history, decisions, tests, bugs and release notes must remain documented throughout the project's lifetime.

**The final product must be a real, usable application, not a visual prototype or demonstration.**