import { useBirdImage } from '../hooks/useBirdImage';
import { BirdSpecies, CaptureRecord, Rarity } from '../types';
import { RARITY_META } from '../lib/theme';
import { useCollectionContext } from '../context/CollectionContext';
import { MapPin, Ruler, Utensils } from 'lucide-react';
import { ivRankLabel } from '../lib/birdStats';

interface BirdCardProps {
  bird: BirdSpecies;
  capture?: CaptureRecord;
  compact?: boolean;
  onClick?: () => void;
  showStats?: boolean;   // 強制顯示 IV（CaptureResult 用）
  hideStats?: boolean;   // 強制隱藏 IV（圖鑑用）
  useSticker?: boolean;  // 使用貼圖版
}

export function BirdCard({ bird, capture, compact, onClick, showStats, hideStats, useSticker }: BirdCardProps) {
  const { canShowAltArt } = useCollectionContext();
  const rarity: Rarity = capture?.currentRarity ?? 'UC';
  const meta = RARITY_META[rarity];
  const isUncaptured = !capture;

  const stats = capture?.stats ?? capture?.bestStats;
  const ivInfo = stats ? ivRankLabel(stats.iv.percent) : null;

  // 圖片來源優先序：貼圖 > 異圖卡 > 原圖
  const wantsAltArt = canShowAltArt(bird.id, rarity);
  const { imageUrl: currentImageUrl, isSticker: isStickerMode, onError: handleImgError, onLoad: handleImgLoad } =
    useBirdImage(bird.id, bird.photoUrl, wantsAltArt, useSticker ? stats?.stickerUrl : null);

  // 是否顯示 IV 數值
  const shouldShowIv = showStats ? true : hideStats ? false : !!stats;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="relative w-full aspect-[3/4] rounded-xl overflow-hidden card-3d text-left"
        style={{
          border: isUncaptured ? '2px dashed #374151' : meta.border,
          boxShadow: isUncaptured ? 'none' : meta.glow,
        }}
      >
        <div className="absolute inset-0 bird-art-bg" style={{ backgroundColor: isUncaptured ? '#111827' : bird.baseColor + '22' }} />
        {currentImageUrl && !isUncaptured ? (
          <img 
            src={currentImageUrl} 
            alt={bird.name} 
            className={`absolute inset-0 w-full h-full ${
              isStickerMode ? 'object-contain p-2' : 'object-cover opacity-70'
            }`}
            onError={handleImgError} onLoad={handleImgLoad} loading="lazy"/>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">{bird.emoji}</div>
        )}
        {!isStickerMode && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />}
        {isStickerMode && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black tracking-wider shadow-md"
          style={{ background: meta.gradient, color: meta.textColor }}>
          {isUncaptured ? '???' : meta.label}
        </div>
        {isStickerMode && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-dex-neon/90 text-dex-bg text-[9px] font-black">貼圖</div>
        )}
        {stats && !isUncaptured && !hideStats && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 border border-white/15 text-[10px] font-black"
               style={{ color: ivInfo?.color, left: isStickerMode ? '42px' : '8px' }}>CP {stats.cp}</div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <div className="text-xs font-bold text-white truncate leading-tight drop-shadow">
            {bird.name}
          </div>
          <div className="text-[10px] text-dex-muted truncate">{bird.nameEn}</div>
          {stats && !hideStats && <div className="text-[9px] mt-0.5" style={{color: ivInfo?.color}}>{ivInfo?.label} · {stats.nature}</div>}
        </div>
        {['SSR','UR','LR'].includes(rarity) && !isUncaptured && (
          <div className="absolute inset-0 foil-shimmer rounded-xl pointer-events-none" />
        )}
        {stats?.isShiny && (
          <div className="absolute top-8 right-2 text-[10px]">✨</div>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-2xl overflow-hidden card-3d cursor-pointer select-none"
      style={{
        border: isUncaptured ? '2px dashed #374151' : meta.border,
        boxShadow: isUncaptured ? 'inset 0 0 40px rgba(0,0,0,0.5)' : meta.glow,
      }}
    >
      <div className="absolute inset-0" style={{ background: isUncaptured
        ? 'radial-gradient(circle at 50% 50%, #1f2937 0%, #0b0f19 100%)'
        : isStickerMode
          ? `radial-gradient(ellipse at center, ${bird.baseColor}55 0%, #0b0f19 70%)`
          : `radial-gradient(ellipse at 30% 20%, ${bird.baseColor}33 0%, transparent 60%), linear-gradient(180deg, ${bird.baseColor}18 0%, #0b0f19 100%)`
      }} />

      {currentImageUrl && !isUncaptured ? (
        <img 
          src={currentImageUrl} 
          alt={bird.name} 
          className={`absolute inset-0 w-full h-full ${isStickerMode ? 'object-contain p-4' : 'object-cover opacity-60'}`}
          onError={handleImgError} onLoad={handleImgLoad}/>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[120px] opacity-20">{bird.emoji}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-dex-muted font-mono tracking-wider">{bird.scientificName}</div>
          <div className={`text-lg font-black leading-tight truncate ${isUncaptured ? 'text-dex-muted' : 'text-white'}`}>
            {bird.name}
          </div>
          <div className="text-[10px] text-dex-muted truncate">{isUncaptured ? '???' : bird.nameEn}</div>
        </div>
        <div className="px-2 py-1 rounded-lg text-xs font-black tracking-wider shadow-lg"
          style={{ background: isUncaptured ? '#374151' : meta.gradient, color: isUncaptured ? '#9CA3AF' : meta.textColor }}>
          {isUncaptured ? '???' : meta.labelZh}
        </div>
      </div>

      {isStickerMode && (
        <div className="absolute top-14 right-3 px-2 py-1 rounded-full bg-dex-neon text-dex-bg text-[10px] font-black">貼圖</div>
      )}

      {stats && shouldShowIv && !isUncaptured && (
        <div className="absolute top-16 left-3 right-3">
          <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-[11px]">
            <div className="flex justify-between text-white/90 font-bold">
              <span>CP {stats.cp}</span>
              <span style={{color: ivInfo?.color}}>{ivInfo?.label} {stats.iv.percent}%</span>
            </div>
            <div className="text-[10px] text-white/60 mt-0.5">{stats.nature} · {stats.trait} · {stats.sizeVariant}</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          {bird.habitat.slice(0, 2).map(h => (
            <span key={h} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80 border border-white/10">{h}</span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-dex-muted">
            <Ruler size={10} /> {bird.size}
          </span>
        </div>

        {!isUncaptured && (
          <div className="flex items-center gap-3 text-[10px] text-dex-muted">
            <span className="flex items-center gap-1"><Utensils size={10} /> {bird.diet}</span>
            <span className="flex items-center gap-1"><MapPin size={10} /> {bird.hotspots[0]?.name ?? '全港'}</span>
          </div>
        )}

        {capture && (
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <div className="text-dex-muted">已捕捉 <span className="text-dex-neon font-bold">{capture.count}</span> 次</div>
            <div className="text-dex-gold">
              {capture.count >= 20 ? '傳說級夥伴' : capture.count >= 5 ? '親密夥伴' : '新夥伴'}
              {stats && shouldShowIv && ` · CP ${stats.cp}`}
            </div>
          </div>
        )}
      </div>

      {['SSR','UR','LR'].includes(rarity) && !isUncaptured && (
        <div className="absolute inset-0 foil-shimmer pointer-events-none" />
      )}
      {stats?.isShiny && (
        <div className="absolute top-14 right-3 px-2 py-1 rounded-full bg-amber-400 text-black text-[10px] font-black shadow" style={{ right: isStickerMode ? '62px' : '12px'}}>✨ 色違</div>
      )}
      {isUncaptured && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="text-6xl mb-2 opacity-40">{bird.emoji}</div>
          <div className="text-lg font-black text-white/90">{bird.name}</div>
          <div className="text-xs text-white/60 mb-3">{bird.nameEn}</div>
          <div className="px-3 py-1 rounded bg-white/10 text-[10px] text-white/70 font-black tracking-widest border border-white/20">
            尚未捕捉
          </div>
        </div>
      )}
    </div>
  );
}
