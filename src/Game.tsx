import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BestScores,
  QUESTIONS_PER_GAME,
  accuracyTier,
  formatQuestionValue,
  positionToValue,
  questionCount,
  readBestScores,
  readQuestionHistory,
  scoreGuess,
  selectQuestionsWithHistory,
  startPosition,
  writeBestScores,
  writeQuestionHistory,
} from "../lib/game";
import { dailyResultGrid } from "../lib/share";
import { signOut } from "../lib/auth";
import {
  buildSurvivalDeck,
  readFormatRecords,
  recordSurvivalRun,
  survivalVerdict,
  survivalWindow,
  writeFormatRecords,
  type SurvivalVerdict,
} from "../lib/formats";
import {
  BoardScreen,
  type LeaderboardFormat,
} from "./BoardScreen";
import { SurvivalOver, SurvivalRound } from "./Survival";
import {
  DAILY_MAX_SCORE,
  activeStreak,
  applyOfficialDailyResult,
  dailySetFor,
  playableDailyDates,
  readDailyProgress,
  recordLocalDailyResult,
  todayIso,
  todaysDailySet,
  writeDailyProgress,
} from "../lib/daily";
import type { GameMode, Question, QuestionCategory } from "../lib/types";
import {
  AuthPanel,
  ConfirmEmailNotice,
  NewPasswordForm,
} from "./AuthPanel";
import {
  applyBackgroundTheme,
  readEquippedBackgroundTheme,
} from "../lib/backgroundTheme";
import type { BackgroundThemeId } from "../lib/themes";
import { ThemeArtwork } from "./themes/ThemeArtwork";
import { DailyArchive, readableDate } from "./Daily";
import { HomeHeader } from "./HomeHeader";
import { BrandMark } from "./BrandMark";
import {
  AchievementPanel,
  ProfileDashboard,
  ProgressRibbon,
  RankPanel,
  UnlocksPanel,
  hasEarnedTitle,
} from "./Progress";
import { useProgress } from "./useProgress";
import { EstimatePanel } from "./EstimatePanel";
import { HeroDemo } from "./HeroDemo";
import { DailyHero } from "./DailyHero";
import { JoinLeaderboardForm } from "./Leaderboard";
import type { SubmittedDailyRound } from "../lib/leaderboard";
import {
  formatPoints,
  subtypeLabel,
  unitSuffix,
  useCountUp,
  verdictDetail,
} from "./questionText";
import {
  type Theme,
  applyTheme,
  readTheme,
  subscribeToSystemTheme,
  syncTheme,
} from "./theme";
import { useAuth } from "./useAuth";
import { useLeaderboard } from "./useLeaderboard";
import { useSocial } from "./useSocial";
import { FriendsScreen } from "./Friends";
import {
  submitGameChallenge,
  type ChallengeSummary,
} from "../lib/social";
import {
  ChallengePlayBanner,
  ChallengeResultCallout,
  type ChallengeSubmitState,
} from "./ChallengeUI";
import {
  challengeIdFromUrl,
  challengeShareUrl,
  replaceChallengeLink,
} from "../lib/challengeLink";

type Phase =
  | "category"
  | "playing"
  | "results"
  | "leaderboard"
  | "account"
  | "friends"
  | "daily-archive"
  | "survival"
  | "survival-over"
  | "ranks"
  | "achievements"
  | "unlocks";
type RoundResult = { question: Question; guess: number; points: number };

function linkedChallengeId(): string | null {
  if (typeof window === "undefined") return null;
  return challengeIdFromUrl(window.location.href);
}

const SHIMMER_DURATION_MS = 2600;
const SHIMMER_MIN_PAUSE_MS = 6000;
const SHIMMER_PAUSE_RANGE_MS = 16000;

function AchievementShimmer() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let startTimer: number | undefined;
    let stopTimer: number | undefined;

    const schedule = () => {
      const pause =
        SHIMMER_MIN_PAUSE_MS + Math.random() * SHIMMER_PAUSE_RANGE_MS;
      startTimer = window.setTimeout(() => {
        setActive(true);
        stopTimer = window.setTimeout(() => {
          setActive(false);
          schedule();
        }, SHIMMER_DURATION_MS);
      }, pause);
    };

    schedule();
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
    };
  }, []);

  return (
    <span
      className={`progress-screen-hero-sheen${active ? " is-active" : ""}`}
      aria-hidden="true"
    />
  );
}

/**
 * How a round is played, as opposed to what it is about. Deliberately not a
 * GameMode: subjects, best scores and question history are a separate axis,
 * and conflating them is what made the old board row unmanageable.
 */
type PlayFormat = "classic" | "survival";

const SHIMMER_CUE_SELECTOR = [
  ".board-format.is-current",
  ".board-action-button",
  ".profile-section-title button",
  ".profile-section-action",
  ".profile-account-strip > button",
  ".account-screen-profile > .result-actions .secondary-button",
].join(", ");

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.5 2" strokeLinecap="round" />
  </svg>
);

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 7h3.5l9 10H20M4 17h3.5l9-10H20" strokeLinecap="round" />
    <path d="M17 4l3 3-3 3M17 14l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M12 2c3 2.2 4.8 5.7 4.8 9.6L12 16l-4.8-4.4C7.2 7.7 9 4.2 12 2Z"
      strokeLinejoin="round"
    />
    <path d="M7.2 11.6 4 14l1.6 3.4M16.8 11.6 20 14l-1.6 3.4" strokeLinejoin="round" />
    <circle cx="12" cy="9" r="1.8" />
  </svg>
);

const StackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3l9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
    <path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.5 14.6a5.5 5.5 0 0 1 3 4.9" strokeLinecap="round" />
  </svg>
);

const PawIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <ellipse cx="8" cy="7.5" rx="1.9" ry="2.5" />
    <ellipse cx="16" cy="7.5" rx="1.9" ry="2.5" />
    <ellipse cx="4.6" cy="12.6" rx="1.7" ry="2.2" />
    <ellipse cx="19.4" cy="12.6" rx="1.7" ry="2.2" />
    <path d="M12 12.5c2.8 0 5 2.2 5 4.6 0 1.7-1.4 2.9-3.1 2.9h-3.8c-1.7 0-3.1-1.2-3.1-2.9 0-2.4 2.2-4.6 5-4.6Z" strokeLinejoin="round" />
  </svg>
);

const FilmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M7 5v14M17 5v14M2.5 12h19M2.5 8.5h4.5M2.5 15.5h4.5M17 8.5h4.5M17 15.5h4.5" strokeLinecap="round" />
  </svg>
);

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
  </svg>
);

