import { BirdSpecies } from '../types';
import birdsJson from './birds.json';

export const BIRD_SPECIES: BirdSpecies[] = birdsJson as BirdSpecies[];

export function getBirdById(id: number): BirdSpecies | undefined {
  return BIRD_SPECIES.find(b => b.id === id);
}
