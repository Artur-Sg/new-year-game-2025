const STORAGE_KEY = 'new-year-game-2025:unlockedLevel';
let activeLevelId = 1;
let unlockedLevelId = 1;

try {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  if (!Number.isNaN(stored) && stored > 0) {
    unlockedLevelId = stored === 7 ? 8 : stored;
  }
} catch {
  // Ignore storage when unavailable.
}

export function getActiveLevelId(): number {
  return activeLevelId;
}

export function setActiveLevelId(id: number): void {
  activeLevelId = id;
}

export function getUnlockedLevelId(): number {
  return unlockedLevelId;
}

export function unlockLevel(id: number): void {
  const resolvedId = id === 7 ? 8 : id;
  if (resolvedId <= unlockedLevelId) {
    return;
  }
  unlockedLevelId = resolvedId;
  try {
    localStorage.setItem(STORAGE_KEY, String(unlockedLevelId));
  } catch {
    // Ignore storage failures.
  }
}
