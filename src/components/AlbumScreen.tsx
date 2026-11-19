import { useMemo, useState } from 'react';
import { AppLogo } from './AppLogo';
import { TrainerTierBadge } from './TrainerTierBadge';
import { useCollectionContext } from '../context/CollectionContext';
import { BIRD_SPECIES } from '../data/birdData';
import { BirdCard } from './BirdCard';
import { RARITY_ORDER, RARITY_META } from '../lib/theme';
import { AVIANDEX_BASE_URL } from '../lib/aviandex';
import { ArrowUpDown, BookOpen, MapPin, Share2 } from 'lucide-react';
import { formatCapturedAt, formatCaptureArea } from '../lib/captureMemory';
import { shareCaptureImage } from '../lib/shareCapture';
import { buildFootprints } from '../lib/captureFootprint';

interface AlbumScreenProps {
  onSelectSpecies: (id: number) => void;
}

export function AlbumScreen({ onSelectSpecies }: AlbumScreenProps) {
  const { captures, profile } = useCollectionContext();
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'count'>('rarity');
  const [showFootprints, setShowFootprints] = useState(false);

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

  const footprints = useMemo(() => buildFootprints(captures, BIRD_SPECIES), [captures]);

  return (
    <div className="min-h-full bg-dex-bg pb-24">
      <div className="sticky top-0 z-30 bg-dex-bg/90 backdrop-blur-md border-b border-dex-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <AppLogo size={38} />
          <TrainerTierBadge level={profile.level} size={44} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-dex-text tracking-wide">我的收藏冊</h1>
            <p className="text-xs text-dex-muted mt-0.5">
              持有 <span className="text-dex-neon font-bold">{captures.length}</span> 種鳥卡
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 兄弟互通：收藏 ↔ AvianDex 權威圖鑑 */}
            <button
              type="button"
              onClick={() => window.open(AVIANDEX_BASE_URL, '_blank', 'noopener')}
              aria-label="開啟 AvianDex 圖鑑"
              title="AvianDex 圖鑑（權威資料）"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dex-neon/10 border border-dex-neon/40 text-dex-neon text-xs font-black transition"
            >
              <BookOpen size={14} aria-hidden="true" />
              圖鑑
            </button>
            <button
              onClick={() => setSortBy(prev => prev === 'rarity' ? 'newest' : prev === 'newest' ? 'count' : 'rarity')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dex-surface border border-dex-border text-xs font-bold text-dex-muted hover:text-dex-text transition"
            >
              <ArrowUpDown size={14} />
              {sortBy === 'rarity' ? '依稀有度' : sortBy === 'newest' ? '依最新' : '依次數'}
            </button>
          </div>
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
                <span className="text-dex-text font-black">{count}</span>
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
          <h3 className="text-lg font-bold text-dex-text mb-1">收藏冊還是空的</h3>
          <p className="text-sm text-dex-muted max-w-xs">
            還沒拍攝到任何鳥。拿起相機去戶外，開始你的第一次拍攝吧！
          </p>
        </div>
      )}

      {/* 觀鳥足跡：相片 → 】（咩雀、邊日、邊度）→ 分享。只記錄，不影響辨識。 */}
      {captures.length > 0 && (
        <div className="px-4 pb-4 max-w-2xl mx-auto">
          <button
            onClick={() => setShowFootprints(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-dex-surface border border-dex-border text-dex-text text-sm font-black"
          >
            <span className="flex items-center gap-2"><MapPin size={16} className="text-dex-neon" /> 觀鳥足跡 · {footprints.length} 次</span>
            <span className="text-xs text-dex-muted">{showFootprints ? '收起 ▲' : '展開 ▼'}</span>
          </button>
          {showFootprints && (
            <div className="mt-2 space-y-2">
              {footprints.map(fp => (
                <div key={fp.key} className="flex items-center gap-3 p-3 rounded-xl bg-dex-surface/70 border border-dex-border">
                  {fp.photo ? (
                    <img src={fp.photo} alt={fp.birdName} className="w-12 h-12 rounded-lg object-cover border border-dex-border" />
                  ) : <div className="w-12 h-12 rounded-lg bg-dex-bg flex items-center justify-center text-xl">📷</div>}
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onSelectSpecies(fp.birdId)} className="text-sm font-black text-dex-text hover:text-dex-neon truncate block">{fp.birdName}</button>
                    <div className="text-[10px] text-dex-muted flex flex-wrap gap-x-3">
                      <span>{formatCapturedAt(fp.when)}</span>
                      <span>{formatCaptureArea(fp.where)}</span>
                    </div>
                  </div>
                  {fp.photo && (
                    <button
                      onClick={() => shareCaptureImage(fp.photo!, `${fp.birdName}_原相.png`, `BIRD-DEX · ${fp.birdName}`)}
                      aria-label={`分享${fp.birdName}的原相`}
                      className="p-2 rounded-lg border border-dex-border text-dex-muted hover:text-dex-neon"
                    >
                      <Share2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-dex-muted leading-relaxed px-1">
                足跡只保存在你手機，分享出去嘅圖片唔會附帶座標；相片只作紀錄同證明，唔參與品種辨識。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}