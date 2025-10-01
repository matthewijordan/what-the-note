import { invoke } from "@tauri-apps/api/core";

export class WindowService {
  static async toggle(): Promise<void> {
    await invoke("toggle_window");
  }

  static async show(): Promise<void> {
    await invoke("show_window_command");
  }

  static async hide(): Promise<void> {
    await invoke("hide_window_command");
  }
}