const MODES: Array<{
  mode: GameMode;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    mode: "population",
    title: "Population",
    description: "How many people live in a country, a city, or online.",
    icon: <PeopleIcon />,
  },
  {
    mode: "history",
    title: "History",
    description: "Place turning points on the timeline, and price the past.",
    icon: <ClockIcon />,
  },
  {
    mode: "geography",
    title: "Geography",
    description: "Oceans, deserts, mountains and the shape of the land.",
    icon: <GlobeIcon />,
  },
  {
    mode: "science",
    title: "Science",
    description: "Physics, chemistry and the workings of the human body.",
    icon: <BoltIcon />,
  },
  {
    mode: "animals",
    title: "Animals",
    description: "What they weigh, how fast they run, how long they carry.",
    icon: <PawIcon />,
  },
  {
    mode: "space",
    title: "Space",
    description: "Orbits, planets and the machines we have sent up there.",
    icon: <RocketIcon />,
  },
  {
    mode: "technology",
    title: "Technology",
    description: "The tallest, heaviest and fastest things we have built.",
    icon: <StackIcon />,
  },
  {
    mode: "movies",
    title: "Movies",
    description: "When films landed, and what they took at the box office.",
    icon: <FilmIcon />,
  },
  {
    mode: "mixed",
    title: "Mixed",
    description: "A draw from every category at once.",
    icon: <ShuffleIcon />,
  },
];

const MODE_LABELS: Record<GameMode, string> = {
  population: "Population",
  history: "History",
  geography: "Geography",
  science: "Science",
  animals: "Animals",
  space: "Space",
  technology: "Technology",
  movies: "Movies",
  mixed: "Mixed",
};

