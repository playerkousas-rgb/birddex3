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
import { generateCaptureStats } from './lib/birdStats';

function AppRouter() {
  const [view, setView] = useState<View>('dex');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [lastCapture, setLastCapture] = useState<CaptureResultType | null>(null);
  const [throwSession, setThrowSession] = useState<ThrowSession | null>(null);
  const [throwZoom, setThrowZoom] = useState(1);

  const { captureBird } = useCollectionContext();

  const handleCapture = (result: CaptureResultType) => {
    setLastCapture(result);
    setView('capture-result');
  };

  const handleCloseCapture = () => {
    setView('album');
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
      setLastCapture(null);
      setView('album');
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
    <div className="h-screen w-screen bg-dex-bg text-dex-text overflow-hidden flex flex-col relative">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {view === 'scanner' && (
          <ScannerScreen
            onCapture={handleCapture}
            onStartThrow={handleStartThrow}
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

      {view !== 'capture-result' && view !== 'detail' && view !== 'throw' && (
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
