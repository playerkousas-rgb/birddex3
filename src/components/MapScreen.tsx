import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCollectionContext } from '../context/CollectionContext';
import { getBirdById } from '../data/birdData';
import { MapPin, Camera, List, Navigation } from 'lucide-react';
import { RARITY_META } from '../lib/theme';

interface MapScreenProps {
  onSelectSpecies: (id: number) => void;
  onGoScan: () => void;
}

function FlyTo({ center, zoom }: { center: [number, number] | null, zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.7 });
  }, [center, zoom, map]);
  return null;
}

function makeEmojiIcon(emoji: string, caughtCount: number) {
  const ring = caughtCount > 10 ? '#FFD700' : caughtCount > 3 ? '#9b5cff' : '#00F0FF';
  return new DivIcon({
    html: `<div style="font-size:26px; width:36px; height:36px; display:flex;align-items:center;justify-content:center; background:rgba(8,14,22,0.85); border:2px solid ${ring}; border-radius:50%; box-shadow:0 2px 10px rgba(0,0,0,.5)">${emoji}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function MapScreen({ onSelectSpecies, onGoScan }: MapScreenProps) {
  const { captures } = useCollectionContext();
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [listMode, setListMode] = useState(false);
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  // 有 GPS 的捕捉紀錄
  type MapPin = {
    capture: (typeof captures)[number];
    bird: NonNullable<ReturnType<typeof getBirdById>>;
    lat: number;
    lng: number;
    stats: ReturnType<typeof getBirdById> extends any ? any : never;
  };

  const pins = useMemo(() => {
    return captures
      .filter(c => c.location && typeof c.location.lat === 'number')
      .map((c): MapPin | null => {
        const bird = getBirdById(c.speciesId);
        if (!bird) return null;
        const stats = c.bestStats ?? c.stats;
        return {
          capture: c,
          bird,
          lat: c.location!.lat,
          lng: c.location!.lng,
          stats,
        };
      })
      .filter((p): p is MapPin => p !== null);
  }, [captures]);

  const center: [number, number] = loc ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [22.352, 114.13]);

  const goToPin = (lat: number, lng: number) => {
    setListMode(false);
    setFlyToPos([lat, lng]);
    setTimeout(() => setFlyToPos(null), 100);
  };

  return (
    <div className="h-full bg-dex-bg flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-dex-bg/95 backdrop-blur border-b border-dex-border px-4 py-3 z-[500]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white">捕捉足跡</h1>
            <p className="text-xs text-dex-muted">
              已記錄 <span className="text-dex-neon font-bold">{pins.length}</span> 個地點 · {loc ? `${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}` : '定位中…'}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                navigator.geolocation?.getCurrentPosition(
                  p => setFlyToPos([p.coords.latitude, p.coords.longitude]),
                  () => alert('無法取得定位')
                );
                setLoc(prev => prev);
              }}
              className="px-2.5 py-2 rounded-lg bg-dex-surface border border-dex-border text-white/70"
              title="定位到我"
            >
              <Navigation size={15} />
            </button>
            <button
              onClick={() => setListMode(v => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${listMode ? 'bg-dex-neon text-dex-bg border-dex-neon' : 'bg-dex-surface text-white border-dex-border'}`}
            >
              {listMode ? <MapPin size={14} /> : <List size={14} />}
              {listMode ? '地圖' : '列表'}
            </button>
          </div>
        </div>
      </div>

      {/* Map / List */}
      {listMode ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
          {pins.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-5xl mb-3">🗺️</div>
              <div className="text-white font-bold mb-1">還沒有捕捉足跡</div>
              <div className="text-sm text-dex-muted mb-4">開啟 GPS 後外出捕捉，<br/>你的捕捉地點會自動記錄在這裡</div>
              <button onClick={onGoScan} className="px-4 py-2.5 rounded-xl bg-dex-neon text-dex-bg font-black text-sm">去捕捉</button>
            </div>
          ) : (
            <div className="space-y-2">
              {pins
                .slice()
                .sort((a, b) => new Date(b.capture.lastCaptureDate).getTime() - new Date(a.capture.lastCaptureDate).getTime())
                .map(({ capture, bird, lat, lng, stats }) => {
                  const rarityMeta = RARITY_META[capture.currentRarity];
                  return (
                    <button
                      key={bird.id}
                      onClick={() => onSelectSpecies(bird.id)}
                      className="w-full text-left px-3 py-3 rounded-xl bg-dex-surface border border-dex-border hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{bird.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {bird.name}
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-black" style={{ background: rarityMeta.color + '22', color: rarityMeta.color }}>
                              {rarityMeta.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-dex-muted truncate">
                            {lat.toFixed(5)}, {lng.toFixed(5)} · {new Date(capture.lastCaptureDate).toLocaleDateString('zh-HK')}
                          </div>
                          {stats && (
                            <div className="text-[10px] text-dex-muted mt-0.5">
                              CP {stats.cp} · {stats.nature} · 捕捉 {capture.count} 次
                              {stats.stickerUrl && ' · 有貼圖'}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[10px] text-dex-muted">
                          <div
                            className="px-2 py-1 rounded bg-white/5 cursor-pointer hover:bg-white/10"
                            onClick={(e) => { e.stopPropagation(); goToPin(lat, lng); }}
                          >
                            看地圖
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
          <div className="text-center text-[11px] text-dex-muted mt-5 pb-2 leading-relaxed">
            地圖顯示的是你親自捕捉的地點紀錄，<br/>
            非鳥類分布預測。鳥會飛，實際觀鳥請以現場為準。<br/>
            深入學習請前往 <a className="text-dex-neon underline" href="https://avian-dex.vercel.app/" target="_blank" rel="noreferrer">AvianDex</a>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <MapContainer
            center={center}
            zoom={loc || pins[0] ? 13 : 11}
            className="w-full h-full"
            style={{ background: '#0b1117' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo center={flyToPos} zoom={15} />
            {loc && <Circle center={loc} radius={60} pathOptions={{ color: '#00F0FF', fillOpacity: 0.14 }} />}

            {pins.map(({ capture, bird, lat, lng, stats }) => (
              <Marker
                key={`${bird.id}-${lat}-${lng}`}
                position={[lat, lng]}
                icon={makeEmojiIcon(bird.emoji, capture.count)}
              >
                <Popup>
                  <div style={{ minWidth: 210, fontFamily: 'system-ui' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>
                      {bird.emoji} {bird.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                      {bird.nameEn} · {RARITY_META[capture.currentRarity].labelZh}
                    </div>
                    {stats && (
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        CP <b>{stats.cp}</b> · IV {stats.iv.percent}% · {stats.nature}
                        {stats.isShiny ? ' · ✨色違' : ''}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
                      捕捉 {capture.count} 次<br/>
                      最近：{new Date(capture.lastCaptureDate).toLocaleString('zh-HK')}<br/>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </div>
                    {stats?.stickerUrl && (
                      <img src={stats.stickerUrl} alt="sticker" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 6, background: '#f5f5f5', borderRadius: 8 }} />
                    )}
                    <button
                      onClick={() => onSelectSpecies(bird.id)}
                      style={{
                        width: '100%', padding: '7px',
                        border: 'none', borderRadius: 8,
                        background: '#00F0FF', color: '#041019',
                        fontWeight: 800, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      查看圖鑑卡
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* floating scan button */}
          <div className="absolute bottom-3 left-3 right-3 z-[400]">
            <button onClick={onGoScan}
              className="w-full py-3.5 rounded-xl bg-dex-neon text-dex-bg font-black flex items-center justify-center gap-2 shadow-lg shadow-dex-neon/20">
              <Camera size={18} /> 前往捕捉
            </button>
            <div className="text-center text-[10px] text-white/70 mt-1.5 drop-shadow" style={{ textShadow: '0 1px 4px #000' }}>
              {pins.length > 0 ? `已記錄 ${pins.length} 個捕捉點` : '尚無足跡 · 開啟 GPS 後捕捉會自動記錄'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
