import { useMemo, useState, useRef } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { getBirdById } from '../data/birdData';
import { Swords, Share2, RotateCcw, Download, Copy, Clipboard } from 'lucide-react';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';

interface BattleScreenProps {
  onBack: () => void;
}

type RemoteFighter = {
  speciesId: number;
  cp: number;
  ivPercent: number;
  nature: string;
  isShiny?: boolean;
};

type TeamExport = {
  v: 1;
  trainer: { name: string; level: number; avatar?: string };
  fighters: RemoteFighter[];
  ts: number;
};

export function BattleScreen({ onBack }: BattleScreenProps) {
  const { captures, profile } = useCollectionContext();
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);

  // 本機隊伍
  const team = useMemo(() => 
    captures
      .filter(c => c.bestStats || c.stats)
      .sort((a,b) => ((b.bestStats?.cp ?? b.stats?.cp ?? 0) - (a.bestStats?.cp ?? a.stats?.cp ?? 0)))
      .slice(0, 12),
  [captures]);

  // 匯入的對手隊伍
  const [rivalTeam, setRivalTeam] = useState<{ meta: TeamExport['trainer'], fighters: (RemoteFighter & { bird: any })[] } | null>(null);
  const [showTeamIO, setShowTeamIO] = useState(false);
  const [importText, setImportText] = useState('');

  const useRival = !!rivalTeam;

  const left = team[leftIdx % Math.max(1, team.length)];
  const right = useRival
    ? rivalTeam!.fighters[rightIdx % rivalTeam!.fighters.length]
    : team[rightIdx % Math.max(1, team.length)];

  const leftBird = left ? getBirdById(left.speciesId)! : null;
  const rightBird = useRival
    ? (right as any).bird
    : right ? getBirdById((right as any).speciesId)! : null;

  const leftSt = left ? (left.bestStats ?? left.stats!) : null;
  const rightSt = useRival
    ? right as RemoteFighter
    : (right ? ((right as any).bestStats ?? (right as any).stats) : null);

  const leftCP = leftSt?.cp ?? 100;
  const rightCP = rightSt?.cp ?? 100;

  const [battleResult, setBattleResult] = useState<null | 'left' | 'right' | 'draw'>(null);

  const doBattle = () => {
    const lScore = leftCP + Math.random()*120;
    const rScore = rightCP + Math.random()*120;
    const result = lScore > rScore + 10 ? 'left' : rScore > lScore + 10 ? 'right' : 'draw';
    setBattleResult(result);
  };

  const shareBattle = async () => {
    const rn = rightBird?.name ?? '對手';
    const text = `BIRD-DEX 對戰！${leftBird?.name} (CP ${leftCP}) VS ${rn} (CP ${rightCP})` +
      (battleResult ? ` — ${battleResult==='draw'?'平手':(battleResult==='left'?leftBird?.name:rn)+'獲勝'}` : '');
    
    if (battleResult && cardRef.current) {
      try {
        const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `birdex-battle-${Date.now()}.png`, { type: 'image/png' });
        if ((navigator as any).canShare?.({ files: [file] })) {
          await (navigator as any).share({ files: [file], title: 'BIRD-DEX 對戰結果', text });
          return;
        }
        const a = document.createElement('a'); a.href = dataUrl; a.download = `birdex-battle.png`; a.click();
        return;
      } catch {}
    }
    if (navigator.share) { try { await navigator.share({ title: 'BIRD-DEX 對戰', text, url: location.href }); return; } catch {} }
    await navigator.clipboard.writeText(text + '\n' + location.href);
    alert('對戰資訊已複製！');
  };

  // 非同步對戰：匯出隊伍
  const exportTeamCode = () => {
    const fighters: RemoteFighter[] = team.slice(0,6).map(c => {
      const st = c.bestStats ?? c.stats!;
      return {
        speciesId: c.speciesId,
        cp: st.cp,
        ivPercent: st.iv.percent,
        nature: st.nature,
        isShiny: st.isShiny || undefined,
      };
    });
    const payload: TeamExport = {
      v: 1,
      trainer: { name: profile.name, level: profile.level, avatar: profile.avatar },
      fighters,
      ts: Date.now(),
    };
    const json = JSON.stringify(payload);
    // 壓縮一點：base64
    const code = btoa(unescape(encodeURIComponent(json)));
    return { json, code };
  };

  const importTeam = (input: string) => {
    try {
      let raw = input.trim();
      // 支援 raw JSON 或 base64
      if (!raw.startsWith('{')) {
        raw = decodeURIComponent(escape(atob(raw)));
      }
      const data = JSON.parse(raw) as TeamExport;
      if (data.v !== 1 || !Array.isArray(data.fighters)) throw new Error('bad format');
      const fighters = data.fighters.map(f => {
        const bird = getBirdById(f.speciesId);
        if (!bird) return null;
        return { ...f, bird };
      }).filter(Boolean) as any[];
      if (!fighters.length) throw new Error('無有效鳥種');
      setRivalTeam({ meta: data.trainer, fighters });
      setRightIdx(0);
      setBattleResult(null);
      setShowTeamIO(false);
      setImportText('');
      return true;
    } catch (e: any) {
      alert('匯入失敗：' + (e.message || e));
      return false;
    }
  };

  if (team.length < 2 && !useRival) {
    return (
      <div className="min-h-full bg-dex-bg flex flex-col items-center justify-center p-6 text-center">
        <Swords size={48} className="text-dex-muted mb-3"/>
        <div className="text-lg font-black text-white mb-1">對戰室尚未開放</div>
        <div className="text-sm text-dex-muted mb-4">至少捕捉 2 隻有個體值的鳥才能對戰<br/>或匯入朋友的隊伍來打</div>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl bg-dex-surface border border-dex-border text-white">返回</button>
          <button onClick={()=>setShowTeamIO(true)} className="px-5 py-2.5 rounded-xl bg-dex-neon text-dex-bg font-black">匯入隊伍</button>
        </div>
      </div>
    );
  }

  const exp = exportTeamCode();

  return (
    <div className="min-h-full bg-dex-bg">
      <div className="sticky top-0 z-30 bg-dex-bg/90 backdrop-blur border-b border-dex-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-white flex items-center gap-2"><Swords size={18}/> 鳥雀對戰 {useRival && <span className="text-[10px] text-dex-neon font-mono">ASYNC</span>}</h1>
        <div className="flex gap-2 text-xs">
          <button onClick={()=>setShowTeamIO(true)} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-dex-border text-white">隊伍匯出/入</button>
          <button onClick={onBack} className="text-dex-muted">關閉</button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 左：我方 */}
          <div className="bg-dex-surface border border-dex-border rounded-2xl p-3">
            <div className="text-[10px] text-dex-muted mb-1">我方 · {profile.name}</div>
            {leftBird ? <>
              <div className="text-3xl text-center mb-1">{leftBird.emoji}</div>
              <div className="text-sm font-black text-white text-center truncate">{leftBird.name}</div>
              <div className="text-[11px] text-dex-neon text-center">CP {leftCP}</div>
              <div className="text-[9px] text-dex-muted text-center">{leftSt?.nature} · IV {leftSt?.iv.percent}%</div>
              <div className="flex gap-1 mt-2">
                <button onClick={()=>setLeftIdx((leftIdx-1+team.length)%team.length)} className="flex-1 py-1.5 rounded-lg bg-black/30 text-[11px] text-white/70">‹</button>
                <button onClick={()=>setLeftIdx((leftIdx+1)%team.length)} className="flex-1 py-1.5 rounded-lg bg-black/30 text-[11px] text-white/70">›</button>
              </div>
            </> : <div className="text-xs text-dex-muted text-center py-6">無隊員</div>}
          </div>

          {/* 右：對手 */}
          <div className="bg-dex-surface border border-dex-border rounded-2xl p-3">
            <div className="text-[10px] text-dex-muted mb-1">
              對手 · {useRival ? rivalTeam!.meta.name + ` Lv.${rivalTeam!.meta.level}` : '電腦'}
            </div>
            {rightBird ? <>
              <div className="text-3xl text-center mb-1">{rightBird.emoji}</div>
              <div className="text-sm font-black text-white text-center truncate">{rightBird.name}
                {rightSt?.isShiny && <span className="ml-1">✨</span>}
              </div>
              <div className="text-[11px] text-amber-300 text-center">CP {rightCP}</div>
              <div className="text-[9px] text-dex-muted text-center">{(rightSt as any)?.nature ?? ''} · IV {(rightSt as any)?.ivPercent ?? (rightSt as any)?.iv?.percent ?? '?'}%</div>
              <div className="flex gap-1 mt-2">
                <button onClick={()=>{
                  const n = useRival ? rivalTeam!.fighters.length : team.length;
                  setRightIdx((rightIdx-1+n)%n);
                }} className="flex-1 py-1.5 rounded-lg bg-black/30 text-[11px] text-white/70">‹</button>
                <button onClick={()=>{
                  const n = useRival ? rivalTeam!.fighters.length : team.length;
                  setRightIdx((rightIdx+1)%n);
                }} className="flex-1 py-1.5 rounded-lg bg-black/30 text-[11px] text-white/70">›</button>
              </div>
            </> : <div className="text-xs text-dex-muted text-center py-6">無隊員</div>}
          </div>
        </div>

        {/* battle card */}
        <div ref={cardRef} className="bg-dex-surface border border-dex-border rounded-2xl p-4 text-center mb-3 min-h-[110px] flex flex-col items-center justify-center" style={{ backgroundColor: '#101827' }}>
          {!battleResult ? (
            <><div className="text-2xl mb-1">⚔️</div>
            <div className="text-xs text-dex-muted">{useRival ? `${rivalTeam?.meta.name} 的影子隊 · 非同步對戰` : 'CP 相近時勝負隨機'}</div></>
          ) : battleResult === 'draw' ? (
            <div className="text-lg font-black text-amber-300">平手！勢均力敵</div>
          ) : (
            <div className="text-lg font-black text-dex-neon">{battleResult==='left' ? leftBird?.name : rightBird?.name} 獲勝！</div>
          )}
          {battleResult && (
            <div className="text-[10px] text-white/50 mt-2 font-mono">
              {leftBird?.name} CP{leftCP} vs {rightBird?.name} CP{rightCP}<br/>
              BIRD-DEX v3 · {profile.name} {useRival ? `vs ${rivalTeam?.meta.name}` : ''}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={doBattle} disabled={!leftBird || !rightBird}
            className="flex-1 py-3.5 rounded-xl bg-dex-neon text-dex-bg font-black disabled:opacity-40">開戰！</button>
          <button onClick={()=>setBattleResult(null)} className="px-4 py-3.5 rounded-xl bg-dex-surface border border-dex-border text-white"><RotateCcw size={18}/></button>
          <button onClick={()=>shareBattle()} className="px-4 py-3.5 rounded-xl bg-dex-surface border border-dex-border text-white"><Share2 size={18}/></button>
          {battleResult && <button onClick={()=>shareBattle()} className="px-3 py-3.5 rounded-xl bg-white/10 border border-dex-border text-white text-[11px]"><Download size={16}/></button>}
        </div>

        <div className="mt-4 text-[11px] text-dex-muted text-center pb-6">
          非同步對戰：匯出隊伍給朋友，對方匯入即可挑戰你的影子隊。<br/>
          {useRival ? <>目前對手：{rivalTeam?.meta.name} Lv.{rivalTeam?.meta.level} · <button onClick={()=>{setRivalTeam(null); setRightIdx(1);}} className="underline text-dex-neon">清除對手</button></> : <>訓練師 {profile.name} · Lv.{profile.level}</>}
        </div>
      </div>

      {/* Team import/export modal */}
      {showTeamIO && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dex-bg border border-dex-border rounded-2xl p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-white">隊伍匯出 / 匯入</h3>
              <button onClick={()=>setShowTeamIO(false)} className="text-dex-muted">✕</button>
            </div>
            
            <div className="mb-4 bg-dex-surface rounded-xl p-3 border border-dex-border">
              <div className="text-xs font-bold text-white mb-2">匯出我的隊伍 (前6隻)</div>
              <div className="text-[11px] text-dex-muted mb-2">{profile.name} Lv.{profile.level} · {Math.min(6, team.length)} 隻</div>
              <div className="bg-black/40 rounded-lg p-2 text-[10px] font-mono text-dex-neon break-all max-h-20 overflow-y-auto">
                {exp.code}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={async ()=>{ await navigator.clipboard.writeText(exp.code); alert('隊伍代碼已複製！'); }}
                  className="flex-1 py-2 rounded-lg bg-dex-neon text-dex-bg text-xs font-black flex items-center justify-center gap-1">
                  <Copy size={13}/> 複製代碼
                </button>
                <button onClick={async ()=>{
                  if (navigator.share) { try { await navigator.share({ title: 'BIRD-DEX 對戰挑戰', text: `來挑戰我的鳥精靈隊伍！代碼：${exp.code}`, url: location.href }); } catch {} }
                }} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs border border-dex-border">
                  <Share2 size={13}/>
                </button>
              </div>
              <div className="mt-3 bg-white rounded-lg p-3 flex justify-center">
                <QRCodeSVG value={exp.code} size={140} />
              </div>
              <div className="text-[10px] text-dex-muted text-center mt-1">掃 QR 或複製代碼給朋友匯入</div>
            </div>

            <div className="bg-dex-surface rounded-xl p-3 border border-dex-border">
              <div className="text-xs font-bold text-white mb-2">匯入對手隊伍</div>
              <textarea
                value={importText}
                onChange={e=>setImportText(e.target.value)}
                placeholder="貼上朋友的隊伍代碼 / JSON…"
                className="w-full h-24 bg-black/40 border border-dex-border rounded-lg px-2 py-2 text-[11px] font-mono text-white placeholder-dex-muted focus:outline-none focus:border-dex-neon resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={async ()=>{
                  try { const t = await navigator.clipboard.readText(); setImportText(t); } catch { alert('無法讀取剪貼簿，請手動貼上'); }
                }} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1"><Clipboard size={13}/> 貼上</button>
                <button onClick={()=>importTeam(importText)} disabled={!importText.trim()}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 text-black text-xs font-black disabled:opacity-40">
                  匯入並對戰
                </button>
              </div>
              <div className="text-[10px] text-dex-muted mt-2">匯入後，對戰頁右邊會變成對手的影子隊，無需連線伺服器。</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
