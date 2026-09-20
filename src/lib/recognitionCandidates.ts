import type { RecognizeResult, BirdSpecies } from '../types';
import { resolveBirdId } from '../data/nameAliases';
import { getBirdById } from '../data/birdData';

export interface RecognitionCandidate { bird: BirdSpecies; result: RecognizeResult }
export const AUTO_CAPTURE_CONFIDENCE = 0.68; // Keep v3's existing automatic acceptance threshold.
export const CANDIDATE_CONFIDENCE = 0.35; // Lower scores require an explicit user confirmation.

export function recognitionCandidates(results: RecognizeResult[]): RecognitionCandidate[] {
  const seen = new Set<number>();
  return results.slice(0, 3).flatMap(result => {
    if (!Number.isFinite(result.score) || result.score < CANDIDATE_CONFIDENCE || result.score > 1) return [];
    const id = resolveBirdId(result.label) ?? (result.scientific ? resolveBirdId(result.scientific) : undefined);
    const bird = id === undefined ? undefined : getBirdById(id);
    if (!bird || seen.has(bird.id)) return [];
    seen.add(bird.id);
    return [{ bird, result }];
  });
}
