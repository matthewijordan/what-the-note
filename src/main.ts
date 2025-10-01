import { NoteService } from "./services/note-service";
import { PreferencesService } from "./services/preferences-service";
import { WindowService } from "./services/window-service";
import { IdleDetector } from "./services/idle-detector";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { Preferences } from "./types";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

// State
let preferences: Preferences;
let currentNote: string = "";
let saveTimeout: number | null = null;
const idleDetector = new IdleDetector();
let windowLocked = false; // True when user has clicked in window or opened via shortcut - prevents auto-hide
let isFading = false; // Prevents multiple fade operations
let isMouseOverWindow = false; // True when mouse is hovering over window

// DOM elements
let editor: Editor;
let closeBtn: HTMLButtonElement;
let prefsBtn: HTMLButtonElement;
let formatToggleBtn: HTMLButtonElement;
let noteContainer: HTMLElement;
let toolbar: HTMLElement;

// Initialize app
async function init() {
  // Get DOM elements
  closeBtn = document.getElementById("close-btn") as HTMLButtonElement;
  prefsBtn = document.getElementById("prefs-btn") as HTMLButtonElement;
  formatToggleBtn = document.getElementById("format-toggle-btn") as HTMLButtonElement;
  noteContainer = document.querySelector(".note-container") as HTMLElement;
  toolbar = document.querySelector(".editor-toolbar") as HTMLElement;

  // Load preferences
  try {
    preferences = await PreferencesService.get();
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return;
  }

  // Load note content
  try {
    currentNote = await NoteService.get();
  } catch (error) {
    console.error("Failed to load note:", error);
  }

  // Initialize Tiptap editor
  editor = new Editor({
    element: document.getElementById("editor") as HTMLElement,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({
        nested: true,
      })
    ],
    content: currentNote,
    editorProps: {
      attributes: {
        class: "tiptap-content",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      currentNote = editor.getHTML();
      debouncedSave();
      updateToolbarState();
    },
    onSelectionUpdate: () => {
      updateToolbarState();
    },
  });

  // Set up toolbar
  setupToolbar();

  // Set up event listeners
  setupEventListeners();

  // Set up window bounds tracking
  setupWindowBoundsTracking();

  // Apply text size
  applyTextSize(preferences.text_size);

  // Initialize preferences change listener
  await PreferencesService.initialize();
  PreferencesService.onChange((newPrefs) => {
    preferences = newPrefs;
    applyTextSize(newPrefs.text_size);
    updateIdleDetector();
  });

  // Listen for hotcorner events - reset idle timer while mouse is in corner
  await listen("hotcorner-triggered", () => {
    // Don't lock the window, just reset the timer
    // This keeps the window visible while mouse is in hot corner
    if (!windowLocked) {
      updateIdleDetector();
    }
  });

  // Listen for keyboard shortcut events - lock window immediately
  await listen("shortcut-triggered", () => {
    // When opened via keyboard shortcut, it's an intentional action
    // Lock the window immediately to prevent blur from hiding it
    windowLocked = true;
    idleDetector.stop();

    // Always focus editor when opened via shortcut (implicit focus)
    setTimeout(() => {
      editor.commands.focus();
    }, 100);
  });

  // Set up idle detector
  updateIdleDetector();

  // Focus editor if auto-focus is enabled
  if (preferences.auto_focus) {
    editor.commands.focus();
  }
}

function setupToolbar() {
  const buttons = toolbar.querySelectorAll(".toolbar-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const action = (button as HTMLElement).dataset.action;

      if (!action) return;

      switch (action) {
        case "bold":
          editor.chain().focus().toggleBold().run();
          break;
        case "italic":
          editor.chain().focus().toggleItalic().run();
          break;
        case "strike":
          editor.chain().focus().toggleStrike().run();
          break;
        case "h1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "bulletList":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "orderedList":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "taskList":
          editor.chain().focus().toggleTaskList().run();
          break;
        case "code":
          editor.chain().focus().toggleCode().run();
          break;
        case "codeBlock":
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case "blockquote":
          editor.chain().focus().toggleBlockquote().run();
          break;
      }
    });
  });

  // Color picker
  const colorPickerBtn = document.getElementById("color-picker-btn");
  const colorPalette = document.getElementById("color-palette");

  if (colorPickerBtn && colorPalette) {
    const colorOptions = colorPalette.querySelectorAll(".color-option");

    colorPickerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      colorPalette.classList.toggle("show");
    });

    colorOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const color = (option as HTMLElement).dataset.color;

        if (color) {
          editor.chain().focus().setColor(color).run();
        } else {
          editor.chain().focus().unsetColor().run();
        }

        colorPalette.classList.remove("show");
      });
    });
  }
}

