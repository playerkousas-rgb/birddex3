import { useEffect, useState } from 'react';
import { useBirdImage } from '../hooks/useBirdImage';
import { formatCaptureLocation } from '../lib/captureMemory';
import { useCollectionContext } from '../context/CollectionContext';
import { getBirdById } from '../data/birdData';
import { RARITY_META } from '../lib/theme';
import {
  ArrowLeft, Share2, ExternalLink, Image as ImageIcon,
  Scissors, Download, Trash2, Star, Crown, RefreshCcw, Repeat2,
} from 'lucide-react';
import { makeSticker } from '../lib/stickerMaker';
import { ivRankLabel, natureEffect } from '../lib/birdStats';
import { birdNo, openAvianDexUnlock } from '../lib/aviandex';
import { shareCaptureImage } from '../lib/shareCapture';
import { resolveCardFaces, type BackMediaKind } from '../lib/cardFace';

interface BirdDetailScreenProps {
  speciesId: number;
  onBack: () => void;
}

export function BirdDetailScreen({ speciesId, onBack }: BirdDetailScreenProps) {
  const bird = getBirdById(speciesId);
  const { captures, canShowAltArt, altArt, setCaptureSticker, setBestIndividual, deleteCatchRecord, deleteCapture } = useCollectionContext();
  const capture = captures.find(c => c.speciesId === speciesId);
  const isCaught = !!capture;

  const rarity = capture?.currentRarity ?? 'UC';
  const stats = capture?.bestStats ?? capture?.stats;
  const allCatches = capture?.allCatches ?? [];
  const [stickerBusy, setStickerBusy] = useState(false);
  const [stickerMsg, setStickerMsg] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [backKind, setBackKind] = useState<BackMediaKind>('photo');
  const [showIvList, setShowIvList] = useState(false);

  useEffect(() => {
    setFlipped(false);
    setBackKind('photo');
    setStickerMsg('');
  }, [speciesId]);

  const wantsAltArt = bird ? canShowAltArt(bird.id, rarity) : false;
  const { imageUrl: heroImageUrl, onLoad: handleImageLoad, onError: handleImageError } =
    useBirdImage(speciesId, bird?.photoUrl, wantsAltArt, null);

  const faces = resolveCardFaces(capture, heroImageUrl, backKind);
  const effectiveFlipped = isCaught && faces.canFlip && flipped;

  const handleMakeSticker = async () => {
    if (!bird || !faces.originalPhotoUrl || stickerBusy) return;
    try {
      setFlipped(true);
      setStickerBusy(true);
      setStickerMsg('準備中…');
      const url = await makeSticker(faces.originalPhotoUrl, setStickerMsg);
      setCaptureSticker(bird.id, url);
      setBackKind('sticker');
      setFlipped(true);
      setStickerMsg('貼圖已生成！');
      window.setTimeout(() => setStickerMsg(''), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStickerMsg('失敗：' + msg);
    } finally {
      setStickerBusy(false);
    }
  };

  const altArtUnlocked = bird ? altArt.unlocked.includes(bird.id) : false;
  const altArtMissing  = bird ? altArt.missingOnR2.includes(bird.id) : false;

  if (!bird) {
    return (
      <div className="min-h-full bg-dex-bg flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-3">🙈</div>
        <p className="text-dex-muted">找不到這隻鳥的資料</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-dex-surface border border-dex-border text-dex-text text-sm">返回</button>
      </div>
    );
  }

  const rarityMeta = capture ? RARITY_META[capture.currentRarity] : null;

  const handleShare = async () => {
    const st = stats;
    const text = st
      ? `我在 BIRD-DEX 拍攝到 ${bird.name}！CP ${st.cp} · IV ${st.iv.percent}% · ${st.nature} · ${capture?.count}次`
      : `我在 BIRD-DEX 拍攝到了 ${bird.name}！`;
    if (navigator.share) {
      try { await navigator.share({ title: `BIRD-DEX · ${bird.name}`, text, url: window.location.href }); return; } catch {}
    }
    await navigator.clipboard.writeText(text + '\n' + window.location.href);
    alert('已複製到剪貼簿！');
  };

  const handleExternalLink = () => {
    const url = `https://avian-dex.vercel.app/?id=${bird.id}&search=${encodeURIComponent(bird.name)}`;
    window.open(url, '_blank');
  };

  const shareableUserPhoto = faces.activeBackKind === 'cel' && faces.celPhotoUrl
    ? { url: faces.celPhotoUrl, label: '賽璐璐卡' }
    : faces.originalPhotoUrl
      ? { url: faces.originalPhotoUrl, label: '原相' }
      : faces.celPhotoUrl
        ? { url: faces.celPhotoUrl, label: '鳥卡' }
        : null;

  return (
    <div className="min-h-full bg-dex-bg pb-8 relative flex flex-col">
      {/* Hero：正面為已解鎖插圖；反轉切換成自己拍的照片及貼圖 */}
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto shrink-0 mt-4 px-4">
        <div className="w-full h-full card-flip-scene">
          <div className="card-flip-inner" data-flipped={effectiveFlipped ? 'true' : 'false'}>
            {/* 正面：已解鎖插圖 */}
            <div
              aria-hidden={effectiveFlipped}
              onClick={() => {
                if (isCaught && faces.canFlip) setFlipped(true);
              }}
              className={`card-flip-face rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.12)] border-4 border-dex-border bg-dex-surface ${
                isCaught && faces.canFlip ? 'cursor-pointer' : ''
              } ${effectiveFlipped ? 'pointer-events-none' : ''}`}
            >
              {faces.frontIllustrationUrl && isCaught ? (
                <img
                  src={faces.frontIllustrationUrl}
                  alt={bird.name}
                  className="w-full h-full object-cover"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-dex-bg relative">
                  <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(180deg, ${bird.baseColor} 0%, transparent 100%)` }} />
                  <span className="text-8xl opacity-10 mb-4">{bird.emoji}</span>
                  <span className="text-dex-muted font-black tracking-widest">NO DATA</span>
                </div>
              )}

              {isCaught && (
                <div className="absolute top-16 right-3 z-10 flex flex-col gap-1.5 items-end pointer-events-none">
                  {wantsAltArt && !altArtMissing && faces.frontIllustrationUrl && (
                    <div className="px-2 py-1 rounded-md bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-[10px] font-black tracking-wider shadow-lg border border-white/30">✨ ALT ART</div>
                  )}
                  {altArtUnlocked && altArtMissing && (
                    <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white/70 text-[10px] font-bold border border-white/10">異圖卡尚未繪製</div>
                  )}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-4 pointer-events-none">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-300 font-mono mb-0.5">
                      NO.{String(bird.id).padStart(4, '0')}{isCaught ? ' · 已解鎖插圖' : ''}
                    </div>
                    <h1 className="text-3xl font-black text-white leading-tight truncate drop-shadow-md">{bird.name}</h1>
                    <p className="text-sm text-gray-300 truncate font-bold">{bird.nameEn}</p>
                    {stats && <p className="text-[11px] mt-1" style={{ color: ivRankLabel(stats.iv.percent).color }}>CP {stats.cp} · {ivRankLabel(stats.iv.percent).label} {stats.iv.percent}% · {stats.nature}</p>}
                  </div>
                  {rarityMeta && (
                    <div
                      className="px-3 py-1.5 rounded-lg text-sm font-black tracking-wider shadow-lg shrink-0 border border-white/20"
                      style={{ background: rarityMeta.gradient, color: rarityMeta.textColor }}
                    >
                      {rarityMeta.label}
                    </div>
                  )}
                </div>
              </div>

              {isCaught && rarityMeta && capture && ['SSR', 'UR', 'LR'].includes(capture.currentRarity) && (
                <div className="absolute inset-0 foil-shimmer pointer-events-none" />
              )}
            </div>

            {/* 反面：自己拍的照片／貼圖 */}
            {isCaught && faces.canFlip && capture && (
              <div
                aria-hidden={!effectiveFlipped}
                onClick={() => setFlipped(false)}
                className={`card-flip-face card-flip-back rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.12)] border-4 border-dex-border cursor-pointer ${
                  !effectiveFlipped ? 'pointer-events-none' : ''
                }`}
                style={{
                  background: faces.activeBackKind === 'sticker'
                    ? `radial-gradient(ellipse at center, ${bird.baseColor}55 0%, #0b0f19 72%)`
                    : '#0b0f19',
                }}
              >
                {faces.backUrl && (
                  <img
                    src={faces.backUrl}
                    alt={faces.activeBackKind === 'sticker' ? `${bird.name} 貼圖` : `${bird.name}（自己拍的照片）`}
                    className={`w-full h-full ${
                      faces.activeBackKind === 'sticker'
                        ? 'object-contain p-6 drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)]'
                        : 'object-cover'
                    }`}
                  />
                )}

                <div className="absolute top-20 right-3 z-10 pointer-events-none">
                  <div className="px-2.5 py-1 rounded-md bg-dex-neon text-dex-ink text-[10px] font-black shadow">
                    {faces.activeBackKind === 'sticker'
                      ? '貼圖版'
                      : faces.activeBackKind === 'cel'
                        ? '賽璐璐版'
                        : '自己拍的照片'}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-4 pointer-events-none">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-300 font-mono mb-0.5">
                        NO.{String(bird.id).padStart(4, '0')} · {faces.activeBackKind === 'sticker' ? '透明貼圖' : '拍攝證據'}
                      </div>
                      <div className="text-3xl font-black text-white leading-tight truncate drop-shadow-md">{bird.name}</div>
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        📅 {new Date(capture.lastCaptureDate).toLocaleDateString('zh-HK')} · 📍 {formatCaptureLocation(capture.location)}
                      </p>
                    </div>
                    {rarityMeta && (
                      <div
                        className="px-3 py-1.5 rounded-lg text-sm font-black tracking-wider shadow-lg shrink-0 border border-white/20"
                        style={{ background: rarityMeta.gradient, color: rarityMeta.textColor }}
                      >
                        {rarityMeta.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-4 left-7 right-7 flex justify-between items-center z-20">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="w-11 h-11 rounded-full bg-black/65 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-2 items-center">
            {isCaught && faces.canFlip && (
              <button
                type="button"
                onClick={() => setFlipped(v => !v)}
                className="h-11 px-3.5 rounded-full bg-black/70 backdrop-blur-md border border-white/25 flex items-center justify-center gap-1.5 text-xs font-black text-white hover:bg-black/85 transition shadow-lg"
                title={effectiveFlipped ? '反轉回插圖' : '反轉查看自己拍的照片'}
              >
                <Repeat2 size={15} className="text-dex-neon" />
                <span>{effectiveFlipped ? '反轉插圖' : '反轉照片'}</span>
              </button>
            )}
            {isCaught && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="分享"
                className="w-11 h-11 rounded-full bg-dex-neon/95 backdrop-blur-md border-2 border-dex-neon flex items-center justify-center text-dex-ink hover:brightness-110 transition shadow-lg"
              >
                <Share2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 卡面切換列：插圖 ↔ 自己拍的照片 ↔ 貼圖／生成貼圖 */}
      {isCaught && faces.canFlip && (
        <div className="px-4 pt-3 max-w-md mx-auto w-full">
          <div className="bg-dex-surface border border-dex-border rounded-xl p-1 flex items-center gap-1" role="group" aria-label="切換插圖、照片與貼圖">
            <button
              type="button"
              onClick={() => setFlipped(false)}
              aria-pressed={!effectiveFlipped}
              className={`flex-1 min-h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                !effectiveFlipped ? 'bg-dex-neon text-dex-ink' : 'text-dex-muted hover:text-dex-text'
              }`}
            >
              <ImageIcon size={14} /> 插圖
            </button>
            {(faces.originalPhotoUrl || faces.celPhotoUrl) && (
              <button
                type="button"
                onClick={() => {
                  setBackKind('photo');
                  setFlipped(true);
                }}
                aria-pressed={effectiveFlipped && faces.activeBackKind === 'photo'}
                className={`flex-1 min-h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  effectiveFlipped && faces.activeBackKind === 'photo' ? 'bg-dex-neon text-dex-ink' : 'text-dex-muted hover:text-dex-text'
                }`}
              >
                <Repeat2 size={14} /> 我的照片
              </button>
            )}
            {faces.celPhotoUrl && faces.originalPhotoUrl && (
              <button
                type="button"
                onClick={() => {
                  setBackKind('cel');
                  setFlipped(true);
                }}
                aria-pressed={effectiveFlipped && faces.activeBackKind === 'cel'}
                className={`px-2.5 min-h-10 rounded-lg text-xs font-bold flex items-center justify-center transition ${
                  effectiveFlipped && faces.activeBackKind === 'cel' ? 'bg-dex-neon text-dex-ink font-black' : 'text-dex-muted hover:text-dex-text'
                }`}
              >
                賽璐璐
              </button>
            )}
            {faces.stickerUrl ? (
              <button
                type="button"
                onClick={() => {
                  setBackKind('sticker');
                  setFlipped(true);
                }}
                aria-pressed={effectiveFlipped && faces.activeBackKind === 'sticker'}
                className={`flex-1 min-h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  effectiveFlipped && faces.activeBackKind === 'sticker' ? 'bg-dex-neon text-dex-ink' : 'text-dex-muted hover:text-dex-text'
                }`}
              >
                <Scissors size={14} /> 貼圖
              </button>
            ) : faces.canGenerateSticker ? (
              <button
                type="button"
                disabled={stickerBusy}
                onClick={handleMakeSticker}
                className="flex-1 min-h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 bg-dex-neon/15 text-dex-neon border border-dex-neon/40 hover:bg-dex-neon hover:text-dex-ink transition disabled:opacity-50"
              >
                <Scissors size={14} /> {stickerBusy ? '去背中…' : '生成貼圖'}
              </button>
            ) : null}
          </div>
          {stickerMsg && <p className="text-[11px] text-dex-neon font-bold mt-1.5 px-1">{stickerMsg}</p>}
        </div>
      )}

      <div className="px-4 py-5 space-y-4 max-w-md mx-auto w-full">

        {/* IV / 貼圖管理器 */}
        {isCaught && capture && (
          <div className="bg-dex-surface border border-dex-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-dex-text flex items-center gap-1.5"><Star size={13} className="text-dex-gold" /> 個體管理</div>
              {stats && <div className="text-[11px] font-black" style={{ color: ivRankLabel(stats.iv.percent).color }}>CP {stats.cp} · {ivRankLabel(stats.iv.percent).label}</div>}
            </div>
            {stats ? (
              <div className="text-[11px] text-dex-text/80 mb-2">
                {stats.nature}｜{natureEffect(stats.nature)} · {stats.trait} · 體型 {stats.sizeVariant}
                {stats.catchScore && ` · ${stats.catchScore} 投擲`}
                {stats.isShiny && ' · ✨ 色違'}
              </div>
            ) : <div className="text-[11px] text-dex-muted mb-2">舊記錄，無 IV 資料</div>}

            <div className="flex gap-2 text-[11px] flex-wrap mb-2">
              {faces.canGenerateSticker && (
                <button
                  type="button"
                  disabled={stickerBusy}
                  onClick={handleMakeSticker}
                  className="px-3 py-1.5 rounded-lg bg-dex-neon text-dex-ink font-bold disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCcw size={12} /> {faces.stickerUrl ? '重做貼圖' : '生成貼圖'}
                </button>
              )}
              {faces.stickerUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (effectiveFlipped && faces.activeBackKind === 'sticker') {
                        setFlipped(false);
                      } else {
                        setBackKind('sticker');
                        setFlipped(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-dex-bg text-dex-text font-bold border border-dex-border"
                  >
                    {effectiveFlipped && faces.activeBackKind === 'sticker' ? '看回插圖' : '看貼圖'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(faces.stickerUrl!);
                      const blob = await res.blob();
                      const file = new File([blob], `${bird.name}_sticker.png`, { type: 'image/png' });
                      if ((navigator as any).canShare?.({ files: [file] })) await (navigator as any).share({ files: [file], title: bird.name });
                      else {
                        const a = document.createElement('a');
                        a.href = faces.stickerUrl!;
                        a.download = `${bird.name}_sticker.png`;
                        a.click();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-dex-bg text-dex-text flex items-center gap-1 border border-dex-border"
                  >
                    <Share2 size={12} />分享貼圖
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = faces.stickerUrl!;
                      a.download = `${bird.name}_sticker.png`;
                      a.click();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-dex-bg text-dex-text flex items-center gap-1 border border-dex-border"
                  >
                    <Download size={12} />下載
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('刪除貼圖？')) {
                        setCaptureSticker(bird.id, null);
                        setBackKind('photo');
                      }
                    }}
                    aria-label="刪除貼圖"
                    className="px-2.5 py-1.5 rounded-lg bg-dex-bg text-dex-muted text-[10px] border border-dex-border"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
              {shareableUserPhoto && (
                <button
                  type="button"
                  onClick={() => shareCaptureImage(
                    shareableUserPhoto.url,
                    `${bird.name}_${shareableUserPhoto.label}.png`,
                    `BIRD-DEX · ${bird.name}`,
                  )}
                  className="px-3 py-1.5 rounded-lg bg-dex-bg text-dex-text flex items-center gap-1 border border-dex-border"
                >
                  <Share2 size={12} /> 分享{shareableUserPhoto.label}
                </button>
              )}
            </div>
            {stickerMsg && !faces.canFlip && <div className="text-[10px] text-dex-neon mb-2">{stickerMsg}</div>}

            {/* IV 歷史清單 */}
            {allCatches.length > 1 && (
              <div className="pt-3 mt-2 border-t border-dex-border">
                <button type="button" onClick={() => setShowIvList(v => !v)} className="text-[11px] text-dex-neon font-bold">
                  個體歷史 ({allCatches.length} 隻) {showIvList ? '▲' : '▼'}
                </button>
                {showIvList && (
                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {allCatches.map((st, i) => {
                      const isBest = capture.bestStats === st || capture.stats === st;
                      const ivr = ivRankLabel(st.iv.percent);
                      return (
                        <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] ${isBest ? 'bg-dex-neon/10 border border-dex-neon/30' : 'bg-dex-bg border border-dex-border'}`}>
                          <div className="flex-1">
                            <span className="font-black text-dex-text">CP {st.cp}</span>
                            <span className="ml-2" style={{ color: ivr.color }}>{ivr.label} {st.iv.percent}%</span>
                            <span className="text-dex-muted ml-2">{st.nature} · {st.trait}</span>
                            {st.isShiny && <span className="ml-1">✨</span>}
                          </div>
                          {!isBest && (
                            <button type="button" onClick={() => setBestIndividual(bird.id, i)} className="px-2 py-1 rounded bg-dex-bg text-dex-text text-[10px] flex items-center gap-1">
                              <Crown size={11} /> 設為代表
                            </button>
                          )}
                          {isBest && <span className="text-[10px] text-dex-neon font-bold">★代表</span>}
                          <button
                            type="button"
                            onClick={() => {
                              const msg = allCatches.length <= 1
                                ? '呢個品種只餘下呢一筆拍攝紀錄；刪除後會變回「未拍到」。確定？'
                                : '刪除呢次拍攝紀錄？不能復原。';
                              if (confirm(msg)) deleteCatchRecord(bird.id, i);
                            }}
                            aria-label="刪除呢次拍攝紀錄"
                            className="text-dex-muted hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 拍攝統計 */}
        <div className="bg-dex-surface border border-dex-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-5"><ImageIcon size={150} /></div>
          {!isCaught ? (
            <div className="flex flex-col items-center text-center gap-3 py-2 relative z-10">
              <div className="w-16 h-16 rounded-full bg-dex-bg border-2 border-dex-border flex items-center justify-center text-3xl">🔒</div>
              <div>
                <p className="text-lg font-black text-dex-text mb-1">尚未拍到</p>
                <p className="text-xs text-dex-muted">去戶外拍到照片即可解鎖插圖，並反轉查看自己拍的照片及生成貼圖！</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-dex-muted font-black tracking-widest mb-1">拍攝紀錄</p>
                  <div className="flex items-baseline gap-2"><span className="text-4xl font-black text-dex-text">{capture.count}</span><span className="text-sm text-dex-muted font-bold">次</span></div>
                  <p className="text-[10px] text-dex-muted mt-1">首次：{new Date(capture.firstCaptureDate).toLocaleDateString('zh-HK')} · 最近：{new Date(capture.lastCaptureDate).toLocaleDateString('zh-HK')}</p>
                  <p className="text-[10px] text-dex-muted mt-0.5">📍 {formatCaptureLocation(capture.location)}</p>
                  {allCatches.length > 1 && <p className="text-[10px] text-dex-neon mt-0.5">已記錄 {allCatches.length} 隻不同個體</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-dex-muted font-black tracking-widest mb-1">當前階級</p>
                  <p className="text-xl font-black" style={{ color: rarityMeta?.color }}>{rarityMeta?.labelZh}</p>
                </div>
              </div>
              <div className="relative z-10 mt-3 pt-3 border-t border-dex-border flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('刪除呢種鳥嘅全部拍攝紀錄？原相、IV 同貼圖都會移除，不能復原。')) {
                      deleteCapture(bird.id);
                      onBack();
                    }
                  }}
                  className="px-3 py-2 rounded-lg border border-red-400/40 text-red-500 text-[11px] font-bold flex items-center gap-1.5 min-h-[40px]"
                >
                  <Trash2 size={12} /> 刪除全部拍攝紀錄
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleExternalLink}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-dex-surface border border-dex-border text-dex-text font-bold shadow-lg active:scale-95 transition group"
        >
          <div className="text-left">
            <div className="text-sm font-black text-blue-400 tracking-widest mb-0.5">AvianDex 圖鑑</div>
            <div className="text-xs text-dex-muted">查看完整生態特徵與觀鳥熱點</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ExternalLink size={18} />
          </div>
        </button>

        {isCaught && capture && (
          <button
            type="button"
            onClick={() => openAvianDexUnlock(capture, bird.name)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-dex-surface border border-dex-border text-dex-text font-bold shadow-lg active:scale-95 transition group"
          >
            <div className="text-left">
              <div className="text-sm font-black text-emerald-400 tracking-widest mb-0.5">
                解鎖 NO.{birdNo(bird.id)}
              </div>
              <div className="text-xs text-dex-muted">將呢隻喺 AvianDex 由剪影變做你張卡</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ExternalLink size={18} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
