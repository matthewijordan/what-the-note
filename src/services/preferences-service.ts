import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Preferences } from "../types";

export class PreferencesService {
  private static listeners: Array<(prefs: Preferences) => void> = [];

  static async get(): Promise<Preferences> {
    return await invoke<Preferences>("get_preferences");
  }

  static async update(preferences: Preferences): Promise<void> {
    await invoke("update_preferences", { newPrefs: preferences });
  }

  static onChange(callback: (prefs: Preferences) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  static async initialize(): Promise<void> {
    await listen<Preferences>("preferences-updated", (event) => {
      this.listeners.forEach((callback) => callback(event.payload));
    });
  }
}
