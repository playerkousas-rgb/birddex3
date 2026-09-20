import { useState, useCallback, useEffect } from 'react';
import { CaptureRecord, TrainerProfile, Rarity, CaptureResult, CaptureStats } from '../types';
import { BIRD_SPECIES } from '../data/birdData';
import { readJSON, saveJSON, savedDataForBackup } from '../lib/storage';
import { getRarityFromCount, xpForCapture, getLevelFromXp } from '../lib/theme';

const STORAGE_KEY = 'bd_collection_v3';
const PROFILE_KEY = 'bd_profile_v1';
const SETTINGS_KEY = 'bd_settings_v1';
const ALTART_KEY  = 'bd_altart_v1';

interface StoredData {
  captures: CaptureRecord[];
  version: number;
}

/** 異圖卡（精靈化版本）使用模式 */
export type AltArtMode = 'off' | 'high-rarity' | 'all';

export interface AppSettings {
  altArtMode: AltArtMode;
}

/**
 * 異圖卡狀態資料
 *   unlocked : 用戶已「擁有」的異圖卡 id（達到 UR / 創世神解鎖）
 *   existsOnR2 : R2 上實際存在的異圖卡 id（前端首次嘗試載入時自動偵測）
 *   missingOnR2 : 已確認 R2 上不存在的 id（不再重複偵測）
 */
export interface AltArtState {
  unlocked: number[];
  existsOnR2: number[];
  missingOnR2: number[];
}

const DEFAULT_SETTINGS: AppSettings = {
  altArtMode: 'high-rarity', // 預設：只有 UR/LR 用異圖卡
};

const DEFAULT_ALTART: AltArtState = {
  unlocked: [],
  existsOnR2: [],
  missingOnR2: [],
};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isCollection = (value: unknown) => isObject(value) && Array.isArray(value.captures) && value.captures.every(c =>
  isObject(c) && Number.isInteger(c.speciesId) && typeof c.count === 'number' && ['UC','C','R','SR','SSR','UR','LR'].includes(String(c.currentRarity)));

function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...readJSON(SETTINGS_KEY, {}, value => isObject(value) && (value.altArtMode === undefined || ['off','high-rarity','all'].includes(String(value.altArtMode)))) };
}

// Read-only initialization: a full disk must not turn a valid v2 save into an empty v3 save.
function loadStored(): StoredData {
  const current = readJSON<StoredData | null>(STORAGE_KEY, null, isCollection);
  if (current) return current;
  const old = readJSON<StoredData | null>('bd_collection_v2', null, isCollection);
  return old ? { ...old, version: 3 } : { captures: [], version: 3 };
}

function loadAltArt(): AltArtState {
  return { ...DEFAULT_ALTART, ...readJSON(ALTART_KEY, {}, value => isObject(value) && ['unlocked','existsOnR2','missingOnR2'].every(k => value[k] === undefined || (Array.isArray(value[k]) && value[k].every(Number.isInteger)))) };
}

function loadProfile(): TrainerProfile {
  return readJSON(PROFILE_KEY, {
    name: '見習訓練師', xp: 0, level: 1, title: '見習觀鳥員', totalCaptures: 0,
    uniqueSpecies: 0, joinedAt: new Date().toISOString(), avatar: '🥾',
  }, value => isObject(value) && typeof value.name === 'string' && typeof value.xp === 'number' && Number.isFinite(value.xp) && typeof value.level === 'number');
}

