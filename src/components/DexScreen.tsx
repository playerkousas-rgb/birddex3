import { useState, useMemo } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { BIRD_SPECIES } from '../data/birdData';
import { BirdCard } from './BirdCard';
import { Search, Filter } from 'lucide-react';

interface DexScreenProps {
  onSelectSpecies: (id: number) => void;
}

export function DexScreen({ onSelectSpecies }: DexScreenProps) {
  const { captures, hasCaptured } = useCollectionContext();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'caught' | 'uncaught'>('all');

  const filtered = useMemo(() => {
    return BIRD_SPECIES.filter(b => {
      const matchQuery = !query ||
        b.name.includes(query) ||
        b.nameEn.toLowerCase().includes(query.toLowerCase()) ||
        b.scientificName.toLowerCase().includes(query.toLowerCase());
      const caught = hasCaptured(b.id);
      const matchFilter = filter === 'all' ? true : filter === 'caught' ? caught : !caught;
      return matchQuery && matchFilter;
    });
  }, [query, filter, hasCaptured]);

  const caughtCount = captures.length;
  const totalCount = BIRD_SPECIES.length;

  return (
    <div className="min-h-full bg-dex-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dex-bg/90 backdrop-blur-md border-b border-dex-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">鳥精靈圖鑑</h1>
            <p className="text-xs text-dex-muted mt-0.5">
              已收錄 <span className="text-dex-neon font-bold">{caughtCount}</span> / {totalCount} 種
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-dex-surface border border-dex-border flex items-center justify-center">
            <Filter size={20} className="text-dex-muted" />
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {(['all','caught','uncaught'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === k
                  ? 'bg-dex-neon text-dex-bg'
                  : 'bg-dex-surface text-dex-muted border border-dex-border'
              }`}
            >
              {k === 'all' ? '全部' : k === 'caught' ? '已捕捉' : '未發現'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dex-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋鳥名、英文或學名..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dex-surface border border-dex-border text-sm text-white placeholder-dex-muted focus:outline-none focus:border-dex-neon/50 transition"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filtered.map(bird => {
          const capture = captures.find(c => c.speciesId === bird.id);
          return (
            <BirdCard
              key={bird.id}
              bird={bird}
              capture={capture}
              compact
              hideStats
              onClick={() => onSelectSpecies(bird.id)}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-dex-muted text-sm">
          沒有符合條件的鳥精靈
        </div>
      )}
    </div>
  );
}
