import { useState, useRef } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { BIRD_SPECIES } from '../data/birdData';
import { getLevelFromXp, getLevelProgress, RARITY_ORDER, RARITY_META } from '../lib/theme';
import { User, Edit3, Award, Feather, Target, Trash2, Check, X, Sparkles, ImageOff, Wand2, Share2, QrCode } from 'lucide-react';
import type { AltArtMode } from '../hooks/useCollection';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { COPYRIGHT_FULL, COPYRIGHT_SHORT } from '../lib/copyright';

const AVATARS = [
  { emoji: '🥾', unlockLevel: 1, desc: '見習裝備' },
  { emoji: '🎒', unlockLevel: 2, desc: '旅行背包' },
  { emoji: '🔭', unlockLevel: 4, desc: '望遠鏡' },
  { emoji: '📷', unlockLevel: 5, desc: '專業相機' },
  { emoji: '🏕️', unlockLevel: 6, desc: '野外帳篷' },
  { emoji: '🦅', unlockLevel: 7, desc: '神鷹之力' },
  { emoji: '👑', unlockLevel: 10, desc: '傳說王冠' },
];

export function ProfileScreen() {
  const { profile, captures, totalCount, resetAll, unlockAll, updateProfileName, updateProfileAvatar, settings, setAltArtMode, altArt } = useCollectionContext();

  // 異圖卡統計
  const altUnlockedCount = altArt.unlocked.length;
  const altConfirmedCount = altArt.unlocked.filter(id =>
    altArt.existsOnR2.includes(id) && !altArt.missingOnR2.includes(id)
  ).length;
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const levelInfo = getLevelFromXp(profile.xp);

  // Admin backdoor counter
  // 50 連點才觸發創世神模式，避免誤觸
  const tapCount = useRef(0);
  const lastTap = useRef(0);
  const ADMIN_TAP_THRESHOLD = 50;

  const handleAvatarTap = () => {
    const now = Date.now();
    // 把連點間隔放寬到 2 秒，比較容易點出來
    if (now - lastTap.current > 2000) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current += 1;

    // 提示：進度到一半 (25) 才開始輕微提示，避免「我不小心點 5 下就被提示」
    if (tapCount.current >= 25 && tapCount.current < ADMIN_TAP_THRESHOLD) {
      console.log(`[admin] ${tapCount.current} / ${ADMIN_TAP_THRESHOLD}`);
    }

    if (tapCount.current === ADMIN_TAP_THRESHOLD) {
      unlockAll();
      tapCount.current = 0;
    }
  };

  const saveName = () => {
    if (nameDraft.trim()) updateProfileName(nameDraft.trim());
    setEditing(false);
  };

  const completion = Math.round((captures.length / BIRD_SPECIES.length) * 100);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://birdex.app';

  const doShareCardImage = async () => {
    if (!shareCardRef.current) return;
    try {
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `birdex-trainer-${profile.name}.png`, { type: 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: `BIRD-DEX · ${profile.name}` });
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl; a.download = `birdex-trainer-${profile.name}.png`; a.click();
    } catch {}
  };

  return (
    <div className="min-h-full bg-dex-bg pb-24 relative">
      {/* Header banner */}
      <div className="relative bg-gradient-to-b from-dex-surface to-dex-bg border-b border-dex-border px-4 pt-6 pb-8">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Award size={120} />
        </div>

        <div className="relative flex items-center gap-4">
          <button 
            onClick={handleAvatarTap}
            className="w-20 h-20 rounded-2xl bg-dex-border border-2 border-dex-neon/30 flex items-center justify-center text-4xl shadow-lg shadow-dex-neon/10 hover:border-dex-neon transition-colors"
          >
            {profile.avatar || (profile.level >= 10 ? '👑' : profile.level >= 7 ? '🦅' : profile.level >= 4 ? '🔭' : '🥾')}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    className="bg-dex-bg border border-dex-border rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-dex-neon w-full"
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                  />
                  <button onClick={saveName} className="p-1.5 rounded-lg bg-dex-neon text-dex-bg hover:brightness-110">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white truncate">{profile.name}</h2>
                  <button onClick={() => { setNameDraft(profile.name); setEditing(true); }} className="text-dex-muted hover:text-white transition">
                    <Edit3 size={14} />
                  </button>
                  {/* 新增換頭像按鈕 */}
                  <button onClick={() => setShowAvatarSelect(true)} className="text-dex-muted hover:text-white transition ml-2 bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold">
                    換頭像
                  </button>
                </div>
              )}
            </div>
            <div className="text-xs text-dex-neon font-bold tracking-wider mt-0.5 flex items-center gap-2">
              <span>Lv.{profile.level}</span>
              <span className="px-1.5 py-0.5 rounded bg-dex-neon/10 border border-dex-neon/30">{profile.title}</span>
            </div>
            <div className="text-[10px] text-dex-muted mt-1">
              加入於 {new Date(profile.joinedAt).toLocaleDateString('zh-HK')}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] text-dex-muted mb-1 font-mono">
            <span>XP {profile.xp}</span>
            <span>{levelInfo.nextXp ? `下一級 ${levelInfo.nextXp} XP` : '已達最高等級 MAX'}</span>
          </div>
          <div role="progressbar" aria-label="訓練師等級進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={getLevelProgress(profile.xp)} className="h-2.5 rounded-full bg-dex-border overflow-hidden relative">
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-dex-neon to-dex-accent transition-all duration-700"
              style={{
                width: `${getLevelProgress(profile.xp)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <Feather size={14} />
            <span className="text-[10px] font-bold tracking-wider">獨特種類</span>
          </div>
          <div className="text-2xl font-black text-white">{captures.length}</div>
          <div className="text-[10px] text-dex-muted">/ {BIRD_SPECIES.length} 種已收錄</div>
        </div>
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <Target size={14} />
            <span className="text-[10px] font-bold tracking-wider">總捕捉次數</span>
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
          <div className="text-[10px] text-dex-muted">平均每種 {captures.length ? (totalCount / captures.length).toFixed(1) : '0'} 次</div>
        </div>
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <Award size={14} />
            <span className="text-[10px] font-bold tracking-wider">圖鑑完成度</span>
          </div>
          <div className="text-2xl font-black text-dex-gold">{completion}%</div>
          <div className="text-[10px] text-dex-muted">{completion >= 100 ? '🎉 全圖鑑達成！' : '繼續探索！'}</div>
        </div>
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <User size={14} />
            <span className="text-[10px] font-bold tracking-wider">稀有度分佈</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {RARITY_ORDER.map(r => {
              const c = captures.filter(x => x.currentRarity === r).length;
              if (!c) return null;
              return (
                <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-black"
                  style={{ background: RARITY_META[r].color + '22', color: RARITY_META[r].color, border: `1px solid ${RARITY_META[r].color}44` }}>
                  {RARITY_META[r].label} {c}
                </span>
              );
            })}
            {captures.length === 0 && <span className="text-[10px] text-dex-muted">尚無收藏</span>}
          </div>
        </div>
      </div>

      {/* ────── 分享收藏冊 ────── */}
      <div className="px-4 pt-2 pb-2">
        <div className="bg-dex-surface border border-dex-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={14} className="text-dex-neon" />
            <h3 className="text-sm font-black text-white">分享我的收藏</h3>
          </div>
          <p className="text-[11px] text-dex-muted mb-3">
            生成你的訓練師名片 · 包含等級、捕捉數、完成度 QR 碼
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => setShowShareCard(true)}
              className="px-3 py-2 rounded-lg bg-dex-neon text-dex-bg text-xs font-black flex items-center gap-1.5"
            >
              <QrCode size={14} /> 生成名片
            </button>
            <button
              onClick={async () => {
                const text = `我在 BIRD-DEX 捕捉了 ${captures.length}/${BIRD_SPECIES.length} 種鳥精靈！訓練師 ${profile.name} Lv.${profile.level} · ${profile.title}\n${window.location.origin}`;
                if (navigator.share) { try { await navigator.share({ title: 'BIRD-DEX 收藏', text, url: window.location.href }); return; } catch {} }
                await navigator.clipboard.writeText(text);
                alert('已複製到剪貼簿！');
              }}
              className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-bold border border-dex-border"
            >
              <Share2 size={14} /> 快速分享
            </button>
          </div>
        </div>
      </div>

      {/* ────── 異圖卡（精靈化）顯示設定 ────── */}
      <div className="px-4 pt-2 pb-4">
        <div className="bg-dex-surface border border-dex-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-dex-neon" />
              <h3 className="text-sm font-black text-white tracking-wide">異圖卡顯示</h3>
            </div>
            <div className="text-[10px] font-mono text-dex-muted">
              已解鎖 <span className="text-dex-neon font-bold">{altConfirmedCount}</span>
              {altUnlockedCount > altConfirmedCount && (
                <span className="text-white/40"> / 持有 {altUnlockedCount}</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-dex-muted mb-3 leading-relaxed">
            異圖卡是精靈化版本的鳥卡（檔名 <code className="px-1 py-0.5 bg-black/30 rounded text-dex-neon">_UR.avif</code>）。
            <b className="text-white/80"> 達 UR 稀有度自動解鎖</b>，這是王者的權利 👑
          </p>

          {([
            { id: 'off',          label: '關閉',         desc: '全部使用普通圖卡',                icon: ImageOff },
            { id: 'high-rarity',  label: '僅 UR / LR',   desc: '只在高稀有度時顯示異圖卡（預設）', icon: Sparkles },
            { id: 'all',          label: '全部使用異圖卡', desc: '整本圖鑑都用精靈化版本',          icon: Wand2 },
          ] as { id: AltArtMode; label: string; desc: string; icon: typeof Sparkles }[]).map((opt) => {
            const Icon = opt.icon;
            const active = settings.altArtMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setAltArtMode(opt.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 last:mb-0 transition-all border ${
                  active
                    ? 'bg-dex-neon/15 border-dex-neon text-white'
                    : 'bg-dex-bg border-dex-border text-dex-muted hover:border-dex-neon/40 hover:text-white'
                }`}
              >
                <Icon size={16} className={active ? 'text-dex-neon' : 'text-dex-muted'} />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.desc}</div>
                </div>
                {active && (
                  <div className="w-2 h-2 rounded-full bg-dex-neon shadow-[0_0_8px_#00F0FF]" />
                )}
              </button>
            );
          })}

          <div className="mt-3 pt-3 border-t border-dex-border/50 text-[10px] text-dex-muted leading-relaxed space-y-1">
            <div>💡 <b>建議</b>：拍照辨識用「關閉」或「僅 UR / LR」，瀏覽收藏時切「全部使用異圖卡」最帥。</div>
            <div>🔒 <b>規則</b>：只有「已擁有」異圖卡的鳥才會切換 — 把鳥升到 UR 即解鎖。</div>
            <div>📦 <b>自動偵測</b>：若該鳥還沒做異圖卡（R2 上沒檔），系統自動退回普通卡，不會出現破圖。</div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="px-4 py-4">
        <button
          onClick={resetAll}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dex-accent/30 text-dex-accent text-xs font-bold hover:bg-dex-accent/10 transition"
        >
          <Trash2 size={14} /> 重置所有捕捉記錄（謹慎操作）
        </button>
      </div>

      <div className="text-center text-[10px] text-white/30 font-mono pb-8">
        {COPYRIGHT_FULL}
      </div>

      {/* Share Card Modal */}
      {showShareCard && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px]">
            <div ref={shareCardRef} className="rounded-[20px] overflow-hidden border-2 border-dex-neon/40 shadow-2xl" style={{ background: 'linear-gradient(160deg,#0f172a 0%, #0b1220 60%, #07121a 100%)' }}>
              <div className="p-5 text-white">
                <div className="text-[10px] tracking-widest text-dex-neon font-mono mb-1">BIRD-DEX TRAINER CARD</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-4xl">{profile.avatar || '🥾'}</div>
                  <div>
                    <div className="text-lg font-black">{profile.name}</div>
                    <div className="text-xs text-dex-neon">Lv.{profile.level} · {profile.title}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-3">
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-white">{captures.length}</div><div className="text-white/50">種類</div></div>
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-dex-gold">{completion}%</div><div className="text-white/50">完成度</div></div>
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-white">{totalCount}</div><div className="text-white/50">捕捉</div></div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <div className="text-[10px] text-gray-700 leading-snug">
                    掃碼加入<br/>BIRD-DEX<br/>
                    <span className="font-mono text-[9px]">birdex.hk</span>
                  </div>
                  <div className="bg-white p-1 rounded">
                    <QRCodeSVG value={shareUrl} size={72} />
                  </div>
                </div>
                <div className="mt-3 text-center text-[10px] text-white/50">{COPYRIGHT_SHORT}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={doShareCardImage} className="flex-1 py-3 rounded-xl bg-dex-neon text-dex-bg font-black text-sm">分享 / 下載名片</button>
              <button onClick={()=>setShowShareCard(false)} className="px-4 py-3 rounded-xl bg-white/10 text-white text-sm border border-white/15">關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {showAvatarSelect && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-dex-bg border-t border-dex-border rounded-t-3xl p-6 pb-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">更換角色形象</h3>
              <button onClick={() => setShowAvatarSelect(false)} className="text-dex-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {AVATARS.map((av) => {
                const isUnlocked = profile.level >= av.unlockLevel;
                const isSelected = profile.avatar === av.emoji || (!profile.avatar && av.emoji === '🥾');
                return (
                  <button
                    key={av.emoji}
                    onClick={() => {
                      if (isUnlocked) {
                        updateProfileAvatar(av.emoji);
                        setShowAvatarSelect(false);
                      }
                    }}
                    disabled={!isUnlocked}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                      isSelected 
                        ? 'bg-dex-neon/20 border-2 border-dex-neon' 
                        : isUnlocked 
                          ? 'bg-dex-surface border-2 border-dex-border hover:border-dex-muted' 
                          : 'bg-dex-surface/50 border-2 border-dex-border/50 opacity-50'
                    }`}
                  >
                    <span className="text-4xl">{av.emoji}</span>
                    <span className="text-[10px] font-bold text-dex-muted">{av.desc}</span>
                    
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded">Lv.{av.unlockLevel} 解鎖</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
