import { useState, useEffect } from 'react';
import { TopicsIndex, Category } from '../types/topic';
import { CategoryAccordion } from '../components/TopicFilter/CategoryAccordion';
import { TopicStat } from '../hooks/useTopicProgress';
import { ProgressData, getAnsweredByTopic } from '../types/progress';
import { getOverallStats } from '../utils/stats';
import { BrandCard } from '../components/Brand';
import { ProgressSummary } from '../components/ProgressSummary';
import { MembraneDivider } from '../components/Membrane';
import type { ReviewMode } from './ReviewPage';
import { SkinName, SkinAccess, applySkin, savedSkin, loadSkinAccess } from '../utils/skin';

interface Props {
  topics: TopicsIndex;
  selectedTopicIds: Set<string>;
  selectedCount: number;
  topicStats?: Map<string, TopicStat> | null;
  progress: ProgressData;
  onToggleTopic: (topicId: string) => void;
  onToggleCategory: (category: Category) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onStartQuiz: () => void;
  onGoToDashboard: () => void;
  onGoToReview: (mode?: ReviewMode) => void;
  onClearProgress: () => void;
  /** High Yield mode: each topic condensed to its high-yield picks. */
  hyMode: boolean;
  onSetHyMode: (on: boolean) => void;
}

export function HomePage({
  topics, selectedTopicIds, selectedCount, topicStats, progress,
  onToggleTopic, onToggleCategory, onSelectAll, onClearAll,
  onStartQuiz, onGoToDashboard, onGoToReview, onClearProgress,
  hyMode, onSetHyMode,
}: Props) {
  const stats = getOverallStats(progress);
  const missedCount = Object.values(progress.answers).filter((a) => !a.isCorrect).length;
  const completedCount = Object.keys(progress.answers).length;
  const answeredByTopic = getAnsweredByTopic(progress);

  const allTopics = topics.categories.flatMap(c => c.topics);
  const anyHy = allTopics.some(t => (t.hyCount ?? 0) > 0);
  const hyOf = (t: Category['topics'][number]) =>
    topicStats?.get(t.id)?.hyTotal ?? t.hyCoreCount ?? 0;
  const hyTotal = allTopics.reduce((n, t) => n + hyOf(t), 0);

  // Compute remaining (unanswered) for selected topics. In High Yield mode
  // that is the unanswered HY picks.
  const remainingCount = topics.categories.reduce((sum, cat) =>
    sum + cat.topics.reduce((s, t) => {
      if (!selectedTopicIds.has(t.id)) return s;
      if (hyMode) return s + (topicStats?.get(t.id)?.hyRemaining ?? t.hyCoreCount ?? 0);
      const answered = answeredByTopic[t.id] || 0;
      return s + Math.max(0, t.questionCount - answered);
    }, 0), 0);

  const [skin, setSkin] = useState<SkinName>(savedSkin);
  const [skinAccess, setSkinAccess] = useState<SkinAccess | null>(null);
  useEffect(() => { loadSkinAccess().then(setSkinAccess); }, []);
  const skinLocked = skinAccess !== null && skinAccess !== 'ok';
  function chooseSkin(next: SkinName) {
    if (skinLocked && next !== 'off') return;
    setSkin(next);
    applySkin(next);
  }

  return (
    <div className="min-h-screen bg-slate-900">

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Progress shortcuts. The shared header above carries the title and
            the course's sibling tools; empty:hidden drops the row for a new user. */}
        <div className="mb-6 flex items-center gap-2 flex-wrap empty:hidden">
          {stats.total > 0 && (
            <button
              onClick={onGoToDashboard}
              className="px-4 py-2 min-h-10 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Dashboard ({stats.percentage}%)
            </button>
          )}
          {missedCount > 0 && (
            <button
              onClick={() => onGoToReview('incorrect')}
              className="px-4 py-2 min-h-10 text-sm rounded-lg border border-amber-600 bg-amber-500/10 text-amber-400 font-medium hover:bg-amber-500/20 transition-colors"
              title="Redo the questions you got wrong"
            >
              Missed ({missedCount})
            </button>
          )}
          {completedCount > 0 && (
            <button
              onClick={() => onGoToReview()}
              className="px-4 py-2 min-h-10 text-sm rounded-lg border border-blue-700 text-blue-400 hover:bg-blue-900/30 transition-colors"
            >
              Completed ({completedCount})
            </button>
          )}
        </div>

        {/* Where you are in the bank */}
        { stats.total > 0 && (
          <ProgressSummary
            answered={stats.total}
            correct={Math.round(stats.total * stats.percentage / 100)}
            total={topics?.totalQuestions ?? stats.total}
            onReset={onClearProgress}
          />
        )}

        {/* Filter controls */}
        {/* Settings first, then the list — they used to share a row. */}
        <div className="mb-5">
          {/* Exam skins — re-dress the quiz to look like the interfaces you
              actually sit exams in. Signed-in Active Transport accounts only. */}
          <div className="mt-4 min-w-0 max-w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400">Skin</span>
              <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-1">
                {([
                  ['off', 'Off'],
                  ['examplify', 'Examplify Skin'],
                  ['examplify-dark', 'Examplify Dark'],
                  ['nbme', 'NBME Skin'],
                ] as [SkinName, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => chooseSkin(value)}
                    disabled={skinLocked && value !== 'off'}
                    title={skinLocked && value !== 'off'
                      ? 'Sign in to Active Transport to use the exam skins'
                      : undefined}
                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                      skin === value
                        ? 'bg-blue-600 text-white'
                        : skinLocked && value !== 'off'
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {skinLocked && <p className="mt-2 text-xs text-slate-500">Sign in to use exam skins.</p>}
          </div>
        </div>

        <MembraneDivider />

        {/* High Yield: condense the bank to the questions most likely to be
            on the exam, picked brick by brick against the learning objectives. */}
        {anyHy && (
          <div className={`mb-6 w-fit max-w-full rounded-xl border px-4 py-3 ${
            hyMode ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60'}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800 p-1">
                <button
                  onClick={() => onSetHyMode(false)}
                  aria-pressed={!hyMode}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                    !hyMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All questions
                </button>
                <button
                  onClick={() => onSetHyMode(true)}
                  title="Each topic cut to its highest-yield questions"
                  aria-pressed={hyMode}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                    hyMode ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-amber-300'}`}
                >
                  ⚡ High Yield
                </button>
              </div>
              <span className="text-sm text-slate-300">
                {hyMode && <><strong className="text-amber-300">{hyTotal}</strong> high-yield questions</>}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Select Topics</h2>
          <div className="flex items-center gap-3">
            <button onClick={onSelectAll} className="text-sm text-blue-400 hover:text-blue-300">Select All</button>
            <span className="text-slate-600">|</span>
            <button onClick={onClearAll} className="text-sm text-blue-400 hover:text-blue-300">Clear All</button>
          </div>
        </div>

        {/* Category accordions, grouped by teaching week so a student revising
            one week of the block can find its topics together. Falls back to a
            flat list if the data has no week on it. */}
        <div className="mb-8">
          {topics.categories.map((cat, i) => {
            const prev = i > 0 ? topics.categories[i - 1] : undefined;
            const startsWeek = cat.week !== undefined && cat.week !== prev?.week;
            const inWeek = topics.categories.filter(c => c.week === cat.week);
            const topicCount = inWeek.reduce((n, c) => n + c.topics.length, 0);
            const questionCount = inWeek.reduce(
              (n, c) => n + c.topics.reduce((m, t) => m + (hyMode ? hyOf(t) : t.questionCount), 0), 0);
            return (
              <div key={cat.id}>
                {startsWeek && (
                  <div className={`flex items-baseline gap-3 flex-wrap rounded-lg border border-blue-900/60 bg-blue-950/30 px-4 py-3 ${i === 0 ? 'mb-3' : 'mt-6 mb-3'}`}>
                    <span className="text-base font-bold text-blue-300">{cat.weekName}</span>
                    {cat.weekSubtitle && (
                      <span className="text-sm text-slate-300">{cat.weekSubtitle}</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">
                      {topicCount} topics &middot; {questionCount} {hyMode ? 'high-yield ' : ''}questions
                    </span>
                  </div>
                )}
                <div className="mb-2">
                  <CategoryAccordion
                    category={cat}
                    selectedTopicIds={selectedTopicIds}
                    topicStats={topicStats}
                    hyMode={hyMode}
                    onToggleTopic={onToggleTopic}
                    onToggleCategory={onToggleCategory}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        <div className="at-sticky-bottom sticky bottom-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-6 pb-6 -mx-4 px-4">
          <button
            onClick={onStartQuiz}
            disabled={remainingCount === 0}
            className="w-full py-4 rounded-xl at-btn-primary font-semibold text-lg transition-colors shadow-lg"
          >
            {remainingCount > 0
              ? `Start ${hyMode ? 'High Yield ' : ''}Quiz (${remainingCount} remaining)`
              : selectedCount > 0
                ? `All selected ${hyMode ? 'high-yield ' : ''}questions completed!`
                : 'Select topics to begin'}
          </button>
        </div>

        <BrandCard kind="qbank" />
      </main>
    </div>
  );
}
