import { PreferencesService } from "./services/preferences-service";
import type { Preferences } from "./types";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from '@tauri-apps/api/app';

let form: HTMLFormElement;

async function init() {
  form = document.getElementById("prefs-form") as HTMLFormElement;

  // Set up tabs
  setupTabs();

  // Set up slider value displays
  setupSliders();

  // Set up coffee link
  setupCoffeeLink();

  // Set up tooltips positioning
  setupTooltips();

  // Set up shortcut recording
  setupShortcutRecording();

  // Load and display app version
  try {
    const version = await getVersion();
    const versionElement = document.getElementById("app-version");
    if (versionElement) {
      versionElement.textContent = version;
    }
  } catch (error) {
    console.error("Failed to get app version:", error);
  }

  // Load current preferences
  try {
    const preferences = await PreferencesService.get();
    loadPreferencesIntoForm(preferences);
  } catch (error) {
    console.error("Failed to load preferences:", error);
  }

  // Set up dependent settings (enable/disable based on checkboxes)
  setupDependentSettings();

  // Set up auto-save on any change
  setupAutoSave();
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = (tab as HTMLElement).dataset.tab;

      // Remove active from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));

      // Add active to clicked tab and corresponding content
      tab.classList.add("active");
      const content = document.querySelector(
        `[data-tab-content="${tabName}"]`
      );
      if (content) {
        content.classList.add("active");
      }
    });
  });
}

function setupCoffeeLink() {
  const coffeeLink = document.getElementById("coffee-link");
  if (coffeeLink) {
    coffeeLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await openUrl("https://buymeacoffee.com/mattyj");
      } catch (error) {
        console.error("Failed to open link:", error);
      }
    });
  }
}

function setupTooltips() {
  const infoIcons = document.querySelectorAll(".info-icon");

  infoIcons.forEach((icon) => {
    const tooltip = icon.querySelector(".tooltip") as HTMLElement;
    if (!tooltip) return;

    icon.addEventListener("mouseenter", () => {
      const iconRect = icon.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Calculate if tooltip fits above the icon
      const spaceAbove = iconRect.top;
      const spaceBelow = windowHeight - iconRect.bottom;
      const tooltipHeight = 100; // Approximate height

      let top: number;
      let left: number;

      // Position vertically
      if (spaceAbove >= tooltipHeight || spaceAbove > spaceBelow) {
        // Position above
        top = iconRect.top - tooltipHeight - 8;
        tooltip.classList.add("top");
        tooltip.classList.remove("bottom");
      } else {
        // Position below
        top = iconRect.bottom + 8;
        tooltip.classList.add("bottom");
        tooltip.classList.remove("top");
      }

      // Position horizontally (centered, but keep within window bounds)
      left = iconRect.left + iconRect.width / 2 - 100; // 100 = half of tooltip width

      // Keep within window bounds
      if (left < 8) {
        left = 8;
      } else if (left + 200 > windowWidth - 8) {
        left = windowWidth - 208;
      }

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    });
  });
}

function setupSliders() {
  // Hot corner size slider
  const hotcornerSizeSlider = form.elements.namedItem(
    "hotcorner_size"
  ) as HTMLInputElement;
  const hotcornerSizeValue = document.getElementById("hotcorner-size-value");

  if (hotcornerSizeSlider && hotcornerSizeValue) {
    hotcornerSizeSlider.addEventListener("input", () => {
      hotcornerSizeValue.textContent = `${hotcornerSizeSlider.value}px`;
    });
  }

  // Auto hide delay slider
  const autoHideDelaySlider = form.elements.namedItem(
    "auto_hide_delay_ms"
  ) as HTMLInputElement;
  const autoHideDelayValue = document.getElementById("auto-hide-delay-value");

  if (autoHideDelaySlider && autoHideDelayValue) {
    autoHideDelaySlider.addEventListener("input", () => {
      autoHideDelayValue.textContent = `${autoHideDelaySlider.value}ms`;
    });
  }

  // Fade duration slider
  const fadeDurationSlider = form.elements.namedItem(
    "fade_duration_ms"
  ) as HTMLInputElement;
  const fadeDurationValue = document.getElementById("fade-duration-value");

  if (fadeDurationSlider && fadeDurationValue) {
    fadeDurationSlider.addEventListener("input", () => {
      fadeDurationValue.textContent = `${fadeDurationSlider.value}ms`;
    });
  }

  // Text size slider
  const textSizeSlider = form.elements.namedItem(
    "text_size"
  ) as HTMLInputElement;
  const textSizeValue = document.getElementById("text-size-value");

  if (textSizeSlider && textSizeValue) {
    textSizeSlider.addEventListener("input", () => {
      textSizeValue.textContent = `${textSizeSlider.value}px`;
    });
  }
}

function setupAutoSave() {
  // Listen for changes on all form inputs
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    // Use 'change' event for immediate save when value changes
    input.addEventListener("change", async () => {
      await savePreferences();
    });
  });
}

