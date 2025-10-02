import { PreferencesService } from "./services/preferences-service";
import { PREFERENCE_DEFAULTS } from "./types";
import type { Preferences, SyncPreferences, SyncTestResponse } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from '@tauri-apps/api/app';

let form: HTMLFormElement;
let currentPreferences: Preferences = mergeWithDefaults();

type PrimitivePreferenceValue = string | number | boolean | null;
type RootPreferenceKey = Exclude<keyof Preferences, "sync">;
type SyncPreferenceKey = keyof SyncPreferences;
type PreferencePath = RootPreferenceKey | `sync.${SyncPreferenceKey}`;
type SyncTargetValue = "none" | "markdown" | "apple_notes";

interface PreferenceBinding {
  path: PreferencePath;
  name: string;
  control: "checkbox" | "text" | "range" | "radio" | "select";
  valueDisplayId?: string;
  formatDisplay?: (value: number) => string;
}

const preferenceBindings: PreferenceBinding[] = [
  { path: "launch_on_startup", name: "launch_on_startup", control: "checkbox" },
  { path: "show_on_launch", name: "show_on_launch", control: "checkbox" },
  { path: "shortcut_enabled", name: "shortcut_enabled", control: "checkbox" },
  { path: "keyboard_shortcut", name: "keyboard_shortcut", control: "text" },
  {
    path: "text_size",
    name: "text_size",
    control: "range",
    valueDisplayId: "text-size-value",
    formatDisplay: (value) => `${value}px`,
  },
  {
    path: "text_size",
    name: "text_size_visual",
    control: "range",
    valueDisplayId: "text-size-visual-value",
    formatDisplay: (value) => `${value}px`,
  },
  {
    path: "formatting_size",
    name: "formatting_size",
    control: "range",
    valueDisplayId: "formatting-size-value",
    formatDisplay: (value) => `${value}%`,
  },
  { path: "theme", name: "theme", control: "select" },
  {
    path: "transparency",
    name: "transparency",
    control: "range",
    valueDisplayId: "transparency-value",
    formatDisplay: (value) => `${value}%`,
  },
  { path: "hotcorner_enabled", name: "hotcorner_enabled", control: "checkbox" },
  { path: "hotcorner_corner", name: "hotcorner_corner", control: "radio" },
  {
    path: "hotcorner_size",
    name: "hotcorner_size",
    control: "range",
    valueDisplayId: "hotcorner-size-value",
    formatDisplay: (value) => `${value}px`,
  },
  { path: "auto_focus", name: "auto_focus", control: "checkbox" },
  { path: "hide_on_blur", name: "hide_on_blur", control: "checkbox" },
  { path: "auto_hide_enabled", name: "auto_hide_enabled", control: "checkbox" },
  {
    path: "auto_hide_delay_ms",
    name: "auto_hide_delay_ms",
    control: "range",
    valueDisplayId: "auto-hide-delay-value",
    formatDisplay: (value) => `${value}ms`,
  },
  {
    path: "fade_duration_ms",
    name: "fade_duration_ms",
    control: "range",
    valueDisplayId: "fade-duration-value",
    formatDisplay: (value) => `${value}ms`,
  },
  { path: "sync.markdown_path", name: "sync_markdown_path", control: "text" },
  { path: "sync.include_metadata", name: "sync_include_metadata", control: "checkbox" },
  { path: "sync.apple_notes_title", name: "sync_apple_notes_title", control: "text" },
  { path: "sync.apple_notes_folder", name: "sync_apple_notes_folder", control: "select" },
];

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
    currentPreferences = mergeWithDefaults(preferences);
    loadPreferencesIntoForm(currentPreferences);
  } catch (error) {
    console.error("Failed to load preferences:", error);
  }

  // Set up dependent settings (enable/disable based on checkboxes)
  setupDependentSettings();

  // Set up auto-save on any change
  setupSyncTargetControls();
  setupAutoSave();
  setupSyncActions();
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

