# ARCHITECTURE DECISION RECORDS (ADR)
# Privacy-First AI Photo Gallery Ecosystem

This document records the architectural and technology decisions made for the project, their rationale, context, and implications.

---

## ADR-001: Technology Stack Selection — React Native + Electron/React vs Flutter

### Context
The application requires high-performance, native-grade execution across both **Android Mobile** and **Windows Desktop (10/11)**. Features include 60/120 FPS infinite grid rendering, local AI vector search, camera/MediaStore indexing, native MTP USB detection, hardware keystore integration, and non-destructive image editing.
We evaluated two primary cross-platform paradigms:
1. **React Ecosystem**: React Native (Android) + Electron with Vite & React.js (Windows Desktop) in a TypeScript Turborepo / pnpm monorepo.
2. **Flutter Ecosystem**: A single Flutter / Dart codebase targeting Android and Windows Desktop.

### Environment Audit
- Host machine has Node.js `v23.6.1`, pnpm `12.5.1`, npm `10.9.2`, Python `3.12.10`, and Git `2.52.0`.
- Flutter is **not installed** on this machine.

### Evaluation Matrix

| Criteria | React Native + Electron / React | Flutter (Dart) |
|---|---|---|
| **Host Toolchain Fit** | **Instant (100% matched)**: Node v23 & pnpm 12 already active. Zero external SDK friction. | Requires multi-gigabyte Flutter SDK installation, Visual Studio C++ desktop workload, and Android SDK linking. |
| **Code Sharing** | 70-80% code sharing across TypeScript packages (database schemas, sync protocols, EXIF parsers, AI interfaces, validation). | 80-90% single codebase, but UI layouts still require separate desktop vs mobile styling logic. |
| **Windows Desktop Native Integrations** | Direct access to Node.js native APIs, Windows Portable Devices (WPD / MTP) via C++ bindings, Windows DPAPI, and DirectML ONNX Runtime. | Requires custom C++ Win32 plugins via Platform Channels or FFI for WPD / MTP. |
| **Local AI / ONNX Runtime** | Mature `@xenova/transformers`, `onnxruntime-node` (DirectML on Windows) and `onnxruntime-react-native` (NNAPI on Android). | `onnxruntime_flutter` exists but DirectML acceleration on Windows requires custom C++ CMake wiring. |
| **UI Flexibility & WebGL Shaders** | Tailwind CSS + Radix UI on Desktop; React Native Paper + Skia shaders for Photoshop-grade editing. | Excellent Skia rendering, but desktop text selection, multiple windows, and mouse hover states require more boilerplate. |

### Decision
**Adopt React Native for Android and Electron + React.js for Windows Desktop within a unified TypeScript / pnpm monorepo.**  
This maximizes developer velocity, leverages the host's existing Node v23/pnpm 12 toolchain, and provides battle-tested Windows native bindings for USB MTP and DirectML.

---

## ADR-002: Zero-Knowledge Secure Vault Isolation

### Context
Users require a password/PIN/biometric-protected Vault for private photos that must NEVER leak to normal gallery browsing, desktop MTP scans, or background AI indexing.

### Decision
1. **Separate Cipher Database**: Vault metadata is stored in an independent SQLCipher database completely decoupled from the normal `gallery.db`.
2. **AES-256-GCM Payload Encryption**: Vault photos are encrypted file-by-file with random 96-bit initialization vectors (IVs) and 128-bit authentication tags.
3. **Hardware Keystore Binding**: The Master Key is derived using Argon2id and wrapped using Android Keystore (StrongBox/TEE) on mobile, and Windows DPAPI / Windows Hello on desktop.
4. **Zero Cache Leakage**: Vault thumbnails are generated only in volatile RAM upon authentication and immediately zeroed from memory upon app backgrounding or session timeout.

---

## ADR-003: SyncFlow Dual-Mode Transfer Engine (USB MTP & Wi-Fi LAN)

### Context
When connecting mobile to laptop, the desktop application must automatically detect new photos and prompt: *"These are the new photos found. Shall I transfer?"* Additionally, the app must support wireless local synchronization without cloud servers.

### Decision
1. **USB Mode (MTP Detection)**:
   - On Windows, a background device watcher listens for `WM_DEVICECHANGE` via WPD (Windows Portable Device) COM API.
   - Upon connection, it scans `DCIM/Camera` on the phone, reads file modification timestamps and sizes, compares against desktop SQLite index, and presents the *"New Photos Found"* transfer modal.
2. **Wi-Fi Mode (P2P TLS Sync)**:
   - Zero-configuration local discovery using mDNS (`_photogallery._tcp.local`).
   - One-time QR code handshake for device pairing and mutual TLS certificate exchange.
   - Chunked file transfer over WebSocket/TCP with streaming SHA-256 integrity checks and resume support for interrupted transfers.

---

## ADR-004: On-Device AI Architecture (SigLIP + ArcFace + sqlite-vec)

### Context
To support face recognition, semantic search ("red car at beach"), and photo quality scoring without external cloud dependencies or privacy leaks.

### Decision
1. **Face Recognition**: SCRFD (lightweight 2.5MB ONNX) for face detection + ArcFace (MobileFaceNet ONNX) for 512-dimension face embeddings. Cosine similarity clustering groups people locally.
2. **Semantic Search**: SigLIP-base-patch16-224 (quantized INT8 ONNX, ~85MB) for text and image embeddings.
3. **Local Vector Search**: SQLite with `sqlite-vec` extension for fast local cosine similarity queries without needing heavy vector databases like Pinecone or Milvus.
4. **Execution Providers**: DirectML on Windows (GPU acceleration for Intel/AMD/Nvidia) and NNAPI / CPU with XNNPACK on Android.

---

## ADR-005: Non-Destructive Mobile Photoshop-Grade Image Editor

### Context
Users need professional image editing (crop, rotate, curves, HSL, adjustments, color grading) without altering original files.

### Decision
1. **Edit Recipe Data Model**: Every edit is stored as a JSON parameters object (`brightness`, `contrast`, `curvesPoints: { r: [], g: [], b: [] }`, `cropRect`, `rotationAngle`).
2. **GPU Shader Rendering**: Preview rendering is executed in real-time at 60 FPS using Skia Shaders (React Native Skia) on mobile and WebGL2 / GLSL fragment shaders on desktop.
3. **Deterministic Export**: The original image is read only during export, processed through the offline shader pipeline at full camera resolution, and saved as a new file (e.g., `IMG_20261108_EDITED.jpg`). The original remains untouched.