function setupDependentSettings() {
  // Shortcut settings
  const shortcutEnabled = document.getElementById("shortcut-enabled") as HTMLInputElement;
  const shortcutSettings = document.getElementById("shortcut-settings");

  if (shortcutEnabled && shortcutSettings) {
    const updateShortcutSettings = () => {
      if (shortcutEnabled.checked) {
        shortcutSettings.classList.remove("disabled");
      } else {
        shortcutSettings.classList.add("disabled");
      }
    };

    shortcutEnabled.addEventListener("change", updateShortcutSettings);
    updateShortcutSettings(); // Set initial state
  }

  // Hot corner settings
  const hotcornerEnabled = document.getElementById("hotcorner-enabled") as HTMLInputElement;
  const hotcornerSettings = document.getElementById("hotcorner-settings");

  if (hotcornerEnabled && hotcornerSettings) {
    const updateHotcornerSettings = () => {
      if (hotcornerEnabled.checked) {
        hotcornerSettings.classList.remove("disabled");
      } else {
        hotcornerSettings.classList.add("disabled");
      }
    };

    hotcornerEnabled.addEventListener("change", updateHotcornerSettings);
    updateHotcornerSettings(); // Set initial state
  }

  // Auto-hide settings
  const autoHideEnabled = document.getElementById("auto-hide-enabled") as HTMLInputElement;
  const autoHideSettings = document.getElementById("auto-hide-settings");

  if (autoHideEnabled && autoHideSettings) {
    const updateAutoHideSettings = () => {
      if (autoHideEnabled.checked) {
        autoHideSettings.classList.remove("disabled");
      } else {
        autoHideSettings.classList.add("disabled");
      }
    };

    autoHideEnabled.addEventListener("change", updateAutoHideSettings);
    updateAutoHideSettings(); // Set initial state
  }
}

