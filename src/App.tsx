import { useState } from 'react';
import { CollectionProvider, useCollectionContext } from './context/CollectionContext';
import { View, CaptureResult as CaptureResultType, ThrowSession, CaptureStats } from './types';
import { Navbar } from './components/Navbar';
import { ScannerScreen } from './components/ScannerScreen';
import { DexScreen } from './components/DexScreen';
import { AlbumScreen } from './components/AlbumScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { CaptureResultScreen } from './components/CaptureResultScreen';
import { BirdDetailScreen } from './components/BirdDetailScreen';
import { ThrowCaptureScreen } from './components/ThrowCaptureScreen';
import { MapScreen } from './components/MapScreen';
import { BattleScreen } from './components/BattleScreen';
import { downloadBackup } from './lib/storage';
import { generateCaptureStats } from './lib/birdStats';

function AppRouter() {
  const [view, setView] = useState<View>('dex');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [lastCapture, setLastCapture] = useState<CaptureResultType | null>(null);
  const [throwSession, setThrowSession] = useState<ThrowSession | null>(null);
  const [throwZoom, setThrowZoom] = useState(1);

  const [scannerBusy, setScannerBusy] = useState(false);
  const { captureBird, storageError, retrySave, exportBackup } = useCollectionContext();

  const handleCapture = (result: CaptureResultType) => {
    setLastCapture(result);
    setView('capture-result');
  };

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

  // Scanner → Throw
  const handleStartThrow = (session: ThrowSession) => {
    setThrowSession(session);
    setThrowZoom(session.zoomLevel ?? 1);
    setView('throw');
  };

  const handleThrowComplete = (_score: CaptureStats['catchScore'], stats: CaptureStats) => {
    if (!throwSession) return;
    const result = captureBird(throwSession.speciesId, {
      photoDataUrl: throwSession.photoDataUrl,
      location: throwSession.location ?? null,
      stats,
    });
    setThrowSession(null);
    setLastCapture(result);
    setView('capture-result');
  };

  const handleThrowSkip = () => {
    if (!throwSession) return;
    const stats = generateCaptureStats({ catchScore: null, zoomLevel: throwZoom });
    handleThrowComplete(null, stats);
  };

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
            onCapture={handleCapture}
            onStartThrow={handleStartThrow}
            onBusyChange={setScannerBusy}
          />
        )}
        {view === 'throw' && throwSession && (
          <ThrowCaptureScreen
            session={throwSession}
            zoomLevel={throwZoom}
            onComplete={handleThrowComplete}
            onSkip={handleThrowSkip}
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

      {view !== 'capture-result' && view !== 'detail' && view !== 'throw' && !scannerBusy && (
        <Navbar current={view} onNavigate={setView} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CollectionProvider>
      <AppRouter />
    </CollectionProvider>
  );
}
