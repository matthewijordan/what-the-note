# What The Note

A minimal, always-accessible sticky note app for macOS.

![What The Note](https://img.shields.io/badge/platform-macOS-lightgrey)

## Features

- **Always Accessible** - Quick access via keyboard shortcut (⌥⌘N) or hot corner hover
- **Rich Text Formatting** - Bold, italic, headings, lists, task lists, code blocks, colors, and more
- **Auto-Save** - Your notes are saved instantly as you type
- **Auto-Update** - Automatically checks for new versions and updates with one click
- **Customizable** - Adjust text size, auto-hide behavior, fade effects, and shortcuts
- **Remembers Position** - Window opens where you last left it
- **Click Away to Hide** - Automatically hides when you click elsewhere (configurable)
- **Drag & Resize** - Position and size the window however you like

## Installation

Download the latest `.dmg` from the [Releases](https://github.com/matthewijordan/what-the-note/releases) page.

1. Open the `.dmg` file
2. Drag **What The Note** to your Applications folder
3. Launch the app

On first launch, you may need to allow the app in System Preferences → Privacy & Security.

## Usage

### Showing/Hiding the Note

- **Keyboard Shortcut**: Press `⌥⌘N` (Option+Command+N) - customizable in preferences
- **Hot Corner**: Hover your mouse in the top-right corner of your screen (customizable)
- **Menu Bar**: Click the menu bar icon and select "Show/Hide Note"
- **Escape Key**: Press `Esc` to hide the note when it's visible

### Formatting Text

Click the **T** icon in the top-left corner to reveal the formatting toolbar with options for:
- Bold, italic, strikethrough
- Headings (H1, H2, H3)
- Bullet lists, numbered lists, task lists
- Code and code blocks
- Blockquotes
- Text colors

### Settings

Click the gear icon to customize:
- **General**: Show on launch, text size
- **Shortcuts**: Enable/disable keyboard shortcut, customize key combination
- **Hot Corner**: Enable/disable, choose corner, adjust trigger size
- **Behavior**: Auto-hide settings, hide on blur, fade duration

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- Xcode Command Line Tools (macOS)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/matthewijordan/what-the-note.git
cd what-the-note

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) - Rust-based desktop app framework
- [TypeScript](https://www.typescriptlang.org/) - Frontend logic
- [Tiptap](https://tiptap.dev/) - Rich text editor
- Vanilla HTML/CSS - No heavy frameworks

## License

MIT

## Support

If you find this app useful, consider [buying me a coffee](https://buymeacoffee.com/mattyj)!