/** Read off the bank, so adding questions updates the chooser by itself. */
function modeNote(mode: GameMode) {
  const perRound = `${QUESTIONS_PER_GAME} questions`;
  return mode === "mixed"
    ? `${perRound} · a bit of everything`
    : `${perRound} · ${formatPoints(questionCount(mode))} in the bank`;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>(() =>
    linkedChallengeId() ? "account" : "category",
  );
  const [targetChallengeId, setTargetChallengeId] = useState(linkedChallengeId);
  const [rankSubject, setRankSubject] = useState<QuestionCategory | null>(null);
  const [mode, setMode] = useState<GameMode>("mixed");
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [position, setPosition] = useState(0.5);
  const [locked, setLocked] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  // Read straight from the browser during the first render. The app is fully
  // client-rendered, so there is no server pass to mismatch against.
  const [theme, setTheme] = useState<Theme>(readTheme);
  // The selected custom skin, if any. It may support one display mode or both,
  // while `theme` remains the independent mode axis.
  const [bgTheme, setBgTheme] = useState<BackgroundThemeId | null>(
    readEquippedBackgroundTheme,
  );
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [questionHistory, setQuestionHistory] = useState(readQuestionHistory);
  const [dailyProgress, setDailyProgress] = useState(readDailyProgress);
  // Non-null while the round in play is a daily, and holds which day's it is.
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [leaderboardFormat, setLeaderboardFormat] =
    useState<LeaderboardFormat>("classic");
  // Which format the hero is offering. Classic keeps the consequence-free
  // warm-up; picking Survival is the act of intent that starts a real run.
  const [heroFormat, setHeroFormat] = useState<PlayFormat>("classic");
  const [formatRecords, setFormatRecords] = useState(readFormatRecords);
  const [survivalDeck, setSurvivalDeck] = useState<Question[]>([]);
  const [survivalIndex, setSurvivalIndex] = useState(0);
  const [survivalGuesses, setSurvivalGuesses] = useState<RoundResult[]>([]);
  const [survivalVerdictState, setSurvivalVerdictState] =
    useState<SurvivalVerdict | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [activeChallenge, setActiveChallenge] =
    useState<ChallengeSummary | null>(null);
  const [challengeSubmit, setChallengeSubmit] =
    useState<ChallengeSubmitState>({ status: "idle" });
  const [challengeOpenError, setChallengeOpenError] = useState("");
  // Tagged with the player and date it was fetched for, so a rank belonging to
  // a previous sign-in can never be shown to the next one.
  const [dailyRank, setDailyRank] = useState<{
    key: string;
    rank: number | null;
  } | null>(null);
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);
  const auth = useAuth();
  const leaderboard = useLeaderboard(auth.user?.id ?? null);
  // Progression is derived on the server from recorded rounds, so it only
  // exists for a player who has a name to record them against.
  const progress = useProgress(leaderboard.profile?.id ?? null);
  const social = useSocial(leaderboard.profile?.id ?? null);
  const { refresh: refreshProgress } = progress;
  const { refresh: refreshSocial } = social;

  useEffect(() => {
    const startShimmer = (target: Element | null) => {
      const button = target?.closest<HTMLElement>(SHIMMER_CUE_SELECTOR);
      if (!button) return;
      button.classList.remove("is-shimmering");
      void button.offsetWidth;
      button.classList.add("is-shimmering");
    };

    const handlePointerOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLElement>(SHIMMER_CUE_SELECTOR);
      if (!button) return;
      if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) {
        return;
      }
      startShimmer(button);
    };

    const handleFocusIn = (event: FocusEvent) => {
      startShimmer(event.target instanceof Element ? event.target : null);
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "board-action-shimmer") return;
      if (event.target instanceof HTMLElement) {
        event.target.classList.remove("is-shimmering");
      }
    };

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("animationend", handleAnimationEnd);
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("animationend", handleAnimationEnd);
    };
  }, []);

  /** Subject label and icon by category, so Progress renders what MODES does. */
  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        MODES.filter((detail) => detail.mode !== "mixed").map((detail) => [
          detail.mode,
          { title: detail.title, icon: detail.icon },
        ]),
      ) as Record<QuestionCategory, { title: string; icon: ReactNode }>,
    [],
  );
  /** Rank by subject, for the home cards. */
  const rankByCategory = useMemo(
    () =>
      new Map(
        (progress.progress?.categories ?? []).map((entry) => [
          entry.category,
          entry,
        ]),
      ),
    [progress.progress],
  );
  const highestRankSubject = useMemo(() => {
    const categories = progress.progress?.categories;
    if (!categories || categories.length === 0) return "population";
    return categories.reduce((best, entry) =>
      entry.rank > best.rank ? entry : best,
    ).category;
  }, [progress.progress]);
  const openRanks = (category?: QuestionCategory) => {
    setRankSubject(category ?? highestRankSubject);
    setPhase("ranks");
  };
  // One publish per finished round, whatever React does with effects.
  const publishedRef = useRef(false);
  const challengePublishedRef = useRef(false);

  // Following a reset link drops the player back on the app with a recovery
  // session, so the account screen takes over until the new password is set.
  // Derived rather than pushed into state, so it cannot fight with navigation.
  const activePhase: Phase = auth.recovering ? "account" : phase;

  useEffect(
    () =>
      subscribeToSystemTheme((next) => {
        setTheme(next);
        syncTheme(next);
      }),
    [],
  );

  useEffect(() => {
    if (activePhase !== "category") focusHeadingRef.current?.focus();
  }, [activePhase, questionIndex]);

  // Hold the pre-reveal frame long enough for the marker transition to run.
  useEffect(() => {
    if (!revealing) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRevealing(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [revealing]);

  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  );
  const question = gameQuestions[questionIndex];
  const guess = question ? positionToValue(question, position) : 0;
  const currentResult = results[questionIndex];
  const tier = currentResult ? accuracyTier(currentResult.points) : null;
  const countedPoints = useCountUp(
    currentResult?.points ?? 0,
    Boolean(currentResult),
  );

  // Classic and Daily are both five questions, while Survival is variable, so
  // the ceiling is read off the active round rather than assumed.
  const maxScore = gameQuestions.length * 1000;
  const todaysDaily = useMemo(() => todaysDailySet(), []);
  const archiveDates = useMemo(() => playableDailyDates(), []);
  const streak = activeStreak(dailyProgress);
  const today = todayIso();
  const playedToday = dailyProgress.lastPlayedDate === today;

  const {
    profile: player,
    updateAvatar,
    publish,
    publishDaily,
    checkDailyOfficial,
    myDailyRank,
    publishSurvival,
    resetSubmit,
    loadClassicBoard,
    loadDailyBoard,
    loadSurvivalBoard,
  } = leaderboard;
  const canPublish = auth.canUseLeaderboard;

  // A challenge link survives authentication and display-name setup. Only once
  // both are ready do we hand it to the participant-only Friends screen.
  useEffect(() => {
    // Once the deck is active, targetChallengeId is also used to keep the share
    // URL intact. Do not let that restoration behavior pull an in-progress
    // player back out of the game.
    if (
      !targetChallengeId ||
      activeChallenge ||
      auth.status !== "signed-in" ||
      !player
    ) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPhase("friends");
    });
    return () => {
      cancelled = true;
    };
  }, [targetChallengeId, activeChallenge, auth.status, player]);

  // Checked once per sign-in, before the player has necessarily played today
  // on this device. Without this, a device that has not played yet offers
  // "Play today's Daily" even when the player already went official somewhere
  // else, and only finds out when the submission is rejected.
  useEffect(() => {
    if (!player || !canPublish || !todaysDaily) return;
    // Nothing to correct if this device already believes today is done.
    if (dailyProgress.dates[todaysDaily.date]?.officialScore !== null) return;
    let cancelled = false;
    void checkDailyOfficial(player.id, todaysDaily.date)
      .then((result) => {
        if (cancelled || !result) return;
        setDailyProgress((current) => {
          const updated = applyOfficialDailyResult(
            current,
            todaysDaily.date,
            result,
          );
          writeDailyProgress(updated);
          return updated;
        });
      })
      .catch(() => {
        // Best-effort: local state stands, and a real submission attempt
        // will still get the authoritative answer from the server.
      });
    return () => {
      cancelled = true;
    };
    // dailyProgress is read for its current value above, not tracked as a
    // dependency — including it would refire this on every local record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, canPublish, todaysDaily, checkDailyOfficial]);

  // The home hero shows a rank only once there is an official score to rank,
  // so this waits on the score rather than firing on every sign-in.
  const todaysOfficialScore = dailyProgress.dates[today]?.officialScore ?? null;
  const rankKey =
    player && canPublish && todaysOfficialScore !== null
      ? `${player.id}:${today}`
      : null;

  useEffect(() => {
    if (!rankKey || !player) return;
    let cancelled = false;
    void myDailyRank(player.id, today)
      .then((rank) => {
        if (!cancelled) setDailyRank({ key: rankKey, rank });
      })
      .catch(() => {
        // A rank that cannot be read just goes unshown; the score still stands.
      });
    return () => {
      cancelled = true;
    };
  }, [rankKey, player, today, myDailyRank]);

  const shownDailyRank =
    rankKey && dailyRank?.key === rankKey ? dailyRank.rank : null;

  /**
   * A daily round that cannot claim its date's official slot: either an archive
   * day, which the server scores outside its window, or today after an official
   * result is already in. Both are worth playing, and neither should read as
   * the run that counts.
   */
  const isPracticeRound =
    dailyDate !== null &&
    (dailyDate !== today ||
      dailyProgress.dates[dailyDate]?.officialScore != null);

  const survivalQuestion = survivalDeck[survivalIndex];
  const survivalNumber = survivalIndex + 1;
  const survivalGuess = survivalQuestion
    ? positionToValue(survivalQuestion, position)
    : 0;
  const survivalSurvived = survivalVerdictState?.survived
    ? survivalGuesses.length
    : Math.max(0, survivalGuesses.length - 1);

  /**
   * Folds the server's verdict on a daily submission into local progress,
   * correcting whatever `recordLocalDailyResult` guessed when results first
   * appeared. `isOfficial: false` here means another attempt — on this device
   * or another — already holds the slot for the date; `officialScore` is
   * always that attempt's score, so the record ends up right either way.
   */
  function applyDailyPublishResult(date: string, recorded: SubmittedDailyRound) {
    setDailyProgress((current) => {
      const priorAttempts = current.dates[date]?.attemptCount ?? 1;
      const updated = applyOfficialDailyResult(current, date, {
        score: recorded.officialScore,
        attempts: recorded.isOfficial ? priorAttempts : priorAttempts + 1,
      });
      writeDailyProgress(updated);
      return updated;
    });
  }

  // Publish the moment a round ends, but only for a player who already has a
  // name. Everyone else is offered the join form on the results screen.
  //
  // A daily goes to its own per-day board, never a category one: two days are
  // two different puzzles, so their scores must not rank together.
  useEffect(() => {
    if (activeChallenge || phase !== "results" || publishedRef.current) return;
    if (!player || !canPublish || results.length === 0) return;
    publishedRef.current = true;
    const guesses = results.map((result) => ({
      question_id: result.question.id,
      guess: result.guess,
    }));
    if (dailyDate) {
      const date = dailyDate;
      void publishDaily(date, guesses).then((recorded) => {
        if (!recorded) return;
        applyDailyPublishResult(date, recorded);
        void refreshProgress();
      });
      return;
    }
    // Progress is re-read only once the server has actually taken the round;
    // a failed publish has moved nothing.
    void publish(mode, guesses).then((recorded) => {
      if (recorded) void refreshProgress();
    });
  }, [
    phase,
    mode,
    results,
    player,
    canPublish,
    publish,
    publishDaily,
    dailyDate,
    refreshProgress,
    activeChallenge,
  ]);

  // A finished run posts the whole sequence, fatal guess included: the server
  // re-judges every one and refuses a run that did not actually end in a miss.
  useEffect(() => {
    if (activeChallenge || phase !== "survival-over" || publishedRef.current) return;
    if (!player || !canPublish || survivalGuesses.length === 0) return;
    publishedRef.current = true;
    void publishSurvival(
      survivalGuesses.map((result) => ({
        question_id: result.question.id,
        guess: result.guess,
      })),
    ).then((recorded) => {
      if (recorded) void refreshProgress();
    });
  }, [
    phase,
    survivalGuesses,
    player,
    canPublish,
    publishSurvival,
    refreshProgress,
    activeChallenge,
  ]);

  const submitFinishedChallenge = useCallback(async () => {
    if (!activeChallenge || challengePublishedRef.current) return;
    const guesses = (
      activeChallenge.format === "survival" ? survivalGuesses : results
    ).map((result) => ({
      question_id: result.question.id,
      guess: result.guess,
    }));
    if (guesses.length === 0) return;

    challengePublishedRef.current = true;
    setChallengeSubmit({ status: "sending" });
    try {
      const submitted = await submitGameChallenge(activeChallenge.id, guesses);
      setActiveChallenge(submitted.challenge);
      setChallengeSubmit({ status: "sent", challenge: submitted.challenge });
      setTargetChallengeId(activeChallenge.id);
      replaceChallengeLink(activeChallenge.id);
      await refreshSocial();
      await refreshProgress();
    } catch (caught) {
      challengePublishedRef.current = false;
      setChallengeSubmit({
        status: "failed",
        message:
          caught instanceof Error
            ? caught.message
            : "Could not submit this challenge.",
      });
    }
  }, [
    activeChallenge,
    results,
    survivalGuesses,
    refreshSocial,
    refreshProgress,
  ]);

  useEffect(() => {
    if (!activeChallenge) return;
    const finished =
      (activeChallenge.format === "classic" && phase === "results") ||
      (activeChallenge.format === "survival" && phase === "survival-over");
    if (!finished) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void submitFinishedChallenge();
    });
    return () => {
      cancelled = true;
    };
  }, [activeChallenge, phase, submitFinishedChallenge]);

  async function joinAndPublishSurvival(name: string) {
    await leaderboard.join(name);
    publishedRef.current = true;
    const recorded = await publishSurvival(
      survivalGuesses.map((result) => ({
        question_id: result.question.id,
        guess: result.guess,
      })),
    );
    if (recorded) await refreshProgress();
  }

  async function joinAndPublish(name: string) {
    await leaderboard.join(name);
    publishedRef.current = true;
    const guesses = results.map((result) => ({
      question_id: result.question.id,
      guess: result.guess,
    }));
    if (dailyDate) {
      const recorded = await publishDaily(dailyDate, guesses);
      if (recorded) {
        applyDailyPublishResult(dailyDate, recorded);
        await refreshProgress();
      }
      return;
    }
    const recorded = await publish(mode, guesses);
    if (recorded) await refreshProgress();
  }

  /** The day the Daily board opens on: whichever puzzle was last in play. */
  const boardDailyDate = dailyDate ?? today;

  function showBoardFor(format: LeaderboardFormat) {
    if (format === "survival") void loadSurvivalBoard();
    else if (format === "daily") void loadDailyBoard(boardDailyDate);
    else void loadClassicBoard();
  }

  /** Classic is the default; Daily and Survival are separate boards because
   * they rank different things. */
  function openLeaderboard(
    formatOrEvent:
      | LeaderboardFormat
      | React.MouseEvent<HTMLButtonElement> = "classic",
  ) {
    const format =
      typeof formatOrEvent === "string" ? formatOrEvent : "classic";
    setLeaderboardFormat(format);
    setPhase("leaderboard");
    showBoardFor(format);
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  /** Equips a background, or clears it if it was already equipped — a toggle
   * rather than a one-way switch, so a player can always get back to plain
   * light/dark with nothing behind it. */
  function toggleBackgroundTheme(themeId: BackgroundThemeId) {
    const next = bgTheme === themeId ? null : themeId;
    setBgTheme(next);
    applyBackgroundTheme(next);
  }

  /** Everything a round needs reset, whichever way it was started. */
  function beginRound(roundQuestions: Question[]) {
    setGameQuestions(roundQuestions);
    setQuestionIndex(0);
    setPosition(roundQuestions[0] ? startPosition(roundQuestions[0]) : 0.5);
    setLocked(false);
    setRevealing(false);
    setResults([]);
    setShareStatus("");
    publishedRef.current = false;
    challengePublishedRef.current = false;
    setChallengeSubmit({ status: "idle" });
    resetSubmit();
    setPhase("playing");
  }

  function startGame(selectedMode: GameMode) {
    setActiveChallenge(null);
    setTargetChallengeId(null);
    replaceChallengeLink(null);
    const draw = selectQuestionsWithHistory(selectedMode, questionHistory);
    setMode(selectedMode);
    setDailyDate(null);
    setQuestionHistory(draw.history);
    writeQuestionHistory(draw.history);
    beginRound(draw.questions);
  }

  /**
   * A run draws from the whole bank in its own shuffle. Question history is
   * untouched, as in the daily: a run is not a round, and letting it eat the
   * category rotation would starve normal play.
   */
  function startSurvival(
    deck: Question[] = buildSurvivalDeck(),
    challenge: ChallengeSummary | null = null,
  ) {
    setActiveChallenge(challenge);
    setTargetChallengeId(challenge?.id ?? null);
    replaceChallengeLink(challenge?.id ?? null);
    setSurvivalDeck(deck);
    setSurvivalIndex(0);
    setSurvivalGuesses([]);
    setSurvivalVerdictState(null);
    setPosition(deck[0] ? startPosition(deck[0]) : 0.5);
    setLocked(false);
    setRevealing(false);
    setShareStatus("");
    setDailyDate(null);
    publishedRef.current = false;
    challengePublishedRef.current = false;
    setChallengeSubmit({ status: "idle" });
    resetSubmit();
    setPhase("survival");
  }

  function lockSurvivalGuess() {
    if (!survivalQuestion || locked) return;
    const verdict = survivalVerdict(
      survivalQuestion,
      survivalGuess,
      survivalNumber,
    );
    setSurvivalGuesses((current) => [
      ...current,
      {
        question: survivalQuestion,
        guess: survivalGuess,
        points: scoreGuess(survivalQuestion, survivalGuess),
      },
    ]);
    setSurvivalVerdictState(verdict);
    setLocked(true);
    setRevealing(true);
  }

  function continueSurvival() {
    if (!locked) return;
    const alive = survivalVerdictState?.survived ?? false;
    const next = survivalDeck[survivalIndex + 1];

    // Out of questions with the run still alive means the bank was cleared,
    // which the server accepts as a completed run.
    if (!alive || !next) {
      const survived = alive ? survivalGuesses.length : survivalGuesses.length - 1;
      const updated = recordSurvivalRun(formatRecords, Math.max(0, survived));
      setFormatRecords(updated);
      writeFormatRecords(updated);
      setPhase("survival-over");
      return;
    }

    setSurvivalIndex((current) => current + 1);
    setSurvivalVerdictState(null);
    setPosition(startPosition(next));
    setLocked(false);
    setRevealing(false);
  }

  /**
   * The daily is a fixed set, so it neither draws from the shared bank nor
   * touches question history — everyone must get the same five in the same order.
   */
  function startDaily(date: string) {
    const set = dailySetFor(date);
    if (!set) return;
    setActiveChallenge(null);
    setTargetChallengeId(null);
    replaceChallengeLink(null);
    setDailyDate(date);
    beginRound([...set.questions]);
  }

  async function playChallenge(challenge: ChallengeSummary) {
    setChallengeOpenError("");
    const deck = await social.loadChallengeDeck(challenge.id);
    setShareStatus("");
    setTargetChallengeId(challenge.id);
    replaceChallengeLink(challenge.id);
    if (challenge.format === "survival") {
      startSurvival(deck, challenge);
      return;
    }

    setActiveChallenge(challenge);
    setMode(challenge.classicMode ?? "mixed");
    setDailyDate(null);
    beginRound(deck);
  }

  function requestPlayChallenge(challenge: ChallengeSummary) {
    void playChallenge(challenge).catch((caught) => {
      setChallengeOpenError(
        caught instanceof Error ? caught.message : "This challenge is unavailable.",
      );
      setPhase("friends");
    });
  }

  function backToFriends() {
    setActiveChallenge(null);
    setChallengeSubmit({ status: "idle" });
    setPhase("friends");
    void social.enterFriends();
  }

  async function startRematch() {
    if (!activeChallenge) return;
    setChallengeSubmit({ status: "sending" });
    try {
      const id = await social.createChallenge(
        activeChallenge.opponent.id,
        activeChallenge.format,
        activeChallenge.classicMode,
      );
      const rematch = await social.loadChallenge(id);
      await playChallenge(rematch);
    } catch (caught) {
      setChallengeSubmit({
        status: "failed",
        message:
          caught instanceof Error ? caught.message : "Could not start a rematch.",
      });
    }
  }

  async function shareChallenge() {
    if (!activeChallenge) return;
    const url = challengeShareUrl(activeChallenge.id, window.location.href);
    const text = `${activeChallenge.opponent.displayName}, your Give or Take challenge is ready.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Give or Take challenge", text, url });
        setShareStatus("Challenge shared.");
        return;
      }
      await copyText(`${text} ${url}`);
      setShareStatus("Challenge link copied.");
    } catch {
      try {
        await copyText(`${text} ${url}`);
        setShareStatus("Challenge link copied.");
      } catch {
        setShareStatus("Sharing is unavailable on this device.");
      }
    }
  }

  function lockGuess() {
    if (!question || locked) return;
    setResults((current) => [
      ...current,
      { question, guess, points: scoreGuess(question, guess) },
    ]);
    setLocked(true);
    setRevealing(true);
  }

  function goToNextQuestion() {
    if (!locked) return;
    if (questionIndex === gameQuestions.length - 1) {
      // A daily is scored per day rather than as a personal best, so the two
      // records never mix. Recorded locally the instant results appear, so
      // the streak and score show up without waiting on the network; the
      // publish effect below corrects this once the server has the final say
      // on which attempt is actually official.
      if (dailyDate) {
        const updated = recordLocalDailyResult(
          dailyProgress,
          dailyDate,
          totalScore,
          new Date(),
          results.map((result) => result.points),
        );
        setDailyProgress(updated);
        writeDailyProgress(updated);
      } else {
        const updated = {
          ...bestScores,
          [mode]: Math.max(bestScores[mode], totalScore),
        };
        setBestScores(updated);
        writeBestScores(updated);
      }
      setPhase("results");
      return;
    }
    const next = gameQuestions[questionIndex + 1];
    setQuestionIndex((current) => current + 1);
    setPosition(next ? startPosition(next) : 0.5);
    setLocked(false);
    setRevealing(false);
  }

  /**
   * The shareable form of a daily result: the day, a row of squares standing
   * for how close each of the five guesses landed, and the score. The grid is
   * dropped for a result recorded before breakdowns were stored, leaving the
   * score to speak for itself rather than showing an empty row.
   */
  function dailyShareText(
    date: string,
    score: number,
    pointsPerQuestion: readonly number[],
  ) {
    const grid =
      pointsPerQuestion.length > 0
        ? `\n${dailyResultGrid(pointsPerQuestion)}\n`
        : " ";
    return `Give or Take — ${readableDate(date)}${grid}${formatPoints(
      score,
    )}/${formatPoints(DAILY_MAX_SCORE)}\n\nHow close can you get?`;
  }

  /**
   * Shares a daily straight from the home hero, where no round is in play and
   * `results` belongs to whatever was last finished. The date and score are
   * passed in rather than read off round state for that reason.
   */
  async function shareDailyScore(
    date: string,
    score: number,
    pointsPerQuestion: readonly number[] = [],
  ) {
    const text = dailyShareText(date, score, pointsPerQuestion);
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Give or Take", text, url });
        setShareStatus("Result shared.");
        return;
      }
      await copyText(`${text} ${url}`);
      setShareStatus("Result copied to your clipboard.");
    } catch {
      try {
        await copyText(`${text} ${url}`);
        setShareStatus("Result copied to your clipboard.");
      } catch {
        setShareStatus("Sharing is unavailable on this device.");
      }
    }
  }

  async function shareResult() {
    // Naming the day is the point of sharing a daily: the reader can play the
    // same five questions and compare directly. A run shares its length, which
    // is the number the survival board ranks.
    const text =
      phase === "survival-over"
        ? `I survived ${formatPoints(survivalSurvived)} questions in Give or Take. How far can you get?`
        : dailyDate
          ? dailyShareText(
              dailyDate,
              totalScore,
              results.map((result) => result.points),
            )
          : `I scored ${formatPoints(totalScore)}/${formatPoints(maxScore)} in Give or Take — ${MODE_LABELS[mode]}. How close can you get?`;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Give or Take", text, url });
        setShareStatus("Result shared.");
        return;
      }
      await copyText(`${text} ${url}`);
      setShareStatus("Result copied to your clipboard.");
    } catch {
      try {
        await copyText(`${text} ${url}`);
        setShareStatus("Result copied to your clipboard.");
      } catch {
        setShareStatus("Sharing is unavailable on this device.");
      }
    }
  }

  return (
    <main className="site-shell">
      <ThemeArtwork
        themeId={bgTheme}
        mode={theme}
        variant="backdrop"
      />
      {todaysDaily ? (
        <HomeHeader
          date={todaysDaily.date}
          streak={streak}
          playedToday={playedToday}
          score={dailyProgress.dates[today]?.officialScore ?? null}
          archiveCount={archiveDates.length}
          leaderboardEnabled={leaderboard.enabled}
          accountLabel={
            auth.status === "signed-in"
              ? (player?.displayName ?? auth.user?.email ?? "Account")
              : "Sign in"
          }
          socialUnreadCount={social.unreadCount}
          theme={theme}
          onHome={() => setPhase("category")}
          onPlayDaily={() => startDaily(todaysDaily.date)}
          onOpenArchive={() => setPhase("daily-archive")}
          onOpenLeaderboard={openLeaderboard}
          onOpenAccount={() => setPhase("account")}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => setPhase("category")}
          aria-label="Give or Take home"
        >
          <BrandMark />
          <span>Give or Take</span>
        </button>
        <div className="header-side">
          {activePhase === "playing" && (
            <p className="score-chip">
              {dailyDate ? "Daily" : MODE_LABELS[mode]} ·{" "}
              <strong>{formatPoints(totalScore)}</strong>
            </p>
          )}
          {activePhase === "survival" && (
            <p className="score-chip">
              Survival · <strong>{formatPoints(survivalSurvived)} in</strong>
            </p>
          )}
          {leaderboard.enabled &&
            activePhase !== "playing" &&
            activePhase !== "survival" && (
            <>
              <button
                className="board-button"
                type="button"
                onClick={openLeaderboard}
              >
                Leaderboard
              </button>
              {auth.status === "signed-in" ? (
                <button
                  className="board-button"
                  type="button"
                  onClick={() => setPhase("account")}
                >
                  {player?.displayName ?? auth.user?.email ?? "Account"}
                </button>
              ) : (
                <button
                  className="board-button"
                  type="button"
                  onClick={() => setPhase("account")}
                >
                  Sign in
                </button>
              )}
            </>
          )}
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" />
                <path
                  d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path
                  d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        </header>
      )}

      {activePhase === "category" && (
        <section className="category-screen">
          <div className="hero-copy">
            <p className="eyebrow">A game of informed guesses</p>
            <h1>How close can you get?</h1>
            <p className="hero-lede">
              Five questions. One slider. Put your instinct somewhere on the line.
            </p>
          </div>

          {todaysDaily && (
            <DailyHero
              set={todaysDaily}
              streak={streak}
              today={dailyProgress.dates[today]}
              rank={shownDailyRank}
              boardEnabled={leaderboard.enabled}
              onPlay={() => startDaily(todaysDaily.date)}
              onReplay={() => startDaily(todaysDaily.date)}
              onOpenBoard={() => openLeaderboard("daily")}
              onShare={() =>
                void shareDailyScore(
                  todaysDaily.date,
                  dailyProgress.dates[today]?.officialScore ?? 0,
                  dailyProgress.dates[today]?.officialPoints ?? [],
                )
              }
              shareStatus={shareStatus}
            />
          )}

          <h2 className="keep-playing-label">Keep playing</h2>

          {/* Format pills: how you play, kept off the subject grid below. */}
          <div
            className="hero-formats board-formats"
            role="group"
            aria-label="Choose a format"
          >
            <button
              type="button"
              className={`hero-format board-format${heroFormat === "classic" ? " is-current" : ""}`}
              aria-pressed={heroFormat === "classic"}
              onClick={() => setHeroFormat("classic")}
            >
              Classic
            </button>
            <button
              type="button"
              className={`hero-format board-format${heroFormat === "survival" ? " is-current" : ""}`}
              aria-pressed={heroFormat === "survival"}
              onClick={() => setHeroFormat("survival")}
            >
              Survival
            </button>
          </div>

          {heroFormat === "classic" ? (
            <HeroDemo onPlay={() => startGame("mixed")} />
          ) : (
            <div className="hero-survival">
              <div className="hero-survival-head">
                <span className="question-tag">Survival</span>
                {formatRecords.survivalBest > 0 && (
                  <span className="hero-survival-best">
                    Best run {formatPoints(formatRecords.survivalBest)}
                  </span>
                )}
              </div>
              <p className="hero-survival-lede">
                Questions keep coming until one gets away from you. The window
                you have to land in narrows every three questions.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => startSurvival()}
              >
                Start a run
              </button>
              <p className="hero-survival-note">
                Drawn from all {formatPoints(questionCount("mixed"))} questions.
              </p>
            </div>
          )}

          <h2 className="mode-grid-label">All categories</h2>
          <div className="mode-grid" aria-label="Choose a category">
            {MODES.map((detail) => (
              <button
                className="mode-card"
                type="button"
                key={detail.mode}
                onClick={() => startGame(detail.mode)}
              >
                <span className="mode-icon">{detail.icon}</span>
                <strong>{detail.title}</strong>
                <span className="mode-description">{detail.description}</span>
                <span className="mode-note">{modeNote(detail.mode)}</span>
                {(() => {
                  // A title only appears once it has been earned — Newcomer is
                  // for the account screen, not the front page.
                  const earnedTitle = hasEarnedTitle(
                    rankByCategory.get(detail.mode as QuestionCategory)?.title,
                  )
                    ? rankByCategory.get(detail.mode as QuestionCategory)?.title
                    : null;
                  const best = bestScores[detail.mode];
                  if (best <= 0 && !earnedTitle) return null;

                  return (
                    <span className="mode-best">
                      {best > 0 && `Best ${formatPoints(best)}`}
                      {best > 0 && earnedTitle && " · "}
                      {earnedTitle}
                    </span>
                  );
                })()}
              </button>
            ))}
          </div>
          <div className="category-footer">
            <span>
              {formatPoints(questionCount("mixed"))} sourced questions, bundled with the app
            </span>
            <span>Best scores stay on this device</span>
          </div>
        </section>
      )}

      {activePhase === "playing" && question && (
        <section className="game-screen">
          {activeChallenge && (
            <ChallengePlayBanner challenge={activeChallenge} labels={MODE_LABELS} />
          )}
          <div
            className="progress-dots"
            role="progressbar"
            aria-label="Game progress"
            aria-valuemin={1}
            aria-valuemax={gameQuestions.length}
            aria-valuenow={questionIndex + 1}
          >
            {gameQuestions.map((item, index) => (
              <span
                key={item.id}
                className={
                  index === questionIndex
                    ? "is-current"
                    : index < questionIndex
                      ? "is-done"
                      : undefined
                }
              />
            ))}
          </div>

          {dailyDate && (
            <p
              className={`daily-play-flag${isPracticeRound ? " is-practice" : ""}`}
            >
              {isPracticeRound
                ? "Practice replay"
                : `Today's Daily · Question ${questionIndex + 1} of ${gameQuestions.length}`}
            </p>
          )}

          <article className="question-card">
            <span className="question-tag">{subtypeLabel(question)}</span>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              {question.prompt}
            </h1>

            <EstimatePanel
              question={question}
              position={position}
              onPositionChange={setPosition}
              locked={locked}
              revealing={revealing}
              tierId={tier?.id}
              sliderId="estimate-slider"
            />

            {!locked ? (
              <button className="primary-button" type="button" onClick={lockGuess}>
                Lock in guess
              </button>
            ) : (
              <div className={`reveal tier-${tier?.id ?? "far"}`} aria-live="polite">
                <div className="verdict">
                  <h2>{tier?.headline}</h2>
                  <p>{verdictDetail(question, currentResult.guess)}</p>
                </div>
                <div className="stat-tiles">
                  <div className="stat-tile">
                    <span>Answer</span>
                    <strong>{formatQuestionValue(question, question.answer)}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Your guess</span>
                    <strong>
                      {formatQuestionValue(question, currentResult.guess)}
                    </strong>
                  </div>
                  <div className="stat-tile is-points">
                    <span>Points</span>
                    <strong>+{formatPoints(countedPoints)}</strong>
                  </div>
                </div>
                <p className="reveal-fact">{question.explanation}</p>
                <a
                  className="source-link"
                  href={question.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source: {question.source.title}
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  className="primary-button"
                  type="button"
                  onClick={goToNextQuestion}
                >
                  {questionIndex === gameQuestions.length - 1
                    ? "See results"
                    : "Next question"}
                </button>
              </div>
            )}
          </article>
        </section>
      )}

      {activePhase === "results" && (
        <section className="results-screen">
          <div className="results-hero">
            <p className="eyebrow">
              {dailyDate ? `Daily · ${dailyDate}` : MODE_LABELS[mode]} · Game
              complete
            </p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              Final score
            </h1>
            <div className="final-score">
              <strong>{formatPoints(totalScore)}</strong>
              <span>/ {formatPoints(maxScore)}</span>
            </div>
            {activeChallenge ? (
              <ChallengeResultCallout
                state={challengeSubmit}
                onRetry={() => void submitFinishedChallenge()}
                onShare={() => void shareChallenge()}
                onBack={backToFriends}
                onRematch={() => void startRematch()}
                shareStatus={shareStatus}
              />
            ) : (
            <div className="result-summary">
              <p>
                {dailyDate
                  ? streak > 0
                    ? `That's a ${streak}-day streak. Come back tomorrow to keep it.`
                    : "Play tomorrow's daily to start a streak."
                  : totalScore === bestScores[mode] && totalScore > 0
                    ? "That’s your best score in this category."
                    : `Your best ${MODE_LABELS[mode].toLowerCase()} score is ${formatPoints(bestScores[mode])}.`}
              </p>
              <div className="result-actions">
                {dailyDate ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setPhase("category")}
                  >
                    Back to the game
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => startGame(mode)}
                  >
                    Play again
                  </button>
                )}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setPhase(dailyDate ? "daily-archive" : "category")
                  }
                >
                  {dailyDate ? "Past dailies" : "Change category"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={shareResult}
                >
                  Share result
                </button>
              </div>
              <p className="share-status" role="status">
                {shareStatus}
              </p>
            </div>
            )}
          </div>

          <ProgressRibbon change={progress.change} labels={categoryLabels} />

          {!activeChallenge && leaderboard.enabled && leaderboard.ready && (
            <div className="board-callout">
              {auth.status === "signed-out" ? (
                <>
                  <p className="board-status">
                    Your score is saved on this device. Sign in to put it on{" "}
                    {dailyDate ? "the day's board" : "the leaderboard"}.
                  </p>
                  <AuthPanel compact />
                </>
              ) : !auth.canUseLeaderboard ? (
                <ConfirmEmailNotice email={auth.user?.email ?? null} />
              ) : !player ? (
                <JoinLeaderboardForm onJoin={joinAndPublish} />
              ) : (
                <div className="board-status" role="status">
                  {leaderboard.submit.status === "sending" &&
                    "Saving your score…"}
                  {leaderboard.submit.status === "sent" && (
                    <>
                      Saved as <strong>{player.displayName}</strong>. The server
                      scored this round{" "}
                      <strong>
                        {formatPoints(leaderboard.submit.totalScore)}
                      </strong>
                      .
                    </>
                  )}
                  {leaderboard.submit.status === "failed" && (
                    <span className="is-error">
                      {leaderboard.submit.message}
                    </span>
                  )}
                </div>
              )}
              <button
                className="secondary-button"
                type="button"
                onClick={() => openLeaderboard(dailyDate ? "daily" : "classic")}
              >
                {dailyDate
                  ? "See today's Daily board"
                  : "See the Classic leaderboard"}
              </button>
            </div>
          )}

          <div className="breakdown">
            <div className="section-heading">
              <h2>Question by question</h2>
              <span>{results.length} rounds</span>
            </div>
            <ol className="result-list">
              {results.map((result) => (
                <li
                  key={result.question.id}
                  className={`tier-${accuracyTier(result.points).id}`}
                >
                  <div className="result-question">
                    <strong>{result.question.prompt}</strong>
                    <span>
                      Your guess{" "}
                      {formatQuestionValue(result.question, result.guess)}
                      {unitSuffix(result.question)} · Answer{" "}
                      {formatQuestionValue(result.question, result.question.answer)}
                      {unitSuffix(result.question)}
                    </span>
                  </div>
                  <strong className="result-points">
                    {formatPoints(result.points)}
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {activePhase === "leaderboard" && (
        <BoardScreen
          modes={MODES}
          modeLabels={MODE_LABELS}
          rows={leaderboard.board}
          loading={leaderboard.boardLoading}
          error={leaderboard.boardError}
          profile={player}
          format={leaderboardFormat}
          dailyDate={boardDailyDate}
          onFormatChange={(format) => {
            setLeaderboardFormat(format);
            showBoardFor(format);
          }}
          onPlayDaily={() => {
            if (todaysDaily) startDaily(todaysDaily.date);
            else setPhase("category");
          }}
          onPlay={(category) => {
            if (category === "all") {
              setPhase("category");
              return;
            }
            setMode(category);
            startGame(category);
          }}
          onPlaySurvival={startSurvival}
          onReturnHome={() => setPhase("category")}
          headingRef={focusHeadingRef}
        />
      )}

      {activePhase === "survival" && survivalQuestion && (
        <>
          {activeChallenge && (
            <ChallengePlayBanner challenge={activeChallenge} labels={MODE_LABELS} />
          )}
          <SurvivalRound
            question={survivalQuestion}
            questionNumber={survivalNumber}
            survived={survivalSurvived}
            position={position}
            onPositionChange={setPosition}
            windowHalfWidth={survivalWindow(survivalNumber)}
            locked={locked}
            revealing={revealing}
            verdict={survivalVerdictState}
            guess={survivalGuess}
            onLock={lockSurvivalGuess}
            onContinue={continueSurvival}
            headingRef={focusHeadingRef}
          />
        </>
      )}

      {activePhase === "survival-over" && (
        <SurvivalOver
          survived={survivalSurvived}
          best={formatRecords.survivalBest}
          question={
            survivalVerdictState?.survived
              ? null
              : survivalGuesses[survivalGuesses.length - 1]?.question ?? null
          }
          guess={survivalGuesses[survivalGuesses.length - 1]?.guess ?? 0}
          onRunAgain={() => startSurvival()}
          onHome={() => setPhase("category")}
          onShare={shareResult}
          shareStatus={shareStatus}
          headingRef={focusHeadingRef}
          challengeCallout={
            activeChallenge ? (
              <ChallengeResultCallout
                state={challengeSubmit}
                onRetry={() => void submitFinishedChallenge()}
                onShare={() => void shareChallenge()}
                onBack={backToFriends}
                onRematch={() => void startRematch()}
                shareStatus={shareStatus}
              />
            ) : undefined
          }
          progressRibbon={
            <ProgressRibbon change={progress.change} labels={categoryLabels} />
          }
          boardCallout={
            !activeChallenge && leaderboard.enabled && leaderboard.ready ? (
              <div className="board-callout">
                {auth.status === "signed-out" ? (
                  <>
                    <p className="board-status">
                      Your run is saved on this device. Sign in to put it on the
                      survival board.
                    </p>
                    <AuthPanel compact />
                  </>
                ) : !auth.canUseLeaderboard ? (
                  <ConfirmEmailNotice email={auth.user?.email ?? null} />
                ) : !player ? (
                  <JoinLeaderboardForm onJoin={joinAndPublishSurvival} />
                ) : (
                  <div className="board-status" role="status">
                    {leaderboard.submit.status === "sending" &&
                      "Saving your run…"}
                    {leaderboard.submit.status === "sent" && (
                      <>
                        Saved as <strong>{player.displayName}</strong>. The
                        server counted{" "}
                        <strong>
                          {formatPoints(leaderboard.submit.totalScore)}
                        </strong>{" "}
                        survived.
                      </>
                    )}
                    {leaderboard.submit.status === "failed" && (
                      <span className="is-error">
                        {leaderboard.submit.message}
                      </span>
                    )}
                  </div>
                )}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => openLeaderboard("survival")}
                >
                  See the Survival leaderboard
                </button>
              </div>
            ) : null
          }
        />
      )}

      {activePhase === "daily-archive" && (
        <section className="board-screen">
          <div className="results-hero">
            <p className="eyebrow">
              {streak > 0
                ? `${streak}-day streak`
                : "Play today's to start a streak"}
            </p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              Past dailies
            </h1>
          </div>

          <DailyArchive
            dates={archiveDates}
            progress={dailyProgress}
            onPlay={startDaily}
          />

          <div className="result-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPhase("category")}
            >
              Back
            </button>
          </div>
        </section>
      )}

      {activePhase === "account" && (
        <section
          className={`account-screen${
            auth.status === "signed-in" && progress.progress
              ? " account-screen-profile"
              : ""
          }`}
        >
          {(!progress.progress || auth.status !== "signed-in") && (
            <div className="results-hero">
              <p className="eyebrow">
                {auth.status === "signed-in" ? "Your account" : "Optional"}
              </p>
              <h1 ref={focusHeadingRef} tabIndex={-1}>
                {auth.status === "signed-in" ? "Account" : "Sign in"}
              </h1>
              <p className="account-lede">
                You never need an account to play. Signing in only puts your
                scores on the leaderboard under a name of your choosing.
              </p>
            </div>
          )}

          {auth.recovering ? (
            <NewPasswordForm onDone={auth.endRecovery} />
          ) : auth.status === "signed-in" &&
            progress.progress &&
            player ? (
            <ProfileDashboard
              progress={progress.progress}
              labels={categoryLabels}
              displayName={player.displayName}
              avatarKey={player.avatarKey}
              email={auth.user?.email ?? null}
              emailConfirmed={Boolean(auth.user?.emailConfirmed)}
              themeMode={theme}
              equippedId={bgTheme}
              onEquip={toggleBackgroundTheme}
              onSelectAvatar={updateAvatar}
              onOpenRanks={openRanks}
              onOpenAchievements={() => setPhase("achievements")}
              onOpenUnlocks={() => setPhase("unlocks")}
              onOpenFriends={() => {
                setChallengeOpenError("");
                setPhase("friends");
              }}
              friendCount={social.dashboard.friends.length}
              activeChallengeCount={social.dashboard.activeChallenges.length}
              socialUnreadCount={social.unreadCount}
              onSignOut={() => {
                void signOut();
                setPhase("category");
              }}
              headingRef={focusHeadingRef}
            />
          ) : auth.status === "signed-in" ? (
            <div className="account-detail">
              <dl className="account-facts">
                <div>
                  <dt>Signed in as</dt>
                  <dd>{auth.user?.email ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>Leaderboard name</dt>
                  <dd>{player?.displayName ?? "Not chosen yet"}</dd>
                </div>
                <div>
                  <dt>Email confirmed</dt>
                  <dd>{auth.user?.emailConfirmed ? "Yes" : "Not yet"}</dd>
                </div>
              </dl>

              {!auth.canUseLeaderboard && (
                <ConfirmEmailNotice email={auth.user?.email ?? null} />
              )}

              {auth.canUseLeaderboard && !player && (
                <JoinLeaderboardForm onJoin={(name) => leaderboard.join(name)} />
              )}

              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  void signOut();
                  setPhase("category");
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <AuthPanel onSignedIn={() => setPhase("category")} />
          )}

          <div className="result-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPhase("category")}
            >
              Back to the game
            </button>
          </div>
        </section>
      )}

      {activePhase === "friends" && player && (
        <FriendsScreen
          social={social}
          modeLabels={MODE_LABELS}
          initialChallengeId={targetChallengeId}
          externalError={challengeOpenError}
          onPlayChallenge={requestPlayChallenge}
          onBack={() => {
            setTargetChallengeId(null);
            replaceChallengeLink(null);
            setChallengeOpenError("");
            setPhase("account");
          }}
          headingRef={focusHeadingRef}
        />
      )}

      {(activePhase === "ranks" ||
        activePhase === "achievements" ||
        activePhase === "unlocks") && (
        <section className="account-screen progress-screen">
          {activePhase !== "ranks" && (
            <div
              className={`results-hero progress-screen-hero progress-screen-hero-${activePhase}`}
            >
              {activePhase === "achievements" && <AchievementShimmer />}
              <p className="eyebrow">Your progress</p>
              <h1 ref={focusHeadingRef} tabIndex={-1}>
                {activePhase === "achievements" ? "Achievements" : "Unlocks"}
              </h1>
            </div>
          )}

          {progress.progress ? (
            activePhase === "ranks" ? (
              <RankPanel
                progress={progress.progress}
                labels={categoryLabels}
                selectedCategory={rankSubject ?? highestRankSubject}
                onSelectCategory={setRankSubject}
                headingRef={focusHeadingRef}
              />
            ) : activePhase === "achievements" ? (
              <AchievementPanel progress={progress.progress} />
            ) : (
              <UnlocksPanel
                progress={progress.progress}
                labels={categoryLabels}
                themeMode={theme}
                equippedId={bgTheme}
                onEquip={toggleBackgroundTheme}
              />
            )
          ) : (
            <p className="board-empty" role="status">
              Sign in to start earning ranks and achievements.
            </p>
          )}

          <div className="result-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPhase("account")}
            >
              Back to account
            </button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <strong>Give or Take</strong>
        <span>Facts have sources. Guesses are all yours.</span>
      </footer>
    </main>
  );
}
