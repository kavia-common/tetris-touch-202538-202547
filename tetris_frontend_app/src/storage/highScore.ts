import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tetris:highScore";

// PUBLIC_INTERFACE
export async function loadHighScore(): Promise<number> {
  /** Load the saved high score; returns 0 if missing/unavailable. */
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

// PUBLIC_INTERFACE
export async function saveHighScore(score: number): Promise<void> {
  /** Persist the high score, ignoring errors (offline-safe). */
  try {
    await AsyncStorage.setItem(KEY, String(Math.max(0, Math.floor(score))));
  } catch {
    // ignore
  }
}
