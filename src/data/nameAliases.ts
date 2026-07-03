// ============================================================
// AI 辨識名稱對映表
// 把 Hugging Face / BirdNET / Nyckel 回傳的各種名稱
// 對映到 BIRD-DEX 的 speciesId
// ============================================================

export interface AliasEntry {
  speciesId: number;
  aliases: string[]; // 全部轉成小寫比對
}

import aliasesData from './nameAliases.json';
const ALIASES: AliasEntry[] = aliasesData;

const aliasMap = new Map<string, number>();
for (const entry of ALIASES) {
  for (const alias of entry.aliases) {
    aliasMap.set(alias.toLowerCase().trim(), entry.speciesId);
    // 也存無標點版本
    aliasMap.set(alias.toLowerCase().replace(/[-_']/g, '').trim(), entry.speciesId);
  }
}

/** 從 AI 回傳名稱解析出 BIRD-DEX speciesId */
export function resolveBirdId(label: string): number | undefined {
  if (!label) return undefined;
  const key = label.toLowerCase().trim();
  // 直接命中
  if (aliasMap.has(key)) return aliasMap.get(key);
  // 去掉標點
  const noPunct = key.replace(/[-_'.]/g, '');
  if (aliasMap.has(noPunct)) return aliasMap.get(noPunct);
  // 只取前兩個單詞嘗試 (e.g. "Passer montanus (Tree Sparrow)")
  const words = key.split(/\s+/).slice(0, 3).join(' ');
  if (aliasMap.has(words)) return aliasMap.get(words);
  return undefined;
}

/** 取得所有 aliases（用於 Debug） */
export function getAllAliases(): AliasEntry[] {
  return ALIASES;
}
