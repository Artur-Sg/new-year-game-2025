const STORAGE_KEY = 'new-year-game-2025:bonus-record';

export type BonusRecord = {
  gifts: number;
  seconds: number;
};

let record: BonusRecord = { gifts: 0, seconds: 0 };

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<BonusRecord>;
    record = {
      gifts: Number.isFinite(parsed.gifts) ? Number(parsed.gifts) : 0,
      seconds: Number.isFinite(parsed.seconds) ? Number(parsed.seconds) : 0,
    };
  }
} catch {
  // Ignore storage when unavailable.
}

export function getBonusRecord(): BonusRecord {
  return { ...record };
}

export function updateBonusRecord(gifts: number, seconds: number): BonusRecord {
  let updated = false;
  if (gifts > record.gifts) {
    record.gifts = gifts;
    updated = true;
  }
  if (seconds > record.seconds) {
    record.seconds = seconds;
    updated = true;
  }
  if (updated) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage failures.
    }
  }
  return { ...record };
}