function setupSyncTargetControls() {
  const targetSections = Array.from(
    document.querySelectorAll<HTMLElement>(".sync-target")
  );
  if (targetSections.length === 0) {
    return;
  }

  const radios = getSyncTargetRadios();
  if (!radios) {
    return;
  }

  const status = document.getElementById("sync-test-status");

  const updateSelection = (triggerLoad: boolean) => {
    const selected = getSelectedSyncTarget();

    targetSections.forEach((section) => {
      const matches = section.dataset.target === selected;
      section.classList.toggle("selected", matches);

      const interactiveElements = section.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement
      >("input, select, textarea, button");

      interactiveElements.forEach((element) => {
        if ((element as HTMLInputElement).type === "radio") {
          return;
        }

        if (!matches) {
          element.disabled = true;
          return;
        }

        const lockDisabled = (element as HTMLElement).dataset.lockDisabled === "true";
        if (lockDisabled) {
          return;
        }

        element.disabled = false;
      });
    });

    if (status) {
      status.textContent = "";
      status.className = "sync-status-message";
    }

    if (selected === "apple_notes" && triggerLoad) {
      const currentValue = (
        form.elements.namedItem("sync_apple_notes_folder") as HTMLSelectElement | null
      )?.value ?? null;
      void loadAppleNotesFolders(currentValue);
    }

    if (selected !== "apple_notes") {
      const select = document.getElementById(
        "apple-notes-folder-select"
      ) as HTMLSelectElement | null;
      if (select) {
        select.disabled = true;
      }
    }
  };

  Array.from(radios).forEach((radio) => {
    radio.addEventListener("change", () => {
      updateSelection(true);
    });
  });

  updateSelection(false);
}

function getSyncTargetRadios(): RadioNodeList | null {
  const element = form.elements.namedItem("sync_target");
  return (element as RadioNodeList | null) ?? null;
}

function getSelectedSyncTarget(): SyncTargetValue {
  const radios = getSyncTargetRadios();
  if (!radios) {
    return "none";
  }

  const selected = Array.from(radios).find(
    (radio) => (radio as HTMLInputElement).checked
  ) as HTMLInputElement | undefined;

  if (!selected) {
    return "none";
  }

  if (selected.value === "markdown" || selected.value === "apple_notes") {
    return selected.value;
  }

  return "none";
}

function setSelectedSyncTarget(target: SyncTargetValue) {
  const radios = getSyncTargetRadios();
  if (!radios) {
    return;
  }

  Array.from(radios).forEach((radio) => {
    const input = radio as HTMLInputElement;
    input.checked = input.value === target;
  });
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
  preferenceBindings
    .filter((binding) => binding.control === "range")
    .forEach((binding) => {
      const input = form.elements.namedItem(binding.name) as HTMLInputElement | null;
      if (!input) {
        return;
      }

      input.addEventListener("input", () => {
        const value = resolveNumericValue(input.value, binding);
        updateValueDisplay(binding, value);
      });
    });
}

