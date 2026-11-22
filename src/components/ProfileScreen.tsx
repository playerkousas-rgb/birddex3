import { useState, useRef, useEffect } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { BIRD_SPECIES } from '../data/birdData';
import { getLevelProgress, RARITY_ORDER, RARITY_META } from '../lib/theme';
import { User, Edit3, Award, Feather, Target, Trash2, Check, X, Sparkles, ImageOff, Wand2, Share2, QrCode, Flag } from 'lucide-react';
import type { AltArtMode } from '../hooks/useCollection';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { COPYRIGHT_FULL, COPYRIGHT_SHORT } from '../lib/copyright';
import { APP_VERSION } from '../version';
import { InstallButton } from './PwaChrome';
import { StoreSupportButton } from './StoreSupportButton';
import { TrainerTierBadge } from './TrainerTierBadge';
import { EVOLUTION_STAGES } from '../lib/trainerTier';
import { EvolutionArt } from './EvolutionArt';
import { type AvatarKind } from './PlayerAvatarIcon';
import { AvatarArt } from './AvatarArt';
import { cachedCardCount, clearOfflineCards, downloadOfflineCards, offlineCardsSupported, type OfflineProgress } from '../lib/offlineCards';

const AVATARS: { kind: AvatarKind; legacy: string; unlockLevel: number; desc: string }[] = [
  { kind: 'boots',     legacy: '🥾', unlockLevel: 1,  desc: '見習裝備' },
  { kind: 'backpack', legacy: '🎒', unlockLevel: 2,  desc: '旅行背包' },
  { kind: 'telescope', legacy: '🔭', unlockLevel: 4,  desc: '望遠鏡' },
  { kind: 'camera',   legacy: '📷', unlockLevel: 5,  desc: '專業相機' },
  { kind: 'tent',     legacy: '🏕️', unlockLevel: 6,  desc: '野外帳篷' },
  { kind: 'eagle',    legacy: '🦅', unlockLevel: 7,  desc: '神鷹之力' },
  { kind: 'crown',    legacy: '👑', unlockLevel: 10, desc: '傳說王冠' },
];

/** 用戶上傳嘅頭像以 data URL 存喺 bd_profile_v1，唔新增 storage key。 */
function customAvatarSrc(value: string | undefined): string | undefined {
  return value && value.startsWith('data:image/') ? value : undefined;
}

