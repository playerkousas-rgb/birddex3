export type Rarity = 'UC' | 'C' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR';

export interface Hotspot {
  name: string;
  nameEn?: string;
  lat: number;
  lng: number;
  region: 'hk' | 'world';
  subregion?: string;
  frequency: 'high' | 'medium' | 'low';
  season?: string;
}

export interface BirdSpecies {
  id: number;
  name: string;           // 中文
  nameEn: string;         // English common name
  nameYue?: string;       // 粵語俗名
  scientificName: string;
  family: string;
  familyEn?: string;
  order?: string;

  size: string;
  habitat: string[];
  diet: string;
  features: string;
  funFact: string;
  funFactEn?: string;
  description: string;

  region: string;
  season: string;
  hotspots: Hotspot[];
  globalRange: string[];

  baseColor: string;
  emoji: string;
  call: string;
  tags: string[];

  aiRecognizable: boolean;
  aiConfidence?: number;
  merlinCode?: string;
  ebirdCode?: string;

  photoUrl?: string | null;
  illustrationUrl?: string | null;
  audioUrl?: string | null;

  notionId?: string;
  lastUpdated?: number;
  pack: number;
}

// --- CatchCat-style 個體值系統 ---
export type Nature = 
  | '勇敢' | '膽小' | '活潑' | '冷靜' | '溫和' | '急躁' 
  | '害羞' | '頑皮' | '穩重' | '機靈';

export type PersonalityTrait = 
  | '愛鳴唱' | '愛覓食' | '愛飛翔' | '愛群聚' | '獨行俠'
  | '晨型鳥' | '夜貓子' | '好奇寶寶' | '警戒心高' | '親人';

export interface BirdIV {
  hp: number;      // 體力 0-31
  atk: number;     // 攻擊 0-31
  def: number;     // 防禦 0-31
  spd: number;     // 速度 0-31
  sta: number;     // 耐力 0-31
  total: number;   // 總和
  percent: number; // IV% 0-100
}

export interface CaptureStats {
  iv: BirdIV;
  nature: Nature;
  trait: PersonalityTrait;
  cp: number;           // 戰鬥力
  sizeVariant: 'XS' | 'S' | 'M' | 'L' | 'XL'; // 體型
  isShiny: boolean;     // 色異個體 ~1/512
  catchScore: 'Nice' | 'Great' | 'Excellent' | null;
  catchDistance: number; // 捕捉時 zoom 倍率
  // Sticker
  stickerUrl?: string | null; // 去背 PNG dataURL
}

export interface CaptureRecord {
  speciesId: number;
  capturedAt: string;     // ISO date
  count: number;        // total captures
  currentRarity: Rarity;
  firstCaptureDate: string;
  lastCaptureDate: string;
  location?: { lat: number; lng: number } | null;
  photoDataUrl?: string | null; // 使用者拍的照片
  
  // v3 CatchCat
  stats?: CaptureStats; // 最新一次捕捉的個體數值
  bestStats?: CaptureStats; // 歷史最佳個體
  allCatches?: CaptureStats[]; // 所有個體記錄
}

export interface TrainerProfile {
  name: string;
  xp: number;
  level: number;
  title: string;
  totalCaptures: number;
  uniqueSpecies: number;
  joinedAt: string;
  avatar?: string;
}

export interface RecognizeResult {
  label: string;
  score: number;
  scientific?: string;
}

export interface CaptureResult {
  record: CaptureRecord | null; // 如果是 null 代表捕捉失敗
  isNew: boolean;
  oldRarity: Rarity;
  newRarity: Rarity;
  xpGained: number;
  species: BirdSpecies | null;
  failed?: boolean; // 失敗標記
  failReason?: string; // 失敗原因文字
  failKind?: 'not-bird' | 'low-confidence' | 'not-in-dex' | 'escaped'; // 失敗種類，控制背景
  // v3
  captureStats?: CaptureStats;
  isBestIndividual?: boolean;
}

export type View = 'scanner' | 'dex' | 'album' | 'profile' | 'detail' | 'capture-result' | 'audio' | 'map' | 'battle' | 'throw';

// Throw game
export interface ThrowSession {
  speciesId: number;
  species: BirdSpecies;
  photoDataUrl: string;
  location?: { lat: number; lng: number } | null;
  analyzeResult: RecognizeResult;
  zoomLevel: number;
}
