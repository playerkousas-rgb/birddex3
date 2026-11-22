import { useMemo, useState } from 'react';
import {
  ArrowLeft, Camera, ChevronRight, ExternalLink, HelpCircle,
  RotateCcw, Search,
} from 'lucide-react';
import type { BeakShape, BirdSize, BirdSpecies, MainColor, QuizAnswers, QuizSession, ShapeKind } from '../types';
import { BIRD_SPECIES, getBirdById } from '../data/birdData';
import { resolveBirdId } from '../data/nameAliases';
import {
  BEAK_OPTIONS, COLOR_OPTIONS, SIZE_OPTIONS, SHORTLIST_SIZE,
  candidateResult, answerCount, chooseNextFollowupQuestion, FOLLOWUP_THRESHOLD,
} from '../lib/birdFilter';
import { SHAPE_OPTIONS, getShape } from '../data/quizTraits';
import { getFollowupQuestion } from '../data/quizObservations';
import type { FollowupKey } from '../data/quizObservations';
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
type BaseAnswerKey = 'size' | 'main_color' | 'shape' | 'beak';
const BASE_ANSWER_KEYS = new Set<BaseAnswerKey>(['size', 'main_color', 'shape', 'beak']);

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

const COLOR_HINT: Record<MainColor, string> = {
  '黑白': '斑紋', '白': '白／淺色', '黑': '黑／深色', '啡棕': '啡／棕',
  '灰': '灰／藍灰', '綠藍': '綠／藍／頸光', '紅黃': '紅／橙／黃',
};

const BEAK_EMOJI: Record<BeakShape, string> = { '尖': '📌', '長': '🥢', '闊': '🦆', '鉤': '🪝' };
const BEAK_HINT: Record<BeakShape, string> = {
  '尖': '細尖直嘴', '長': '長嘴', '闊': '扁闊嘴', '鉤': '鉤嘴／猛禽利爪',
};

