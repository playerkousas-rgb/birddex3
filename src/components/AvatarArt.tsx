import { useState } from 'react';
import { PlayerAvatarIcon, type AvatarKind } from './PlayerAvatarIcon';

/** AI 觀鳥員頭像貼紙；customAvatar（用戶上傳嘅 data URL）優先；讀取失敗先退回手繪 SVG。 */
export function AvatarArt({
  kind,
  size = 40,
  className = '',
  locked = false,
  src,
}: {
  kind: AvatarKind;
  size?: number;
  className?: string;
  locked?: boolean;
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = src && !failed ? src : `/avatar-${kind}.avif`;
  if (failed && !src) {
    return <PlayerAvatarIcon kind={kind} size={size} className={`${locked ? 'grayscale opacity-45' : ''} ${className}`} />;
  }
  return (
    <img
      src={resolved}
      alt={src ? '用戶頭像' : `觀鳥員頭像 ${kind}`}
      width={size}
      height={size}
      className={`object-cover rounded-xl ${locked ? 'grayscale opacity-45' : ''} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
