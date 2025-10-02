export type Corner = "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
export type Theme = "liquid-glass" | "gradient-cosmic" | "minimal" | "minimal-dark" | "sticky-note";

export interface SyncPreferences {
  markdown_enabled: boolean;
  markdown_path: string | null;
  include_metadata: boolean;
  apple_notes_enabled: boolean;
  apple_notes_title: string;
  apple_notes_folder: string;
}

export interface Preferences {
  show_on_launch: boolean;
  launch_on_startup: boolean;
  hotcorner_enabled: boolean;
  hotcorner_corner: Corner;
  hotcorner_size: number;
  shortcut_enabled: boolean;
  keyboard_shortcut: string;
  auto_focus: boolean;
  auto_hide_enabled: boolean;
  auto_hide_delay_ms: number;
  hide_on_blur: boolean;
  fade_duration_ms: number;
  text_size: number;
  formatting_size: number;
  theme: Theme;
  transparency: number;
  window_x: number | null;
  window_y: number | null;
  window_width: number | null;
  window_height: number | null;
  sync: SyncPreferences;
}

export interface WindowState {
  isVisible: boolean;
  lastInteractionTime: number;
}

export const PREFERENCE_DEFAULTS: Preferences = {
  show_on_launch: false,
  launch_on_startup: true,
  hotcorner_enabled: true,
  hotcorner_corner: "BottomRight",
  hotcorner_size: 10,
  shortcut_enabled: true,
  keyboard_shortcut: "Alt+Command+N",
  auto_focus: true,
  auto_hide_enabled: false,
  auto_hide_delay_ms: 1500,
  hide_on_blur: true,
  fade_duration_ms: 200,
  text_size: 14,
  formatting_size: 100,
  theme: "liquid-glass",
  transparency: 10,
  window_x: null,
  window_y: null,
  window_width: null,
  window_height: null,
  sync: {
    markdown_enabled: false,
    markdown_path: null,
    include_metadata: true,
    apple_notes_enabled: false,
    apple_notes_title: "What The Note",
    apple_notes_folder: "Notes",
  },
};

export interface SyncTestResponse {
  success: boolean;
  target: string | null;
  message: string;
}
