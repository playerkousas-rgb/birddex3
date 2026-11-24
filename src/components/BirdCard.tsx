import { useEffect, useState } from 'react';
import { useBirdImage } from '../hooks/useBirdImage';
import { BirdSpecies, CaptureRecord, Rarity } from '../types';
import { RARITY_META } from '../lib/theme';
import { useCollectionContext } from '../context/CollectionContext';
import { MapPin, Ruler, Utensils, Repeat2, Scissors } from 'lucide-react';
import { ivRankLabel } from '../lib/birdStats';
import { resolveCardFaces, type BackMediaKind } from '../lib/cardFace';
import { makeSticker } from '../lib/stickerMaker';
import { formatCapturedAt } from '../lib/captureMemory';

interface BirdCardProps {
  bird: BirdSpecies;
  capture?: CaptureRecord;
  compact?: boolean;
  onClick?: () => void;
  showStats?: boolean;   // 強制顯示 IV（CaptureResult 用）
  hideStats?: boolean;   // 強制隱藏 IV（圖鑑用）
  useSticker?: boolean;  // 切換至貼圖反面（外部同步用）
  flipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  backKind?: BackMediaKind;
  onBackKindChange?: (kind: BackMediaKind) => void;
  onGenerateSticker?: () => void;
  stickerBusy?: boolean;
  stickerStatus?: string;
}

