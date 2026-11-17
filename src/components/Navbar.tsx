import React from 'react';
import { LayoutGrid, ScanLine, Images, User } from 'lucide-react';
import { View } from '../types';

interface NavbarProps {
  current: View;
  onNavigate: (v: View) => void;
}

const ITEMS: { key: View; label: string; icon: React.ElementType }[] = [
  { key: 'dex', label: '圖鑑', icon: LayoutGrid },
  { key: 'scanner', label: '捕捉', icon: ScanLine },
  { key: 'album', label: '收藏', icon: Images },
  { key: 'profile', label: '訓練師', icon: User },
];

export function Navbar({ current, onNavigate }: NavbarProps) {
  return (
    <nav
      aria-label="主導覽"
      className="shrink-0 min-h-[68px] bg-dex-surface/95 backdrop-blur border-t border-dex-border flex items-stretch gap-1 px-2 pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] z-50 select-none"
    >
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-150 ${
              active
                ? 'bg-dex-neon/12 text-dex-neon'
                : 'text-dex-muted hover:text-dex-text'
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            <span className={`text-[10px] leading-none ${active ? 'font-black' : 'font-bold'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
