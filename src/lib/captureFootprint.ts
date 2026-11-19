import type { BirdSpecies, CaptureRecord, CaptureStats } from '../types';

export interface FootprintEntry {
  key: string;
  birdId: number;
  birdName: string;
  when: string;
  where: { lat: number; lng: number } | null;
  photo: string | null;
}

/**
 * 觀鳥足跡：每次拍攝記低「邊日、邊度、咩雀」。
 * 新紀錄喺 allCatches 有獨立時間／坐標；舊紀錄退化到 capture.location，
 * 所以唔會改 storage key，亦唔會破壞舊資料。
 */
export function buildFootprints(
  captures: CaptureRecord[],
  species: BirdSpecies[],
): FootprintEntry[] {
  return captures.flatMap(c => {
    const bird = species.find(b => b.id === c.speciesId);
    if (!bird) return [];
    const rows = (c.allCatches?.length ? c.allCatches : [c.stats]).filter(Boolean) as CaptureStats[];
    return rows.map((st, i): FootprintEntry => ({
      key: `${c.speciesId}-${i}`,
      birdId: bird.id,
      birdName: bird.name,
      when: st.capturedAt ?? (i === 0 ? c.lastCaptureDate : c.firstCaptureDate),
      where: st.location ?? c.location ?? null,
      photo: c.photo_original_url ?? c.photo_cel_url ?? null,
    }));
  }).sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
}
