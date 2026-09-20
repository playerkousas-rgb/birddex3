import React from 'react';
import { LayoutGrid, ScanLine, Images, User, Map, Swords } from 'lucide-react';
import { View } from '../types';

interface NavbarProps {
  current: View;
  onNavigate: (v: View) => void;
}

const ITEMS: { key: View; label: string; icon: React.ElementType }[] = [
  { key: 'dex', label: '圖鑑', icon: LayoutGrid },
  { key: 'map', label: '地圖', icon: Map },
  { key: 'scanner', label: '捕捉', icon: ScanLine },
  { key: 'battle', label: '對戰', icon: Swords },
  { key: 'album', label: '收藏', icon: Images },
  { key: 'profile', label: '訓練師', icon: User },
];

export function Navbar({ current, onNavigate }: NavbarProps) {
  return (
    <nav className="shrink-0 min-h-[74px] bg-dex-surface border-t border-dex-border flex items-center justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] z-50 select-none">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        const isScan = key === 'scanner';
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 ${
              active ? 'text-dex-neon' : 'text-dex-muted hover:text-white'
            }`}
          >
            {isScan && active && (
              <span className="absolute -top-1 w-12 h-12 rounded-full bg-dex-neon/10 blur-md" />
            )}
            <Icon size={isScan ? 30 : 22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[9px] font-bold tracking-wider ${active ? 'text-dex-neon' : 'text-dex-muted'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
