import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { CollectionProvider, useCollectionContext } from './context/CollectionContext';
import { View, CaptureResult as CaptureResultType, QuizSession, CaptureStats } from './types';
import { Navbar } from './components/Navbar';
import { ScannerScreen } from './components/ScannerScreen';
import { QuizScreen } from './components/QuizScreen';
import { DexScreen } from './components/DexScreen';
import { AlbumScreen } from './components/AlbumScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { CaptureResultScreen } from './components/CaptureResultScreen';
import { BirdDetailScreen } from './components/BirdDetailScreen';
import { MapScreen } from './components/MapScreen';
import { BattleScreen } from './components/BattleScreen';
import { downloadBackup } from './lib/storage';
import { generateCaptureStats } from './lib/birdStats';
import { celShadeImage } from './lib/celShade';
import { PwaChrome } from './components/PwaChrome';
import { parseIncomingSpecies } from './lib/aviandex';
import { getBirdById } from './data/birdData';

function AppRouter() {
  const [view, setView] = useState<View>('dex');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [lastCapture, setLastCapture] = useState<CaptureResultType | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);

  const [scannerBusy, setScannerBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const { captureBird, storageError, retrySave, exportBackup } = useCollectionContext();

  const handleCloseCapture = () => {
    setView(lastCapture?.failed ? 'scanner' : 'album');
    setLastCapture(null);
  };

  const handleSelectSpecies = (id: number) => {
    setSelectedSpeciesId(id);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail') {
      setSelectedSpeciesId(null);
      setView('dex');
    } else if (view === 'capture-result') {
      setView(lastCapture?.failed ? 'scanner' : 'album');
      setLastCapture(null);
    } else {
      setView('dex');
    }
  };

  // Scanner → 三問流程（相只係證據，冇 AI 辨識）
  const handlePhotoTaken = (session: QuizSession) => {
    setQuizSession(session);
    setView('quiz');
  };

  // 小朋友對卡揀中 → 即刻生成賽璐璐卡 → 捕捉記錄（原相＋賽璐璐一齊 Keep）
  const handlePick = async (speciesId: number) => {
    if (!quizSession || picking) return;
    setPicking(true);
    try {
      const stats: CaptureStats = generateCaptureStats({ catchScore: null, zoomLevel: quizSession.zoom });
      let celUrl: string | null = null;
      try {
        celUrl = await celShadeImage(quizSession.photoDataUrl);
      } catch {
        celUrl = null; // 轉換失敗都要保住原相（證據優先）
      }
      const result = captureBird(speciesId, {
        photo_original_url: quizSession.photoDataUrl,
        photo_cel_url: celUrl,
        location: quizSession.location ?? null,
        stats,
      });
      setQuizSession(null);
      setLastCapture(result);
      setView('capture-result');
    } finally {
      setPicking(false);
    }
  };

  const handleQuizBack = () => {
    setQuizSession(null);
    setView('scanner');
  };

  // 入站深層連結（AvianDex → BirdEx）：?no=0008 / ?species=8 / ?id=0008 直接開呢隻鳥嘅詳頁。
  // 處理完清走參數，重新整理唔會重開。合約見 docs/AVIANDEX_INTEROP.md §3。
  useEffect(() => {
    const incoming = parseIncomingSpecies(window.location.search);
    if (incoming === null) return;
    if (getBirdById(incoming)) {
      setSelectedSpeciesId(incoming);
      setView('detail');
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }, []);

  return (
    <div className="app-shell w-screen bg-dex-bg text-dex-text overflow-hidden flex flex-col relative">
      {storageError && (
        <div role="alert" className="shrink-0 bg-amber-950 text-amber-100 px-3 py-2 text-xs z-[60]">
          <p>儲存空間不足或瀏覽器禁止儲存。新資料暫存於此頁，請勿關閉；照片與既有存檔未被刪除。</p>
          <div className="flex gap-4 mt-1">
            <button className="underline py-1" onClick={() => downloadBackup(exportBackup())}>下載完整備份</button>
            <button className="underline py-1" onClick={retrySave}>重試儲存</button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {view === 'scanner' && (
          <ScannerScreen
            onPhotoTaken={handlePhotoTaken}
            onBusyChange={setScannerBusy}
          />
        )}
        {view === 'quiz' && quizSession && (
          <QuizScreen
            session={quizSession}
            onBack={handleQuizBack}
            onPick={handlePick}
          />
        )}
        {view === 'dex' && <DexScreen onSelectSpecies={handleSelectSpecies} />}
        {view === 'album' && <AlbumScreen onSelectSpecies={handleSelectSpecies} />}
        {view === 'map' && <MapScreen onSelectSpecies={handleSelectSpecies} onGoScan={() => setView('scanner')} />}
        {view === 'battle' && <BattleScreen onBack={() => setView('dex')} />}
        {view === 'profile' && <ProfileScreen />}
        {view === 'detail' && selectedSpeciesId !== null && (
          <BirdDetailScreen speciesId={selectedSpeciesId} onBack={handleBack} />
        )}
        {view === 'capture-result' && lastCapture && (
          <CaptureResultScreen result={lastCapture} onClose={handleCloseCapture} />
        )}
      </div>

      {view !== 'capture-result' && view !== 'detail' && view !== 'quiz' && !scannerBusy && (
        <Navbar current={view} onNavigate={setView} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CollectionProvider>
      <AppRouter />
      <PwaChrome />
      <Analytics />
    </CollectionProvider>
  );
}
