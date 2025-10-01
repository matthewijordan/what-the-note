# Release Process

This document explains how to create releases for What The Note with auto-update support.

## Quick Start (Recommended)

Use the interactive release script:

```bash
./prepare-release.sh
```

This script will:
- Help you choose the new version number (patch/minor/major)
- Update all version files automatically
- Build the universal binary
- Create the zip file for auto-updater
- Generate the `latest.json` template
- Show you exactly where the release files are
- Print next steps for Git and GitHub

## Manual Process

If you prefer to do it manually:

### Prerequisites

1. Version number updated in both:
   - `src-tauri/tauri.conf.json` (`version` field)
   - `src-tauri/Cargo.toml` (`version` field)
   - `package.json` (`version` field)

### Building for Release

```bash
npm install
npm run build:release
```

This builds a universal binary that works on both Intel and Apple Silicon Macs.

The build artifacts will be in `src-tauri/target/universal-apple-darwin/release/bundle/`:
- `dmg/What The Note_1.0.0_universal.dmg` - macOS disk image installer
- `macos/What The Note.app` - macOS app bundle

## Creating a GitHub Release

1. **Create a Git Tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create Release on GitHub**
   - Go to https://github.com/matthewijordan/what-the-note/releases
   - Click "Create a new release"
   - Choose the tag you just created
   - Set release title (e.g., "v1.0.0")
   - Add release notes

3. **Upload Build Artifacts**

   Upload these files from `src-tauri/target/universal-apple-darwin/release/bundle/`:
   - `dmg/What.The.Note_1.0.0_universal.dmg` (for users to download and install)
   - `macos/What.The.Note.zip` (for auto-updater - create this by zipping the .app)

   Create the zip:
   ```bash
   cd src-tauri/target/universal-apple-darwin/release/bundle/macos
   zip -r "What.The.Note.zip" "What The Note.app"
   cd ../../../../../..
   ```

4. **Create Update Manifest**

   Create a file named `latest.json` with this content:

   ```json
   {
     "version": "1.0.0",
     "notes": "Release notes here",
     "pub_date": "2025-01-15T12:00:00Z",
     "platforms": {
       "darwin-aarch64": {
         "url": "https://github.com/matthewijordan/what-the-note/releases/download/v1.0.0/What.The.Note.zip"
       },
       "darwin-x86_64": {
         "url": "https://github.com/matthewijordan/what-the-note/releases/download/v1.0.0/What.The.Note.zip"
       }
     }
   }
   ```

   Update:
   - `version` - The new version number (without 'v' prefix)
   - `notes` - Brief description of changes
   - `pub_date` - Current date/time in ISO 8601 format
   - `url` - Replace with actual download URL from your release (right-click the .zip file and copy link)

5. **Upload the Manifest**

   Upload `latest.json` to the release

6. **Publish the Release**

## How Auto-Update Works

1. App checks for updates on startup (after 3 seconds delay)
2. App fetches `latest.json` from GitHub releases
3. If new version available, prompts user to download and install
4. User can also manually check via menu: "Check for Updates..."

## Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes

## Notes

- The `pubkey` field in `tauri.conf.json` is empty because we're not using code signing for updates (not recommended for production but fine for personal use)
- For production apps, you should generate a signing key and add signatures to the update manifest
- The updater only works on released builds, not in dev mode
