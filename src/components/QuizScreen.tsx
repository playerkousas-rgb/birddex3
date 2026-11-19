import { useMemo, useState } from 'react';
import {
  ArrowLeft, Camera, ChevronRight, ExternalLink, HelpCircle, Image as ImageIcon,
  RotateCcw, Search, Sparkles, Target,
} from 'lucide-react';
import type { BeakShape, BirdSize, BirdSpecies, MainColor, QuizAnswers, QuizSession, SpotKind } from '../types';
import { BIRD_SPECIES, getBirdById } from '../data/birdData';
import { resolveBirdId } from '../data/nameAliases';
import {
  BEAK_OPTIONS, COLOR_OPTIONS, INITIAL_PAGE, PAGE_SIZE, SIZE_OPTIONS,
  candidateResult, answerCount, MIN_ANSWERS,
} from '../lib/birdFilter';
import { SPOT_OPTIONS, getSpot } from '../data/quizTraits';
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

/** 情境用電筒／眼睇得到嘅描述，唔用鳥類學術語 */
const SPOT_HINT: Record<SpotKind, { emoji: string; hint: string }> = {
  '水中游': { emoji: '🦆', hint: '浮喺水面游' },
  '水邊行': { emoji: '🦩', hint: '企喺水邊／泥灘' },
  '海面飛': { emoji: '🌊', hint: '海上面飛' },
  '天空飛': { emoji: '🕊️', hint: '半空飛過' },
  '樹上': { emoji: '🌳', hint: '樹枝／樹叢' },
  '地面': { emoji: '🌾', hint: '地上行／跳' },
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
  const chips: Array<{ label: string; ok: boolean }> = [];
  if (answers.size) chips.push({ label: `📏 ${bird.size}`, ok: bird.size === answers.size });
  if (answers.main_color) chips.push({ label: `🎨 ${bird.main_color}`, ok: bird.main_color === answers.main_color });
  if (answers.spot) {
    const spot = getSpot(bird);
    chips.push({ label: `📍 ${spot}`, ok: spot === answers.spot });
  }
  if (answers.beak) chips.push({ label: `${BEAK_EMOJI[bird.beak]} ${bird.beak}`, ok: bird.beak === answers.beak });

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
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [merlinOpen, setMerlinOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE);

  const answered = answerCount(answers);
  const ready = answered >= MIN_ANSWERS;
  const result = useMemo(
    () => (ready ? candidateResult(BIRD_SPECIES, answers) : null),
    [ready, answers],
  );
  const candidates = result?.birds ?? [];
  const queryResults = useMemo(() => resolveManualQuery(query), [query]);

  const setAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    setSelectedId(null);
    setVisibleCount(INITIAL_PAGE);
    setAnswers(prev => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const restart = () => {
    setAnswers({});
    setSelectedId(null);
    setVisibleCount(INITIAL_PAGE);
  };

  const openMerlin = () => {
    setMerlinOpen(true);
    window.open(MERLIN_URL, '_blank', 'noopener');
  };

  const waterHint = answers.spot && answers.main_color === '白' && ['水中游', '水邊行', '海面飛'].includes(answers.spot);

  return (
    <div className="min-h-full bg-dex-bg pb-28 relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dex-bg/95 backdrop-blur-md border-b border-dex-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-dex-surface border border-dex-border flex items-center justify-center text-dex-text shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-dex-text leading-tight">答幾條，對返你張相</h1>
            <p className="text-[11px] text-dex-muted">
              {ready
                ? `答咗 ${answered} 條 · 答案一改，下面即刻重新排`
                : `答夠 ${MIN_ANSWERS} 條就出候選卡（最少要 2 條）`}
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
                <span className="w-7 h-7 rounded-full border border-white/30" style={{ background: COLOR_DOT[color] }} />
                <span className="text-xs font-black text-dex-text">{color}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Q3 喺邊度見到（取代舊版「似邊一類」同「條尾點樣」） */}
        <section>
          <h2 className="text-base font-black text-dex-text mb-1">你喺邊度見到佢？</h2>
          <p className="text-[10px] text-dex-muted mb-2">呢題最幫到手 — 影相時一定知佢喺邊</p>
          <div className="grid grid-cols-2 gap-2">
            {SPOT_OPTIONS.map(spot => (
              <button
                key={spot}
                onClick={() => setAnswer('spot', spot)}
                className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                  answers.spot === spot ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-surface'
                }`}
              >
                <div className="text-sm font-black text-dex-text">{SPOT_HINT[spot].emoji} {spot}</div>
                <div className="text-[10px] text-dex-muted">{SPOT_HINT[spot].hint}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Q4 嘴形（選填） */}
        <section>
          <h2 className="text-base font-black text-dex-text mb-1">佢個嘴係點？<span className="text-dex-muted text-xs font-bold ml-1">唔知可以唔答</span></h2>
          <div className="grid grid-cols-4 gap-2">
            {BEAK_OPTIONS.map(beak => (
              <button
                key={beak}
                onClick={() => setAnswer('beak', answers.beak === beak ? undefined : beak)}
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

        {/* 候選卡：答夠 2 條即出，唔使等答完 */}
        {result && (
          <section>
            <div className="flex items-start gap-2 mb-3 text-[11px] text-dex-muted">
              <Target size={13} className="text-dex-neon shrink-0 mt-0.5" />
              <span>
                {!result.exact ? (
                  <>冇雀 {answered} 個特徵全中 — 以下係最接近嘅 {candidates.length} 隻</>
                ) : result.lowestHits < result.totalAnswered ? (
                  <>
                    有 <b className="text-dex-text">{result.poolSize}</b> 隻全中；後面補埋差一格嘅近似雀
                    {waterHint ? '（白鷺一家都喺名單）' : ''}
                  </>
                ) : (
                  <>
                    有 <b className="text-dex-text">{result.poolSize}</b> 隻符合你答嘅 {answered} 個特徵
                    {waterHint ? '（白鷺一家都喺名單）' : ''}
                  </>
                )}
              </span>
            </div>

            {result.warnings.map(warning => (
              <div key={warning.message} className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800">
                {warning.message}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              {candidates.slice(0, visibleCount).map(bird => (
                <CandidateCard
                  key={bird.id}
                  bird={bird}
                  answers={answers}
                  selected={selectedId === bird.id}
                  onSelect={() => setSelectedId(bird.id)}
                />
              ))}
            </div>

            {visibleCount < candidates.length && (
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="w-full py-3 mt-3 rounded-xl border border-dex-border bg-dex-surface text-dex-text text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ImageIcon size={13} /> 顯示更多（仲有 {candidates.length - visibleCount} 隻）
              </button>
            )}

            {candidates.length === 0 && (
              <p className="text-center text-xs text-dex-muted py-6">未有雀夾到，試下改上面任何一格。</p>
            )}

            <div className="flex items-center justify-center gap-2 my-4 text-[10px] text-dex-muted">
              <span>轉答案就會即時重排；搵唔到先用下面「重答」或 Merlin／NO. 編號</span>
            </div>
          </section>
        )}

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

        {answered > 0 && (
          <button
            onClick={restart}
            className="w-full py-2.5 rounded-xl border border-dex-border text-dex-muted text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} /> 重答
          </button>
        )}

        {!ready && (
          <div className="sticky bottom-20 z-20">
            <div className="w-full py-4 rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 bg-dex-surface text-dex-muted border border-dex-border">
              <Sparkles size={16} />
              再答多 {MIN_ANSWERS - answered} 條就出候選卡
            </div>
          </div>
        )}
      </div>

      {/* 揀中 → 拍到 */}
      {ready && (
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
