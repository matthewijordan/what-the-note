import { invoke } from "@tauri-apps/api/core";

export class NoteService {
  static async get(): Promise<string> {
    return await invoke<string>("get_note");
  }

  static async save(content: string): Promise<void> {
    await invoke("save_note", { content });
  }
}
