import { useMemo, useState } from 'react';
import {
  ArrowLeft, Camera, ChevronRight, ExternalLink, HelpCircle, Image as ImageIcon,
  RotateCcw, Search, Sparkles, Target,
} from 'lucide-react';
import type { BeakShape, BirdSize, BirdSpecies, BirdType, MainColor, QuizAnswers, QuizSession, TailStyle } from '../types';
import { BIRD_SPECIES, getBirdById } from '../data/birdData';
import { resolveBirdId } from '../data/nameAliases';
import { BEAK_OPTIONS, COLOR_OPTIONS, SIZE_OPTIONS, candidateResult, MAX_CANDIDATES } from '../lib/birdFilter';
import { TAIL_OPTIONS, TYPE_OPTIONS } from '../data/quizTraits';
import { birdNo } from '../lib/aviandex';

interface QuizScreenProps {
  session: QuizSession;
  onBack: () => void;
  /** 小朋友自己對卡揀中 → 上級直接生成賽璐璐卡並拍攝 */
  onPick: (speciesId: number) => void;
  /** 生成賽璐璐卡中：GO 鈕出 loading，唔畀重複撳 */
  picking?: boolean;
}

const MERLIN_URL = 'https://merlin.allaboutbirds.org';

const SIZE_HINT: Record<BirdSize, { emoji: string; hint: string }> = {
  '細': { emoji: '🐦', hint: '麻雀咁細' },
  '中': { emoji: '🕊️', hint: '白鴿咁大' },
  '大': { emoji: '🦅', hint: '烏鴉／鷹咁大' },
};

const COLOR_DOT: Record<MainColor, string> = {
  '黑白': 'linear-gradient(135deg, #111 50%, #f5f5f5 50%)',
  '白': '#f5f5f5',
  '黑': '#151515',
  '啡棕': '#8a5a2b',
  '灰': '#9aa0a6',
  '綠藍': 'linear-gradient(135deg, #16a34a, #2563eb)',
  '紅黃': 'linear-gradient(135deg, #dc2626, #f59e0b)',
};

const BEAK_EMOJI: Record<BeakShape, string> = { '尖': '📌', '長': '🥢', '闊': '🦆', '鉤': '🪝' };

const TYPE_HINT: Record<BirdType, string> = {
  '水鳥': '🦆 游水／浮水面', '海鳥': '🌊 海邊盤旋',
  '涉禽': '🦶 長腳企水邊', '猛禽': '🦅 鉤嘴利爪',
  '陸鳥': '🐔 地面／林下', '飛行鳥': '🕊️ 空中飛得快',
  '鶲類': '🪰 捕蟲小鳥', '柳鶯': '🌿 幼細柳枝雀',
  '蘆鶯': '🌾 蘆葦叢雀', '雀鳥': '🐤 食籽小雀',
  '鶇鶥': '🐦 較圓身鳴禽', '其他鳥': '❓ 唔肯定先揀呢個',
};

const TAIL_HINT: Record<TailStyle, string> = {
  '叉尾': '像燕仔開叉', '尖長尾': '幼幼長長',
  '短圓尾': '短短圓圓', '扇尾': '打開似扇', '中尾': '唔長唔短',
};

/** 手動揀 NO.：編號 → 精確別名（Merlin 認完嘅學名/英文名）→ 名稱包含搜尋 */
function resolveManualQuery(query: string): BirdSpecies[] {
  const text = query.trim();
  if (!text) return [];
  const digits = text.replace(/\D/g, '');
  if (digits && digits.length <= 4) {
    const byNo = getBirdById(Number(digits));
    if (byNo) return [byNo];
  }
  const exactId = resolveBirdId(text);
  const exact = exactId !== undefined ? getBirdById(exactId) : undefined;
  const lower = text.toLowerCase();
  const partial = BIRD_SPECIES.filter(b =>
    b.name.includes(text) ||
    b.nameEn.toLowerCase().includes(lower) ||
    b.scientificName.toLowerCase().includes(lower)
  ).slice(0, 6);
  if (exact) return [exact, ...partial.filter(b => b.id !== exact.id)].slice(0, 6);
  return partial;
}

