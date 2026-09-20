import { useState } from 'react';
import { useCollectionContext } from '../context/CollectionContext';

/** Remember the failing URL, not a single global image-error flag. */
export function useBirdImage(speciesId: number, photoUrl: string | null | undefined, wantsAltArt: boolean, stickerUrl?: string | null) {
  const { markAltArtExists, markAltArtMissing } = useCollectionContext();
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const altUrl = photoUrl?.replace('.avif', '_UR.avif');
  const imageUrl = [stickerUrl, wantsAltArt ? altUrl : null, photoUrl].find(url => url && !failed.has(url)) ?? null;
  const isSticker = !!stickerUrl && imageUrl === stickerUrl;
  const onError = () => {
    if (!imageUrl) return;
    if (imageUrl === altUrl && !isSticker) markAltArtMissing(speciesId);
    setFailed(previous => new Set(previous).add(imageUrl));
  };
  const onLoad = () => {
    if (imageUrl === altUrl && !isSticker) markAltArtExists(speciesId);
  };
  return { imageUrl, isSticker, onError, onLoad };
}
