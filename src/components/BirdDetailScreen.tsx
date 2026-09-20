import { useState } from 'react';
import { useBirdImage } from '../hooks/useBirdImage';
import { useCollectionContext } from '../context/CollectionContext';
import { getBirdById } from '../data/birdData';
import { RARITY_META } from '../lib/theme';
import { ArrowLeft, Share2, ExternalLink, Image as ImageIcon, Scissors, Download, Trash2, Star, Crown, RefreshCcw } from 'lucide-react';
import { makeSticker } from '../lib/stickerMaker';
import { ivRankLabel, natureEffect } from '../lib/birdStats';

interface BirdDetailScreenProps {
  speciesId: number;
  onBack: () => void;
}

export function BirdDetailScreen({ speciesId, onBack }: BirdDetailScreenProps) {
  const bird = getBirdById(speciesId);
  const { captures, canShowAltArt, altArt, setCaptureSticker, setBestIndividual, deleteCatchRecord } = useCollectionContext();
  const capture = captures.find(c => c.speciesId === speciesId);
  const isCaught = !!capture;

  const rarity = capture?.currentRarity ?? 'UC';
  const stats = capture?.bestStats ?? capture?.stats;
  const allCatches = capture?.allCatches ?? [];
  const [stickerBusy, setStickerBusy] = useState(false);
  const [stickerMsg, setStickerMsg] = useState('');
  const [useStickerView, setUseStickerView] = useState(false);
  const [showIvList, setShowIvList] = useState(false);

  const wantsAltArt = bird ? canShowAltArt(bird.id, rarity) : false;
  const { imageUrl: heroImageUrl, isSticker: showingSticker, onLoad: handleImageLoad, onError: handleImageError } =
    useBirdImage(speciesId, bird?.photoUrl, wantsAltArt, useStickerView ? stats?.stickerUrl : null);

  const handleMakeSticker = async () => {
    if (!bird || !capture?.photoDataUrl || stickerBusy) return;
    try {
      setStickerBusy(true);
      setStickerMsg('去背中…');
      const url = await makeSticker(capture.photoDataUrl, setStickerMsg);
      setCaptureSticker(bird.id, url);
      setUseStickerView(true);
      setStickerMsg('完成！');
      setTimeout(()=>setStickerMsg(''), 1200);
    } catch (e:any) {
      setStickerMsg('失敗：' + (e.message||e));
    } finally { setStickerBusy(false); }
  };

  const altArtUnlocked = bird ? altArt.unlocked.includes(bird.id) : false;
  const altArtMissing  = bird ? altArt.missingOnR2.includes(bird.id) : false;

  if (!bird) {
    return (
      <div className="min-h-full bg-dex-bg flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-3">🙈</div>
        <p className="text-dex-muted">找不到這隻鳥的資料</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-dex-surface text-white text-sm">返回</button>
      </div>
    );
  }

  const rarityMeta = capture ? RARITY_META[capture.currentRarity] : null;

  const handleShare = async () => {
    const st = stats;
    const text = st
      ? `我在 BIRD-DEX 捕捉到 ${bird.name}！CP ${st.cp} · IV ${st.iv.percent}% · ${st.nature} · ${capture?.count}次`
      : `我在 BIRD-DEX 捕捉到了 ${bird.name}！`;
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

  return (
    <div className="min-h-full bg-dex-bg pb-8 relative flex flex-col">
      {/* Hero */}
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto shrink-0 mt-4 px-4">
        <div className="absolute inset-0 px-4">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-gray-800 bg-gray-900 relative">
            {heroImageUrl && isCaught ? (
              <img
                src={heroImageUrl}
                alt={bird.name}
                className={`w-full h-full ${showingSticker ? 'object-contain p-6' : 'object-cover'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 relative">
                <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(180deg, ${bird.baseColor} 0%, transparent 100%)` }} />
                <span className="text-8xl opacity-10 mb-4">{bird.emoji}</span>
                <span className="text-gray-600 font-black tracking-widest">NO DATA</span>
              </div>
            )}

            {isCaught && (
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
                {showingSticker && <div className="px-2 py-1 rounded-md bg-dex-neon text-dex-bg text-[10px] font-black">貼圖版</div>}
                {wantsAltArt && !altArtMissing && !useStickerView && (
                  <div className="px-2 py-1 rounded-md bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-[10px] font-black tracking-wider shadow-lg border border-white/30">✨ ALT ART</div>
                )}
                {altArtUnlocked && altArtMissing && !useStickerView && (
                  <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white/70 text-[10px] font-bold border border-white/10">異圖卡尚未繪製</div>
                )}
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-4">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400 font-mono mb-0.5">NO.{String(bird.id).padStart(4, '0')} {showingSticker && '· 貼圖版'}</div>
                  <h1 className="text-3xl font-black text-white leading-tight truncate drop-shadow-md">{bird.name}</h1>
                  <p className="text-sm text-gray-300 truncate font-bold">{bird.nameEn}</p>
                  {stats && <p className="text-[11px] mt-1" style={{color: ivRankLabel(stats.iv.percent).color}}>CP {stats.cp} · {ivRankLabel(stats.iv.percent).label} {stats.iv.percent}% · {stats.nature}</p>}
                </div>
                {rarityMeta && (
                  <div className="px-3 py-1.5 rounded-lg text-sm font-black tracking-wider shadow-lg shrink-0 border border-white/20"
                    style={{ background: rarityMeta.gradient, color: rarityMeta.textColor }}>
                    {rarityMeta.label}
                  </div>
                )}
              </div>
            </div>

            {isCaught && rarityMeta && ['SSR', 'UR', 'LR'].includes(capture.currentRarity) && (
              <div className="absolute inset-0 foil-shimmer pointer-events-none" />
            )}
          </div>
        </div>

        <div className="absolute top-4 left-6 right-6 flex justify-between z-10">
          <button onClick={onBack} className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            {stats?.stickerUrl && (
              <button onClick={() => setUseStickerView(v => !v)}
                className={`w-12 h-12 rounded-full backdrop-blur-md border-2 flex items-center justify-center transition shadow-lg ${useStickerView ? 'bg-dex-neon text-black border-dex-neon' : 'bg-black/60 text-white border-white/20'}`} title="貼圖/原圖">
                <Scissors size={18} />
              </button>
            )}
            {isCaught && (
              <button onClick={handleShare}
                className="w-12 h-12 rounded-full bg-dex-neon/90 backdrop-blur-md border-2 border-dex-neon flex items-center justify-center text-black hover:bg-white transition shadow-[0_0_20px_rgba(0,240,255,0.6)]">
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 mt-2 space-y-4 max-w-md mx-auto w-full">

        {/* IV / 貼圖管理器 */}
        {isCaught && capture && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5"><Star size={13} className="text-dex-gold"/> 個體管理</div>
              {stats && <div className="text-[11px] font-black" style={{color: ivRankLabel(stats.iv.percent).color}}>CP {stats.cp} · {ivRankLabel(stats.iv.percent).label}</div>}
            </div>
            {stats ? (
              <div className="text-[11px] text-gray-300 mb-2">
                {stats.nature}｜{natureEffect(stats.nature)} · {stats.trait} · 體型 {stats.sizeVariant}
                {stats.catchScore && ` · ${stats.catchScore} 投擲`}
                {stats.isShiny && ' · ✨ 色違'}
              </div>
            ) : <div className="text-[11px] text-gray-500 mb-2">舊記錄，無 IV 資料</div>}
            
            <div className="flex gap-2 text-[11px] flex-wrap mb-2">
              {capture.photoDataUrl && (
                <button disabled={stickerBusy} onClick={handleMakeSticker}
                  className="px-3 py-1.5 rounded-lg bg-dex-neon text-dex-bg font-bold disabled:opacity-50 flex items-center gap-1">
                  <RefreshCcw size={12}/> {stats?.stickerUrl ? '重做貼圖' : '生成貼圖'}
                </button>
              )}
              {stats?.stickerUrl && (
                <>
                <button onClick={()=>setUseStickerView(v=>!v)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold border border-white/15">
                  {useStickerView ? '看原圖' : '看貼圖'}
                </button>
                <button onClick={async ()=>{
                  const res = await fetch(stats.stickerUrl!); const blob = await res.blob();
                  const file = new File([blob], `${bird.name}_sticker.png`, {type:'image/png'});
                  if ((navigator as any).canShare?.({files:[file]})) await (navigator as any).share({files:[file], title: bird.name});
                  else { const a=document.createElement('a'); a.href=stats.stickerUrl!; a.download=`${bird.name}_sticker.png`; a.click(); }
                }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white flex items-center gap-1"><Share2 size={12}/>分享</button>
                <button onClick={()=>{ const a=document.createElement('a'); a.href=stats.stickerUrl!; a.download=`${bird.name}_sticker.png`; a.click(); }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white flex items-center gap-1"><Download size={12}/>下載</button>
                <button onClick={()=>{ if(confirm('刪除貼圖？')) { setCaptureSticker(bird.id, null as any); setUseStickerView(false); } }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 text-[10px]"><Trash2 size={11}/></button>
                </>
              )}
            </div>
            {stickerMsg && <div className="text-[10px] text-dex-neon mb-2">{stickerMsg}</div>}

            {/* IV 歷史清單 */}
            {allCatches.length > 1 && (
              <div className="pt-3 mt-2 border-t border-white/10">
                <button onClick={()=>setShowIvList(v=>!v)} className="text-[11px] text-dex-neon font-bold">
                  個體歷史 ({allCatches.length} 隻) {showIvList ? '▲' : '▼'}
                </button>
                {showIvList && (
                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {allCatches.map((st, i) => {
                      const isBest = capture.bestStats === st || capture.stats === st;
                      const ivr = ivRankLabel(st.iv.percent);
                      return (
                        <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] ${isBest ? 'bg-dex-neon/10 border border-dex-neon/30' : 'bg-black/30 border border-white/5'}`}>
                          <div className="flex-1">
                            <span className="font-black text-white">CP {st.cp}</span>
                            <span className="ml-2" style={{color: ivr.color}}>{ivr.label} {st.iv.percent}%</span>
                            <span className="text-white/50 ml-2">{st.nature} · {st.trait}</span>
                            {st.isShiny && <span className="ml-1">✨</span>}
                          </div>
                          {!isBest && (
                            <button onClick={()=>setBestIndividual(bird.id, i)} className="px-2 py-1 rounded bg-white/10 text-white text-[10px] flex items-center gap-1">
                              <Crown size={11}/> 設為代表
                            </button>
                          )}
                          {isBest && <span className="text-[10px] text-dex-neon font-bold">★代表</span>}
                          <button onClick={()=>{
                            if (allCatches.length <= 1) { alert('至少保留 1 隻個體'); return; }
                            if (confirm('刪除這隻個體紀錄？')) deleteCatchRecord(bird.id, i);
                          }} className="text-white/30 hover:text-red-400"><Trash2 size={12}/></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 捕捉統計 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-5"><ImageIcon size={150} /></div>
          {!isCaught ? (
            <div className="flex flex-col items-center text-center gap-3 py-2 relative z-10">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-3xl">🔒</div>
              <div><p className="text-lg font-black text-white mb-1">尚未捕獲</p>
              <p className="text-xs text-gray-400">去戶外尋找牠的蹤跡吧！</p></div>
            </div>
          ) : (
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs text-gray-500 font-black tracking-widest mb-1">捕捉紀錄</p>
                <div className="flex items-baseline gap-2"><span className="text-4xl font-black text-white">{capture.count}</span><span className="text-sm text-gray-400 font-bold">次</span></div>
                <p className="text-[10px] text-gray-500 mt-1">首次：{new Date(capture.firstCaptureDate).toLocaleDateString('zh-HK')}</p>
                {allCatches.length > 1 && <p className="text-[10px] text-dex-neon mt-0.5">已記錄 {allCatches.length} 隻不同個體</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-black tracking-widest mb-1">當前階級</p>
                <p className="text-xl font-black" style={{ color: rarityMeta?.color }}>{rarityMeta?.labelZh}</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleExternalLink}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-blue-900 to-gray-900 border border-blue-500/30 text-white font-bold shadow-lg active:scale-95 transition group">
          <div className="text-left">
            <div className="text-sm font-black text-blue-400 tracking-widest mb-0.5">AvianDex 圖鑑</div>
            <div className="text-xs text-gray-300">查看完整生態特徵與觀鳥熱點</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <ExternalLink size={18} />
          </div>
        </button>
      </div>
    </div>
  );
}
