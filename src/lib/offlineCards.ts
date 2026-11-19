import { BIRD_SPECIES } from '../data/birdData';

/**
 * 離線圖卡：用 Cache Storage 預載 R2 嘅鳥卡 AVIF。
 * 唔新增 localStorage key（storage keys 保持不變）。
 * SW 嘅 runtimeCaching 用同一個 cache name，離線時直接由 cache 出圖。
 */
export const OFFLINE_CARDS_CACHE = 'bd-birdcards-v1';

export interface OfflineProgress {
  done: number;
  total: number;
  failed: number;
}

export function offlineCardsSupported(): boolean {
  return typeof caches !== 'undefined';
}

export async function cachedCardCount(): Promise<number> {
  if (!offlineCardsSupported()) return 0;
  try {
    const cache = await caches.open(OFFLINE_CARDS_CACHE);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

/** 並行預載；no-cors 攞到嘅 opaque response 一樣可以放入 Cache Storage。 */
export async function downloadOfflineCards(
  onProgress: (p: OfflineProgress) => void,
  shouldCancel: () => boolean = () => false,
): Promise<OfflineProgress> {
  const urls = BIRD_SPECIES.map((b) => b.photoUrl).filter((u): u is string => !!u);
  const total = urls.length;
  const result: OfflineProgress = { done: 0, total, failed: 0 };
  if (!offlineCardsSupported() || total === 0) {
    onProgress(result);
    return result;
  }

  const cache = await caches.open(OFFLINE_CARDS_CACHE);
  let next = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (next < total && !shouldCancel()) {
      const url = urls[next++];
      try {
        const response = await fetch(url, { mode: 'no-cors', cache: 'force-cache' });
        if (response.type === 'opaque' || response.ok) await cache.put(url, response);
        else result.failed++;
      } catch {
        result.failed++;
      }
      result.done++;
      onProgress({ ...result });
    }
  });
  await Promise.all(workers);
  return { ...result };
}

export async function clearOfflineCards(): Promise<void> {
  if (!offlineCardsSupported()) return;
  try {
    await caches.delete(OFFLINE_CARDS_CACHE);
  } catch { /* 無權限就算數，唔影響主流程 */ }
}
