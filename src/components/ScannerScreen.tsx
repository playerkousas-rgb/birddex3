import { useRef, useState, useEffect, useCallback } from 'react';
import { analyzeImageDetailed } from '../lib/aiClient';
import { resolveBirdId } from '../data/nameAliases';
import { getBirdById } from '../data/birdData';
import { Camera, Zap, AlertTriangle, ZoomIn, ZoomOut, MapPin, Sparkles, Eye, EyeOff } from 'lucide-react';
import { RecognizeResult, ThrowSession } from '../types';
import { useLiveBirdDetector } from '../lib/liveDetect';

interface ScannerScreenProps {
  onCapture: (result: any) => void;
  onStartThrow: (session: ThrowSession) => void;
}

type ScanPhase = 'idle' | 'starting' | 'active' | 'countdown' | 'snapping' | 'analyzing' | 'found' | 'missed' | 'error';

export function ScannerScreen({ onCapture, onStartThrow }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaTrack | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [analyzingText, setAnalyzingText] = useState('初始化影像...');

  // Zoom
  const [zoomCap, setZoomCap] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(1);
  const supportsOpticalZoom = !!zoomCap;

  // GPS
  const [location, setLocation] = useState<{lat:number,lng:number}|null>(null);
  const [locStatus, setLocStatus] = useState<'idle'|'ok'|'denied'>('idle');

  // Live detection
  const [liveDetectEnabled, setLiveDetectEnabled] = useState(true);
  const { detections, loading: modelLoading, fps, ready } = useLiveBirdDetector(
    videoRef.current,
    phase === 'active' && liveDetectEnabled
  );
  const birdDetected = detections.length > 0;

  const applyZoom = useCallback(async (z: number) => {
    const t = trackRef.current as any;
    let finalZoom = z;
    if (supportsOpticalZoom && zoomCap && t) {
      const clamped = Math.max(zoomCap.min, Math.min(zoomCap.max, z));
      try {
        await t.applyConstraints({ advanced: [{ zoom: clamped } as any] });
        setZoom(clamped);
        finalZoom = clamped;
        localStorage.setItem('bd_last_zoom', String(clamped));
        return;
      } catch {}
    }
    finalZoom = Math.max(1, Math.min(6, z));
    setDigitalZoom(finalZoom);
    setZoom(finalZoom);
    localStorage.setItem('bd_last_zoom', String(finalZoom));
  }, [supportsOpticalZoom, zoomCap]);

  const startCamera = useCallback(async () => {
    setPhase('starting');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const caps = track.getCapabilities() as any;
      if (caps.zoom) {
        setZoomCap({ min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 5, step: caps.zoom.step ?? 0.1 });
        const settings = track.getSettings() as any;
        setZoom(settings.zoom ?? 1);
      } else {
        setZoomCap(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPhase('active');
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e.name === 'NotAllowedError' ? '相機權限被拒絕，請在瀏覽器設定中允許相機。' : `無法啟動相機：${e.message}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocStatus('ok'); },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  // pinch zoom
  useEffect(() => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist.current = Math.hypot(dx, dy);
        pinchStartZoom.current = zoom;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / pinchStartDist.current;
        applyZoom(pinchStartZoom.current * scale);
      }
    };
    const onTouchEnd = () => { pinchStartDist.current = null; };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom, applyZoom]);

  const snap = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || phase !== 'active') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setPhase('snapping');
    await new Promise(r => setTimeout(r, 140));

    setPhase('analyzing');
    const texts = ['特徵提取...', '比對圖鑑資料庫...', '神經網路辨識...', '搜尋香港鳥種...', '信心度評估...'];
    let ti = 0;
    const tInt = setInterval(() => {
      setAnalyzingText(texts[ti % texts.length]);
      ti++;
    }, 520);

    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      if (!blob) throw new Error('照片生成失敗');
      const data = await analyzeImageDetailed(blob);
      clearInterval(tInt);

      const results = data.results || [];
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.72);

      const fail = (
        reason: string,
        kind: 'not-bird' | 'low-confidence' | 'not-in-dex' | 'escaped',
      ) => {
        onCapture({
          record: null, isNew: false, oldRarity: 'UC', newRarity: 'UC',
          xpGained: 0, species: null, failed: true, failReason: reason, failKind: kind,
        });
      };

      if (data.notBird) {
        const guess = data.topGuess ? `（看起來像「${data.topGuess}」）` : '';
        fail(`畫面中沒有偵測到鳥類${guess}，請對準鳥類再試。`, 'not-bird'); return;
      }
      if (!results.length || results[0].score < 0.68 || results[0].label === 'Unknown Object') {
        fail('辨識信心度不足，請靠近一點或在光線充足處再試。', 'escaped'); return;
      }
      const top = results[0] as RecognizeResult;
      const speciesId = resolveBirdId(top.label) ?? (top.scientific ? resolveBirdId(top.scientific) : undefined);
      if (!speciesId) {
        fail(`偵測到「${top.label}」，但這隻鳥不在 BIRD-DEX 圖鑑中。`, 'not-in-dex'); return;
      }
      const bird = getBirdById(speciesId);
      if (!bird) { fail('圖鑑資料異常，請重試。', 'escaped'); return; }

      onStartThrow({
        speciesId,
        species: bird,
        photoDataUrl,
        location,
        analyzeResult: top,
        zoomLevel: zoom,
      });

    } catch (err: any) {
      clearInterval(tInt);
      setPhase('error');
      setErrorMsg(err.message || '辨識過程發生錯誤');
    }
  }, [phase, onCapture, onStartThrow, location, zoom]);

  const maxZoom = zoomCap?.max ?? 6;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden touch-none select-none">
      {/* Video */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${phase === 'snapping' ? 'opacity-40' : 'opacity-100'}`}
        style={{
          transform: supportsOpticalZoom ? 'none' : `scale(${digitalZoom})`,
          transformOrigin: 'center center',
        }}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Live detection boxes */}
      {phase === 'active' && liveDetectEnabled && detections.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {detections.map((d, i) => (
            <div
              key={i}
              className="absolute border-2 border-dex-neon rounded-lg shadow-[0_0_18px_rgba(0,240,255,0.55)]"
              style={{
                left: `${d.x * 100}%`,
                top: `${d.y * 100}%`,
                width: `${d.width * 100}%`,
                height: `${d.height * 100}%`,
              }}
            >
              <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-dex-neon text-dex-bg text-[10px] font-black tracking-wider">
                BIRD {(d.score * 100).toFixed(0)}%
              </div>
              {/* corners */}
              <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-white" />
              <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-white" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-white" />
            </div>
          ))}
        </div>
      )}

      {/* Scan frame overlay – only when no live detection */}
      {(phase === 'active') && (!liveDetectEnabled || detections.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[4]">
          <div className="relative w-[70vw] max-w-[340px] aspect-[4/3]">
            <div className={`absolute inset-0 border-2 rounded-2xl transition-colors ${birdDetected ? 'border-dex-neon' : 'border-white/25'}`} />
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />
            <div className="scan-line rounded-full" />
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <div className="text-[10px] text-dex-neon/80 tracking-[0.3em] font-mono">
                BIRD-DEX SCAN v3.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <div className="absolute inset-0 bg-dex-bg/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-dex-neon/20 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 border-4 border-t-dex-neon border-r-transparent border-b-dex-neon/30 border-l-transparent rounded-full animate-spin" />
            <Zap className="absolute inset-0 m-auto text-dex-neon" size={32} />
          </div>
          <div className="text-dex-neon font-mono text-sm tracking-widest mb-2 animate-pulse">AI ANALYZING</div>
          <div className="text-white/60 text-xs font-mono">{analyzingText}</div>
          <div className="text-white/30 text-[10px] mt-3">Zoom {zoom.toFixed(1)}x · {location ? 'GPS OK' : 'GPS --'}</div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="absolute inset-0 bg-dex-bg/95 flex flex-col items-center justify-center z-20 px-6">
          <AlertTriangle className="text-dex-accent mb-3" size={48} />
          <div className="text-lg font-bold text-white mb-2">掃描器異常</div>
          <div className="text-sm text-dex-muted text-center mb-6">{errorMsg}</div>
          <button onClick={startCamera} className="px-6 py-3 rounded-xl bg-dex-neon text-dex-bg font-bold text-sm">
            重新啟動相機
          </button>
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-10 bg-gradient-to-b from-black/70 to-transparent text-[11px] font-mono">
        <div className="flex items-center gap-2 text-dex-neon">
          <Sparkles size={14} />
          <span className="tracking-widest">CAPTURE</span>
          {ready && liveDetectEnabled && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${birdDetected ? 'bg-dex-neon text-black' : 'bg-white/10 text-white/70'}`}>
              {birdDetected ? `${detections.length} BIRD${detections.length>1?'S':''}` : 'SCANNING'} · {fps}fps
            </span>
          )}
          {modelLoading && liveDetectEnabled && (
            <span className="text-[10px] text-white/50">AI loading…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiveDetectEnabled(v => !v)}
            className={`p-1.5 rounded-lg border transition ${liveDetectEnabled ? 'bg-dex-neon/15 border-dex-neon text-dex-neon' : 'bg-black/40 border-white/20 text-white/50'}`}
            title="即時鳥類偵測"
          >
            {liveDetectEnabled ? <Eye size={15}/> : <EyeOff size={15}/>}
          </button>
          <div className={`flex items-center gap-1 ${locStatus==='ok' ? 'text-emerald-400' : 'text-white/40'}`}>
            <MapPin size={13} />
            <span className="hidden sm:inline">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'GPS --'}</span>
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      {(phase === 'active') && (
        <>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
            <button onClick={()=>applyZoom(zoom+ (zoomCap?.step ?? 0.3))}
              className="w-10 h-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-white active:scale-95">
              <ZoomIn size={18}/>
            </button>
            <div className="relative h-36 w-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center">
              <input
                type="range"
                min={1}
                max={maxZoom}
                step={zoomCap?.step ?? 0.1}
                value={zoom}
                onChange={e=>applyZoom(parseFloat(e.target.value))}
                className="absolute h-32 -rotate-90 w-32 accent-[#00F0FF]"
                style={{ touchAction: 'none' }}
              />
              <div className="pointer-events-none text-[10px] text-white/60 rotate-90 tracking-wider">ZOOM</div>
            </div>
            <button onClick={()=>applyZoom(Math.max(1, zoom - (zoomCap?.step ?? 0.3)))}
              className="w-10 h-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-white active:scale-95">
              <ZoomOut size={18}/>
            </button>
            <div className="text-[11px] text-white font-mono bg-black/55 px-2 py-0.5 rounded-full border border-white/15">
              {zoom.toFixed(1)}x
            </div>
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
            {[1, 2, 3, maxZoom >= 5 ? 5 : null].filter(Boolean).map(v => {
              const z = v as number;
              if (z > maxZoom + 0.01) return null;
              const active = Math.abs(zoom - z) < 0.2;
              return (
                <button key={z}
                  onClick={()=>applyZoom(z)}
                  className={`w-11 h-11 rounded-full text-[11px] font-black border transition ${
                    active ? 'bg-dex-neon text-dex-bg border-dex-neon' : 'bg-black/55 text-white border-white/20'
                  }`}>
                  {z}x
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Bottom controls */}
      {(phase === 'active') && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-10">
          <div className="text-[11px] text-white/70 font-mono text-center px-4">
            {birdDetected ? (
              <span className="text-dex-neon font-bold">偵測到 {detections.length} 隻鳥！按下快門捕捉</span>
            ) : liveDetectEnabled ? (
              ready ? 'AI 即時偵測中 · 對準鳥類' : 'AI 模型載入中…'
            ) : (
              '即時偵測已關閉 · 對準鳥類拍攝'
            )}
            <br />
            <span className="text-white/40">雙指縮放 / 滑桿調整 · 遠距離開 Zoom</span>
          </div>
          <button
            onClick={snap}
            className={`relative w-[78px] h-[78px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${birdDetected ? 'bg-dex-neon' : 'bg-white'}`}
          >
            {birdDetected && <span className="pulse-ring absolute inset-0 rounded-full" style={{borderColor:'#00F0FF'}} />}
            <div className="w-[62px] h-[62px] rounded-full border-[3px] border-dex-bg flex items-center justify-center">
              <Camera size={26} className="text-dex-bg" />
            </div>
          </button>
          <div className="text-[10px] text-white/40">Zoom {zoom.toFixed(1)}x · {supportsOpticalZoom ? '光學' : '數位'} · {liveDetectEnabled ? (ready ? `AI ON ${fps}fps` : 'AI…') : 'AI OFF'}</div>
        </div>
      )}
    </div>
  );
}
