#!/bin/bash

set -e

# Add cargo to PATH if it exists
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}    What The Note - Release Preparation Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get current version from tauri.conf.json
CURRENT_VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Parse version parts
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Calculate version options
PATCH_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
MINOR_VERSION="$MAJOR.$((MINOR + 1)).0"
MAJOR_VERSION="$((MAJOR + 1)).0.0"

echo "Select version increment:"
echo "  1) Patch (bug fixes): ${PATCH_VERSION}"
echo "  2) Minor (new features): ${MINOR_VERSION}"
echo "  3) Major (breaking changes): ${MAJOR_VERSION}"
echo "  4) Custom version"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    NEW_VERSION="$PATCH_VERSION"
    ;;
  2)
    NEW_VERSION="$MINOR_VERSION"
    ;;
  3)
    NEW_VERSION="$MAJOR_VERSION"
    ;;
  4)
    read -p "Enter custom version (e.g., 1.2.3): " NEW_VERSION
    ;;
  *)
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}New version will be: ${NEW_VERSION}${NC}"
echo ""
read -p "Continue? [y/N]: " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo -e "${RED}Aborted.${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Updating version numbers...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Update tauri.conf.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
else
  sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
fi
echo -e "${GREEN}✓ Updated src-tauri/tauri.conf.json${NC}"

# Update Cargo.toml
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
else
  sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
fi
echo -e "${GREEN}✓ Updated src-tauri/Cargo.toml${NC}"

# Update package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
else
  sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
fi
echo -e "${GREEN}✓ Updated package.json${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm install

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Building release (this may take a few minutes)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm run build:release || {
  echo -e "${YELLOW}Build completed with DMG bundling issue, checking for temp files...${NC}"

  # Check if temp DMG exists and move it
  TEMP_DMG=$(find src-tauri/target/universal-apple-darwin/release/bundle/macos -name "rw.*.dmg" 2>/dev/null | head -1)
  if [ -n "$TEMP_DMG" ]; then
    echo -e "${YELLOW}Found temporary DMG, moving it to final location...${NC}"
    mv "$TEMP_DMG" "src-tauri/target/universal-apple-darwin/release/bundle/dmg/What.The.Note_${NEW_VERSION}_universal.dmg"
    echo -e "${GREEN}✓ DMG recovered${NC}"
  fi
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Creating zip file for auto-updater...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd src-tauri/target/universal-apple-darwin/release/bundle/macos
rm -f "What.The.Note.zip"
zip -r "What.The.Note.zip" "What The Note.app" > /dev/null
echo -e "${GREEN}✓ Created What.The.Note.zip${NC}"
cd ../../../../../..

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Creating latest.json template...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "src-tauri/target/universal-apple-darwin/release/bundle/latest.json" <<EOF
{
  "version": "$NEW_VERSION",
  "notes": "Release notes for v$NEW_VERSION",
  "pub_date": "$CURRENT_DATE",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/matthewijordan/what-the-note/releases/download/v$NEW_VERSION/What.The.Note.zip"
    },
    "darwin-x86_64": {
      "url": "https://github.com/matthewijordan/what-the-note/releases/download/v$NEW_VERSION/What.The.Note.zip"
    }
  }
}
EOF

echo -e "${GREEN}✓ Created latest.json${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}    BUILD COMPLETE! 🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Version: ${NEW_VERSION}${NC}"
echo ""
echo -e "${YELLOW}Release files are located at:${NC}"
echo ""
DMG_PATH="src-tauri/target/universal-apple-darwin/release/bundle/dmg/What.The.Note_${NEW_VERSION}_universal.dmg"
ZIP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/What.The.Note.zip"
JSON_PATH="src-tauri/target/universal-apple-darwin/release/bundle/latest.json"

# Check if DMG exists with spaces, rename to dots
DMG_WITH_SPACES="src-tauri/target/universal-apple-darwin/release/bundle/dmg/What The Note_${NEW_VERSION}_universal.dmg"
if [ -f "$DMG_WITH_SPACES" ]; then
  mv "$DMG_WITH_SPACES" "$DMG_PATH"
  echo -e "${GREEN}✓ Renamed DMG to use dots instead of spaces${NC}"
fi

echo -e "  ${BLUE}DMG (for users):${NC}"
echo -e "    ${DMG_PATH}"
echo ""
echo -e "  ${BLUE}ZIP (for auto-updater):${NC}"
echo -e "    ${ZIP_PATH}"
echo ""
echo -e "  ${BLUE}Update manifest:${NC}"
echo -e "    ${JSON_PATH}"
echo ""

# Check if files exist
if [ -f "$DMG_PATH" ]; then
  DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)
  echo -e "  ${GREEN}✓ DMG exists (${DMG_SIZE})${NC}"
else
  echo -e "  ${RED}✗ DMG not found!${NC}"
fi

if [ -f "$ZIP_PATH" ]; then
  ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
  echo -e "  ${GREEN}✓ ZIP exists (${ZIP_SIZE})${NC}"
else
  echo -e "  ${RED}✗ ZIP not found!${NC}"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "  1. Edit ${JSON_PATH} to add release notes"
echo ""
echo -e "  2. Commit and tag:"
echo -e "     ${BLUE}git add .${NC}"
echo -e "     ${BLUE}git commit -m \"Release v${NEW_VERSION}\"${NC}"
echo -e "     ${BLUE}git push${NC}"
echo -e "     ${BLUE}git tag v${NEW_VERSION}${NC}"
echo -e "     ${BLUE}git push origin v${NEW_VERSION}${NC}"
echo ""
echo -e "  3. Create GitHub release at:"
echo -e "     ${BLUE}https://github.com/matthewijordan/what-the-note/releases/new${NC}"
echo ""
echo -e "  4. Upload these 3 files to the release:"
echo -e "     - What.The.Note_${NEW_VERSION}_universal.dmg"
echo -e "     - What.The.Note.zip"
echo -e "     - latest.json"
echo ""
echo -e "  5. Publish the release!"
echo ""