/** 舊存檔可能仲係 emoji；對應返新圖示，唔會忽然變冇頭像。 */
function avatarKind(value: string | undefined, level: number): AvatarKind {
  const hit = AVATARS.find(a => a.kind === value || a.legacy === value);
  if (hit) return hit.kind;
  return AVATARS.find(a => level >= a.unlockLevel)?.kind ?? 'boots';
}

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
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [offlineCached, setOfflineCached] = useState(0);
  const [offlineRunning, setOfflineRunning] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress | null>(null);
  const offlineCancelRef = useRef(false);

  useEffect(() => { void cachedCardCount().then(setOfflineCached); }, []);

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
      <div className="bg-dex-surface border-b border-dex-border px-4 pt-6 pb-8">
        <div className="absolute top-3 right-4 z-10">
          <EvolutionArt level={profile.level} size={96} />
        </div>

        <div className="relative flex items-center gap-4 pr-28">
          <button 
            onClick={handleAvatarTap}
            className="relative w-20 h-20 rounded-2xl bg-dex-border border-2 border-dex-neon/30 flex items-center justify-center text-4xl shadow-lg shadow-dex-neon/10 hover:border-dex-neon transition-colors"
          >
            <AvatarArt kind={avatarKind(profile.avatar, profile.level)} src={customAvatarSrc(profile.avatar)} size={52} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    className="bg-dex-bg border border-dex-border rounded-lg px-2 py-1 text-sm text-dex-text focus:outline-none focus:border-dex-neon w-full"
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                  />
                  <button onClick={saveName} className="p-1.5 rounded-lg bg-dex-neon text-dex-ink hover:brightness-110">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-dex-text truncate">{profile.name}</h2>
                  <button onClick={() => { setNameDraft(profile.name); setEditing(true); }} className="text-dex-muted hover:text-dex-text transition">
                    <Edit3 size={14} />
                  </button>
                  {/* 新增換頭像按鈕 */}
                  <button onClick={() => setShowAvatarSelect(true)} className="text-dex-muted hover:text-dex-text transition ml-2 bg-dex-bg border border-dex-border px-2 py-0.5 rounded text-[10px] font-bold">
                    換頭像
                  </button>
                </div>
              )}
            </div>
            <div className="text-xs text-dex-neon font-bold tracking-wider mt-0.5 flex items-center gap-2">
              <span>Lv.{profile.level}</span>
              <span className="px-1.5 py-0.5 rounded bg-dex-neon/10 border border-dex-neon/30">{profile.title}</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-dex-muted mb-1">
            <span>XP {profile.xp}</span>
            <span className="text-dex-neon font-bold">目前形態：{EVOLUTION_STAGES[Math.min(profile.level, 12) - 1].name}</span>
          </div>
          <div role="progressbar" aria-label="觀鳥員等級進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={getLevelProgress(profile.xp)} className="h-2.5 rounded-full bg-dex-border overflow-hidden relative">
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-dex-neon transition-all duration-700"
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
          <div className="text-2xl font-black text-dex-text">{captures.length}</div>
        </div>
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <Target size={14} />
            <span className="text-[10px] font-bold tracking-wider">總拍攝次數</span>
          </div>
          <div className="text-2xl font-black text-dex-text">{totalCount}</div>
        </div>
        <div className="bg-dex-surface border border-dex-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-dex-muted mb-2">
            <Award size={14} />
            <span className="text-[10px] font-bold tracking-wider">圖鑑完成度</span>
          </div>
          <div className="text-2xl font-black text-dex-gold">{completion}%</div>
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
            <h3 className="text-sm font-black text-dex-text">分享</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => setShowShareCard(true)}
              className="px-3 py-2 rounded-lg bg-dex-neon text-dex-ink text-xs font-black flex items-center gap-1.5"
            >
              <QrCode size={14} /> 生成名片
            </button>
            <button
              onClick={async () => {
                const text = `我在 BIRD-DEX 拍攝了 ${captures.length}/${BIRD_SPECIES.length} 種鳥！觀鳥員 ${profile.name} Lv.${profile.level} · ${profile.title}\n${window.location.origin}`;
                if (navigator.share) { try { await navigator.share({ title: 'BIRD-DEX 收藏', text, url: window.location.href }); return; } catch {} }
                await navigator.clipboard.writeText(text);
                alert('已複製到剪貼簿！');
              }}
              className="px-3 py-2 rounded-lg bg-dex-bg text-dex-text text-xs font-bold border border-dex-border"
            >
              <Share2 size={14} /> 快速分享
            </button>
          </div>
        </div>
      </div>

      {/* 離線圖卡 */}
      <div className="px-4 pt-2 pb-4">
        <div className="bg-dex-surface border border-dex-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-black text-dex-text">離線圖卡</h3>
            <span className="text-[11px] text-dex-muted">{offlineCached} / {BIRD_SPECIES.length}</span>
          </div>
          {!offlineCardsSupported() ? (
            <p className="text-[11px] text-dex-muted">此瀏覽器不支援離線快取。</p>
          ) : offlineRunning && offlineProgress ? (
            <>
              <div className="h-1.5 rounded-full bg-dex-border overflow-hidden mb-2">
                <div className="h-full bg-dex-neon transition-all"
                  style={{ width: `${Math.round(offlineProgress.done / Math.max(1, offlineProgress.total) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-dex-muted mb-3">
                {offlineProgress.done} / {offlineProgress.total}
                {offlineProgress.failed ? ` · 失敗 ${offlineProgress.failed}` : ''}
              </p>
              <button onClick={() => { offlineCancelRef.current = true; }}
                className="px-3 py-2 rounded-lg bg-dex-bg text-dex-text text-xs font-bold border border-dex-border">
                取消
              </button>
            </>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  offlineCancelRef.current = false;
                  setOfflineRunning(true);
                  setOfflineProgress({ done: 0, total: BIRD_SPECIES.length, failed: 0 });
                  try {
                    await downloadOfflineCards(setOfflineProgress, () => offlineCancelRef.current);
                  } finally {
                    setOfflineRunning(false);
                    setOfflineCached(await cachedCardCount());
                    setOfflineProgress(null);
                  }
                }}
                className="px-3 py-2 rounded-lg bg-dex-neon text-dex-ink text-xs font-black"
              >
                下載離線圖卡
              </button>
              {offlineCached > 0 && (
                <button
                  onClick={async () => { await clearOfflineCards(); setOfflineCached(0); }}
                  className="px-3 py-2 rounded-lg bg-dex-bg text-dex-text text-xs font-bold border border-dex-border"
                >
                  清除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ────── 異圖卡（精靈化）顯示設定 ────── */}
      <div className="px-4 pt-2 pb-4">
        <div className="bg-dex-surface border border-dex-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-dex-neon" />
              <h3 className="text-sm font-black text-dex-text tracking-wide">異圖卡顯示</h3>
            </div>
            <div className="text-[10px] font-mono text-dex-muted">
              已解鎖 <span className="text-dex-neon font-bold">{altConfirmedCount}</span>
              {altUnlockedCount > altConfirmedCount && (
                <span className="text-dex-muted"> / 持有 {altUnlockedCount}</span>
              )}
            </div>
          </div>
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
                    ? 'bg-dex-neon/10 border-dex-neon text-dex-text'
                    : 'bg-dex-surface border-dex-border text-dex-muted hover:border-dex-neon/40 hover:text-dex-text'
                }`}
              >
                <Icon size={16} className={active ? 'text-dex-neon' : 'text-dex-muted'} />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold">{opt.label}</div>
                </div>
                {active && (
                  <div className="w-2 h-2 rounded-full bg-dex-neon" />
                )}
              </button>
            );
          })}

        </div>
      </div>

      {/* Danger zone */}
      <div className="px-4 py-4">
        <button
          onClick={resetAll}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dex-accent/30 text-dex-accent text-xs font-bold hover:bg-dex-accent/10 transition"
        >
          <Trash2 size={14} /> 重置記錄
        </button>
      </div>

      <div className="px-4 pb-8 space-y-3">
        {/* I1 加入主畫面入口（standalone 自動隱藏） */}
        <InstallButton />
        <div className="grid grid-cols-2 gap-2" aria-label="支援與回饋">
          <a
            href="https://github.com/playerkousas-rgb/birddex3/issues/new"
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dex-border bg-dex-surface px-3 py-2 text-xs font-bold text-dex-text transition hover:border-dex-neon/40"
            aria-label="前往 GitHub 回報問題（開新分頁）"
            title="前往 GitHub 回報問題（開新分頁）"
          >
            <Flag size={14} aria-hidden="true" />
            回報問題
          </a>
          <StoreSupportButton variant="profile" />
        </div>
        {/* W1 可見頁尾 ＋ V2 用家可見版號 */}
        <div className="text-center text-[10px] text-dex-muted leading-relaxed">
          {COPYRIGHT_FULL} · BIRD-DEX 3 <strong className="text-dex-text/70">v{APP_VERSION}</strong>
        </div>
      </div>

      {/* Share Card Modal */}
      {showShareCard && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px]">
            <div ref={shareCardRef} className="rounded-[20px] overflow-hidden border-2 border-dex-neon/40 shadow-2xl" style={{ background: 'linear-gradient(160deg,#0f172a 0%, #0b1220 60%, #07121a 100%)' }}>
              <div className="p-5 text-white">
                <div className="text-[10px] tracking-widest text-dex-neon mb-1">BIRD-DEX</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <AvatarArt kind={avatarKind(profile.avatar, profile.level)} src={customAvatarSrc(profile.avatar)} size={38} />
                    <TrainerTierBadge level={profile.level} size={44} />
                  </div>
                  <div>
                    <div className="text-lg font-black">{profile.name}</div>
                    <div className="text-xs text-dex-neon">Lv.{profile.level} · {profile.title}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-3">
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-white">{captures.length}</div><div className="text-white/50">種類</div></div>
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-dex-gold">{completion}%</div><div className="text-white/50">完成度</div></div>
                  <div className="bg-white/5 rounded-lg py-2 border border-white/10"><div className="text-lg font-black text-white">{totalCount}</div><div className="text-white/50">拍攝</div></div>
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
              <button onClick={doShareCardImage} className="flex-1 py-3 rounded-xl bg-dex-neon text-dex-ink font-black text-sm">分享 / 下載名片</button>
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
              <h3 className="text-lg font-bold text-dex-text">更換角色形象</h3>
              <button onClick={() => setShowAvatarSelect(false)} className="text-dex-muted hover:text-dex-text">
                <X size={20} />
              </button>
            </div>
            
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 256;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    const side = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
                    updateProfileAvatar(canvas.toDataURL('image/jpeg', 0.82));
                    setShowAvatarSelect(false);
                  };
                  img.src = String(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              className={`mb-4 w-full aspect-[3/1] rounded-2xl flex items-center justify-center gap-2 border-2 border-dashed transition-all ${
                customAvatarSrc(profile.avatar)
                  ? 'border-dex-neon bg-dex-neon/15 text-dex-neon'
                  : 'border-dex-border bg-dex-surface text-dex-text'
              }`}
            >
              {customAvatarSrc(profile.avatar) ? (
                <img src={customAvatarSrc(profile.avatar)} alt="我的照片" className="h-12 w-12 rounded-xl object-cover mr-2" />
              ) : null}
              <span className="text-sm font-black">上傳自己的照片</span>
            </button>
            <div className="grid grid-cols-3 gap-4">
              {AVATARS.map((av) => {
                const isUnlocked = profile.level >= av.unlockLevel;
                const isSelected = !customAvatarSrc(profile.avatar) && avatarKind(profile.avatar, profile.level) === av.kind;
                return (
                  <button
                    key={av.kind}
                    onClick={() => {
                      if (isUnlocked) {
                        updateProfileAvatar(av.kind);
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
                    <AvatarArt kind={av.kind} src={customAvatarSrc(profile.avatar)} size={40} />
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