function setupShortcutRecording() {
  const recordBtn = document.getElementById("record-shortcut-btn") as HTMLButtonElement;
  const shortcutInput = document.getElementById("keyboard-shortcut-input") as HTMLInputElement;
  const shortcutHint = document.getElementById("shortcut-hint") as HTMLElement;

  let isRecording = false;
  let recordedKeys: Set<string> = new Set();

  const startRecording = () => {
    isRecording = true;
    recordedKeys.clear();
    recordBtn.textContent = "Recording...";
    recordBtn.classList.add("recording");
    shortcutInput.classList.add("recording");
    shortcutInput.value = "";
    shortcutHint.textContent = "Press your key combination...";
    shortcutHint.classList.add("recording");

    // Focus input to capture keys
    shortcutInput.focus();
  };

  const stopRecording = () => {
    isRecording = false;
    recordBtn.textContent = "Record";
    recordBtn.classList.remove("recording");
    shortcutInput.classList.remove("recording");
    shortcutHint.textContent = "Click \"Record\" and press your desired key combination";
    shortcutHint.classList.remove("recording");
  };

  const formatShortcut = (keys: Set<string>): string => {
    const modifiers: string[] = [];
    let mainKey = "";

    keys.forEach((key) => {
      if (key === "Control") modifiers.push("Ctrl");
      else if (key === "Alt") modifiers.push("Alt");
      else if (key === "Meta") modifiers.push("Command");
      else if (key === "Shift") modifiers.push("Shift");
      else if (key.length === 1 || ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].includes(key)) {
        mainKey = key.toUpperCase();
      }
    });

    if (!mainKey) return "";

    return [...modifiers, mainKey].join("+");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    // Add modifier keys and main key
    if (e.ctrlKey) recordedKeys.add("Control");
    if (e.altKey) recordedKeys.add("Alt");
    if (e.metaKey) recordedKeys.add("Meta");
    if (e.shiftKey) recordedKeys.add("Shift");

    // Add main key if it's not a modifier
    if (!["Control", "Alt", "Meta", "Shift"].includes(e.key)) {
      recordedKeys.add(e.key);

      // Format and display the shortcut
      const formatted = formatShortcut(recordedKeys);
      if (formatted) {
        shortcutInput.value = formatted;

        // Auto-save and stop recording after a short delay
        setTimeout(() => {
          stopRecording();
          // Trigger save
          savePreferences();
        }, 500);
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();
  };

  recordBtn.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  shortcutInput.addEventListener("keydown", handleKeyDown);
  shortcutInput.addEventListener("keyup", handleKeyUp);

  // Allow clicking input to start recording
  shortcutInput.addEventListener("click", () => {
    if (!isRecording) {
      startRecording();
    }
  });
}

function loadPreferencesIntoForm(preferences: Preferences) {
  (form.elements.namedItem("show_on_launch") as HTMLInputElement).checked =
    preferences.show_on_launch;
  (form.elements.namedItem("shortcut_enabled") as HTMLInputElement).checked =
    preferences.shortcut_enabled;
  (form.elements.namedItem("hotcorner_enabled") as HTMLInputElement).checked =
    preferences.hotcorner_enabled;

  // Set corner radio button
  const cornerRadios = form.elements.namedItem(
    "hotcorner_corner"
  ) as RadioNodeList;
  cornerRadios.forEach((radio) => {
    if ((radio as HTMLInputElement).value === preferences.hotcorner_corner) {
      (radio as HTMLInputElement).checked = true;
    }
  });

  // Hot corner size
  const hotcornerSizeSlider = form.elements.namedItem(
    "hotcorner_size"
  ) as HTMLInputElement;
  const hotcornerSizeValue = document.getElementById("hotcorner-size-value");
  hotcornerSizeSlider.value = preferences.hotcorner_size.toString();
  if (hotcornerSizeValue) {
    hotcornerSizeValue.textContent = `${preferences.hotcorner_size}px`;
  }

  (form.elements.namedItem("keyboard_shortcut") as HTMLInputElement).value =
    preferences.keyboard_shortcut;
  (form.elements.namedItem("auto_focus") as HTMLInputElement).checked =
    preferences.auto_focus;
  (form.elements.namedItem("auto_hide_enabled") as HTMLInputElement).checked =
    preferences.auto_hide_enabled;

  // Auto hide delay
  const autoHideDelaySlider = form.elements.namedItem(
    "auto_hide_delay_ms"
  ) as HTMLInputElement;
  const autoHideDelayValue = document.getElementById("auto-hide-delay-value");
  autoHideDelaySlider.value = preferences.auto_hide_delay_ms.toString();
  if (autoHideDelayValue) {
    autoHideDelayValue.textContent = `${preferences.auto_hide_delay_ms}ms`;
  }

  (form.elements.namedItem("hide_on_blur") as HTMLInputElement).checked =
    preferences.hide_on_blur;

  // Fade duration
  const fadeDurationSlider = form.elements.namedItem(
    "fade_duration_ms"
  ) as HTMLInputElement;
  const fadeDurationValue = document.getElementById("fade-duration-value");
  fadeDurationSlider.value = preferences.fade_duration_ms.toString();
  if (fadeDurationValue) {
    fadeDurationValue.textContent = `${preferences.fade_duration_ms}ms`;
  }

  // Text size
  const textSizeSlider = form.elements.namedItem(
    "text_size"
  ) as HTMLInputElement;
  const textSizeValue = document.getElementById("text-size-value");
  textSizeSlider.value = preferences.text_size.toString();
  if (textSizeValue) {
    textSizeValue.textContent = `${preferences.text_size}px`;
  }
}

async function savePreferences() {
  // Get current preferences to preserve window bounds
  const currentPrefs = await PreferencesService.get();

  // Get selected corner radio button value
  const cornerRadios = form.elements.namedItem(
    "hotcorner_corner"
  ) as RadioNodeList;
  let selectedCorner = "TopRight";
  cornerRadios.forEach((radio) => {
    if ((radio as HTMLInputElement).checked) {
      selectedCorner = (radio as HTMLInputElement).value;
    }
  });

  const newPrefs: Preferences = {
    show_on_launch: (
      form.elements.namedItem("show_on_launch") as HTMLInputElement
    ).checked,
    hotcorner_enabled: (
      form.elements.namedItem("hotcorner_enabled") as HTMLInputElement
    ).checked,
    hotcorner_corner: selectedCorner as Preferences["hotcorner_corner"],
    hotcorner_size: parseInt(
      (form.elements.namedItem("hotcorner_size") as HTMLInputElement).value
    ),
    shortcut_enabled: (
      form.elements.namedItem("shortcut_enabled") as HTMLInputElement
    ).checked,
    keyboard_shortcut: (
      form.elements.namedItem("keyboard_shortcut") as HTMLInputElement
    ).value,
    auto_focus: (form.elements.namedItem("auto_focus") as HTMLInputElement)
      .checked,
    auto_hide_enabled: (
      form.elements.namedItem("auto_hide_enabled") as HTMLInputElement
    ).checked,
    auto_hide_delay_ms: parseInt(
      (
        form.elements.namedItem("auto_hide_delay_ms") as HTMLInputElement
      ).value
    ),
    hide_on_blur: (form.elements.namedItem("hide_on_blur") as HTMLInputElement)
      .checked,
    fade_duration_ms: parseInt(
      (form.elements.namedItem("fade_duration_ms") as HTMLInputElement).value
    ),
    text_size: parseInt(
      (form.elements.namedItem("text_size") as HTMLInputElement).value
    ),
    // Preserve window bounds
    window_x: currentPrefs.window_x,
    window_y: currentPrefs.window_y,
    window_width: currentPrefs.window_width,
    window_height: currentPrefs.window_height,
  };

  try {
    await PreferencesService.update(newPrefs);
    // Success - the main window will be notified via the preferences change listener
  } catch (error) {
    console.error("Failed to save preferences:", error);
    alert("Failed to save preferences: " + error);
  }
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
