import { useRef, useState, useEffect, useCallback } from 'react';
import { CameraSession, cameraCrop, drawCameraFrame, sharpness } from '../lib/camera';
import { Camera, AlertTriangle, ZoomIn, ZoomOut, MapPin, Sparkles, Eye, EyeOff } from 'lucide-react';
import { QuizSession } from '../types';
import { useLiveBirdDetector } from '../lib/liveDetect';

interface ScannerScreenProps {
  /** 影完相 → 交俾三問流程（相只係證據，唔經 AI 辨識） */
  onPhotoTaken: (session: QuizSession) => void;
  onBusyChange: (busy: boolean) => void;
}

type ScanPhase = 'idle' | 'starting' | 'active' | 'snapping' | 'error';

export function ScannerScreen({ onPhotoTaken, onBusyChange }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new CameraSession());
  const mountedRef = useRef(false);
  const captureLock = useRef(false);
  const requestRef = useRef(0);
  const effectiveZoom = useRef({ total: 1, digital: 1 });
  const zoomQueue = useRef(Promise.resolve());
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

  const busy = phase === 'snapping';
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);

  const applyZoom = useCallback((z: number) => {
    const track = cameraRef.current.track;
    zoomQueue.current = zoomQueue.current.then(async () => {
      if (!track || cameraRef.current.track !== track || !mountedRef.current || captureLock.current) return;
      let finalZoom = Math.max(1, Math.min(6, z));
      let softwareZoom = finalZoom;
      if (supportsOpticalZoom && zoomCap) {
        const clamped = Math.max(zoomCap.min, Math.min(zoomCap.max, z));
        try {
          await track.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] });
          finalZoom = clamped;
          softwareZoom = 1;
        } catch {
          // Hardware may reject zoom even when advertised. Avoid multiplying a previous optical zoom twice.
          const optical = (track.getSettings?.() as MediaTrackSettings & { zoom?: number })?.zoom ?? 1;
          softwareZoom = Math.max(1, finalZoom / Math.max(1, optical));
          finalZoom = Math.max(1, optical) * softwareZoom;
        }
      }
      if (!mountedRef.current || cameraRef.current.track !== track) return;
      effectiveZoom.current = { total: finalZoom, digital: softwareZoom };
      setDigitalZoom(softwareZoom);
      setZoom(finalZoom);
      try { localStorage.setItem('bd_last_zoom', String(finalZoom)); } catch { /* optional preference only */ }
    }).catch(() => { /* A failed hardware call must not poison subsequent zoom requests. */ });
  }, [supportsOpticalZoom, zoomCap]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setPhase('starting'); setErrorMsg(''); setZoomCap(null); setZoom(1); setDigitalZoom(1);
    effectiveZoom.current = { total: 1, digital: 1 };
    captureLock.current = false;
    try {
      const stream = await cameraRef.current.open(videoRef.current);
      if (!stream || !mountedRef.current) return;
      const track = stream.getVideoTracks()[0];
      try {
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } };
        if (caps?.zoom) {
          setZoomCap({ min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 5, step: caps.zoom.step ?? 0.1 });
          const total = (track.getSettings() as MediaTrackSettings & { zoom?: number }).zoom ?? 1;
          effectiveZoom.current = { total, digital: 1 };
          setZoom(total);
        }
      } catch { /* Camera is still usable on browsers without capability inspection. */ }
      setPhase('active');
    } catch (e: any) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErrorMsg(e.name === 'NotAllowedError' ? '相機權限被拒絕，請在瀏覽器設定中允許相機。' : `無法啟動相機：${e.message}`);
    }
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    const requests = requestRef;
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      requests.current++;
      camera.stop();
    };
  }, [startCamera]);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { if (!cancelled) { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocStatus('ok'); } },
      () => { if (!cancelled) setLocStatus('denied'); },
      { enableHighAccuracy: true, timeout: 6000 }
    );
    return () => { cancelled = true; };
  }, []);

  // 戶外拍攝：對準期間保持屏幕長亮（Wake Lock）。唔支援／被拒就靜靜繼續，唔影響拍攝。
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;
    const acquire = () => {
      if (cancelled || phase !== 'active') return;
      navigator.wakeLock.request('screen')
        .then(s => {
          if (cancelled || phase !== 'active') { void s.release().catch(() => {}); return; }
          sentinel = s;
        })
        .catch(() => { /* 權限／前台限制：忽略 */ });
    };
    if (phase === 'active') acquire();
    const onVisibility = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [phase]);

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

  const snap = async () => {
    if (!videoRef.current || !canvasRef.current || phase !== 'active' || captureLock.current) return;
    captureLock.current = true;
    const request = ++requestRef.current;
    const current = () => mountedRef.current && requestRef.current === request;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const viewport = { width: video.clientWidth, height: video.clientHeight };
    setPhase('snapping');
    try {
      await zoomQueue.current;
      if (!current()) return;
      const photoZoom = { ...effectiveZoom.current };
      // 三連拍取最Sharp一張：張相只係「證據」，唔經 AI 辨識，直接入三問流程。
      const probe = document.createElement('canvas'); probe.width = 64; probe.height = 64;
      const probeContext = probe.getContext('2d');
      const best = document.createElement('canvas');
      let bestScore = -1;
      for (let i = 0; i < 3; i++) {
        if (!current()) return;
        drawCameraFrame(video, canvas, photoZoom.digital, viewport);
        probeContext?.drawImage(canvas, 0, 0, 64, 64);
        const score = probeContext ? sharpness(probeContext.getImageData(0, 0, 64, 64).data, 64, 64) : 0;
        if (score > bestScore) {
          best.width = canvas.width; best.height = canvas.height;
          const ctx = best.getContext('2d');
          if (!ctx) throw new Error('無法取得相機畫面');
          ctx.drawImage(canvas, 0, 0); bestScore = score;
        }
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 70));
      }
      if (!current()) return;
      onPhotoTaken({
        photoDataUrl: best.toDataURL('image/jpeg', 0.72),
        location,
        zoom: photoZoom.total,
      });
    } catch (err: any) {
      if (!current()) return;
      setPhase('error');
      setErrorMsg(err.message || '拍攝過程發生錯誤');
    } finally {
      if (requestRef.current === request) captureLock.current = false;
      if (mountedRef.current && requestRef.current === request) setPhase('active');
    }
  };

  // Project full-video detections onto the same object-cover/digital crop as the captured image.
  const video = videoRef.current;
  const crop = video?.videoWidth && video.videoHeight && video.clientWidth && video.clientHeight
    ? cameraCrop(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight, digitalZoom) : null;
  const visibleDetections = crop && video ? detections.map(d => ({ ...d,
    x: (d.x * video.videoWidth - crop.x) / crop.width,
    y: (d.y * video.videoHeight - crop.y) / crop.height,
    width: d.width * video.videoWidth / crop.width,
    height: d.height * video.videoHeight / crop.height,
  })) : detections;

  const maxZoom = zoomCap?.max ?? 6;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden touch-none select-none">
      {/* Video */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${phase === 'snapping' ? 'opacity-40' : 'opacity-100'}`}
        style={{
          transform: `scale(${digitalZoom})`,
          transformOrigin: 'center center',
        }}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Live detection boxes */}
      {phase === 'active' && liveDetectEnabled && detections.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {visibleDetections.map((d, i) => (
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
              <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-dex-neon text-dex-ink text-[10px] font-black tracking-wider">
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
              <div className="text-[11px] font-black text-dex-neon/90 tracking-wide">
                鳥精靈掃描 · v3.1
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 拍攝中（三連拍，約 0.2s）—— 唔使 AI，影完即入三問 */}
      {phase === 'snapping' && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
          <div className="w-16 h-16 rounded-full border-4 border-dex-neon/30 border-t-dex-neon animate-spin" style={{ animationDuration: '0.8s' }} />
          <div className="text-dex-neon font-black text-sm mt-4 animate-pulse">影低緊…</div>
          <div className="text-white/40 text-[10px] mt-2">影低佢做證據</div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="absolute inset-0 bg-dex-bg/95 flex flex-col items-center justify-center z-20 px-6">
          <AlertTriangle className="text-dex-accent mb-3" size={48} />
          <div className="text-lg font-bold text-dex-text mb-2">掃描器異常</div>
          <div className="text-sm text-dex-muted text-center mb-6">{errorMsg}</div>
          <button onClick={startCamera} className="px-6 py-3 rounded-xl bg-dex-neon text-dex-ink font-bold text-sm">
            重新啟動相機
          </button>
        </div>
      )}

      {/* Top HUD */}
      {/* 相機頂部 HUD（漸層只係相機畫面上嘅可讀性 scrim，唔係裝飾） */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-10 bg-gradient-to-b from-black/70 to-transparent text-[11px]">
        <div className="flex items-center gap-2 text-dex-neon">
          <Sparkles size={14} />
          <span className="font-black tracking-wide">捕捉模式</span>
          {ready && liveDetectEnabled && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${birdDetected ? 'bg-dex-neon text-black' : 'bg-white/10 text-white/70'}`}>
              {birdDetected ? `${detections.length} BIRD${detections.length>1?'S':''}` : '掃描中'} · {fps}fps
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
            <div className="text-[11px] font-black text-white bg-black/55 px-2 py-0.5 rounded-full border border-white/15">
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
                    active ? 'bg-dex-neon text-dex-ink border-dex-neon' : 'bg-black/55 text-white border-white/20'
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
          <div className="text-[11px] font-bold text-white/75 text-center px-4">
            {birdDetected ? (
              <span className="text-dex-neon font-bold">偵測到 {detections.length} 隻鳥！按下快門捕捉</span>
            ) : liveDetectEnabled ? (
              ready ? 'AI 即時偵測中 · 對準鳥類' : modelLoading ? 'AI 模型載入中…' : '即時偵測暫時無法使用 · 仍可拍攝'
            ) : (
              '即時偵測已關閉 · 對準鳥類拍攝'
            )}
            <br />
            <span className="text-white/40">影完答 3 條問題自己對卡 · 雙指縮放</span>
          </div>
          <button
            onClick={snap}
            aria-label="拍照"
            className={`relative w-[78px] h-[78px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${birdDetected ? 'bg-dex-neon' : 'bg-white'}`}
          >
            {birdDetected && <span className="pulse-ring absolute inset-0 rounded-full" style={{borderColor:'#00F0FF'}} />}
            <div className="w-[62px] h-[62px] rounded-full border-[3px] border-dex-bg flex items-center justify-center">
              <Camera size={26} className="text-dex-ink" />
            </div>
          </button>
          <div className="text-[10px] text-white/40">Zoom {zoom.toFixed(1)}x · {supportsOpticalZoom ? '光學' : '數位'} · {liveDetectEnabled ? (ready ? `AI ON ${fps}fps` : modelLoading ? 'AI…' : 'AI OFFLINE') : 'AI OFF'}</div>
        </div>
      )}
    </div>
  );
}
