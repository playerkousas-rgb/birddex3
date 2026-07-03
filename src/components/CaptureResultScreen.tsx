import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaptureResult } from '../types';
import { BirdCard } from './BirdCard';
import { RARITY_META } from '../lib/theme';
import { BIRD_SPECIES } from '../data/birdData';
import { Star, Sparkles, ChevronRight, XCircle, Scissors, Download, Share2 } from 'lucide-react';
import { ivRankLabel, natureEffect } from '../lib/birdStats';
import { makeSticker } from '../lib/stickerMaker';
import { useCollectionContext } from '../context/CollectionContext';

interface CaptureResultScreenProps {
  result: CaptureResult;
  onClose: () => void;
}

export function CaptureResultScreen({ result, onClose }: CaptureResultScreenProps) {
  const [phase, setPhase] = useState<'throw' | 'wiggle' | 'caught' | 'card' | 'stats' | 'escaped'>('throw');
  const [stickerBusy, setStickerBusy] = useState(false);
  const [stickerMsg, setStickerMsg] = useState('');
  const [stickerUrl, setStickerUrl] = useState<string | null>(result.captureStats?.stickerUrl ?? null);
  const [showSticker, setShowSticker] = useState(false);
  const { setCaptureSticker } = useCollectionContext();
  
  const { species, isNew, oldRarity, newRarity, xpGained, record, failed, failReason, failKind, captureStats, isBestIndividual } = result;
  const rarityMeta = RARITY_META[newRarity];

  const photoForSticker = record?.photoDataUrl || null;

  const handleMakeSticker = async () => {
    if (!species || !photoForSticker || stickerBusy) return;
    try {
      setStickerBusy(true);
      setStickerMsg('準備中…');
      const url = await makeSticker(photoForSticker, setStickerMsg);
      setStickerUrl(url);
      setShowSticker(true);
      setCaptureSticker(species.id, url);
      setStickerMsg('完成！');
      setTimeout(()=>setStickerMsg(''), 1500);
    } catch (e:any) {
      setStickerMsg('去背失敗：' + (e.message || e));
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
    if (!failed && species?.photoUrl) return species.photoUrl;
    if (failed && failKind === 'escaped') {
      const pool = BIRD_SPECIES.filter((b) => b.photoUrl);
      if (pool.length === 0) return null;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return pick.photoUrl ?? null;
    }
    return null;
  }, [failed, failKind, species]);

  const ambientColor = rarityMeta?.color || '#00F0FF';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wiggle'), 520); 
    let t2: any, t3: any, t4: any;
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
          <div className="absolute inset-0 -z-10" style={{
              background: failed
                ? 'radial-gradient(ellipse at center, rgba(15,17,21,0.55) 0%, rgba(8,9,12,0.92) 80%)'
                : `radial-gradient(ellipse at center, ${ambientColor}25 0%, rgba(8,9,12,0.85) 70%)`,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-dex-bg/55 backdrop-blur-sm" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-10 bg-dex-bg/95 backdrop-blur-md" />
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white/40"
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
            <motion.div key={i} className="absolute rounded-full"
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

      <AnimatePresence>
        {(phase === 'throw' || phase === 'wiggle' || phase === 'caught' || phase === 'escaped') && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" exit={{ opacity: 0, scale: 2 }}>
            {phase !== 'escaped' && phase !== 'caught' && (
              <motion.div
                initial={phase === 'throw' ? { y: 300, scale: 2, rotate: -45 } : false}
                animate={
                  phase === 'throw' ? { y: 0, scale: 1, rotate: 0 } :
                  phase === 'wiggle' ? {
                    rotate: [0, -20, 0, 20, 0, -20, 0, 20, 0],
                    transition: { duration: failed ? 1.4 : 2, times: [0, 0.1, 0.2, 0.4, 0.5, 0.7, 0.8, 0.9, 1] }
                  } : { scale: 0, opacity: 0 }
                }
                transition={{ type: phase === 'throw' ? 'spring' : 'tween', bounce: 0.4, duration: phase === 'throw' ? 0.6 : (failed ? 1.4 : 2)}}
                className="relative w-24 h-24"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${failed && phase === 'wiggle' ? 'from-gray-500' : 'from-dex-accent'} to-white rounded-full border-4 border-dex-border shadow-[0_0_30px_rgba(255,51,102,0.5)] flex items-center justify-center overflow-hidden`}>
                  <div className="absolute top-1/2 left-0 right-0 h-2 bg-dex-border -translate-y-1/2" />
                  <div className="relative w-8 h-8 bg-dex-border rounded-full flex items-center justify-center z-10">
                    <motion.div className="w-4 h-4 bg-white rounded-full"
                      animate={{ backgroundColor: ['#ffffff', '#FF3366', '#ffffff'] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
            {phase === 'caught' && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.5, 2], opacity: [1, 1, 0] }} transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-[10px] border-dex-neon shadow-[0_0_50px_#00F0FF]" />
                <div className="absolute w-full text-center mt-32">
                  <h2 className="text-3xl font-black text-white text-shadow-glow tracking-widest">GOTCHA!</h2>
                </div>
              </motion.div>
            )}
            {phase === 'escaped' && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.2, 1.5], opacity: [1, 1, 0] }} transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center">
                <div className="text-7xl">💨</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'escaped' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center z-10 pointer-events-auto">
          <XCircle size={64} className="text-dex-muted mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">鳥兒逃走了！</h2>
          <p className="text-sm text-dex-muted mb-8 max-w-[280px]">
            {failReason || '可能是因為畫面太模糊、光線太暗，或距離太遠。再試著靠近一點拍攝吧！'}
          </p>
          <button onClick={onClose}
            className="w-full max-w-[200px] py-3.5 rounded-xl bg-dex-surface border border-dex-border text-white font-black text-sm hover:bg-white/10 transition">
            返回繼續尋找
          </button>
        </motion.div>
      )}

      {!failed && phase === 'card' && (
        <motion.div initial={{ opacity: 0, scale: 0.8, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="text-center mb-3 mt-6">
          <div className="text-3xl mb-1">{isNew ? '✨' : upgraded ? '🎉' : '📸'}</div>
          <h2 className="text-xl font-black text-white tracking-wide">
            {isNew ? '圖鑑新登錄！' : upgraded ? '稀有度突破！' : '資料更新成功！'}
          </h2>
          {captureStats?.catchScore && (
            <div className={`text-sm font-black mt-1 ${
              captureStats.catchScore==='Excellent' ? 'text-amber-300' :
              captureStats.catchScore==='Great' ? 'text-emerald-300' : 'text-sky-300'
            }`}>
              {captureStats.catchScore.toUpperCase()} THROW!
            </div>
          )}
        </motion.div>
      )}

      {!failed && species && record && (phase === 'card' || phase === 'stats') && (
        <div className="w-full max-w-[300px] relative my-2 z-10">
          <motion.div initial={{ scale: 0, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 12 }}>
            <BirdCard bird={species} capture={{
              ...record,
              stats: captureStats ? { ...captureStats, stickerUrl: stickerUrl ?? captureStats.stickerUrl } : record.stats,
              bestStats: record.bestStats && captureStats ? { ...record.bestStats, stickerUrl: stickerUrl ?? record.bestStats.stickerUrl } : record.bestStats
            }} showStats={!!captureStats} useSticker={showSticker} />
          </motion.div>
          {captureStats?.isShiny && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              className="absolute -top-2 -right-2 bg-amber-400 text-black text-[11px] font-black px-2 py-1 rounded-full shadow-lg">
              ✨ 色違
            </motion.div>
          )}
          {stickerUrl && !showSticker && phase === 'stats' && (
            <button onClick={()=>setShowSticker(true)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-dex-neon text-dex-bg text-[11px] font-black shadow">查看貼圖</button>
          )}
          {stickerUrl && showSticker && (
            <button onClick={()=>setShowSticker(false)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold border border-white/20">看原卡</button>
          )}
        </div>
      )}

      {!failed && phase === 'stats' && species && record && rarityMeta && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm mt-2 space-y-2.5 z-10 pb-6 pointer-events-auto px-1"
        >
          <div className="flex items-center justify-center gap-2">
            {upgraded && oldRarity && (
              <>
                <div className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background: RARITY_META[oldRarity].gradient, color: RARITY_META[oldRarity].textColor }}>
                  {RARITY_META[oldRarity].label}
                </div>
                <ChevronRight size={16} className="text-dex-muted" />
              </>
            )}
            <div className="px-3 py-1.5 rounded-lg text-sm font-black tracking-wider shadow-lg flex items-center gap-1"
              style={{ background: rarityMeta.gradient, color: rarityMeta.textColor }}>
              {upgraded && <Sparkles size={14} />}
              {rarityMeta.label} · {rarityMeta.labelZh}
            </div>
          </div>

          {/* Sticker Maker */}
          {photoForSticker && (
            <div className="bg-dex-surface/90 backdrop-blur border border-dex-border rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5"><Scissors size={13}/> 鳥精靈貼圖</div>
                  <div className="text-[10px] text-dex-muted mt-0.5">{stickerMsg || (stickerUrl ? '已生成透明 PNG' : '手動去背，生成可分享貼圖')}</div>
                </div>
                {!stickerUrl ? (
                  <button
                    disabled={stickerBusy}
                    onClick={handleMakeSticker}
                    className="px-3 py-1.5 rounded-lg bg-dex-neon text-dex-bg text-xs font-black disabled:opacity-50"
                  >
                    {stickerBusy ? '處理中…' : '生成貼圖'}
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={handleShareSticker} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1"><Share2 size={12}/>分享</button>
                    <button onClick={()=>{const a=document.createElement('a');a.href=stickerUrl;a.download=`${species?.name}_sticker.png`;a.click();}} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1"><Download size={12}/>下載</button>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-dex-muted mt-2">模型約 15MB，第一次較慢，會快取到瀏覽器。照片不滿意就別生成，純手動。</div>
            </div>
          )}

          {/* IV 卡 */}
          {captureStats && (
            <div className="bg-dex-surface/90 backdrop-blur border border-dex-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-dex-muted">個體值 / IV</div>
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
                ].map(([k,v]) => (
                  <div key={k as string} className="bg-black/30 rounded-lg py-1.5">
                    <div className="text-dex-muted">{k}</div>
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

          <div className="bg-dex-surface/80 backdrop-blur border border-dex-border rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-dex-gold" />
              <span className="text-sm text-dex-muted">獲得經驗值</span>
            </div>
            <span className="text-lg font-black text-dex-gold">+{xpGained} XP</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 mt-1 rounded-xl bg-dex-neon text-dex-bg font-black text-sm tracking-wider hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-dex-neon/20"
          >
            收入收藏冊
          </button>
        </motion.div>
      )}
    </div>
  );
}