/** 身形：用剪影＋一句廣東話，全部係張相一眼睇得到嘅外形 */
const SHAPE_HINT: Record<ShapeKind, { glyph: string; hint: string }> = {
  '長頸長腳': { glyph: '🦩', hint: '長頸＋長腳企水邊' },
  '游水肥矮': { glyph: '🦆', hint: '矮身浮喺水面' },
  '長翼海鳥': { glyph: '🕊️', hint: '尖長翼飛海面' },
  '鉤嘴猛禽': { glyph: '🦅', hint: '鉤嘴利爪盤旋' },
  '細細粒': { glyph: '🐤', hint: '麻雀咁細粒' },
  '中等鳥身': { glyph: '🐦', hint: '普通雀仔身形' },
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
  const shape = getShape(bird);
  const chips: Array<{ label: string; ok?: boolean }> = [
    { label: `📏 ${bird.size}`, ok: answers.size ? bird.size === answers.size : undefined },
    { label: `🎨 ${bird.main_color}`, ok: answers.main_color ? bird.main_color === answers.main_color : undefined },
    { label: `${SHAPE_HINT[shape].glyph} ${shape}`, ok: answers.shape ? shape === answers.shape : undefined },
  ];
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
                chip.ok === true
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
                  : chip.ok === false
                    ? 'bg-dex-bg border-dex-border text-dex-muted'
                    : 'bg-dex-bg/70 border-dex-border/70 text-dex-muted'
              }`}
            >
              {chip.ok === true ? '✓ ' : chip.ok === false ? '· ' : ''}{chip.label}
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
  const [candidatePage, setCandidatePage] = useState(0);
  const [baseQuestionsTouched, setBaseQuestionsTouched] = useState<Set<BaseAnswerKey>>(new Set());
  const [skippedFollowups, setSkippedFollowups] = useState<FollowupKey[]>([]);

  const answered = answerCount(answers);
  const result = useMemo(() => candidateResult(BIRD_SPECIES, answers), [answers]);
  const candidates = result?.birds ?? [];
  const filteredCount = result?.exact ? result.poolSize : candidates.length;
  const nextFollowupKey = useMemo(() => baseQuestionsTouched.size === BASE_ANSWER_KEYS.size
    ? chooseNextFollowupQuestion(BIRD_SPECIES, answers, skippedFollowups)
    : null, [answers, baseQuestionsTouched, skippedFollowups]);
  const nextFollowup = nextFollowupKey ? getFollowupQuestion(nextFollowupKey) : null;
  const pageCount = Math.max(1, Math.ceil(candidates.length / SHORTLIST_SIZE));
  const visibleCandidates = candidates.slice(candidatePage * SHORTLIST_SIZE, (candidatePage + 1) * SHORTLIST_SIZE);
  const queryResults = useMemo(() => resolveManualQuery(query), [query]);

  const setAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K] | undefined) => {
    setSelectedId(null);
    setCandidatePage(0);
    if (BASE_ANSWER_KEYS.has(key as BaseAnswerKey)) {
      setBaseQuestionsTouched(prev => new Set([...prev, key as BaseAnswerKey]));
      setSkippedFollowups([]);
    }
    setAnswers(prev => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const skipFollowup = (key: FollowupKey) => {
    setSkippedFollowups(prev => prev.includes(key) ? prev : [...prev, key]);
    setCandidatePage(0);
  };

  const restart = () => {
    setAnswers({});
    setSelectedId(null);
    setCandidatePage(0);
    setBaseQuestionsTouched(new Set());
    setSkippedFollowups([]);
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
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-dex-surface border border-dex-border flex items-center justify-center text-dex-text shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-dex-text leading-tight">揀一張最似你相中嘅雀</h1>
            <p className="text-[11px] text-dex-muted">唔使識雀名；線索可選，唔肯定就跳過</p>
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
        {/* 用引導觀察代替考鳥名：問題先出，答案只用來縮短候選 */}
        <section className="rounded-2xl border border-dex-border bg-dex-surface px-3 py-4 space-y-5" aria-labelledby="clue-heading">
          <div>
            <h2 id="clue-heading" className="text-base font-black text-dex-text">回想一下：剛才看到的鳥有咩外貌？</h2>
            <p className="mt-1 text-[11px] text-dex-muted leading-relaxed">
              依次留意體型、顏色、嘴和腳。唔使識雀名；睇得出幾多就揀幾多，唔肯定可以跳過。
            </p>
          </div>

            {/* Q1 大小 */}
            <section>
              <h3 className="text-sm font-black text-dex-text mb-2">大概同邊隻熟悉雀一樣大？</h3>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map(size => (
                  <button
                    key={size}
                    onClick={() => setAnswer('size', size)}
                    aria-pressed={answers.size === size}
                    className={`rounded-xl border-2 p-2.5 text-center transition ${
                      answers.size === size ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-bg'
                    }`}
                  >
                    <div className="text-2xl">{SIZE_HINT[size].emoji}</div>
                    <div className="text-xs font-black text-dex-text mt-1">{SIZE_HINT[size].hint}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setAnswer('size', undefined)} className="mt-2 min-h-9 px-3 rounded-lg text-[11px] font-bold text-dex-muted border border-dex-border">
                唔肯定，跳過
              </button>
            </section>

            {/* Q2 顏色 */}
            <section>
              <h3 className="text-sm font-black text-dex-text mb-1">最搶眼係咩顏色？</h3>
              <p className="text-[10px] text-dex-muted mb-2">揀大概就得；混色、反光或者睇唔清都可以跳過。</p>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAnswer('main_color', color)}
                    aria-pressed={answers.main_color === color}
                    className={`min-h-[76px] rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-1.5 transition ${
                      answers.main_color === color ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-bg'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full border border-white/30" style={{ background: COLOR_DOT[color] }} />
                    <span className="text-[11px] font-black text-dex-text">{color}</span>
                    <span className="text-[9px] leading-tight text-dex-muted">{COLOR_HINT[color]}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setAnswer('main_color', undefined)} className="mt-2 min-h-9 px-3 rounded-lg text-[11px] font-bold text-dex-muted border border-dex-border">
                顏色難分，跳過
              </button>
            </section>

            {/* Q3 身形：特徵唔明顯就跳過 */}
            <section>
              <h3 className="text-sm font-black text-dex-text mb-1">佢的腳／身形有冇明顯特點？</h3>
              <p className="text-[10px] text-dex-muted mb-2">例如長腳企水邊、浮水，或者猛禽利爪；睇唔清就跳過。</p>
              <div className="grid grid-cols-2 gap-2">
                {SHAPE_OPTIONS.map(shape => (
                  <button
                    key={shape}
                    onClick={() => setAnswer('shape', shape)}
                    aria-pressed={answers.shape === shape}
                    className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                      answers.shape === shape ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-bg'
                    }`}
                  >
                    <div className="text-xs font-black text-dex-text">{SHAPE_HINT[shape].glyph} {shape}</div>
                    <div className="text-[10px] text-dex-muted">{SHAPE_HINT[shape].hint}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setAnswer('shape', undefined)} className="mt-2 min-h-9 px-3 rounded-lg text-[11px] font-bold text-dex-muted border border-dex-border">
                睇唔出，跳過
              </button>
            </section>

            {/* 嘴形：進階可選線索 */}
            <section>
              <h3 className="text-sm font-black text-dex-text mb-1">最後睇嘴：似尖嘴、長嘴、扁嘴，定鉤嘴？</h3>
              <div className="grid grid-cols-4 gap-2">
                {BEAK_OPTIONS.map(beak => (
                  <button
                    key={beak}
                    onClick={() => setAnswer('beak', beak)}
                    aria-pressed={answers.beak === beak}
                    className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition ${
                      answers.beak === beak ? 'border-dex-neon bg-dex-neon/10' : 'border-dex-border bg-dex-bg'
                    }`}
                  >
                    <span className="text-xl">{BEAK_EMOJI[beak]}</span>
                    <span className="text-xs font-black text-dex-text">{beak}</span>
                    <span className="text-[9px] text-dex-muted">{BEAK_HINT[beak]}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setAnswer('beak', undefined)} className="mt-2 min-h-9 px-3 rounded-lg text-[11px] font-bold text-dex-muted border border-dex-border">
                睇唔清，跳過
              </button>
            </section>

            {nextFollowup && (
              <section aria-label="自動加問的外貌線索" className="rounded-xl border border-dex-neon/40 bg-dex-neon/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-dex-text">{nextFollowup.title}</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-dex-muted">
                      仲有 {filteredCount} 隻符合；超過 {FOLLOWUP_THRESHOLD} 隻，所以加問一項。{nextFollowup.hint}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-dex-neon/15 px-2 py-1 text-[9px] font-bold text-dex-text">加問</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {nextFollowup.options.map(option => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={answers[nextFollowup.key] === option}
                      onClick={() => setAnswer(nextFollowup.key, option)}
                      className={`min-h-10 rounded-lg border px-2 py-2 text-left text-xs font-bold transition ${
                        answers[nextFollowup.key] === option
                          ? 'border-dex-neon bg-dex-neon/10 text-dex-text'
                          : 'border-dex-border bg-dex-bg text-dex-text'
                      }`}
                    >{option}</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => skipFollowup(nextFollowup.key)}
                  className="mt-2 min-h-9 rounded-lg border border-dex-border px-3 text-[11px] font-bold text-dex-muted"
                >睇唔清，跳過呢題</button>
              </section>
            )}
        </section>

        {/* 只交出短名單；唔似就再觀察一項特徵，而非翻百幾張卡 */}
        {result && (
          <section aria-labelledby="candidate-heading">
            <div className="mb-3">
              <h2 id="candidate-heading" className="text-base font-black text-dex-text">
                {answered === 0 ? '常見鳥先睇幾張' : `按 ${answered} 個外貌線索排出的短名單`}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-dex-muted">
                {answered === 0
                  ? '先回想外貌線索，再對照下面最多 8 張；唔需要翻完整圖鑑。'
                  : `每次只看 8 張。呢組共有 ${candidates.length} 隻候選；可以加線索縮窄，或逐頁看完，唔會靜靜漏走符合答案的鳥。`}
              </p>
            </div>

            {result.warnings.map(warning => (
              <div key={warning.message} className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800">
                {warning.message}
              </div>
            ))}

            {!nextFollowup && baseQuestionsTouched.size === BASE_ANSWER_KEYS.size && filteredCount > FOLLOWUP_THRESHOLD && (
              <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-dex-muted">
                呢組資料暫時冇另一項可靠外貌線索可以再分；每次仍只顯示 8 隻，可以逐組查看，亦可以用上方已觀察到的特徵調整。
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {visibleCandidates.map(bird => (
                <CandidateCard
                  key={bird.id}
                  bird={bird}
                  answers={answers}
                  selected={selectedId === bird.id}
                  onSelect={() => setSelectedId(bird.id)}
                />
              ))}
            </div>

            {pageCount > 1 && (
              <nav aria-label="候選鳥分頁" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dex-neon/20 bg-dex-neon/5 p-2">
                <button
                  type="button"
                  onClick={() => { setCandidatePage(page => Math.max(0, page - 1)); setSelectedId(null); }}
                  disabled={candidatePage === 0}
                  className="min-h-10 rounded-lg border border-dex-border px-3 text-xs font-bold text-dex-text disabled:opacity-40"
                >上一組</button>
                <span aria-live="polite" className="text-center text-[11px] text-dex-muted">
                  第 {candidatePage + 1} / {pageCount} 組 · 每組最多 8 隻
                </span>
                <button
                  type="button"
                  onClick={() => { setCandidatePage(page => Math.min(pageCount - 1, page + 1)); setSelectedId(null); }}
                  disabled={candidatePage >= pageCount - 1}
                  className="min-h-10 rounded-lg border border-dex-neon/40 px-3 text-xs font-bold text-dex-text disabled:opacity-40"
                >下一組</button>
              </nav>
            )}

            {candidates.length === 0 && (
              <p className="text-center text-xs text-dex-muted py-6">暫時未有相似的雀，試下清除一個線索再看。</p>
            )}
          </section>
        )}

        <div className="rounded-xl bg-dex-neon/5 border border-dex-neon/15 px-3 py-2 text-[11px] leading-relaxed text-dex-muted">
          🐦 觀鳥由留意一個細節開始：體型、顏色或輪廓都得；唔識雀名，一樣玩得到、學得到。
        </div>

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

      </div>

      {/* 揀中 → 拍到 */}
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
    </div>
  );
}