function updateToolbarState() {
  const buttons = toolbar.querySelectorAll(".toolbar-btn");

  buttons.forEach((button) => {
    const action = (button as HTMLElement).dataset.action;
    if (!action) return;

    let isActive = false;

    switch (action) {
      case "bold":
        isActive = editor.isActive("bold");
        break;
      case "italic":
        isActive = editor.isActive("italic");
        break;
      case "strike":
        isActive = editor.isActive("strike");
        break;
      case "h1":
        isActive = editor.isActive("heading", { level: 1 });
        break;
      case "h2":
        isActive = editor.isActive("heading", { level: 2 });
        break;
      case "h3":
        isActive = editor.isActive("heading", { level: 3 });
        break;
      case "bulletList":
        isActive = editor.isActive("bulletList");
        break;
      case "orderedList":
        isActive = editor.isActive("orderedList");
        break;
      case "taskList":
        isActive = editor.isActive("taskList");
        break;
      case "code":
        isActive = editor.isActive("code");
        break;
      case "codeBlock":
        isActive = editor.isActive("codeBlock");
        break;
      case "blockquote":
        isActive = editor.isActive("blockquote");
        break;
    }

    if (isActive) {
      button.classList.add("is-active");
    } else {
      button.classList.remove("is-active");
    }
  });

  // Update color indicator
  const colorIndicator = document.getElementById("color-indicator");
  if (colorIndicator) {
    const currentColor = editor.getAttributes("textStyle").color;
    if (currentColor) {
      colorIndicator.setAttribute("fill", currentColor);
    } else {
      colorIndicator.setAttribute("fill", "currentColor");
    }
  }
}

function setupEventListeners() {
  // Format toggle button
  formatToggleBtn.addEventListener("click", () => {
    toolbar.classList.toggle("expanded");
  });

  // Close button - instant hide and resets lock
  closeBtn.addEventListener("click", async () => {
    windowLocked = false;
    await hideWindowInstant();
  });

  // Preferences button
  prefsBtn.addEventListener("click", async () => {
    try {
      await invoke("open_preferences_window");
    } catch (error) {
      console.error("Failed to open preferences window:", error);
    }
  });

  // Escape key - instant hide and resets lock
  document.addEventListener("keydown", async (e) => {
    if (e.key === "Escape") {
      windowLocked = false;
      await hideWindowInstant();
    }
  });

  // Click inside window - lock it (prevents auto-hide permanently until closed)
  // Exclude drag region to allow window dragging
  document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-region')) {
      return; // Don't lock window when clicking drag region
    }
    windowLocked = true;
    idleDetector.stop();
  });

  // Track mouse over window using mousemove (more reliable than mouseenter on unfocused windows)
  document.addEventListener("mouseover", () => {
    if (!isMouseOverWindow) {
      isMouseOverWindow = true;
      idleDetector.stop();
    }
  });

  document.addEventListener("mouseout", () => {
    if (isMouseOverWindow) {
      isMouseOverWindow = false;
      if (!windowLocked) {
        updateIdleDetector();
      }
    }
  });

  // Window becomes visible - reset flags and start timer after brief delay
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // Only reset state if window isn't locked (e.g., opened via shortcut or clicked)
      if (!windowLocked) {
        isMouseOverWindow = false;
        // Small delay to let mouseover events fire first
        setTimeout(() => {
          if (!isMouseOverWindow && !windowLocked) {
            updateIdleDetector();
          }
        }, 50);
      }
    }
  });

  // Window loses focus (blur) - always hide when clicking off
  window.addEventListener("blur", async () => {
    if (preferences.hide_on_blur) {
      windowLocked = false; // Reset lock when user clicks away
      await hideWindowInstant();
    }
  });
}

function debouncedSave() {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = window.setTimeout(async () => {
    try {
      await NoteService.save(currentNote);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  }, 500);
}

async function hideWindowWithFade() {
  if (isFading) return;
  isFading = true;

  // Fade out
  noteContainer.style.transition = `opacity ${preferences.fade_duration_ms}ms ease-out`;
  noteContainer.style.opacity = "0";

  // Wait for fade to complete
  await new Promise((resolve) => setTimeout(resolve, preferences.fade_duration_ms));

  // Hide window
  await WindowService.hide();

  // Reset opacity for next show
  noteContainer.style.opacity = "1";
  isFading = false;
}

async function hideWindowInstant() {
  if (isFading) return;
  noteContainer.style.transition = "none";
  noteContainer.style.opacity = "1";
  await WindowService.hide();
}

function updateIdleDetector() {
  // Only start idle timer if auto-hide is enabled, auto-focus is off, window not locked, and mouse not hovering
  if (preferences.auto_hide_enabled && !preferences.auto_focus && !windowLocked && !isMouseOverWindow) {
    idleDetector.start(preferences.auto_hide_delay_ms, async () => {
      // Double-check conditions before hiding
      if (!windowLocked && !isMouseOverWindow) {
        await hideWindowWithFade();
      }
    });
  } else {
    idleDetector.stop();
  }
}

function applyTextSize(size: number) {
  // Set the CSS variable that controls editor font size
  document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
}

let saveWindowBoundsTimeout: number | null = null;

function setupWindowBoundsTracking() {
  // Debounced save function to avoid too many saves during dragging/resizing
  const debouncedSaveBounds = () => {
    if (saveWindowBoundsTimeout !== null) {
      clearTimeout(saveWindowBoundsTimeout);
    }

    saveWindowBoundsTimeout = window.setTimeout(async () => {
      try {
        await invoke("save_window_bounds");
      } catch (error) {
        console.error("Failed to save window bounds:", error);
      }
    }, 500);
  };

  // Listen for window move and resize
  window.addEventListener("resize", debouncedSaveBounds);

  // For position changes, we need to poll or use a different approach
  // Tauri doesn't have a direct "move" event, so we'll save on hide
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      // Save immediately when hiding
      invoke("save_window_bounds").catch((error) => {
        console.error("Failed to save window bounds:", error);
      });
    }
  });
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
