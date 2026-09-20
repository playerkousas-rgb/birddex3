/** Storage failures must never delete photos, stickers, or the previous saved value. */
export function readJSON<T>(key: string, fallback: T, valid?: (value: unknown) => boolean): T {
  let raw: string | null;
  try { raw = localStorage.getItem(key); }
  catch { return fallback; } // Private-mode/storage denial: allow in-memory use, warn when saving.
  if (raw === null) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (valid && !valid(value)) throw new Error('invalid shape');
    return value as T;
  } catch {
    // Do not silently replace a damaged save with an empty collection.
    throw new Error(`無法讀取存檔 ${key}。原有資料未被覆寫，請先下載備份。`);
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function savedDataForBackup(): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('bd_')) result[key] = localStorage.getItem(key);
    }
  } catch { /* Include in-memory state even when storage access is denied. */ }
  return result;
}

export function downloadBackup(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `birddex-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