function CandidateCard({
  bird, answers, selected, onSelect,
}: {
  bird: BirdSpecies;
  answers: QuizAnswers;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const chips: Array<{ label: string; ok: boolean }> = [
    { label: `📏 ${bird.size}`, ok: bird.size === answers.size },
    { label: `🎨 ${bird.main_color}`, ok: bird.main_color === answers.main_color },
    { label: `${BEAK_EMOJI[bird.beak]} ${bird.beak}`, ok: bird.beak === answers.beak },
  ];
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98] border-2 ${
        selected ? 'border-dex-neon bg-dex-neon/5' : 'border-dex-border bg-dex-surface'
      }`}
    >
      <div className="relative aspect-square bg-black/40">
        {bird.photoUrl && !imgFailed ? (
          <img
            src={bird.photoUrl}
            alt={bird.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-70">{bird.emoji}</div>
        )}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-dex-neon text-[10px] font-black">
          NO.{birdNo(bird.id)}
        </div>
        {selected && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-dex-neon text-dex-ink text-[10px] font-black">
            ✓ 揀咗
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="text-sm font-black text-dex-text leading-tight truncate">{bird.name}</div>
        <div className="text-[10px] text-dex-muted truncate">{bird.nameEn}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {chips.map(chip => (
            <span
              key={chip.label}
              className={`px-1 py-0.5 rounded text-[9px] font-bold border ${
                chip.ok
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
                  : 'bg-dex-bg border-dex-border text-dex-muted'
              }`}
            >
              {chip.ok ? '✓ ' : '· '}{chip.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export function QuizScreen({ session, onBack, onPick, picking = false }: QuizScreenProps) {
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [phase, setPhase] = useState<'questions' | 'candidates'>('questions');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [merlinOpen, setMerlinOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);

  const complete = !!(answers.size && answers.main_color && answers.beak && answers.birdType && answers.tail);
  const queryResults = useMemo(() => resolveManualQuery(query), [query]);
  const result = useMemo(() => {
    if (!complete) return { birds: [], exact: false, truncated: false };
    return candidateResult(BIRD_SPECIES, answers as QuizAnswers);
  }, [complete, answers]);
  const candidates = phase === 'candidates' ? result.birds : [];

  const setAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const openMerlin = () => {
    setMerlinOpen(true);
    window.open(MERLIN_URL, '_blank', 'noopener');
  };

  return (
    <div className="min-h-full bg-dex-bg pb-28 relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dex-bg/95 backdrop-blur-md border-b border-dex-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (phase === 'candidates' ? setPhase('questions') : onBack())}
            className="w-10 h-10 rounded-full bg-dex-surface border border-dex-border flex items-center justify-center text-dex-text shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-dex-text leading-tight">
              {phase === 'questions' ? '答 5 條問題，對返你張相' : '邊隻最似你影嗰隻？'}
            </h1>
            <p className="text-[11px] text-dex-muted">
              {phase === 'questions'
                ? `已答 ${[answers.size, answers.main_color, answers.beak, answers.birdType, answers.tail].filter(Boolean).length} / 5 · 答完最多 3 頁，揀你認為見到嗰隻`
                : '最後決定權喺你手上 · 揀中先算拍到'}
            </p>
          </div>
        </div>
      </div>

      {/* 證據相（原相唔會改） */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl overflow-hidden border border-dex-border bg-dex-surface relative">
          <img src={session.photoDataUrl} alt="你影嘅原相（證據）" className="w-full max-h-52 object-contain bg-black/60" />
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/70 border border-white/15 text-[10px] font-bold text-white">
            <Camera size={11} className="text-dex-neon" /> 原相＝證據 · 就係要對呢張
          </div>
        </div>
      </div>

      {phase === 'questions' && (
        <div className="px-4 pt-4 space-y-5">
          {/* Q1 大小 */}
          <section>
            <h2 className="text-base font-black text-dex-text mb-2.5">佢有幾大？</h2>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map(size => (
                <button
                  key={size}
                  onClick={() => setAnswer('size', size)}
                  className={`rounded-xl border-2 p-3 text-center transition ${
                    answers.size === size ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                  }`}
                >
                  <div className="text-2xl">{SIZE_HINT[size].emoji}</div>
                  <div className="text-sm font-black text-dex-text mt-1">{size}</div>
                  <div className="text-[10px] text-dex-muted">{SIZE_HINT[size].hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Q2 主色 */}
          <section>
            <h2 className="text-base font-black text-dex-text mb-2.5">佢咩色為主？</h2>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  onClick={() => setAnswer('main_color', color)}
                  className={`rounded-xl border-2 p-2.5 flex flex-col items-center gap-1.5 transition ${
                    answers.main_color === color ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full border border-white/30"
                    style={{ background: COLOR_DOT[color] }}
                  />
                  <span className="text-xs font-black text-dex-text">{color}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Q3 嘴形 */}
          <section>
            <h2 className="text-base font-black text-dex-text mb-2.5">佢個嘴係點？</h2>
            <div className="grid grid-cols-4 gap-2">
              {BEAK_OPTIONS.map(beak => (
                <button
                  key={beak}
                  onClick={() => setAnswer('beak', beak)}
                  className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition ${
                    answers.beak === beak ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                  }`}
                >
                  <span className="text-2xl">{BEAK_EMOJI[beak]}</span>
                  <span className="text-sm font-black text-dex-text">{beak}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Q4 體態／類群：將最大組再拆幼，保持全中 ≤ 26 隻 */}
          <section>
            <h2 className="text-base font-black text-dex-text mb-1">佢似邊一類？</h2>
            <p className="text-[10px] text-dex-muted mb-2">唔肯定揀「其他鳥」都得，之後仲可以手動揀 NO.</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(type => (
                <button
                  key={type}
                  onClick={() => setAnswer('birdType', type)}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                    answers.birdType === type ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                  }`}
                >
                  <div className="text-sm font-black text-dex-text">{TYPE_HINT[type]}</div>
                  <div className="text-[10px] text-dex-muted">{type}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Q5 尾形：最後一刀，將「細／啡棕／尖」柳鶯組再拆開 */}
          <section>
            <h2 className="text-base font-black text-dex-text mb-2.5">佢條尾點樣？</h2>
            <div className="grid grid-cols-3 gap-2">
              {TAIL_OPTIONS.map(tail => (
                <button
                  key={tail}
                  onClick={() => setAnswer('tail', tail)}
                  className={`rounded-xl border-2 p-2.5 text-center transition ${
                    answers.tail === tail ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                  }`}
                >
                  <div className="text-sm font-black text-dex-text">{tail}</div>
                  <div className="text-[10px] text-dex-muted">{TAIL_HINT[tail]}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Merlin 後備（細掣，唔係主流） */}
          <div className="pt-1">
            <button
              onClick={openMerlin}
              className="inline-flex items-center gap-1.5 text-[11px] text-dex-muted underline decoration-dotted underline-offset-2 hover:text-dex-text"
            >
              <HelpCircle size={12} />
              唔肯定？試下用 Merlin 影相認
              <ExternalLink size={11} />
            </button>
            {merlinOpen && (
              <div className="mt-2 rounded-xl border border-dex-border bg-dex-surface p-3">
                <p className="text-[11px] text-dex-muted mb-2">
                  Merlin 認到之後，返嚟 BirdEx 揀返 NO. 編號就得：
                </p>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dex-muted" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="輸入 NO. 編號或鳥名，如 0008 / 鵲鴝 / magpie"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-dex-surface border border-dex-border text-sm text-dex-text placeholder-dex-muted focus:outline-none focus:border-dex-neon/60"
                  />
                </div>
                {queryResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {queryResults.map(bird => (
                      <button
                        key={bird.id}
                        onClick={() => onPick(bird.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-dex-surface border border-dex-border text-left active:bg-dex-neon/10"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-dex-text truncate">{bird.name}</span>
                          <span className="block text-[10px] text-dex-muted truncate">NO.{birdNo(bird.id)} · {bird.nameEn}</span>
                        </span>
                        <ChevronRight size={16} className="text-dex-neon shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 答完 → 彈候選 */}
          <div className="sticky bottom-20 z-20">
            <button
              disabled={!complete}
              onClick={() => { setSelectedId(null); setVisibleCount(12); setPhase('candidates'); }}
              className={`w-full py-4 rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 shadow-lg transition ${
                complete
                  ? 'bg-dex-neon text-dex-ink active:scale-[0.98]'
                  : 'bg-dex-surface text-dex-muted border border-dex-border'
              }`}
            >
              {complete ? (
                <>
                  <Target size={18} />
                  彈出候選卡（{result.birds.length} 隻）
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  五條問題都未答完
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {phase === 'candidates' && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-3 text-[11px] text-dex-muted">
            <ImageIcon size={13} className="text-dex-neon shrink-0" />
            <span>
              上圖係你嘅原相；{result.exact
                ? `以下 ${candidates.length} 隻全部符合你答嘅 5 個特徵（常見嘅排前面）`
                : `冇雀 5 項全中，以下係最接近嘅 ${candidates.length} 隻${result.truncated ? `（最多 ${MAX_CANDIDATES} 隻）` : ''}`} — 對吓形、嘴同尾
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {candidates.slice(0, visibleCount).map(bird => (
              <CandidateCard
                key={bird.id}
                bird={bird}
                answers={answers as QuizAnswers}
                selected={selectedId === bird.id}
                onSelect={() => setSelectedId(bird.id)}
              />
            ))}
          </div>

          {visibleCount < candidates.length && (
            <button
              onClick={() => setVisibleCount(v => v + 12)}
              className="w-full py-3 mt-3 rounded-xl border border-dex-border bg-dex-surface text-dex-text text-xs font-bold"
            >
              顯示更多（仲有 {candidates.length - visibleCount} 隻）
            </button>
          )}

          <div className="flex items-center justify-center gap-2 my-4 text-[10px] text-dex-muted">
            <span>搵唔到？按下方「重答」改答案，或用 Merlin／NO. 編號手動揀</span>
          </div>
          <button
            onClick={() => setPhase('questions')}
            className="w-full py-2.5 rounded-xl border border-dex-border text-dex-muted text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} /> 重答五條問題
          </button>
        </div>
      )}

      {/* 揀中 → 拍到 */}
      {phase === 'candidates' && (
        <div className="sticky bottom-0 z-30 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-dex-bg border-t border-dex-border">
          <button
            type="button"
            disabled={selectedId === null || picking}
            onClick={() => selectedId !== null && onPick(selectedId)}
            className={`w-full py-4 rounded-2xl font-black tracking-wide text-base flex items-center justify-center gap-2 shadow-lg transition ${
              selectedId !== null && !picking
                ? 'bg-dex-neon text-dex-ink active:scale-[0.98]'
                : 'bg-dex-surface text-dex-muted border border-dex-border'
            }`}
          >
            {picking ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-dex-muted border-t-dex-neon animate-spin" aria-hidden="true" />
                生成賽璐璐卡…
              </>
            ) : selectedId !== null ? '就係呢隻！快門一按 📸' : '先揀一張最似嘅卡'}
          </button>
        </div>
      )}
    </div>
  );
}
