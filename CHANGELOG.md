# CHANGELOG
All notable changes to the Privacy-First AI Photo Gallery Ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
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
