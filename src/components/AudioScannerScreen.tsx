import { useRef, useState, useCallback, useEffect } from 'react';
import { useCollectionContext } from '../context/CollectionContext';
import { CaptureResult as CaptureResultType } from '../types';
import { analyzeAudio } from '../lib/aiClient';
import { resolveBirdId } from '../data/nameAliases';
import { getBirdById } from '../data/birdData';

import { Mic, ArrowLeft, Upload, Zap } from 'lucide-react';

type AudioPhase = 'idle' | 'recording' | 'analyzing' | 'found' | 'missed' | 'error';

interface AudioScannerProps {
  onCapture: (result: CaptureResultType) => void;
  onBack: () => void;
}

export function AudioScannerScreen({ onCapture, onBack }: AudioScannerProps) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [phase, setPhase] = useState<AudioPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [analyzingText, setAnalyzingText] = useState('');
  const [recSec, setRecSec] = useState(0);
  const timerRef = useRef<any>(null);
  const { captureBird } = useCollectionContext();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : undefined;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(200);
      setPhase('recording');
      setRecSec(0);
      timerRef.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e.name === 'NotAllowedError' ? '麥克風權限被拒絕' : `錄音失敗：${e.message}`);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
  }, []);

  const processAudio = useCallback(async (blob: Blob) => {
    setPhase('analyzing');
    const texts = ['聲音頻譜分析...', '特徵比對中...', '查詢鳥鳴圖鑑...', 'AI 推理中...'];
    let ti = 0;
    const tInt = setInterval(() => { setAnalyzingText(texts[ti % texts.length]); ti++; }, 700);
    try {
      const results = await analyzeAudio(blob);
      clearInterval(tInt);
      if (!results.length || results[0].score < 0.4) {
        setPhase('missed');
        return;
      }
      const top = results[0];
      const speciesId = resolveBirdId(top.label) ?? (top.scientific ? resolveBirdId(top.scientific) : undefined);
      if (!speciesId) { setPhase('missed'); return; }
      const bird = getBirdById(speciesId);
      if (!bird) { setPhase('missed'); return; }
      setPhase('found');
      await new Promise(r => setTimeout(r, 400));
      const captureResult = captureBird(speciesId);
      onCapture(captureResult);
    } catch (err: any) {
      clearInterval(tInt);
      setPhase('error');
      setErrorMsg(err.message || '分析過程發生錯誤');
    }
  }, [captureBird, onCapture]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAudio(file);
  }, [processAudio]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    };
  }, []);

  return (
    <div className="h-full w-full bg-dex-bg flex flex-col items-center justify-center relative p-6">
      <button onClick={onBack} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10">
        <ArrowLeft size={20} />
      </button>

      <div className="text-xs font-mono text-dex-neon tracking-widest mb-8">AUDIO SCANNER</div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-dex-surface border border-dex-border flex items-center justify-center">
              <Mic size={48} className="text-dex-muted" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-bold mb-1">聽聲認鳥</p>
            <p className="text-xs text-dex-muted">按住下方按鈕錄下鳥叫聲，或上傳錄音檔</p>
          </div>

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="w-full py-4 rounded-xl bg-dex-neon text-dex-bg font-black text-sm tracking-wider active:scale-95 transition select-none"
          >
            按住錄音
          </button>

          <label className="w-full py-3 rounded-xl border border-dex-border text-dex-muted text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-dex-surface transition">
            <Upload size={14} /> 上傳錄音檔
            <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-40 h-40 rounded-full bg-dex-accent/10 border-2 border-dex-accent flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-dex-accent/20 animate-ping" />
            <Mic size={48} className="text-dex-accent relative z-10" />
          </div>
          <div className="text-2xl font-mono font-black text-white tabular-nums">00:{recSec.toString().padStart(2, '0')}</div>
          <p className="text-sm text-dex-muted">錄音中… 放開即可停止</p>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-dex-neon/20 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 border-4 border-t-dex-neon border-r-transparent border-b-dex-neon/30 border-l-transparent rounded-full animate-spin" />
            <Zap className="absolute inset-0 m-auto text-dex-neon" size={32} />
          </div>
          <div className="text-dex-neon font-mono text-sm tracking-widest animate-pulse">AI ANALYZING</div>
          <div className="text-white/60 text-xs font-mono mt-2">{analyzingText}</div>
        </div>
      )}

      {phase === 'missed' && (
        <div className="flex flex-col items-center text-center gap-4">
          <div className="text-5xl">💨</div>
          <div className="text-xl font-black text-white">無法辨識這個聲音</div>
          <p className="text-sm text-dex-muted max-w-xs">可能是雜訊太大、鳥聲太短，或這隻鳥不在圖鑑中。</p>
          <button onClick={() => setPhase('idle')} className="px-6 py-3 rounded-xl bg-dex-neon text-dex-bg font-bold text-sm">再試一次</button>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center text-center gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="text-lg font-bold text-white">錄音發生錯誤</div>
          <p className="text-sm text-dex-muted">{errorMsg}</p>
          <button onClick={() => setPhase('idle')} className="px-6 py-3 rounded-xl bg-dex-neon text-dex-bg font-bold text-sm">重試</button>
        </div>
      )}
    </div>
  );
}
