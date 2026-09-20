import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThrowSession, CaptureStats } from '../types';
import { generateCaptureStats } from '../lib/birdStats';
import { Target, RotateCcw } from 'lucide-react';

interface Props {
  session: ThrowSession;
  zoomLevel: number; // 拍照時的 zoom
  onComplete: (score: CaptureStats['catchScore'], stats: CaptureStats) => void;
  onSkip: () => void;
}

export function ThrowCaptureScreen({ session, zoomLevel, onComplete, onSkip }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'aim'|'throwing'|'result'>('aim');
  const [aimX, setAimX] = useState(0.5);
  const [aimY, setAimY] = useState(0.52);
  const [sway, setSway] = useState(0);
  const [score, setScore] = useState<CaptureStats['catchScore']>(null);

  // bird swaying
  useEffect(() => {
    if (phase !== 'aim') return;
    const id = setInterval(() => setSway(Math.sin(Date.now()/380) * 0.035), 32);
    return () => clearInterval(id);
  }, [phase]);

  const doThrow = () => {
    if (phase !== 'aim') return;
    setPhase('throwing');

    // 判定：圓心距離
    const bx = 0.5 + sway;
    const by = 0.5;
    const dx = aimX - bx;
    const dy = aimY - by;
    const dist = Math.sqrt(dx*dx + dy*dy);

    let s: CaptureStats['catchScore'] = null;
    if (dist < 0.055) s = 'Excellent';
    else if (dist < 0.115) s = 'Great';
    else if (dist < 0.19) s = 'Nice';
    else s = null;

    setScore(s);

    setTimeout(() => {
      setPhase('result');
      const stats = generateCaptureStats({ catchScore: s, zoomLevel });
      setTimeout(() => onComplete(s, stats), 1250);
    }, 850);
  };

  const handlePointer = (e: React.PointerEvent) => {
    const el = areaRef.current;
    if (!el || phase !== 'aim') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setAimX(Math.max(0.1, Math.min(0.9, x)));
    setAimY(Math.max(0.15, Math.min(0.85, y)));
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#07121a] flex flex-col">
      {/* Photo background */}
      <div className="pointer-events-none absolute inset-0 opacity-35 bg-cover bg-center blur-[18px]"
        style={{ backgroundImage: `url(${session.photoDataUrl})` }}/>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60"/>

      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between text-[11px] font-mono text-dex-neon">
        <div>THROW MODE · {session.species.name}</div>
        <button onClick={onSkip} className="text-white/50 hover:text-white">跳過 »</button>
      </div>

      {/* Throw arena */}
      <div
        ref={areaRef}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        className="relative flex-1 mx-4 mb-3 rounded-[22px] border border-white/15 bg-black/30 overflow-hidden touch-none"
        style={{ 
          backgroundImage: `url(${session.photoDataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/25" />
        {/* Bird target */}
        <motion.div
          className="absolute w-20 h-20 -ml-10 -mt-10"
          style={{ left: `${(0.5 + sway) * 100}%`, top: '50%' }}
          animate={phase==='aim' ? { y: [0,-4,0], rotate: [-3,3,-3] } : {}}
          transition={{ repeat: Infinity, duration: 1.35 }}
        >
          <div className="w-20 h-20 rounded-full border-[3px] border-dex-neon/80 bg-dex-neon/12 backdrop-blur-sm flex items-center justify-center shadow-[0_0_24px_rgba(0,240,255,0.45)]">
            <span className="text-4xl">{session.species.emoji}</span>
          </div>
          {/* rings */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/70"
            style={{ transform: 'scale(1.65)' }} />
          <div className="absolute inset-0 rounded-full border border-amber-300/60"
            style={{ transform: 'scale(2.6)' }} />
          <div className="absolute inset-0 rounded-full border border-white/25"
            style={{ transform: 'scale(3.6)' }} />
        </motion.div>

        {/* Aim reticle */}
        {phase === 'aim' && (
          <div className="absolute w-14 h-14 -ml-7 -mt-7 pointer-events-none"
            style={{ left: `${aimX*100}%`, top: `${aimY*100}%` }}>
            <Target className="text-white drop-shadow-lg" size={56} />
            <div className="absolute inset-0 rounded-full border border-white/50 animate-ping" />
          </div>
        )}

        {/* Throw ball */}
        <AnimatePresence>
        {phase === 'throwing' && (
          <motion.div
            initial={{ left: '50%', top: '92%', scale: 1.2 }}
            animate={{ left: `${(0.5+sway)*100}%`, top: '50%', scale: 0.75 }}
            transition={{ type: 'spring', stiffness: 210, damping: 18 }}
            className="absolute w-14 h-14 -ml-7 -mt-7"
            style={{ left: `${aimX*100}%`, top: `${aimY*100}%` }}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#ff3b6b] to-white border-[3px] border-[#111] shadow-xl relative">
              <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-[#111] -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#111] flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"/>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Result flash */}
        {phase === 'result' && score && (
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center">
            <div className={`text-4xl font-black tracking-wider drop-shadow-[0_0_18px_rgba(0,0,0,0.8)] ${
              score==='Excellent' ? 'text-amber-300' : score==='Great' ? 'text-emerald-300' : 'text-sky-300'
            }`}>
              {score.toUpperCase()}!
            </div>
          </motion.div>
        )}
        {phase === 'result' && !score && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-white/90 font-black">
            MISS
          </motion.div>
        )}

        <div className="absolute bottom-2 left-3 right-3 text-[10px] text-white/70 font-mono flex justify-between">
          <span>滑動瞄準 · 點擊投擲</span>
          <span>Zoom {zoomLevel.toFixed(1)}x</span>
        </div>
      </div>

      {/* bottom */}
      <div className="px-4 pb-6">
        {phase === 'aim' ? (
          <button
            onClick={doThrow}
            className="w-full py-4 rounded-2xl bg-dex-neon text-dex-bg font-black tracking-wider shadow-lg shadow-dex-neon/20 active:scale-[0.98]"
          >
            投出精靈球！
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl bg-white/10 text-white/70 text-center text-sm font-bold">
            {phase === 'throwing' ? '飛行中…' : score ? `${score} 命中！` : '沒中… 還是算抓到了！'}
          </div>
        )}
        <button onClick={onSkip} className="w-full mt-2 py-2 text-xs text-white/40 flex items-center justify-center gap-1">
          <RotateCcw size={12}/> 跳過投擲，直接捕捉
        </button>
      </div>
    </div>
  );
}
