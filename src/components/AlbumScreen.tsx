import { useMemo, useState } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { BIRD_SPECIES } from '../data/birdData';
import { BirdCard } from './BirdCard';
import { RARITY_ORDER, RARITY_META } from '../lib/theme';
import { ArrowUpDown } from 'lucide-react';

interface AlbumScreenProps {
  onSelectSpecies: (id: number) => void;
}

export function AlbumScreen({ onSelectSpecies }: AlbumScreenProps) {
  const { captures } = useCollectionContext();
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'count'>('rarity');

  const capturedBirds = useMemo(() => {
    const items = captures.map(c => {
      const bird = BIRD_SPECIES.find(b => b.id === c.speciesId);
      return { capture: c, bird: bird! };
    }).filter(x => x.bird);

    if (sortBy === 'rarity') {
      return items.sort((a, b) =>
        RARITY_ORDER.indexOf(b.capture.currentRarity) - RARITY_ORDER.indexOf(a.capture.currentRarity)
      );
    }
    if (sortBy === 'newest') {
      return items.sort((a, b) =>
        new Date(b.capture.lastCaptureDate).getTime() - new Date(a.capture.lastCaptureDate).getTime()
      );
    }
    return items.sort((a, b) => b.capture.count - a.capture.count);
  }, [captures, sortBy]);

  return (
    <div className="min-h-full bg-dex-bg pb-24">
      <div className="sticky top-0 z-30 bg-dex-bg/90 backdrop-blur-md border-b border-dex-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">我的收藏冊</h1>
            <p className="text-xs text-dex-muted mt-0.5">
              持有 <span className="text-dex-neon font-bold">{captures.length}</span> 種鳥精靈卡
            </p>
          </div>
          <button
            onClick={() => setSortBy(prev => prev === 'rarity' ? 'newest' : prev === 'newest' ? 'count' : 'rarity')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dex-surface border border-dex-border text-xs font-bold text-dex-muted hover:text-white transition"
          >
            <ArrowUpDown size={14} />
            {sortBy === 'rarity' ? '依稀有度' : sortBy === 'newest' ? '依最新' : '依次數'}
          </button>
        </div>

        {/* Rarity summary */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RARITY_ORDER.map(r => {
            const count = captures.filter(c => c.currentRarity === r).length;
            if (count === 0) return null;
            return (
              <div key={r} className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1"
                style={{ borderColor: RARITY_META[r].color, color: RARITY_META[r].color, background: RARITY_META[r].color + '15' }}>
                {RARITY_META[r].label}
                <span className="text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {capturedBirds.map(({ bird, capture }) => (
          <BirdCard
            key={bird.id}
            bird={bird}
            capture={capture}
            onClick={() => onSelectSpecies(bird.id)}
          />
        ))}
      </div>

      {capturedBirds.length === 0 && (
        <div className="py-32 flex flex-col items-center text-center px-6">
          <div className="text-5xl mb-4">📒</div>
          <h3 className="text-lg font-bold text-white mb-1">收藏冊還是空的</h3>
          <p className="text-sm text-dex-muted max-w-xs">
            還沒捕捉到任何鳥精靈。拿起相機去戶外，開始你的第一次捕捉吧！
          </p>
        </div>
      )}
    </div>
  );
}