function setupAutoSave() {
  // Listen for changes on all form inputs
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    const insideSyncTab = (input as HTMLElement).closest('[data-tab-content="sync"]');
    if (insideSyncTab) {
      return;
    }

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

function setupSyncActions() {
  const saveButton = document.getElementById("sync-save-button") as HTMLButtonElement | null;
  const saveAndTestButton = document.getElementById("sync-save-test-button") as HTMLButtonElement | null;
  const status = document.getElementById("sync-test-status");

  if (!saveButton || !saveAndTestButton || !status) {
    return;
  }

  const clearStatus = () => {
    status.textContent = "";
    status.className = "sync-status-message";
  };

  const updateStatus = (message: string, variant: "pending" | "success" | "error") => {
    status.textContent = message;
    status.className = `sync-status-message ${variant}`;
  };

  const getCurrentTargetLabel = (): string | null => {
    const target = getSelectedSyncTarget();
    if (target === "markdown") return "Markdown";
    if (target === "apple_notes") return "Apple Notes";
    return null;
  };

  const syncInputs = document.querySelectorAll<HTMLElement>(
    '[data-tab-content="sync"] input, [data-tab-content="sync"] select, [data-tab-content="sync"] textarea'
  );

  syncInputs.forEach((input) => {
    input.addEventListener("change", () => {
      clearStatus();
    });
  });

  const handleSave = async ({ alsoTest }: { alsoTest: boolean }) => {
    saveButton.disabled = true;
    saveAndTestButton.disabled = true;

    try {
      await savePreferences();

      if (!alsoTest) {
        updateStatus("Sync preferences saved", "success");
        return;
      }

      const targetLabel = getCurrentTargetLabel();
      if (!targetLabel) {
        updateStatus("Select a sync target before testing.", "error");
        return;
      }

      updateStatus(`Saving and testing ${targetLabel}...`, "pending");

      const response = await invoke<SyncTestResponse>("test_sync");
      const label = response.target ?? targetLabel;
      updateStatus(`${label}: ${response.message}`, response.success ? "success" : "error");
    } catch (error) {
      console.error("Failed to update sync preferences:", error);
      updateStatus(`Failed: ${String(error)}`, "error");
    } finally {
      saveButton.disabled = false;
      saveAndTestButton.disabled = false;
    }
  };

  saveButton.addEventListener("click", () => {
    void handleSave({ alsoTest: false });
  });

  saveAndTestButton.addEventListener("click", () => {
    void handleSave({ alsoTest: true });
  });
}

async function loadAppleNotesFolders(selectedValue: string | null) {
  const select = document.getElementById("apple-notes-folder-select") as HTMLSelectElement | null;
  const hint = document.getElementById("apple-notes-folder-hint") as HTMLElement | null;
  const appleRadio = document.querySelector(
    'input[name="sync_target"][value="apple_notes"]'
  ) as HTMLInputElement | null;

  if (!select || !hint || !appleRadio) {
    return;
  }

  if (!hint.dataset.defaultText) {
    hint.dataset.defaultText = hint.textContent ?? "";
  }

  const resetHint = () => {
    hint.textContent = hint.dataset.defaultText ?? "";
    hint.classList.remove("error");
  };

  if (!appleRadio.checked) {
    select.innerHTML = "";
    const value = selectedValue ?? "";
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || "Notes";
    option.selected = true;
    select.appendChild(option);
    select.disabled = true;
    resetHint();
    return;
  }

  select.disabled = true;
  hint.textContent = "Loading folders…";
  hint.classList.remove("error");
  select.innerHTML = "";

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Loading folders…";
  loadingOption.disabled = true;
  loadingOption.selected = true;
  select.appendChild(loadingOption);

  try {
    const folders = await invoke<string[]>("list_apple_notes_folders");
    select.innerHTML = "";

    if (folders.length === 0) {
      const option = document.createElement("option");
      option.value = selectedValue ?? "Notes";
      option.textContent = option.value || "Notes";
      option.selected = true;
      select.appendChild(option);
      select.disabled = true;
      hint.textContent = "No folders returned from Apple Notes.";
      hint.classList.add("error");
      return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a folder";
    placeholder.disabled = true;
    select.appendChild(placeholder);

    folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder;
      option.textContent = folder;
      if (selectedValue && folder === selectedValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    if (!selectedValue || !folders.includes(selectedValue)) {
      placeholder.selected = false;
      select.selectedIndex = 1;
    }

    select.disabled = false;
    resetHint();
  } catch (error) {
    console.error("Failed to load Apple Notes folders:", error);
    select.innerHTML = "";
    const fallback = document.createElement("option");
    const value = selectedValue ?? "Notes";
    fallback.value = value;
    fallback.textContent = value;
    fallback.selected = true;
    select.appendChild(fallback);
    select.disabled = true;
    hint.textContent = `Unable to load folders: ${String(error)}`;
    hint.classList.add("error");
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
  applyPreferencesToForm(preferences);
  void loadAppleNotesFolders(preferences.sync.apple_notes_folder);
}

async function savePreferences() {
  try {
    const latestPrefs = await PreferencesService.get();
    currentPreferences = mergeWithDefaults(latestPrefs);
    const updatedPrefs = buildPreferencesFromForm(currentPreferences);

    await PreferencesService.update(updatedPrefs);
    currentPreferences = clonePreferences(updatedPrefs);
  } catch (error) {
    console.error("Failed to save preferences:", error);
    alert("Failed to save preferences: " + error);
  }
}

function applyPreferencesToForm(preferences: Preferences) {
  preferenceBindings.forEach((binding) => {
    const element = form.elements.namedItem(binding.name);
    if (!element) {
      return;
    }

    const fallback = getDefaultValue(binding.path);
    const value = getPreferenceValue(preferences, binding.path);
    const effectiveValue = value ?? fallback ?? null;

    switch (binding.control) {
      case "checkbox": {
        (element as HTMLInputElement).checked = Boolean(effectiveValue);
        break;
      }
      case "text": {
        const input = element as HTMLInputElement;
        if (effectiveValue === null || effectiveValue === undefined) {
          input.value = "";
        } else {
          input.value = String(effectiveValue);
        }
        break;
      }
      case "select": {
        const select = element as HTMLSelectElement;
        if (typeof effectiveValue === "string") {
          select.value = effectiveValue;
        } else {
          select.value = "";
        }
        break;
      }
      case "range": {
        const input = element as HTMLInputElement;
        const numericValue = resolveNumericValue(effectiveValue, binding);
        input.value = String(numericValue);
        updateValueDisplay(binding, numericValue);
        break;
      }
      case "radio": {
        const radioGroup = element as RadioNodeList;
        const targetValue = String(effectiveValue ?? "");
        Array.from(radioGroup).forEach((radio) => {
          const radioInput = radio as HTMLInputElement;
          radioInput.checked = radioInput.value === targetValue;
        });
        break;
      }
    }
  });

  const target: SyncTargetValue = preferences.sync.apple_notes_enabled
    ? "apple_notes"
    : preferences.sync.markdown_enabled
    ? "markdown"
    : "none";

  setSelectedSyncTarget(target);
}

function buildPreferencesFromForm(base: Preferences): Preferences {
  const updated = clonePreferences(base);

  preferenceBindings.forEach((binding) => {
    const element = form.elements.namedItem(binding.name);
    if (!element) {
      return;
    }

    switch (binding.control) {
      case "checkbox": {
        setPreferenceValue(
          updated,
          binding.path,
          (element as HTMLInputElement).checked as PrimitivePreferenceValue
        );
        break;
      }
      case "text": {
        const input = element as HTMLInputElement;
        const fallback = getDefaultValue(binding.path);
        let value: PrimitivePreferenceValue;

        if (input.value.trim() === "") {
          value = fallback ?? null;
        } else {
          value = input.value;
        }

        setPreferenceValue(updated, binding.path, value);
        break;
      }
      case "select": {
        const select = element as HTMLSelectElement;
        const value = select.value || null;
        setPreferenceValue(updated, binding.path, value);
        break;
      }
      case "range": {
        const input = element as HTMLInputElement;
        const numericValue = resolveNumericValue(input.value, binding);
        input.value = String(numericValue);
        setPreferenceValue(updated, binding.path, numericValue as PrimitivePreferenceValue);
        break;
      }
      case "radio": {
        const radioGroup = element as RadioNodeList;
        const selected = Array.from(radioGroup).find(
          (radio) => (radio as HTMLInputElement).checked
        ) as HTMLInputElement | undefined;
        const fallback = getDefaultValue(binding.path);
        const value = selected?.value ?? (fallback ?? "");
        setPreferenceValue(updated, binding.path, value as PrimitivePreferenceValue);
        break;
      }
    }
  });

  const selectedTarget = getSelectedSyncTarget();
  updated.sync.markdown_enabled = selectedTarget === "markdown";
  updated.sync.apple_notes_enabled = selectedTarget === "apple_notes";

  return updated;
}

function resolveNumericValue(value: unknown, binding: PreferenceBinding): number {
  const fallback = getDefaultValue(binding.path);
  const fallbackNumber = typeof fallback === "number" ? fallback : 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallbackNumber;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallbackNumber;
  }

  return fallbackNumber;
}

function updateValueDisplay(binding: PreferenceBinding, value: number) {
  if (!binding.valueDisplayId) {
    return;
  }

  const display = document.getElementById(binding.valueDisplayId);
  if (!display) {
    return;
  }

  const formatter = binding.formatDisplay ?? ((val: number) => String(val));
  display.textContent = formatter(value);
}

function mergeWithDefaults(preferences?: Preferences): Preferences {
  if (!preferences) {
    return clonePreferences(PREFERENCE_DEFAULTS);
  }

  const merged: Preferences = {
    ...PREFERENCE_DEFAULTS,
    ...preferences,
    sync: {
      ...PREFERENCE_DEFAULTS.sync,
      ...(preferences.sync ?? PREFERENCE_DEFAULTS.sync),
    },
  };

  return clonePreferences(merged);
}

function clonePreferences(preferences: Preferences): Preferences {
  return {
    ...preferences,
    sync: { ...preferences.sync },
  };
}

function getPreferenceValue(
  source: Preferences,
  path: PreferencePath
): PrimitivePreferenceValue | undefined {
  return getPrimitiveValue(source, path);
}

function getDefaultValue(path: PreferencePath): PrimitivePreferenceValue | undefined {
  return getPrimitiveValue(PREFERENCE_DEFAULTS, path);
}

function getPrimitiveValue(
  source: Preferences,
  path: PreferencePath
): PrimitivePreferenceValue | undefined {
  const segments = path.split(".");
  let cursor: unknown = source;

  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }

    if (typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  if (
    typeof cursor === "string" ||
    typeof cursor === "number" ||
    typeof cursor === "boolean" ||
    cursor === null
  ) {
    return cursor;
  }

  return undefined;
}

function setPreferenceValue(
  target: Preferences,
  path: PreferencePath,
  value: PrimitivePreferenceValue
) {
  const segments = path.split(".");
  const lastSegment = segments.pop();

  if (!lastSegment) {
    return;
  }

  let cursor: Record<string, unknown> = target as unknown as Record<string, unknown>;

  segments.forEach((segment) => {
    if (cursor[segment] === undefined || cursor[segment] === null) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  });

  cursor[lastSegment] = value as unknown;
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
