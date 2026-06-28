// Persistent meta-progression via AsyncStorage.
// Stores vault (spendable cash), best stars per level, owned/active themes,
// furthest unlocked level, and settings. All reads are crash-safe (fall back
// to DEFAULT_SAVE) so a corrupt/missing key never bricks the app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SaveData } from './types';

const KEY = 'moneysort.save.v1';

export const DEFAULT_SAVE: SaveData = {
  vault: 0,
  stars: {},
  unlockedTheme: ['classic'],
  activeTheme: 'classic',
  highestUnlocked: 0,
  soundOn: true,
  hapticsOn: true,
  dailyLastISO: null,
};

let cache: SaveData | null = null;

export async function loadSave(): Promise<SaveData> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = { ...DEFAULT_SAVE, ...parsed, stars: { ...parsed.stars } };
      return cache!;
    }
  } catch (e) {
    // ignore — corrupt save, start fresh
  }
  cache = { ...DEFAULT_SAVE };
  return cache;
}

export async function persist(save: SaveData): Promise<void> {
  cache = save;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    // best-effort; in-memory cache still holds this session
  }
}

// Record a level result: update best stars + vault + furthest unlock.
export async function recordResult(
  save: SaveData,
  levelIndex: number,
  stars: number,
  vaultGained: number,
): Promise<SaveData> {
  const best = Math.max(save.stars[levelIndex] ?? 0, stars);
  const next: SaveData = {
    ...save,
    stars: { ...save.stars, [levelIndex]: best },
    vault: save.vault + vaultGained,
    highestUnlocked: Math.max(save.highestUnlocked, levelIndex + 1),
  };
  await persist(next);
  return next;
}

export async function spendVault(save: SaveData, amount: number): Promise<SaveData | null> {
  if (save.vault < amount) return null;
  const next = { ...save, vault: save.vault - amount };
  await persist(next);
  return next;
}

export async function buyTheme(save: SaveData, themeId: string, cost: number): Promise<SaveData | null> {
  if (save.unlockedTheme.includes(themeId)) {
    const next = { ...save, activeTheme: themeId };
    await persist(next);
    return next;
  }
  if (save.vault < cost) return null;
  const next: SaveData = {
    ...save,
    vault: save.vault - cost,
    unlockedTheme: [...save.unlockedTheme, themeId],
    activeTheme: themeId,
  };
  await persist(next);
  return next;
}

export async function setTheme(save: SaveData, themeId: string): Promise<SaveData> {
  const next = { ...save, activeTheme: themeId };
  await persist(next);
  return next;
}

export async function toggleSound(save: SaveData): Promise<SaveData> {
  const next = { ...save, soundOn: !save.soundOn };
  await persist(next);
  return next;
}

export async function toggleHaptics(save: SaveData): Promise<SaveData> {
  const next = { ...save, hapticsOn: !save.hapticsOn };
  await persist(next);
  return next;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.stars).reduce((a, b) => a + b, 0);
}
