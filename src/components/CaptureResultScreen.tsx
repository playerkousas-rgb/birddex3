import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaptureResult } from '../types';
import { BirdCard } from './BirdCard';
import { RARITY_META } from '../lib/theme';
import { BIRD_SPECIES } from '../data/birdData';
import {
  Star, Sparkles, ChevronRight, XCircle, Scissors,
  Download, Share2, ExternalLink, Trash2, Camera, Repeat2, Image as ImageIcon,
} from 'lucide-react';
import { ivRankLabel, natureEffect } from '../lib/birdStats';
import { makeSticker } from '../lib/stickerMaker';
import { useCollectionContext } from '../context/CollectionContext';
import { openAvianDexUnlock } from '../lib/aviandex';
import { formatCapturedAt, formatCaptureLocation } from '../lib/captureMemory';
import type { BackMediaKind } from '../lib/cardFace';

interface CaptureResultScreenProps {
  result: CaptureResult;
  onClose: () => void;
}

export function CaptureResultScreen({ result, onClose }: CaptureResultScreenProps) {
  const [phase, setPhase] = useState<'throw' | 'wiggle' | 'caught' | 'card' | 'stats' | 'escaped'>('throw');
  const [stickerBusy, setStickerBusy] = useState(false);
  const [stickerMsg, setStickerMsg] = useState('');
  const [stickerUrl, setStickerUrl] = useState<string | null>(result.captureStats?.stickerUrl ?? null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardBackKind, setCardBackKind] = useState<BackMediaKind>('photo');
  const { setCaptureSticker, deleteCatchRecord, deleteCapture } = useCollectionContext();

  const { species, isNew, oldRarity, newRarity, xpGained, record, failed, failReason, failKind, captureStats, isBestIndividual } = result;
  const rarityMeta = RARITY_META[newRarity];

  const photoForSticker = record?.photo_original_url || null;

  const handleMakeSticker = async () => {
    if (!species || !photoForSticker || stickerBusy) return;
    try {
      setCardFlipped(true);
      setStickerBusy(true);
      setStickerMsg('準備中…');
      const url = await makeSticker(photoForSticker, setStickerMsg);
      setStickerUrl(url);
      setCardBackKind('sticker');
      setCardFlipped(true);
      setCaptureSticker(species.id, url);
      setStickerMsg('完成！');
      window.setTimeout(() => setStickerMsg(''), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStickerMsg('去背失敗：' + msg);
    } finally {
      setStickerBusy(false);
    }
  };

  const handleShareSticker = async () => {
    if (!stickerUrl || !species) return;
    try {
      const res = await fetch(stickerUrl);
      const blob = await res.blob();
      const file = new File([blob], `${species.name}_sticker.png`, { type: 'image/png' });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: `${species.name} 貼圖` });
      } else {
        const a = document.createElement('a');
        a.href = stickerUrl;
        a.download = `${species.name}_sticker.png`;
        a.click();
      }
    } catch {}
  };

  const backgroundUrl = useMemo<string | null>(() => {
    if (!failed) return species?.photoUrl || photoForSticker || null;
    if (failed && failKind === 'escaped') {
      const pool = BIRD_SPECIES.filter((b) => b.photoUrl);
      if (pool.length === 0) return null;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return pick.photoUrl ?? null;
    }
    return null;
  }, [failed, failKind, species, photoForSticker]);

  const ambientColor = rarityMeta?.color || '#00F0FF';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wiggle'), 520);
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;
    let t4: ReturnType<typeof setTimeout> | undefined;
    if (failed) {
      t2 = setTimeout(() => setPhase('escaped'), 1800);
    } else {
      t2 = setTimeout(() => setPhase('caught'), 2300);
      t3 = setTimeout(() => setPhase('card'), 3400);
      t4 = setTimeout(() => setPhase('stats'), 4100);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [failed]);

  const upgraded = !isNew && oldRarity !== newRarity;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-4 isolate">
      {backgroundUrl ? (
        <>
          <motion.div
            key={backgroundUrl}
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1.05 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage: `url("${backgroundUrl}")`,
              filter: failed ? 'blur(28px) brightness(0.35) saturate(0.7)' : 'blur(22px) brightness(0.55)',
            }}
          />
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: failed
                ? 'radial-gradient(ellipse at center, rgba(15,17,21,0.55) 0%, rgba(8,9,12,0.92) 80%)'
                : `radial-gradient(ellipse at center, ${ambientColor}25 0%, rgba(8,9,12,0.85) 70%)`,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-[#0B0F19]/55 backdrop-blur-sm" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-10 bg-[#0B0F19]/95 backdrop-blur-md" />
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/40"
                style={{
                  width: 1 + Math.random() * 2,
                  height: 1 + Math.random() * 2,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {!failed && (phase === 'card' || phase === 'stats') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + Math.random() * 6,
                height: 4 + Math.random() * 6,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: rarityMeta?.color || '#fff',
              }}
              animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0], scale: [0, 1, 0] }}
              transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
      )}

      {phase === 'caught' && (
        <motion.div
          key="shutter"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 bg-white z-20 pointer-events-none"
        />
      )}

      <AnimatePresence>
        {(phase === 'throw' || phase === 'wiggle' || phase === 'caught' || phase === 'escaped') && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" exit={{ opacity: 0, scale: 2 }}>
            {phase !== 'escaped' && phase !== 'caught' && (
              <motion.div
                initial={phase === 'throw' ? { y: 280, rotate: -8, scale: 0.8, opacity: 0 } : false}
                animate={
                  phase === 'throw'
                    ? { y: 0, rotate: 0, scale: 1, opacity: 1 }
                    : { rotate: [0, -2, 2, 0], scale: [1, 0.98, 1] }
                }
                transition={{ type: phase === 'throw' ? 'spring' : 'tween', bounce: 0.25, duration: phase === 'throw' ? 0.6 : 0.5 }}
                className="bg-white p-2 rounded-2xl shadow-2xl w-40"
              >
                <div className="h-28 rounded-xl overflow-hidden bg-dex-border flex items-center justify-center">
                  {photoForSticker ? (
                    <img src={photoForSticker} alt="剛拍到的照片" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={40} className="text-dex-muted" strokeWidth={1.6} />
                  )}
                </div>
                <div className="pt-2 pb-1 text-[11px] font-black text-dex-ink text-center">
                  {species?.name ?? '拍攝中'}
                </div>
              </motion.div>
            )}
            {phase === 'caught' && (
              <motion.div
                initial={{ opacity: 0, scale: 1.25 }}
                animate={{ opacity: [0, 1, 0], scale: [1.25, 1, 1] }}
                transition={{ duration: 0.9 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="bg-dex-surface/90 border border-dex-neon/50 rounded-full px-5 py-2.5 text-sm font-black text-dex-text">
                  拍到！
                </div>
              </motion.div>
            )}
            {phase === 'escaped' && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.2, 1.5], opacity: [1, 1, 0] }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-7xl">📸💨</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'escaped' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10 pointer-events-auto"
        >
          <XCircle size={64} className="text-white/70 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">拍不到，再試一次！</h2>
          <p className="text-sm text-white/70 mb-8 max-w-[280px]">
            {failReason || '可能是因為畫面太模糊、光線太暗，或距離太遠。再試著靠近一點拍攝吧！'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full max-w-[200px] py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-black text-sm hover:bg-white/20 transition"
          >
            返回繼續尋找
          </button>
        </motion.div>
      )}

      {!failed && phase === 'card' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="text-center mb-3 mt-6"
        >
          <div className="text-3xl mb-1">{isNew ? '✨' : upgraded ? '🎉' : '📸'}</div>
          <h2 className="text-xl font-black text-white tracking-wide">
            {isNew ? '圖鑑插圖已解鎖！' : upgraded ? '稀有度突破！' : '資料更新成功！'}
          </h2>
          {captureStats?.catchScore && (
            <div
              className={`text-sm font-black mt-1 ${
                captureStats.catchScore === 'Excellent'
                  ? 'text-amber-300'
                  : captureStats.catchScore === 'Great'
                    ? 'text-emerald-300'
                    : 'text-sky-300'
              }`}
            >
              {captureStats.catchScore === 'Excellent' ? '拍得好' : captureStats.catchScore === 'Great' ? '拍得不錯' : '已記錄'}
            </div>
          )}
        </motion.div>
      )}

      {!failed && species && record && (phase === 'card' || phase === 'stats') && (
        <div className="w-full max-w-[300px] relative my-2 z-10 pointer-events-auto">
          <motion.div
            initial={{ scale: 0, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 12 }}
          >
            <BirdCard
              bird={species}
              capture={{
                ...record,
                stats: captureStats ? { ...captureStats, stickerUrl: stickerUrl ?? captureStats.stickerUrl } : record.stats,
                bestStats: record.bestStats && captureStats ? { ...record.bestStats, stickerUrl: stickerUrl ?? record.bestStats.stickerUrl } : record.bestStats,
              }}
              showStats={!!captureStats}
              flipped={cardFlipped}
              onFlippedChange={setCardFlipped}
              backKind={cardBackKind}
              onBackKindChange={setCardBackKind}
              onGenerateSticker={handleMakeSticker}
              stickerBusy={stickerBusy}
              stickerStatus={stickerMsg}
            />
          </motion.div>
          {captureStats?.isShiny && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -top-2 -right-2 bg-amber-400 text-black text-[11px] font-black px-2 py-1 rounded-full shadow-lg"
            >
              ✨ 色違
            </motion.div>
          )}
        </div>
      )}

      {!failed && phase === 'stats' && species && record && rarityMeta && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm mt-2 space-y-2.5 z-10 pb-6 pointer-events-auto px-1"
        >
          {/* 卡面快速切換列：正面插圖 ↔ 反轉看自己拍的照片 ↔ 貼圖 */}
          {(photoForSticker || stickerUrl) && (
            <div className="bg-black/50 backdrop-blur border border-white/15 rounded-xl p-1 flex items-center gap-1" role="group" aria-label="切換插圖與自己拍的照片">
              <button
                type="button"
                onClick={() => setCardFlipped(false)}
                aria-pressed={!cardFlipped}
                className={`flex-1 min-h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  !cardFlipped ? 'bg-dex-neon text-dex-ink' : 'text-white/80 hover:text-white'
                }`}
              >
                <ImageIcon size={13} /> 插圖
              </button>
              {photoForSticker && (
                <button
                  type="button"
                  onClick={() => {
                    setCardBackKind('photo');
                    setCardFlipped(true);
                  }}
                  aria-pressed={cardFlipped && cardBackKind === 'photo'}
                  className={`flex-1 min-h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                    cardFlipped && cardBackKind === 'photo' ? 'bg-dex-neon text-dex-ink' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Repeat2 size={13} /> 我的照片
                </button>
              )}
              {stickerUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setCardBackKind('sticker');
                    setCardFlipped(true);
                  }}
                  aria-pressed={cardFlipped && cardBackKind === 'sticker'}
                  className={`flex-1 min-h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                    cardFlipped && cardBackKind === 'sticker' ? 'bg-dex-neon text-dex-ink' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Scissors size={13} /> 貼圖
                </button>
              ) : photoForSticker ? (
                <button
                  type="button"
                  disabled={stickerBusy}
                  onClick={handleMakeSticker}
                  className="flex-1 min-h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 bg-white/10 text-dex-neon border border-dex-neon/40 hover:bg-dex-neon hover:text-dex-ink transition disabled:opacity-50"
                >
                  <Scissors size={13} /> {stickerBusy ? '去背中…' : '生成貼圖'}
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            {upgraded && oldRarity && (
              <>
                <div
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background: RARITY_META[oldRarity].gradient, color: RARITY_META[oldRarity].textColor }}
                >
                  {RARITY_META[oldRarity].label}
                </div>
                <ChevronRight size={16} className="text-white/70" />
              </>
            )}
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-black tracking-wider shadow-lg flex items-center gap-1"
              style={{ background: rarityMeta.gradient, color: rarityMeta.textColor }}
            >
              {upgraded && <Sparkles size={14} />}
              {rarityMeta.label} · {rarityMeta.labelZh}
            </div>
          </div>

          {/* 紀念條：拍攝日期 ＋ 地點 */}
          {record && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/85 bg-black/40 border border-white/15 rounded-full px-3.5 py-1.5">
              <span aria-hidden="true">📅</span>
              <span>{formatCapturedAt(record.capturedAt)}</span>
              <span className="text-dex-border" aria-hidden="true">·</span>
              <span aria-hidden="true">📍</span>
              <span>{formatCaptureLocation(record.location)}</span>
            </div>
          )}

          {/* Sticker Maker */}
          {photoForSticker && (
            <div className="bg-black/40 backdrop-blur border border-white/15 rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5"><Scissors size={13} /> 鳥卡貼圖</div>
                  <div className="text-[10px] text-white/70 mt-0.5">{stickerMsg || (stickerUrl ? '已生成透明 PNG' : '用自己拍的照片去背生成貼圖')}</div>
                </div>
                {!stickerUrl ? (
                  <button
                    type="button"
                    disabled={stickerBusy}
                    onClick={handleMakeSticker}
                    className="px-3 py-1.5 rounded-lg bg-dex-neon text-dex-ink text-xs font-black disabled:opacity-50 shrink-0"
                  >
                    {stickerBusy ? '處理中…' : '生成貼圖'}
                  </button>
                ) : (
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={handleShareSticker} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1"><Share2 size={12} />分享</button>
                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = stickerUrl;
                        a.download = `${species?.name}_sticker.png`;
                        a.click();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1"
                    >
                      <Download size={12} />下載
                    </button>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-white/70 mt-2">模型首次使用時下載並快取到瀏覽器；原相與已解鎖插圖均會保留。</div>
            </div>
          )}

          {/* IV 卡 */}
          {captureStats && (
            <div className="bg-black/40 backdrop-blur border border-white/15 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-white/70">個體值 / IV</div>
                <div className="text-xs font-black" style={{ color: ivRankLabel(captureStats.iv.percent).color }}>
                  {ivRankLabel(captureStats.iv.percent).label} · {captureStats.iv.percent}%
                  {isBestIndividual && !isNew && <span className="ml-1 text-amber-300">★新高</span>}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] mb-2">
                {[
                  ['HP', captureStats.iv.hp],
                  ['ATK', captureStats.iv.atk],
                  ['DEF', captureStats.iv.def],
                  ['SPD', captureStats.iv.spd],
                  ['STA', captureStats.iv.sta],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-black/30 rounded-lg py-1.5">
                    <div className="text-white/70">{k}</div>
                    <div className="font-black text-white">{v as number}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/85">CP {captureStats.cp}</span>
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/85">{captureStats.nature}｜{natureEffect(captureStats.nature)}</span>
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/85">{captureStats.trait}</span>
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/85">體型 {captureStats.sizeVariant}</span>
                {captureStats.catchScore && <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">{captureStats.catchScore}</span>}
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/70">Zoom {captureStats.catchDistance.toFixed(1)}x</span>
              </div>
            </div>
          )}

          <div className="bg-black/40 backdrop-blur border border-white/15 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-dex-gold" />
              <span className="text-sm text-white/70">獲得經驗值</span>
            </div>
            <span className="text-lg font-black text-dex-gold">+{xpGained} XP</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 mt-1 rounded-xl bg-dex-neon text-dex-ink font-black text-sm tracking-wider hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-dex-neon/20"
          >
            收入收藏冊
          </button>

          {/* 完美主義救星：相拍得唔好即場刪除，唔使留低唔想要嘅紀錄 */}
          {record && species && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('刪除呢次拍攝紀錄？原相同 IV 都會移除，不能復原。')) return;
                const idx = Math.max(0, (record.allCatches?.length ?? 1) - 1);
                if (record.allCatches?.length) deleteCatchRecord(species.id, idx);
                else deleteCapture(species.id);
                onClose();
              }}
              className="w-full py-2.5 mt-1 rounded-xl border border-white/20 text-white/70 text-xs font-bold flex items-center justify-center gap-2 min-h-[40px] hover:bg-white/10 transition"
            >
              <Trash2 size={14} /> 拍得唔好？刪除呢次拍攝
            </button>
          )}

          {/* 兄弟 App：解鎖 AvianDex 同一個 NO. */}
          {record && (
            <button
              type="button"
              onClick={() => species && openAvianDexUnlock(record, species.name)}
              className="w-full py-3 mt-2 rounded-xl border border-blue-400/40 bg-blue-500/10 text-blue-200 font-black text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-blue-500/20 active:scale-[0.98] transition"
            >
              <ExternalLink size={15} />
              跳去 AvianDex 解鎖 NO.{record.no}
            </button>
          )}
          <p className="text-[10px] text-white/70 text-center pt-0.5">
            拍到照即解鎖插圖 · 點按「反轉」切換自己拍的照片及生成貼圖
          </p>
        </motion.div>
      )}
    </div>
  );
}
