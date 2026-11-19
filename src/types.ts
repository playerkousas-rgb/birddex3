export type Rarity = 'UC' | 'C' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR';

// ---- 快門版：五問對卡特徵（由 scripts/sync_from_aviandex.py 推導，全表必填）----
export type BirdSize = '細' | '中' | '大';
export type MainColor = '黑白' | '白' | '黑' | '啡棕' | '灰' | '綠藍' | '紅黃';
export type BeakShape = '尖' | '長' | '闊' | '鉤';
/** 舊版 Q4 鳥類學術語分類，只保留型別畀舊資料／深層連結相容；UI 已改用 SpotKind。 */
export type BirdType = '水鳥' | '海鳥' | '涉禽' | '猛禽' | '陸鳥' | '飛行鳥' | '鶲類' | '柳鶯' | '蘆鶯' | '雀鳥' | '鶇鶥' | '其他鳥';
/** 舊版 Q5 尾形，同上：只留型別，唔再由 UI 提問。 */
export type TailStyle = '叉尾' | '尖長尾' | '短圓尾' | '扇尾' | '中尾';
/** 「你喺邊度見到佢？」— 影相時睇得到嘅情境，89 個科全部有歸屬。 */
export type SpotKind = '水中游' | '水邊行' | '海面飛' | '天空飛' | '樹上' | '地面';

/**
 * 小朋友答嘅問題。新版只需 3 題（大細／主色／喺邊度見到）就已經出候選，
 * 嘴形係選填（見到先答）；spot 係舊版答案，用嚟計分提示，唔會硬 filter。
 */
export interface QuizAnswers {
  size?: BirdSize;
  main_color?: MainColor;
  beak?: BeakShape;
  spot?: SpotKind;
}

/** 影完相、未答問題之前的暫存（張相只係證據，唔係俾 AI 睇） */
export interface QuizSession {
  photoDataUrl: string;
  location: { lat: number; lng: number } | null;
  zoom: number;
}

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

  size: BirdSize;          // 細 / 中 / 大（過濾用，唔係 cm）
  main_color: MainColor;   // 主色（過濾用）
  beak: BeakShape;         // 嘴形（過濾用）
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
  catchDistance: number; // 拍攝時 zoom 倍率
  // Sticker
  stickerUrl?: string | null; // 去背 PNG dataURL

  // 每次拍攝的觀鳥足跡（可選；舊紀錄未必有，唔影響相容）
  capturedAt?: string;                       // 呢一筆拍攝時間
  location?: { lat: number; lng: number } | null; // 呢一筆拍攝地點
}

export interface CaptureRecord {
  speciesId: number;
  no: string;              // NO. NNNN — 與 AvianDex 共用的圖鑑編號（'0008'）
  method: 'photo';         // 拍攝方式：影相（本版唯一方式）
  capturedAt: string;     // ISO date（＝ interchange 嘅 captured_at）
  count: number;        // total captures
  currentRarity: Rarity;
  firstCaptureDate: string;
  lastCaptureDate: string;
  location?: { lat: number; lng: number } | null;
  photo_original_url?: string | null; // 原相 = 證據（小朋友自己影嘅真相，唔會改）
  photo_cel_url?: string | null;      // 賽璐璐版 = 精靈卡（前端 Canvas 即時生成，預設顯示）

  // v3 CatchCat
  stats?: CaptureStats; // 最新一次拍攝的個體數值
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
  record: CaptureRecord | null; // 如果是 null 代表拍攝失敗
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

export type View = 'scanner' | 'dex' | 'album' | 'profile' | 'detail' | 'capture-result' | 'audio' | 'map' | 'battle' | 'throw' | 'quiz';

// Throw game
export interface ThrowSession {
  speciesId: number;
  species: BirdSpecies;
  photoDataUrl: string;
  location?: { lat: number; lng: number } | null;
  analyzeResult: RecognizeResult;
  zoomLevel: number;
}