export function BirdCard({
  bird,
  capture,
  compact,
  onClick,
  showStats,
  hideStats,
  useSticker,
  flipped: controlledFlipped,
  onFlippedChange,
  backKind: controlledBackKind,
  onBackKindChange,
  onGenerateSticker,
  stickerBusy: controlledStickerBusy,
  stickerStatus: controlledStickerStatus,
}: BirdCardProps) {
  const { canShowAltArt, setCaptureSticker } = useCollectionContext();
  const rarity: Rarity = capture?.currentRarity ?? 'UC';
  const meta = RARITY_META[rarity];
  const isUncaptured = !capture;

  const stats = capture?.bestStats ?? capture?.stats;
  const ivInfo = stats ? ivRankLabel(stats.iv.percent) : null;

  const [internalFlipped, setInternalFlipped] = useState(false);
  const [internalBackKind, setInternalBackKind] = useState<BackMediaKind>('photo');
  const [localStickerBusy, setLocalStickerBusy] = useState(false);
  const [localStickerMsg, setLocalStickerMsg] = useState('');

  useEffect(() => {
    setInternalFlipped(false);
    setInternalBackKind('photo');
    setLocalStickerMsg('');
  }, [bird.id]);

  const wantsAltArt = canShowAltArt(bird.id, rarity);
  const {
    imageUrl: illustrationUrl,
    onError: handleImgError,
    onLoad: handleImgLoad,
  } = useBirdImage(bird.id, bird.photoUrl, wantsAltArt, null);

  const effectiveBackRequest = controlledBackKind ?? internalBackKind;
  const faces = resolveCardFaces(capture, illustrationUrl, effectiveBackRequest);

  useEffect(() => {
    if (useSticker === undefined) return;
    if (useSticker && faces.stickerUrl) {
      setInternalFlipped(true);
      setInternalBackKind('sticker');
    } else if (!useSticker) {
      setInternalFlipped(false);
      setInternalBackKind('photo');
    }
  }, [useSticker, faces.stickerUrl]);

  const effectiveFlipped = (controlledFlipped ?? internalFlipped) && faces.canFlip && !isUncaptured;
  const effectiveStickerBusy = controlledStickerBusy ?? localStickerBusy;
  const effectiveStickerStatus = controlledStickerStatus ?? localStickerMsg;

  const setFlipped = (next: boolean) => {
    setInternalFlipped(next);
    onFlippedChange?.(next);
  };

  const setBackKind = (kind: BackMediaKind) => {
    setInternalBackKind(kind);
    onBackKindChange?.(kind);
  };

  const handleMakeStickerInternal = async () => {
    if (!faces.originalPhotoUrl || effectiveStickerBusy) return;
    if (onGenerateSticker) {
      onGenerateSticker();
      return;
    }
    try {
      setLocalStickerBusy(true);
      setLocalStickerMsg('準備中…');
      const url = await makeSticker(faces.originalPhotoUrl, setLocalStickerMsg);
      setCaptureSticker(bird.id, url);
      setBackKind('sticker');
      setFlipped(true);
      setLocalStickerMsg('完成！');
      window.setTimeout(() => setLocalStickerMsg(''), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalStickerMsg(msg);
    } finally {
      setLocalStickerBusy(false);
    }
  };

  // 是否顯示 IV 數值
  const shouldShowIv = showStats ? true : hideStats ? false : !!stats;

  if (compact) {
    const compactIsSticker = Boolean(useSticker && faces.stickerUrl);
    const compactImageUrl = compactIsSticker ? faces.stickerUrl : faces.frontIllustrationUrl;

    return (
      <button
        type="button"
        onClick={onClick}
        className="relative w-full aspect-[3/4] rounded-xl overflow-hidden card-3d text-left"
        style={{
          border: isUncaptured ? '2px dashed #374151' : meta.border,
          boxShadow: isUncaptured ? 'none' : meta.glow,
        }}
      >
        <div className="absolute inset-0 bird-art-bg" style={{ backgroundColor: isUncaptured ? '#111827' : bird.baseColor + '22' }} />
        {compactImageUrl && !isUncaptured ? (
          <img
            src={compactImageUrl}
            alt={bird.name}
            className={`absolute inset-0 w-full h-full ${
              compactIsSticker ? 'object-contain p-2' : 'object-cover opacity-95'
            }`}
            onError={handleImgError}
            onLoad={handleImgLoad}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">{bird.emoji}</div>
        )}
        {!compactIsSticker && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />}
        {compactIsSticker && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black tracking-wider shadow-md"
          style={{ background: meta.gradient, color: meta.textColor }}
        >
          {isUncaptured ? '???' : meta.label}
        </div>
        {compactIsSticker && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-dex-neon/90 text-dex-ink text-[9px] font-black">貼圖</div>
        )}
        {stats && !isUncaptured && !hideStats && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 border border-white/15 text-[10px] font-black"
            style={{ color: ivInfo?.color, left: compactIsSticker ? '42px' : '8px' }}
          >
            CP {stats.cp}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <div className="text-xs font-bold text-white truncate leading-tight drop-shadow">
            {bird.name}
          </div>
          <div className="text-[10px] text-white/75 truncate">{bird.nameEn}</div>
          {stats && !hideStats && <div className="text-[9px] mt-0.5" style={{ color: ivInfo?.color }}>{ivInfo?.label} · {stats.nature}</div>}
        </div>
        {['SSR', 'UR', 'LR'].includes(rarity) && !isUncaptured && (
          <div className="absolute inset-0 foil-shimmer rounded-xl pointer-events-none" />
        )}
        {stats?.isShiny && (
          <div className="absolute top-8 right-2 text-[10px]">✨</div>
        )}
      </button>
    );
  }

  const handleCardSurfaceClick = () => {
    if (onClick) {
      onClick();
    } else if (!isUncaptured && faces.canFlip) {
      setFlipped(!effectiveFlipped);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] card-flip-scene select-none">
      <div className="card-flip-inner" data-flipped={effectiveFlipped ? 'true' : 'false'}>
        {/* 正面：拍到照即解鎖插圖 */}
        <div
          onClick={handleCardSurfaceClick}
          aria-hidden={effectiveFlipped}
          className={`card-flip-face rounded-2xl overflow-hidden cursor-pointer ${
            effectiveFlipped ? 'pointer-events-none' : ''
          }`}
          style={{
            border: isUncaptured ? '2px dashed #374151' : meta.border,
            boxShadow: isUncaptured ? 'inset 0 0 40px rgba(0,0,0,0.5)' : meta.glow,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: isUncaptured
                ? 'radial-gradient(circle at 50% 50%, #1f2937 0%, #0b0f19 100%)'
                : `radial-gradient(ellipse at 30% 20%, ${bird.baseColor}33 0%, transparent 60%), linear-gradient(180deg, ${bird.baseColor}18 0%, #0b0f19 100%)`,
            }}
          />

          {faces.frontIllustrationUrl && !isUncaptured ? (
            <img
              src={faces.frontIllustrationUrl}
              alt={bird.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={handleImgError}
              onLoad={handleImgLoad}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[120px] opacity-20">{bird.emoji}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />

          <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/75 font-mono tracking-wider truncate">{bird.scientificName}</div>
              <div className={`text-lg font-black leading-tight truncate ${isUncaptured ? 'text-dex-muted' : 'text-white drop-shadow'}`}>
                {bird.name}
              </div>
              <div className="text-[10px] text-white/75 truncate">{isUncaptured ? '???' : bird.nameEn}</div>
            </div>
            <div
              className="px-2 py-1 rounded-lg text-xs font-black tracking-wider shadow-lg shrink-0"
              style={{ background: isUncaptured ? '#374151' : meta.gradient, color: isUncaptured ? '#9CA3AF' : meta.textColor }}
            >
              {isUncaptured ? '???' : meta.labelZh}
            </div>
          </div>

          {stats && shouldShowIv && !isUncaptured && (
            <div className="absolute top-16 left-3 right-3 pointer-events-none">
              <div className="bg-black/55 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10 text-[11px]">
                <div className="flex justify-between text-white/95 font-bold">
                  <span>CP {stats.cp}</span>
                  <span style={{ color: ivInfo?.color }}>{ivInfo?.label} {stats.iv.percent}%</span>
                </div>
                <div className="text-[10px] text-white/70 mt-0.5 truncate">{stats.nature} · {stats.trait} · {stats.sizeVariant}</div>
              </div>
            </div>
          )}

          {!isUncaptured && faces.canFlip && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setFlipped(true);
              }}
              aria-label={`反轉查看${bird.name}的照片與貼圖`}
              className="absolute right-2.5 bottom-[72px] z-20 min-h-[34px] px-2.5 py-1.5 rounded-full bg-black/75 border border-white/30 text-[11px] font-black text-white flex items-center gap-1 shadow-md backdrop-blur-sm hover:bg-black/90 active:scale-95 transition"
            >
              <Repeat2 size={12} className="text-dex-neon shrink-0" />
              <span>反轉照片</span>
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1.5">
              {bird.habitat.slice(0, 2).map(h => (
                <span key={h} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/15 text-white/90 border border-white/15 truncate">{h}</span>
              ))}
              <span className="ml-auto flex items-center gap-1 text-[10px] text-white/80 shrink-0">
                <Ruler size={10} /> {bird.size}
              </span>
            </div>

            {!isUncaptured && (
              <div className="flex items-center gap-2.5 text-[10px] text-white/75 truncate">
                <span className="flex items-center gap-1 shrink-0"><Utensils size={10} /> {bird.diet}</span>
                <span className="flex items-center gap-1 truncate"><MapPin size={10} className="shrink-0" /> {bird.hotspots[0]?.name ?? '全港'}</span>
              </div>
            )}

            {capture && (
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <div className="text-white/80">已拍攝 <span className="text-dex-neon font-bold">{capture.count}</span> 次</div>
                <div className="text-amber-300 font-bold truncate ml-1">
                  {capture.count >= 20 ? '傳說級夥伴' : capture.count >= 5 ? '親密夥伴' : '新夥伴'}
                </div>
              </div>
            )}
          </div>

          {['SSR', 'UR', 'LR'].includes(rarity) && !isUncaptured && (
            <div className="absolute inset-0 foil-shimmer pointer-events-none" />
          )}
          {stats?.isShiny && (
            <div className="absolute top-14 right-3 px-2 py-1 rounded-full bg-amber-400 text-black text-[10px] font-black shadow">✨ 色違</div>
          )}
          {isUncaptured && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
              <div className="text-6xl mb-2 opacity-40">{bird.emoji}</div>
              <div className="text-lg font-black text-white/90">{bird.name}</div>
              <div className="text-xs text-white/60 mb-3">{bird.nameEn}</div>
              <div className="px-3 py-1 rounded bg-white/10 text-[10px] text-white/70 font-black tracking-widest border border-white/20">
                尚未拍攝
              </div>
            </div>
          )}
        </div>

        {/* 反面：自己拍的照片 ＋ 生成／切換貼圖 */}
        {!isUncaptured && faces.canFlip && capture && (
          <div
            onClick={handleCardSurfaceClick}
            aria-hidden={!effectiveFlipped}
            className={`card-flip-face card-flip-back rounded-2xl overflow-hidden cursor-pointer ${
              !effectiveFlipped ? 'pointer-events-none' : ''
            }`}
            style={{
              border: meta.border,
              boxShadow: meta.glow,
              background: faces.activeBackKind === 'sticker'
                ? `radial-gradient(ellipse at center, ${bird.baseColor}55 0%, #0b0f19 72%)`
                : '#0b0f19',
            }}
          >
            {faces.backUrl && (
              <img
                src={faces.backUrl}
                alt={faces.activeBackKind === 'sticker' ? `${bird.name} 貼圖` : `${bird.name}（自己拍的照片）`}
                className={`absolute inset-0 w-full h-full ${
                  faces.activeBackKind === 'sticker'
                    ? 'object-contain p-4 drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]'
                    : 'object-cover'
                }`}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none" />

            <div className="absolute top-0 left-0 right-0 p-2.5 flex items-start justify-between gap-1.5 z-20">
              <div className="min-w-0">
                <span className="inline-block px-1.5 py-0.5 rounded bg-dex-neon text-dex-ink text-[9px] font-black">
                  {faces.activeBackKind === 'sticker' ? '貼圖' : '我的照片'}
                </span>
                <div className="text-sm font-black text-white leading-tight truncate mt-0.5 drop-shadow">
                  {bird.name}
                </div>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setFlipped(false);
                }}
                aria-label={`反轉回${bird.name}的插圖`}
                className="min-h-[32px] px-2.5 py-1 rounded-full bg-black/75 border border-white/30 text-[11px] font-black text-white flex items-center gap-1 shrink-0 backdrop-blur-sm hover:bg-black/90 active:scale-95 transition"
              >
                <Repeat2 size={12} className="text-dex-neon shrink-0" />
                <span>插圖</span>
              </button>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 p-2.5 z-20 space-y-1.5"
              onClick={e => e.stopPropagation()}
            >
              {effectiveStickerStatus ? (
                <div className="text-[10px] text-dex-neon font-bold truncate bg-black/60 rounded px-2 py-0.5">
                  {effectiveStickerStatus}
                </div>
              ) : (
                <div className="text-[10px] text-white/80 truncate pointer-events-none">
                  📅 {formatCapturedAt(capture.lastCaptureDate || capture.capturedAt)}
                </div>
              )}

              {faces.stickerUrl ? (
                <div className="flex gap-1.5">
                  {(faces.originalPhotoUrl || faces.celPhotoUrl) && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setBackKind('photo');
                      }}
                      aria-pressed={faces.activeBackKind === 'photo'}
                      className={`flex-1 min-h-[32px] rounded-lg text-[11px] font-black transition ${
                        faces.activeBackKind === 'photo'
                          ? 'bg-dex-neon text-dex-ink'
                          : 'bg-black/70 text-white border border-white/25'
                      }`}
                    >
                      原相
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setBackKind('sticker');
                    }}
                    aria-pressed={faces.activeBackKind === 'sticker'}
                    className={`flex-1 min-h-[32px] rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition ${
                      faces.activeBackKind === 'sticker'
                        ? 'bg-dex-neon text-dex-ink'
                        : 'bg-black/70 text-white border border-white/25'
                    }`}
                  >
                    <Scissors size={11} />
                    貼圖
                  </button>
                </div>
              ) : faces.canGenerateSticker ? (
                <button
                  type="button"
                  disabled={effectiveStickerBusy}
                  onClick={e => {
                    e.stopPropagation();
                    void handleMakeStickerInternal();
                  }}
                  className="w-full min-h-[34px] px-2.5 py-1.5 rounded-xl bg-dex-neon text-dex-ink text-[11px] font-black flex items-center justify-center gap-1 shadow disabled:opacity-60 active:scale-95 transition"
                >
                  <Scissors size={12} />
                  <span>{effectiveStickerBusy ? '去背中…' : '生成貼圖'}</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
