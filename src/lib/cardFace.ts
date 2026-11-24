import type { CaptureRecord } from '../types';

export type BackMediaKind = 'photo' | 'sticker' | 'cel';

export interface ResolvedCardFaces {
  /** 是否已拍到：未拍到時插圖保持鎖定，拍到照即解鎖正面插圖 */
  isUnlocked: boolean;
  /** 正面：已解鎖插圖（R2 原圖／高稀有度異圖） */
  frontIllustrationUrl: string | null;
  /** 反面預設：用戶自己拍的原相（證據，不經濾鏡覆蓋） */
  originalPhotoUrl: string | null;
  /** 進階選看：賽璐璐濾鏡相 */
  celPhotoUrl: string | null;
  /** 去背透明貼圖 PNG */
  stickerUrl: string | null;
  /** 是否有自己拍的照片或貼圖可供反轉查看 */
  canFlip: boolean;
  /** 是否有原相可用作去背生成貼圖 */
  canGenerateSticker: boolean;
  /** 反面目前實際顯示的圖片 URL */
  backUrl: string | null;
  /** 反面目前實際顯示的媒體類型 */
  activeBackKind: BackMediaKind;
}

/**
 * 決定鳥卡正反兩面圖片：
 *   - 未拍到（!capture）：正面插圖鎖定（null），不可反轉。
 *   - 已拍到（capture）：正面永遠解鎖顯示插圖（frontIllustrationUrl）；
 *     反轉後預設顯示用戶自己拍的原相（photo_original_url），並可切換或生成去背貼圖（stickerUrl）。
 */
export function resolveCardFaces(
  capture: CaptureRecord | undefined,
  illustrationUrl: string | null | undefined,
  requestedBackKind: BackMediaKind = 'photo',
): ResolvedCardFaces {
  if (!capture) {
    return {
      isUnlocked: false,
      frontIllustrationUrl: null,
      originalPhotoUrl: null,
      celPhotoUrl: null,
      stickerUrl: null,
      canFlip: false,
      canGenerateSticker: false,
      backUrl: null,
      activeBackKind: 'photo',
    };
  }

  const originalPhotoUrl = capture.photo_original_url ?? null;
  const celPhotoUrl = capture.photo_cel_url ?? null;
  const stickerUrl = capture.bestStats?.stickerUrl ?? capture.stats?.stickerUrl ?? null;
  const canFlip = Boolean(originalPhotoUrl || celPhotoUrl || stickerUrl);
  const canGenerateSticker = Boolean(originalPhotoUrl);

  let activeBackKind: BackMediaKind = 'photo';
  let backUrl: string | null = null;

  if (requestedBackKind === 'sticker' && stickerUrl) {
    activeBackKind = 'sticker';
    backUrl = stickerUrl;
  } else if (requestedBackKind === 'cel' && celPhotoUrl) {
    activeBackKind = 'cel';
    backUrl = celPhotoUrl;
  } else if (originalPhotoUrl) {
    activeBackKind = 'photo';
    backUrl = originalPhotoUrl;
  } else if (celPhotoUrl) {
    activeBackKind = 'cel';
    backUrl = celPhotoUrl;
  } else if (stickerUrl) {
    activeBackKind = 'sticker';
    backUrl = stickerUrl;
  }

  return {
    isUnlocked: true,
    frontIllustrationUrl: illustrationUrl ?? null,
    originalPhotoUrl,
    celPhotoUrl,
    stickerUrl,
    canFlip,
    canGenerateSticker,
    backUrl,
    activeBackKind,
  };
}
