export interface LocalStats {
  imagesProcessed: number;
  messagesEncoded: number;
  filesExtracted: number;
  detectionScans: number;
  comparisons: number;
  history: Array<{ action: string; detail: string; timestamp: number }>;
}

const STORAGE_KEY = "pixelvault-stats";

const INITIAL_STATS: LocalStats = {
  imagesProcessed: 0,
  messagesEncoded: 0,
  filesExtracted: 0,
  detectionScans: 0,
  comparisons: 0,
  history: [],
};

export function loadLocalStats(): LocalStats {
  if (typeof window === "undefined") {
    return INITIAL_STATS;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return INITIAL_STATS;
  }

  try {
    return { ...INITIAL_STATS, ...JSON.parse(stored) } as LocalStats;
  } catch {
    return INITIAL_STATS;
  }
}

export function saveLocalStats(stats: LocalStats) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordLocalAction(action: keyof Omit<LocalStats, "history">, detail: string) {
  const stats = loadLocalStats();
  stats[action] += 1;
  stats.imagesProcessed += action === "imagesProcessed" ? 1 : 0;
  stats.history = [{ action, detail, timestamp: Date.now() }, ...stats.history].slice(0, 12);
  saveLocalStats(stats);
  return stats;
}