export function useCollection() {
  const [captures, setCaptures] = useState<CaptureRecord[]>(() => loadStored().captures);
  const [profile, setProfile] = useState<TrainerProfile>(() => loadProfile());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [altArt, setAltArt] = useState<AltArtState>(() => loadAltArt());

  const [storageErrors, setStorageErrors] = useState<Record<string, boolean>>({});
  const persist = useCallback((key: string, value: unknown) => {
    const failed = !saveJSON(key, value);
    setStorageErrors(prev => prev[key] === failed ? prev : { ...prev, [key]: failed });
  }, []);
  useEffect(() => { persist(STORAGE_KEY, { captures, version: 3 }); }, [captures, persist]);
  useEffect(() => { persist(PROFILE_KEY, profile); }, [profile, persist]);
  useEffect(() => { persist(SETTINGS_KEY, settings); }, [settings, persist]);
  useEffect(() => { persist(ALTART_KEY, altArt); }, [altArt, persist]);
  const storageError = Object.values(storageErrors).some(Boolean);
  useEffect(() => {
    if (!storageError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [storageError]);
  const retrySave = () => {
    persist(STORAGE_KEY, { captures, version: 3 }); persist(PROFILE_KEY, profile);
    persist(SETTINGS_KEY, settings); persist(ALTART_KEY, altArt);
  };
  const exportBackup = () => ({
    format: 'birddex-backup', version: 1, exportedAt: new Date().toISOString(),
    // Full in-memory state, including photos, IV histories and stickers, never a slimmed copy.
    current: { [STORAGE_KEY]: { captures, version: 3 }, [PROFILE_KEY]: profile, [SETTINGS_KEY]: settings, [ALTART_KEY]: altArt },
    saved: savedDataForBackup(),
  });

  const setAltArtMode = useCallback((mode: AltArtMode) => {
    setSettings(prev => ({ ...prev, altArtMode: mode }));
  }, []);

  /** 把鳥的異圖卡標記為「已解鎖」(達 UR 自動 / 創世神後門) */
  const unlockAltArt = useCallback((speciesId: number) => {
    setAltArt(prev => prev.unlocked.includes(speciesId)
      ? prev
      : { ...prev, unlocked: [...prev.unlocked, speciesId] });
  }, []);

  /** 前端首次載入時呼叫：標記 R2 上「確實存在」此異圖卡 */
  const markAltArtExists = useCallback((speciesId: number) => {
    setAltArt(prev => {
      if (prev.existsOnR2.includes(speciesId)) return prev;
      return {
        ...prev,
        existsOnR2: [...prev.existsOnR2, speciesId],
        missingOnR2: prev.missingOnR2.filter(id => id !== speciesId),
      };
    });
  }, []);

  /** 標記 R2 上「不存在」此異圖卡（載入 404 時呼叫，避免日後再請求） */
  const markAltArtMissing = useCallback((speciesId: number) => {
    setAltArt(prev => {
      if (prev.missingOnR2.includes(speciesId)) return prev;
      return {
        ...prev,
        missingOnR2: [...prev.missingOnR2, speciesId],
        existsOnR2: prev.existsOnR2.filter(id => id !== speciesId),
      };
    });
  }, []);

  /**
   * 真正能不能顯示異圖卡：
   *   ① 模式允許 && ② 用戶已解鎖 && ③ R2 上確實存在（或還沒偵測過）
   */
  const canShowAltArt = useCallback((speciesId: number, rarity: Rarity): boolean => {
    // 模式檢查
    const isHigh = rarity === 'UR' || rarity === 'LR';
    const allowedByMode =
      settings.altArtMode === 'all' ||
      (settings.altArtMode === 'high-rarity' && isHigh);
    if (!allowedByMode) return false;

    // 用戶要先「擁有」才能用
    if (!altArt.unlocked.includes(speciesId)) return false;

    // R2 上已確認不存在 → 不嘗試
    if (altArt.missingOnR2.includes(speciesId)) return false;

    return true;
  }, [settings.altArtMode, altArt]);

  const getCapture = useCallback((speciesId: number): CaptureRecord | undefined => {
    return captures.find(c => c.speciesId === speciesId);
  }, [captures]);

  const hasCaptured = useCallback((speciesId: number): boolean => {
    return captures.some(c => c.speciesId === speciesId);
  }, [captures]);

  const captureBird = useCallback((
    speciesId: number,
    opts?: {
      photoDataUrl?: string;
      location?: { lat: number; lng: number } | null;
      stats?: CaptureStats;
    }
  ): CaptureResult => {
    const species = BIRD_SPECIES.find(b => b.id === speciesId);
    if (!species) throw new Error('Unknown species');

    const existing = captures.find(c => c.speciesId === speciesId);
    const isNew = !existing;
    const now = new Date().toISOString();

    // IV handling
    const stats = opts?.stats;
    const allCatches = existing?.allCatches ? [...existing.allCatches] : [];
    if (stats) allCatches.push(stats);

    const bestPrev = existing?.bestStats;
    const isBestIndividual = !!(stats && (!bestPrev || stats.cp > bestPrev.cp));
    const bestStats = isBestIndividual && stats ? stats : (bestPrev ?? stats);

    let record: CaptureRecord;
    if (existing) {
      const newCount = existing.count + 1;
      const newRarity = getRarityFromCount(newCount);
      record = {
        ...existing,
        count: newCount,
        currentRarity: newRarity,
        lastCaptureDate: now,
        photoDataUrl: opts?.photoDataUrl ?? existing.photoDataUrl,
        location: opts?.location ?? existing.location,
        stats: stats ?? existing.stats,
        bestStats,
        allCatches,
      };
    } else {
      record = {
        speciesId,
        capturedAt: now,
        count: 1,
        currentRarity: getRarityFromCount(1),
        firstCaptureDate: now,
        lastCaptureDate: now,
        location: opts?.location ?? null,
        photoDataUrl: opts?.photoDataUrl ?? null,
        stats,
        bestStats,
        allCatches: stats ? [stats] : [],
      };
    }

    const newCaptures = isNew
      ? [...captures, record]
      : captures.map(c => c.speciesId === speciesId ? record : c);

    setCaptures(newCaptures);

    // 達 UR 自動解鎖該鳥的異圖卡
    if (record.currentRarity === 'UR' || record.currentRarity === 'LR') {
      setAltArt(prev => prev.unlocked.includes(speciesId)
        ? prev
        : { ...prev, unlocked: [...prev.unlocked, speciesId] });
    }

    const oldRarity: Rarity = existing?.currentRarity ?? 'UC';
    let xpGained = xpForCapture(record.currentRarity);
    // CatchCat 加成：IV / 投擲 / 色違
    if (stats) {
      if (stats.catchScore === 'Nice') xpGained += 10;
      if (stats.catchScore === 'Great') xpGained += 25;
      if (stats.catchScore === 'Excellent') xpGained += 60;
      if (stats.iv.percent >= 90) xpGained += 30;
      if (stats.isShiny) xpGained += 200;
      if (isBestIndividual && !isNew) xpGained += 15;
    }
    const newTotalXp = profile.xp + xpGained;
    const levelInfo = getLevelFromXp(newTotalXp);

    setProfile(prev => ({
      ...prev,
      xp: newTotalXp,
      level: levelInfo.level,
      title: levelInfo.title,
      totalCaptures: prev.totalCaptures + 1,
      uniqueSpecies: newCaptures.length,
    }));

    return {
      record,
      isNew,
      oldRarity,
      newRarity: record.currentRarity,
      xpGained,
      species,
      failed: false,
      captureStats: stats,
      isBestIndividual,
    };
  }, [captures, profile.xp]);

  const updateProfileName = useCallback((name: string) => {
    setProfile(prev => ({ ...prev, name }));
  }, []);

  const updateProfileAvatar = useCallback((avatar: string) => {
    setProfile(prev => ({ ...prev, avatar }));
  }, []);

  // 貼圖：把 sticker PNG 存到該鳥的 stats / bestStats
  const setCaptureSticker = useCallback((speciesId: number, stickerUrl: string | null) => {
    setCaptures(prev => prev.map(c => {
      if (c.speciesId !== speciesId) return c;
      const patch = (s?: CaptureStats) => s ? { ...s, stickerUrl: stickerUrl ?? undefined } : s;
      return {
        ...c,
        stats: patch(c.stats),
        bestStats: patch(c.bestStats),
        allCatches: c.allCatches?.map(x => ({ ...x, stickerUrl: stickerUrl ?? undefined })),
      };
    }));
  }, []);

  // IV 管理：設定指定個體為代表（best）
  const setBestIndividual = useCallback((speciesId: number, catchIndex: number) => {
    setCaptures(prev => prev.map(c => {
      if (c.speciesId !== speciesId || !c.allCatches || catchIndex < 0 || catchIndex >= c.allCatches.length) return c;
      const chosen = c.allCatches[catchIndex];
      return { ...c, stats: chosen, bestStats: chosen };
    }));
  }, []);

  // 刪除指定捕捉紀錄（用於清理不想要的個體）
  const deleteCatchRecord = useCallback((speciesId: number, catchIndex: number) => {
    setCaptures(prev => prev.map(c => {
      if (c.speciesId !== speciesId || !c.allCatches) return c;
      const all = c.allCatches.filter((_, i) => i !== catchIndex);
      if (all.length === 0) return c;
      const best = all.reduce((mx, x) => x.cp > mx.cp ? x : mx, all[0]);
      return { ...c, allCatches: all, stats: best, bestStats: best, count: Math.max(1, c.count - 1) };
    }));
  }, []);

  const resetAll = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('確定要重置所有捕捉記錄與等級？此動作無法復原！')) {
      setCaptures([]);
      setProfile({
        name: '見習訓練師',
        xp: 0,
        level: 1,
        title: '見習觀鳥員',
        totalCaptures: 0,
        uniqueSpecies: 0,
        joinedAt: new Date().toISOString(),
        avatar: '🥾',
      });
      setAltArt(prev => ({ ...prev, unlocked: [] }));
    }
  }, []);

  // Admin Backdoor
  const unlockAll = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('【開發者模式】是否要解鎖全圖鑑並升級至傳說？')) {
      const now = new Date().toISOString();
      const allRecords: CaptureRecord[] = BIRD_SPECIES.map(b => ({
        speciesId: b.id,
        capturedAt: now,
        count: 25,
        currentRarity: 'LR',
        firstCaptureDate: now,
        lastCaptureDate: now,
        photoDataUrl: null,
      }));
      setCaptures(allRecords);
      setProfile({
        name: '創造神',
        xp: 99999,
        level: 12,
        title: '飛羽傳奇',
        totalCaptures: BIRD_SPECIES.length * 25,
        uniqueSpecies: BIRD_SPECIES.length,
        joinedAt: new Date().toISOString(),
        avatar: '👑',
      });
      setAltArt(prev => ({
        ...prev,
        unlocked: BIRD_SPECIES.map(b => b.id),
      }));
    }
  }, []);

  const totalUnique = captures.length;
  const totalCount = captures.reduce((sum, c) => sum + c.count, 0);

  return {
    storageError, retrySave, exportBackup,
    captures,
    profile,
    settings,
    altArt,
    setAltArtMode,
    unlockAltArt,
    markAltArtExists,
    markAltArtMissing,
    canShowAltArt,
    getCapture,
    hasCaptured,
    captureBird,
    updateProfileName,
    updateProfileAvatar,
    setCaptureSticker,
    setBestIndividual,
    deleteCatchRecord,
    resetAll,
    unlockAll,
    totalUnique,
    totalCount,
  };
}
