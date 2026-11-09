# RELEASE NOTES

## Version 1.0.22 — 2026-11-09

### 🚀 Features & Enhancements
- **version-sync**: synchronize version `1.0.22` across all packages, Android build configurations (`versionCode 22`), and desktop sync runtime
- **ui-icons**: complete Lucide vector icon pack integration across mobile and desktop apps (100% zero-emoji compliant)

### 🐛 Bug Fixes
- **connection**: resolve Android Wi-Fi cleartext communication blocking on port 41236 with local subnet network security config
- **sync-server**: resolve desktop sync server multi-adapter IP resolution, filtering out virtual adapters (WSL, Hyper-V, VirtualBox) to prioritize active physical Wi-Fi IP
- **mtp-usb**: resolve Windows MTP / USB file transfer PowerShell quote parsing using base64 `-EncodedCommand` and WPD Shell traversal
- **udp-discovery**: enable native Kotlin UDP multicast discovery beacon probe on Android with `WifiManager.MulticastLock`

### 📦 Release Assets
- `PhotoGallery-Setup-1.0.22.exe` (Windows 10/11 x64 NSIS Installer)
- `PhotoGallery-1.0.22.apk` (Android Universal Release APK)
- `SHA256SUMS.txt` (Cryptographic Checksums)
