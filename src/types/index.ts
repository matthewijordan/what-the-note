export type Corner = "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";

export interface Preferences {
  show_on_launch: boolean;
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
  window_x: number | null;
  window_y: number | null;
  window_width: number | null;
  window_height: number | null;
}

export interface WindowState {
  isVisible: boolean;
  lastInteractionTime: number;
}
