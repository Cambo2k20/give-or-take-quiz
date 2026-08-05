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
  isPlayableCategory,
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
import { CATEGORY_REGISTRY } from "../lib/categories";
import { CategoryIcon } from "./CategoryIcon";
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
  type CategoryFilter,
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
  reconcileOfficialDailyHistory,
  recordLocalDailyResult,
  todayIso,
  todaysDailySet,
  writeDailyProgress,
  type OfficialDailyHistoryEntry,
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
import { BackgroundMusicPlayer } from "./BackgroundMusicPlayer";
import {
  AchievementPanel,
  MascotGamePreference,
  ProfileDashboard,
  ProfileAvatarArtwork,
  QaProfileDashboard,
  ProgressRibbon,
  RankPanel,
  ResultProgressCard,
  UnlocksPanel,
  hasEarnedTitle,
} from "./Progress";
import { useProgress } from "./useProgress";
import { EstimatePanel } from "./EstimatePanel";
import { QuestionCardShell } from "./QuestionCardShell";
import { DailyHero } from "./DailyHero";
import {
  JoinLeaderboardForm,
  ProfileDisplayNameForm,
} from "./Leaderboard";
import type { SubmittedDailyRound } from "../lib/leaderboard";
import {
  formatPoints,
  resultDelta,
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
  type FriendMatchHistory,
  type FriendProfile,
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
import {
  playerIdFromUrl,
  playerProfileReturnState,
  playerProfileShareUrl,
  pushPlayerProfileLink,
  replacePlayerProfileLink,
} from "../lib/playerProfileLink";
import { usePublicProfile } from "./usePublicProfile";
import { WarmupSliderMascot } from "./mascot/WarmupSliderMascot";
import { MascotPose } from "./mascot/MascotPose";
import { reactionForTier } from "./mascot/mascotState";
import {
  readMascotInGames,
  writeMascotInGames,
} from "./mascot/mascotPreference";
import {
  readSoundEffectsEnabled,
  writeSoundEffectsEnabled,
} from "./soundPreference";
import {
  PublicProfileEditor,
  PublicProfileEditorState,
  PublicProfileScreen,
} from "./PublicProfile";
import { QaModeBanner, QaStatusBadge } from "./QaStatus";

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
  | "unlocks"
  | "public-profile"
  | "profile-editor";
type RoundResult = { question: Question; guess: number; points: number };
type DailyHistorySync = {
  playerId: string;
  status: "loading" | "ready" | "error";
  results: readonly OfficialDailyHistoryEntry[];
};

const EMPTY_DAILY_HISTORY: readonly OfficialDailyHistoryEntry[] = [];

function linkedChallengeId(): string | null {
  if (typeof window === "undefined") return null;
  return challengeIdFromUrl(window.location.href);
}

function linkedPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return playerIdFromUrl(window.location.href);
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

function QaScorelessCallout() {
  return (
    <div className="board-callout" data-qa-scoreless="true">
      <p className="board-status" role="status">
        <strong>QA play</strong> — this result is not saved, ranked, shared with
        challenges, or counted toward progress.
      </p>
    </div>
  );
}

function AccountCapabilityNotice({
  authStatus,
  qaStatus,
  email,
  emailConfirmed,
  onRetry,
}: {
  authStatus: "loading" | "signed-out" | "signed-in" | "error";
  qaStatus: "idle" | "loading" | "qa" | "not-qa" | "error";
  email: string | null;
  emailConfirmed: boolean;
  onRetry: () => void;
}) {
  if (authStatus === "loading") {
    return <p className="board-status" role="status">Checking sign-in…</p>;
  }
  if (authStatus === "error") {
    return (
      <p className="board-status is-error" role="alert">
        Sign-in status could not be verified. Results will not be saved.
      </p>
    );
  }
  if (qaStatus === "loading") {
    return (
      <p className="board-status" role="status">
        Checking account capability… Results are not saved while this check is
        in progress.
      </p>
    );
  }
  if (qaStatus === "error") {
    return (
      <div className="capability-error" role="alert">
        <p>
          Account capability could not be verified. Results are not saved until
          the check succeeds.
        </p>
        <button className="secondary-button" type="button" onClick={onRetry}>
          Retry capability check
        </button>
      </div>
    );
  }
  if (!emailConfirmed) return <ConfirmEmailNotice email={email} />;
  return null;
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

type ModeDetail = {
  mode: GameMode;
  title: string;
  description: string;
  icon: ReactNode;
};

/** The chooser and the rest of the app share the same themed category artwork. */
const CATEGORY_MODES: readonly ModeDetail[] = CATEGORY_REGISTRY.map(
  (category) => ({
    mode: category.id,
    title: category.label,
    description: category.description,
    icon: <CategoryIcon category={category.id} />,
  }),
);

const MIXED_MODE: ModeDetail = {
  mode: "mixed",
  title: "Mixed",
  description: "A draw from every playable category at once.",
  icon: <CategoryIcon category="mixed" />,
};

const MODES: readonly ModeDetail[] = [
  ...CATEGORY_MODES.filter((detail) =>
    isPlayableCategory(detail.mode as QuestionCategory),
  ),
  MIXED_MODE,
];

const MODE_LABELS = {
  ...Object.fromEntries(
    CATEGORY_REGISTRY.map((category) => [category.id, category.label]),
  ),
  mixed: "Mixed",
} as Record<GameMode, string>;

/** Read off the bank, so adding questions updates the chooser by itself. */
function modeNote(mode: GameMode, format: PlayFormat) {
  if (format === "survival") {
    return `Survival pool · ${formatPoints(questionCount(mode))} questions`;
  }
  const perRound = `${QUESTIONS_PER_GAME} questions`;
  return mode === "mixed"
    ? `${perRound} · a bit of everything`
    : `${perRound} · ${formatPoints(questionCount(mode))} in the bank`;
}

function modeDescription(detail: ModeDetail, format: PlayFormat) {
  if (format === "classic") return detail.description;
  if (detail.mode === "mixed") {
    return "Questions from every playable category continue until you miss.";
  }
  return `Keep answering ${detail.title} questions until you miss.`;
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
  const [phase, setPhase] = useState<Phase>(() => {
    if (linkedChallengeId()) return "account";
    if (linkedPlayerId()) return "public-profile";
    return "category";
  });
  const [targetChallengeId, setTargetChallengeId] = useState(linkedChallengeId);
  const [targetPlayerId, setTargetPlayerId] = useState(linkedPlayerId);
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
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(
    readSoundEffectsEnabled,
  );
  // The selected custom skin, if any. It may support one display mode or both,
  // while `theme` remains the independent mode axis.
  const [bgTheme, setBgTheme] = useState<BackgroundThemeId | null>(
    readEquippedBackgroundTheme,
  );
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [bestBeforeRound, setBestBeforeRound] = useState(0);
  const [questionHistory, setQuestionHistory] = useState(readQuestionHistory);
  const [dailyProgress, setDailyProgress] = useState(readDailyProgress);
  const [dailyHistorySync, setDailyHistorySync] =
    useState<DailyHistorySync | null>(null);
  const [dailyHistoryRetry, setDailyHistoryRetry] = useState(0);
  // Non-null while the round in play is a daily, and holds which day's it is.
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [leaderboardFormat, setLeaderboardFormat] =
    useState<LeaderboardFormat>(
      () => playerProfileReturnState()?.format ?? "classic",
    );
  const [leaderboardCategoryFilter, setLeaderboardCategoryFilter] =
    useState<CategoryFilter>(() => {
      const category = playerProfileReturnState()?.category;
      return category === "all" || MODES.some((item) => item.mode === category)
        ? (category as CategoryFilter)
        : "all";
    });
  // Which format the category chooser will start.
  const [heroFormat, setHeroFormat] = useState<PlayFormat>("classic");
  const [formatRecords, setFormatRecords] = useState(readFormatRecords);
  const [mascotInGames, setMascotInGames] = useState(readMascotInGames);
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
  const [profileActionBusy, setProfileActionBusy] = useState(false);
  const [profileActionMessage, setProfileActionMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState("");
  const [profileMatchHistory, setProfileMatchHistory] =
    useState<FriendMatchHistory | null>(null);
  const [profileMatchHistoryLoading, setProfileMatchHistoryLoading] =
    useState(false);
  const [profileChallengeFriend, setProfileChallengeFriend] =
    useState<FriendProfile | null>(null);
  const profileOpenedInAppRef = useRef(false);
  const profileReturnPhaseRef = useRef<"leaderboard" | "account">(
    playerProfileReturnState()?.phase ?? "leaderboard",
  );
  const profileEditorReturnRef = useRef<"account" | "public-profile">(
    "public-profile",
  );
  // Tagged with the player and date it was fetched for, so a rank belonging to
  // a previous sign-in can never be shown to the next one.
  const [dailyRank, setDailyRank] = useState<{
    key: string;
    rank: number | null;
  } | null>(null);
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);
  const auth = useAuth();
  const canUseAccountIdentity = auth.canUseAccountIdentity;
  const canSubmitCompetitiveScores = auth.canSubmitCompetitiveScores;
  const canUseSocialCompetition = auth.canUseSocialCompetition;
  const canPersistLocalScores = auth.canPersistLocalScores;
  const leaderboard = useLeaderboard(
    auth.user?.id ?? null,
    canUseAccountIdentity,
  );
  // Identity is safe for QA. Real progression and social competition are not.
  const progress = useProgress(
    canSubmitCompetitiveScores ? leaderboard.profile?.id ?? null : null,
  );
  const social = useSocial(
    canUseSocialCompetition ? leaderboard.profile?.id ?? null : null,
  );
  const publicProfile = usePublicProfile(targetPlayerId);
  const { refresh: refreshProgress } = progress;
  const { refresh: refreshSocial } = social;

  function updateMascotInGames(enabled: boolean) {
    setMascotInGames(enabled);
    writeMascotInGames(enabled);
  }

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
        CATEGORY_MODES.map((detail) => [
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
  const countedTotalScore = useCountUp(
    totalScore,
    activePhase === "results",
  );
  const bullseyeCount = results.filter(
    (result) => accuracyTier(result.points).id === "bullseye",
  ).length;
  const isNewPersonalBest =
    canPersistLocalScores &&
    !dailyDate &&
    !activeChallenge &&
    totalScore > 0 &&
    totalScore > bestBeforeRound;
  const resultProgressCategory: QuestionCategory | null =
    !dailyDate && mode !== "mixed" ? mode : null;
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
  const today = todayIso();

  const {
    profile: player,
    updateAvatar,
    publish,
    publishDaily,
    loadDailyHistory,
    myDailyRank,
    publishSurvival,
    resetSubmit,
    loadClassicBoard,
    loadDailyBoard,
    loadSurvivalBoard,
  } = leaderboard;
  const canPublish = canSubmitCompetitiveScores;
  const playerId = player?.id ?? null;
  const activeDailyHistorySync =
    playerId && dailyHistorySync?.playerId === playerId
      ? dailyHistorySync
      : null;
  const syncedDailyResults =
    activeDailyHistorySync?.results ?? EMPTY_DAILY_HISTORY;
  const shownDailyProgress = useMemo(
    () => reconcileOfficialDailyHistory(dailyProgress, syncedDailyResults),
    [dailyProgress, syncedDailyResults],
  );
  const streak = activeStreak(shownDailyProgress);

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
      !canUseSocialCompetition ||
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
  }, [
    targetChallengeId,
    activeChallenge,
    auth.status,
    canUseSocialCompetition,
    player,
  ]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const playerId = linkedPlayerId();
      const returnState = playerProfileReturnState(event.state);
      setTargetPlayerId(playerId);
      setProfileActionMessage("");
      setProfileSaveMessage("");
      const returnPhase = returnState?.phase ?? profileReturnPhaseRef.current;
      if (returnState) {
        profileReturnPhaseRef.current = returnState.phase;
        setLeaderboardFormat(returnState.format);
        const category = returnState.category;
        setLeaderboardCategoryFilter(
          category === "all" || MODES.some((item) => item.mode === category)
            ? (category as CategoryFilter)
            : "all",
        );
      }
      setPhase(playerId ? "public-profile" : returnPhase);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const viewedProfileId = publicProfile.profile?.player.id ?? null;
  const viewedProfileRelationship = publicProfile.profile?.relationship ?? null;
  const loadProfileMatchHistory = social.loadMatchHistory;

  useEffect(() => {
    let cancelled = false;
    if (viewedProfileRelationship !== "friend" || !viewedProfileId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setProfileMatchHistory(null);
          setProfileMatchHistoryLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setProfileMatchHistoryLoading(true);
    });
    loadProfileMatchHistory(viewedProfileId)
      .then((history) => {
        if (!cancelled) setProfileMatchHistory(history);
      })
      .catch(() => {
        if (!cancelled) setProfileMatchHistory(null);
      })
      .finally(() => {
        if (!cancelled) setProfileMatchHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    viewedProfileId,
    viewedProfileRelationship,
    loadProfileMatchHistory,
  ]);

  // Restore every official result visible in the archive when an account is
  // ready. The result stays keyed to that player, so signing out or switching
  // accounts cannot leak one person's Daily history into another's screen.
  useEffect(() => {
    if (!playerId || !canPublish || archiveDates.length === 0) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDailyHistorySync((current) => ({
        playerId,
        status: "loading",
        results:
          current?.playerId === playerId
            ? current.results
            : EMPTY_DAILY_HISTORY,
      }));
    });

    void loadDailyHistory(playerId, archiveDates)
      .then((results) => {
        if (!cancelled) {
          setDailyHistorySync({ playerId, status: "ready", results });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDailyHistorySync((current) => ({
          playerId,
          status: "error",
          results:
            current?.playerId === playerId
              ? current.results
              : EMPTY_DAILY_HISTORY,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [
    playerId,
    canPublish,
    archiveDates,
    loadDailyHistory,
    dailyHistoryRetry,
  ]);

  const retryDailyHistory = useCallback(() => {
    setDailyHistoryRetry((current) => current + 1);
  }, []);

  // The home hero shows a rank only once there is an official score to rank,
  // so this waits on the score rather than firing on every sign-in.
  const todaysOfficialScore =
    shownDailyProgress.dates[today]?.officialScore ?? null;
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
      shownDailyProgress.dates[dailyDate]?.officialScore != null);

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
    if (
      auth.isQa ||
      activeChallenge ||
      phase !== "results" ||
      publishedRef.current
    ) {
      return;
    }
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
    auth.isQa,
  ]);

  // A finished run posts the whole sequence, fatal guess included: the server
  // re-judges every one and refuses a run that did not actually end in a miss.
  useEffect(() => {
    if (
      auth.isQa ||
      activeChallenge ||
      phase !== "survival-over" ||
      publishedRef.current
    ) {
      return;
    }
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
    auth.isQa,
  ]);

  const submitFinishedChallenge = useCallback(async () => {
    if (
      !canUseSocialCompetition ||
      !activeChallenge ||
      challengePublishedRef.current
    ) {
      return;
    }
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
    canUseSocialCompetition,
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
    if (!canSubmitCompetitiveScores) return;
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
    if (!canSubmitCompetitiveScores) return;
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

  function openPlayerProfile(
    playerId: string,
    returnPhase: "leaderboard" | "account" = "leaderboard",
  ) {
    profileOpenedInAppRef.current = true;
    profileReturnPhaseRef.current = returnPhase;
    setTargetPlayerId(playerId);
    setProfileActionMessage("");
    setProfileSaveMessage("");
    pushPlayerProfileLink(playerId, {
      phase: returnPhase,
      format: leaderboardFormat,
      category: leaderboardCategoryFilter,
    });
    setPhase("public-profile");
  }

  function closePlayerProfile() {
    if (profileOpenedInAppRef.current) {
      profileOpenedInAppRef.current = false;
      window.history.back();
      return;
    }
    setTargetPlayerId(null);
    replacePlayerProfileLink(null);
    const returnState = playerProfileReturnState();
    const returnPhase = returnState?.phase ?? profileReturnPhaseRef.current;
    if (returnState) {
      setLeaderboardFormat(returnState.format);
      const category = returnState.category;
      setLeaderboardCategoryFilter(
        category === "all" || MODES.some((item) => item.mode === category)
          ? (category as CategoryFilter)
          : "all",
      );
    }
    setPhase(returnPhase);
    if (returnPhase === "leaderboard") {
      showBoardFor(returnState?.format ?? leaderboardFormat);
    }
  }

  function closeProfileEditor() {
    if (profileEditorReturnRef.current === "public-profile") {
      setPhase("public-profile");
      return;
    }
    profileOpenedInAppRef.current = false;
    setTargetPlayerId(null);
    replacePlayerProfileLink(null);
    setPhase("account");
  }

  function openFriendsFromProfile() {
    setProfileChallengeFriend(null);
    setTargetPlayerId(null);
    replacePlayerProfileLink(null);
    setPhase("friends");
  }

  function challengeProfilePlayer() {
    const viewed = publicProfile.profile;
    if (!viewed) return;
    setProfileChallengeFriend({
      id: viewed.player.id,
      displayName: viewed.player.displayName,
      avatarKey: viewed.player.avatarKey,
    });
    setTargetPlayerId(null);
    replacePlayerProfileLink(null);
    setPhase("friends");
  }

  async function addProfileFriend() {
    if (profileActionBusy) return;
    setProfileActionBusy(true);
    setProfileActionMessage("");
    try {
      await publicProfile.addFriend();
      await refreshSocial();
      setProfileActionMessage("Friend request sent.");
    } catch (caught) {
      setProfileActionMessage(
        caught instanceof Error ? caught.message : "The request could not be sent.",
      );
    } finally {
      setProfileActionBusy(false);
    }
  }

  async function sharePlayerProfile() {
    const viewed = publicProfile.profile;
    if (!viewed) return;
    const url = playerProfileShareUrl(viewed.player.id, window.location.href);
    const text = `See ${viewed.player.displayName}'s Give or Take profile.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${viewed.player.displayName} · Give or Take`, text, url });
        setProfileActionMessage("Profile shared.");
        return;
      }
      await copyText(url);
      setProfileActionMessage("Profile link copied.");
    } catch {
      setProfileActionMessage("Sharing is unavailable on this device.");
    }
  }

  async function savePublicProfile(
    draft: Parameters<typeof publicProfile.save>[0],
  ) {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileSaveMessage("");
    try {
      await publicProfile.save(draft);
      setProfileSaveMessage(
        draft.featuredBadgeKey === null &&
          draft.pinnedAchievementIds.length === 0 &&
          draft.profileThemeId === null
          ? "Profile reset to Automatic."
          : "Public profile saved.",
      );
    } catch (caught) {
      setProfileSaveMessage(
        caught instanceof Error ? caught.message : "The profile could not be saved.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  function toggleSoundEffects() {
    setSoundEffectsEnabled((enabled) => {
      const next = !enabled;
      writeSoundEffectsEnabled(next);
      return next;
    });
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

  function goHome() {
    setTargetPlayerId(null);
    replacePlayerProfileLink(null);
    setPhase("category");
  }

  function startGame(selectedMode: GameMode) {
    setActiveChallenge(null);
    setTargetChallengeId(null);
    replaceChallengeLink(null);
    const draw = selectQuestionsWithHistory(selectedMode, questionHistory);
    setBestBeforeRound(bestScores[selectedMode]);
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
  function beginSurvival(
    deck: Question[],
    challenge: ChallengeSummary | null = null,
    selectedMode: GameMode = "mixed",
  ) {
    setActiveChallenge(challenge);
    setTargetChallengeId(challenge?.id ?? null);
    replaceChallengeLink(challenge?.id ?? null);
    setMode(selectedMode);
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

  function startSurvival(selectedMode: GameMode = "mixed") {
    beginSurvival(buildSurvivalDeck(selectedMode), null, selectedMode);
  }

  function startSelectedCategory(selectedMode: GameMode) {
    if (heroFormat === "survival") {
      startSurvival(selectedMode);
      return;
    }
    startGame(selectedMode);
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
      if (canPersistLocalScores) {
        const updated = recordSurvivalRun(
          formatRecords,
          Math.max(0, survived),
          mode,
        );
        setFormatRecords(updated);
        writeFormatRecords(updated);
      }
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
    if (!canUseSocialCompetition) return;
    setChallengeOpenError("");
    const deck = await social.loadChallengeDeck(challenge.id);
    setShareStatus("");
    setTargetChallengeId(challenge.id);
    replaceChallengeLink(challenge.id);
    if (challenge.format === "survival") {
      beginSurvival(deck, challenge);
      return;
    }

    setActiveChallenge(challenge);
    setMode(challenge.classicMode ?? "mixed");
    setDailyDate(null);
    beginRound(deck);
  }

  function requestPlayChallenge(challenge: ChallengeSummary) {
    if (!canUseSocialCompetition) return;
    void playChallenge(challenge).catch((caught) => {
      setChallengeOpenError(
        caught instanceof Error ? caught.message : "This challenge is unavailable.",
      );
      setPhase("friends");
    });
  }

  function backToFriends() {
    if (!canUseSocialCompetition) return;
    setActiveChallenge(null);
    setChallengeSubmit({ status: "idle" });
    setPhase("friends");
    void social.enterFriends();
  }

  async function startRematch() {
    if (!canUseSocialCompetition || !activeChallenge) return;
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
      if (dailyDate && canPersistLocalScores) {
        const updated = recordLocalDailyResult(
          dailyProgress,
          dailyDate,
          totalScore,
          new Date(),
          results.map((result) => result.points),
        );
        setDailyProgress(updated);
        writeDailyProgress(updated);
      } else if (canPersistLocalScores) {
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
      {auth.isQa && <QaModeBanner />}
      {todaysDaily ? (
        <HomeHeader
          musicControls={<BackgroundMusicPlayer placement="header" />}
          leaderboardEnabled={leaderboard.enabled}
          leaderboardActive={activePhase === "leaderboard"}
          accountLabel={
            auth.status === "signed-in"
              ? (player?.displayName ?? auth.user?.email ?? "Account")
              : "Sign in"
          }
          profileAvatar={
            player ? (
              <ProfileAvatarArtwork
                avatarKey={player.avatarKey}
                className="home-header-avatar-artwork"
              />
            ) : undefined
          }
          socialUnreadCount={social.unreadCount}
          isQa={auth.isQa}
          soundEffectsEnabled={soundEffectsEnabled}
          theme={theme}
          onHome={goHome}
          onOpenLeaderboard={openLeaderboard}
          onOpenAccount={() => setPhase("account")}
          onToggleSoundEffects={toggleSoundEffects}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          <BackgroundMusicPlayer />
          <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={goHome}
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
        </>
      )}

      {activePhase === "category" && (
        <section className="category-screen home-flow-redesign">
          {todaysDaily && (
            <DailyHero
              set={todaysDaily}
              streak={canPersistLocalScores ? streak : 0}
              today={
                canPersistLocalScores
                  ? shownDailyProgress.dates[today]
                  : undefined
              }
              rank={shownDailyRank}
              boardEnabled={leaderboard.enabled}
              archiveCount={archiveDates.length}
              onPlay={() => startDaily(todaysDaily.date)}
              onReplay={() => startDaily(todaysDaily.date)}
              onOpenBoard={() => openLeaderboard("daily")}
              onOpenArchive={() => setPhase("daily-archive")}
              onShare={() =>
                void shareDailyScore(
                  todaysDaily.date,
                  shownDailyProgress.dates[today]?.officialScore ?? 0,
                  shownDailyProgress.dates[today]?.officialPoints ?? [],
                )
              }
              shareStatus={shareStatus}
            />
          )}

          <section className="home-flow-section home-game-modes" aria-labelledby="home-game-modes-heading">
            <span className="home-flow-thread is-first" aria-hidden="true" />
            <header className="home-flow-heading">
              <span className="home-flow-node" aria-hidden="true" />
              <h2 id="home-game-modes-heading">Game Modes</h2>
              <p>Pick how the questions come at you</p>
            </header>

            <div className="home-mode-grid" role="group" aria-label="Choose a format">
              <button
                type="button"
                className={`home-mode-card${heroFormat === "classic" ? " is-current" : ""}`}
                aria-label="Classic"
                aria-pressed={heroFormat === "classic"}
                onClick={() => setHeroFormat("classic")}
              >
                <span className="home-mode-mark" aria-hidden="true" />
                <strong>Classic</strong>
                <span>Five questions, one score at the end.</span>
              </button>
              <button
                type="button"
                className={`home-mode-card${heroFormat === "survival" ? " is-current" : ""}`}
                aria-label="Survival"
                aria-pressed={heroFormat === "survival"}
                onClick={() => setHeroFormat("survival")}
              >
                <span className="home-mode-mark" aria-hidden="true" />
                <strong>Survival</strong>
                <span>Keep guessing until you miss.</span>
              </button>
            </div>

          </section>

          <div className="home-mobile-category-intro" aria-hidden="true">
            <span className="home-flow-thread" />
            <span className="home-flow-node" />
            <h2>Categories</h2>
            <p>
              {heroFormat === "survival"
                ? "Keep going in whichever category you choose"
                : "Five questions from whichever you choose"}
            </p>
          </div>

          <div className="category-picker">
            <h2 className="mode-grid-label">All categories</h2>
            <div className="mode-grid" aria-label="Choose a category">
              <button
                className="mode-card"
                type="button"
                onClick={() => startSelectedCategory(MIXED_MODE.mode)}
              >
                <span className="mode-card-rest">
                  <span className="mode-icon">{MIXED_MODE.icon}</span>
                  <strong>{MIXED_MODE.title}</strong>
                </span>
                <span className="mode-card-details">
                  <strong className="mode-detail-title" aria-hidden="true">
                    {MIXED_MODE.title}
                  </strong>
                  <span className="mode-description">
                    {modeDescription(MIXED_MODE, heroFormat)}
                  </span>
                  <span className="mode-note">
                    {modeNote(MIXED_MODE.mode, heroFormat)}
                  </span>
                  {canPersistLocalScores &&
                    heroFormat === "classic" &&
                    bestScores.mixed > 0 && (
                    <span className="mode-best">
                      Best {formatPoints(bestScores.mixed)}
                    </span>
                  )}
                  {canPersistLocalScores &&
                    heroFormat === "survival" &&
                    (formatRecords.survivalBestByMode?.mixed ?? 0) > 0 && (
                      <span className="mode-best">
                        Most rounds{" "}
                        {formatPoints(
                          formatRecords.survivalBestByMode?.mixed ?? 0,
                        )}
                      </span>
                    )}
                </span>
              </button>
              {CATEGORY_MODES.map((detail) => (
                <button
                className={`mode-card${
                  isPlayableCategory(detail.mode as QuestionCategory)
                    ? ""
                    : " is-coming-soon"
                }`}
                type="button"
                key={detail.mode}
                disabled={!isPlayableCategory(detail.mode as QuestionCategory)}
                onClick={() => startSelectedCategory(detail.mode)}
              >
                  <span className="mode-card-rest">
                    <span className="mode-icon">{detail.icon}</span>
                    <strong>{detail.title}</strong>
                  </span>
                  <span className="mode-card-details">
                    <strong className="mode-detail-title" aria-hidden="true">
                      {detail.title}
                    </strong>
                    {(() => {
                      if (!isPlayableCategory(detail.mode as QuestionCategory)) {
                        return (
                          <span className="mode-note">Coming soon</span>
                        );
                      }
                      // A title only appears once it has been earned — Newcomer is
                      // for the account screen, not the front page.
                      const earnedTitle = hasEarnedTitle(
                        rankByCategory.get(detail.mode as QuestionCategory)?.title,
                      )
                        ? rankByCategory.get(detail.mode as QuestionCategory)?.title
                        : null;
                      const best = bestScores[detail.mode];
                      const survivalBest =
                        formatRecords.survivalBestByMode?.[detail.mode] ?? 0;

                      return (
                        <>
                          {earnedTitle && (
                            <span className="mode-rank">{earnedTitle}</span>
                          )}
                          <span className="mode-description">
                            {modeDescription(detail, heroFormat)}
                          </span>
                          <span className="mode-note">
                            {modeNote(detail.mode, heroFormat)}
                          </span>
                          {canPersistLocalScores &&
                            heroFormat === "classic" &&
                            best > 0 && (
                            <span className="mode-best">
                              Best {formatPoints(best)}
                            </span>
                          )}
                          {canPersistLocalScores &&
                            heroFormat === "survival" &&
                            survivalBest > 0 && (
                            <span className="mode-best">
                              Most rounds {formatPoints(survivalBest)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="category-footer">
            <span>
              {formatPoints(questionCount("mixed"))} sourced questions, bundled with the app
            </span>
            <span>
              {canPersistLocalScores
                ? heroFormat === "survival"
                  ? "Survival records stay on this device"
                  : "Best scores stay on this device"
                : auth.isQa
                  ? "QA results are not saved"
                  : "Score saving is paused"}
            </span>
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

          <QuestionCardShell
            question={question}
            progressLabel={`Question ${questionIndex + 1} of ${gameQuestions.length}`}
            headingRef={focusHeadingRef}
            answered={locked}
          >
            <EstimatePanel
              question={question}
              position={position}
              onPositionChange={setPosition}
              locked={locked}
              revealing={revealing}
              tierId={tier?.id}
              sliderId="estimate-slider"
              sliderOverlay={
                mascotInGames ? (
                  <WarmupSliderMascot
                    reaction={tier ? reactionForTier(tier.id) : null}
                    reactionNonce={questionIndex}
                  />
                ) : undefined
              }
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
          </QuestionCardShell>
        </section>
      )}

      {activePhase === "results" && (
        <section className="results-screen">
          <div className="results-hero results-tally-hero">
            <div className="results-tally-meta">
              <span className="results-category-pill">
                <span className="results-category-icon" aria-hidden="true">
                  {dailyDate || mode === "mixed"
                    ? MIXED_MODE.icon
                    : categoryLabels[mode].icon}
                </span>
                {dailyDate ? "Daily" : MODE_LABELS[mode]}
              </span>
              <span className="results-format-label">
                <span className="results-format-full">
                  {activeChallenge
                    ? "Challenge · Game complete"
                    : dailyDate
                      ? isPracticeRound
                        ? "Daily · Practice"
                        : "Daily · Game complete"
                      : "Classic · Game complete"}
                </span>
                <span className="results-format-short">
                  {activeChallenge ? "Challenge" : dailyDate ? "Daily" : "Classic"}
                </span>
              </span>
            </div>

            <div className="results-score-row">
              <div className="results-score-copy">
                <h1 ref={focusHeadingRef} tabIndex={-1}>
                  Final score
                </h1>
                <div className="final-score">
                  <strong>{formatPoints(countedTotalScore)}</strong>
                  <span>/ {formatPoints(maxScore)}</span>
                </div>
              </div>
              <MascotPose
                pose="celebrating"
                decorative
                animated
                className="results-celebration-mascot"
              />
              {!activeChallenge && canPersistLocalScores && (
                <div
                  className={`result-best-callout${
                    isNewPersonalBest ? " is-new-best" : ""
                  }`}
                  role="status"
                >
                  <span className="result-best-mark" aria-hidden="true">
                    {isNewPersonalBest ? "▲" : "●"}
                  </span>
                  <span>
                    {dailyDate
                      ? isPracticeRound
                        ? "Practice round · official score unchanged"
                        : streak > 0
                          ? `${streak}-day streak · come back tomorrow`
                          : "Daily complete · start a streak tomorrow"
                      : isNewPersonalBest
                        ? bestBeforeRound > 0
                          ? `New personal best · ${formatPoints(totalScore - bestBeforeRound)} above your last`
                          : "New personal best · first score"
                        : `Personal best · ${formatPoints(bestScores[mode])}`}
                  </span>
                </div>
              )}
            </div>

            <div className="results-tally" aria-label="Scores by question">
              {results.map((result, index) => {
                const resultTier = accuracyTier(result.points);
                return (
                  <div
                    className={`results-tally-item tier-${resultTier.id}`}
                    key={result.question.id}
                    aria-label={`Question ${index + 1}: ${formatPoints(result.points)} points`}
                  >
                    <div className="results-tally-track" aria-hidden="true">
                      <span
                        style={{
                          height: `${result.points === 0 ? 0 : Math.max(5, result.points / 10)}%`,
                          animationDelay: `${260 + index * 130}ms`,
                        }}
                      />
                    </div>
                    <strong>{formatPoints(result.points)}</strong>
                    <span>Q{index + 1}</span>
                  </div>
                );
              })}
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
              <>
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
              </>
            )}
          </div>

          <ResultProgressCard
            category={resultProgressCategory}
            progress={progress.progress}
            change={progress.change}
            labels={categoryLabels}
          >
            {!activeChallenge &&
              leaderboard.enabled &&
              leaderboard.ready &&
              canSubmitCompetitiveScores &&
              player && (
                <div className="result-board-summary">
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
                  <button
                    className="result-board-link"
                    type="button"
                    onClick={() =>
                      openLeaderboard(dailyDate ? "daily" : "classic")
                    }
                  >
                    <span className="result-board-full">
                      {dailyDate
                        ? "See today's Daily board →"
                        : "See the Classic leaderboard →"}
                    </span>
                    <span className="result-board-short" aria-hidden="true">
                      Board →
                    </span>
                  </button>
                </div>
              )}
          </ResultProgressCard>

          {!activeChallenge && auth.isQa && <QaScorelessCallout />}

          {!activeChallenge &&
            leaderboard.enabled &&
            leaderboard.ready &&
            !auth.isQa &&
            (!canSubmitCompetitiveScores || !player) && (
            <div className="board-callout">
              {auth.status === "signed-out" ? (
                <>
                  <p className="board-status">
                    Your score is saved on this device. Sign in to put it on{" "}
                    {dailyDate ? "the day's board" : "the leaderboard"}.
                  </p>
                  <AuthPanel compact />
                </>
              ) : !canUseAccountIdentity ? (
                <AccountCapabilityNotice
                  authStatus={auth.status}
                  qaStatus={auth.qaStatus}
                  email={auth.user?.email ?? null}
                  emailConfirmed={Boolean(auth.user?.emailConfirmed)}
                  onRetry={auth.retryQaCapability}
                />
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
              <span>
                {results.length} rounds
                {bullseyeCount > 0 && (
                  <span className="breakdown-highlight">
                    {" "}·{" "}
                    {bullseyeCount === 1
                      ? "one bullseye"
                      : `${bullseyeCount} bullseyes`}
                  </span>
                )}
              </span>
            </div>
            <ol className="result-list">
              {results.map((result, index) => (
                <li
                  key={result.question.id}
                  className={`tier-${accuracyTier(result.points).id}`}
                  style={{ animationDelay: `${260 + index * 130}ms` }}
                >
                  <div className="result-question">
                    <strong>{result.question.prompt}</strong>
                    <span>
                      Your guess{" "}
                      {formatQuestionValue(result.question, result.guess)}
                      {unitSuffix(result.question)} → answer{" "}
                      {formatQuestionValue(result.question, result.question.answer)}
                      {unitSuffix(result.question)} ·{" "}
                      {resultDelta(result.question, result.guess)}
                    </span>
                    <span className="result-accuracy-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${result.points / 10}%`,
                          animationDelay: `${380 + index * 130}ms`,
                        }}
                      />
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
          categoryFilter={leaderboardCategoryFilter}
          onCategoryFilterChange={setLeaderboardCategoryFilter}
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
          onOpenPlayer={(playerId) => openPlayerProfile(playerId)}
          headingRef={focusHeadingRef}
        />
      )}

      {activePhase === "public-profile" && (
        <PublicProfileScreen
          profile={publicProfile.profile}
          labels={categoryLabels}
          themeMode={theme}
          loading={publicProfile.loading}
          unavailable={publicProfile.unavailable}
          error={publicProfile.error}
          actionBusy={profileActionBusy}
          actionMessage={profileActionMessage}
          socialCompetitionBlocked={
            auth.status === "signed-in" && !canUseSocialCompetition
          }
          matchHistory={profileMatchHistory}
          matchHistoryLoading={profileMatchHistoryLoading}
          onAddFriend={() => void addProfileFriend()}
          onOpenFriends={openFriendsFromProfile}
          onChallenge={challengeProfilePlayer}
          onManage={() => {
            setProfileSaveMessage("");
            profileEditorReturnRef.current = "public-profile";
            setPhase("profile-editor");
          }}
          onSignIn={() => setPhase("account")}
          onShare={() => void sharePlayerProfile()}
          onBack={closePlayerProfile}
          headingRef={focusHeadingRef}
        />
      )}

      {activePhase === "profile-editor" && (
        publicProfile.profile &&
        progress.progress &&
        publicProfile.profile.relationship === "self" ? (
          <PublicProfileEditor
            key={`${publicProfile.profile.player.id}:${publicProfile.profile.showcase.customFeaturedBadgeKey ?? "auto"}:${publicProfile.profile.showcase.customProfileThemeId ?? "auto"}:${publicProfile.profile.showcase.pinnedAchievementIds.join(",")}`}
            profile={publicProfile.profile}
            progress={progress.progress}
            labels={categoryLabels}
            themeMode={theme}
            saving={profileSaving}
            message={profileSaveMessage || publicProfile.error}
            onSave={savePublicProfile}
            onBack={closeProfileEditor}
            headingRef={focusHeadingRef}
          />
        ) : (
          <PublicProfileEditorState
            loading={publicProfile.loading || Boolean(!progress.progress && !publicProfile.error)}
            error={
              publicProfile.error ||
              (publicProfile.unavailable
                ? "Your public profile is unavailable."
                : publicProfile.profile && publicProfile.profile.relationship !== "self"
                  ? "Only the profile owner can customise this page."
                  : "")
            }
            onBack={closeProfileEditor}
            headingRef={focusHeadingRef}
          />
        ))}

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
            mascotInGames={mascotInGames}
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
          best={canPersistLocalScores ? formatRecords.survivalBest : null}
          question={
            survivalVerdictState?.survived
              ? null
              : survivalGuesses[survivalGuesses.length - 1]?.question ?? null
          }
          guess={survivalGuesses[survivalGuesses.length - 1]?.guess ?? 0}
          onRunAgain={() => startSurvival(mode)}
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
            !activeChallenge && auth.isQa ? (
              <QaScorelessCallout />
            ) : !activeChallenge && leaderboard.enabled && leaderboard.ready ? (
              <div className="board-callout">
                {auth.status === "signed-out" ? (
                  <>
                    <p className="board-status">
                      Your run is saved on this device. Sign in to put it on the
                      survival board.
                    </p>
                    <AuthPanel compact />
                  </>
                ) : !canUseAccountIdentity ? (
                  <AccountCapabilityNotice
                    authStatus={auth.status}
                    qaStatus={auth.qaStatus}
                    email={auth.user?.email ?? null}
                    emailConfirmed={Boolean(auth.user?.emailConfirmed)}
                    onRetry={auth.retryQaCapability}
                  />
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
              {auth.isQa
                ? "QA archive · results are not saved"
                : streak > 0
                ? `${streak}-day streak`
                : "Play today's to start a streak"}
            </p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              Past dailies
            </h1>
          </div>

          {auth.status === "signed-out" && (
            <p className="daily-sync-note">
              Completed Dailies are saved in this browser. Sign in to sync them
              across devices.
            </p>
          )}
          {activeDailyHistorySync?.status === "loading" && (
            <p className="daily-sync-note" role="status">
              Syncing Daily history...
            </p>
          )}
          {activeDailyHistorySync?.status === "error" && (
            <div className="daily-sync-note is-error" role="alert">
              <span>
                Couldn't sync account history. Showing the Daily history
                already available here.
              </span>
              <button
                className="daily-sync-retry"
                type="button"
                onClick={retryDailyHistory}
              >
                Retry
              </button>
            </div>
          )}

          <DailyArchive
            dates={archiveDates}
            progress={shownDailyProgress}
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
            auth.status === "signed-in" &&
            player &&
            (auth.isQa || progress.progress)
              ? " account-screen-profile"
              : ""
          }`}
        >
          {(!player ||
            (!auth.isQa && !progress.progress) ||
            auth.status !== "signed-in") && (
            <div className="results-hero">
              <p className="eyebrow">
                {auth.status === "signed-in" ? "Your account" : "Optional"}
              </p>
              <h1 ref={focusHeadingRef} tabIndex={-1}>
                {auth.status === "signed-in" ? "Account" : "Sign in"}
              </h1>
              <p className="account-lede">
                You never need an account to play. Signing in gives you a
                profile identity; eligible accounts can also publish scores.
              </p>
            </div>
          )}

          {auth.recovering ? (
            <NewPasswordForm onDone={auth.endRecovery} />
          ) : auth.status === "signed-in" && auth.isQa && player ? (
            <QaProfileDashboard
              displayName={player.displayName}
              avatarKey={player.avatarKey}
              email={auth.user?.email ?? null}
              emailConfirmed={Boolean(auth.user?.emailConfirmed)}
              onSelectAvatar={updateAvatar}
              onChangeDisplayName={leaderboard.saveDisplayName}
              onViewPublicProfile={() => {
                profileReturnPhaseRef.current = "account";
                openPlayerProfile(player.id, "account");
              }}
              mascotInGames={mascotInGames}
              onMascotInGamesChange={updateMascotInGames}
              onSignOut={() => {
                void signOut();
                setPhase("category");
              }}
              headingRef={focusHeadingRef}
            />
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
              onChangeDisplayName={leaderboard.saveDisplayName}
              onOpenRanks={openRanks}
              onOpenAchievements={() => setPhase("achievements")}
              onOpenUnlocks={() => setPhase("unlocks")}
              onOpenFriends={() => {
                setChallengeOpenError("");
                setPhase("friends");
              }}
              onCustomisePublicProfile={() => {
                if (!player) return;
                profileReturnPhaseRef.current = "account";
                profileEditorReturnRef.current = "account";
                openPlayerProfile(player.id, "account");
                setPhase("profile-editor");
              }}
              mascotInGames={mascotInGames}
              onMascotInGamesChange={updateMascotInGames}
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
                  <dt>Display name</dt>
                  <dd>{player?.displayName ?? "Not chosen yet"}</dd>
                </div>
                <div>
                  <dt>Email confirmed</dt>
                  <dd>{auth.user?.emailConfirmed ? "Yes" : "Not yet"}</dd>
                </div>
              </dl>

              {auth.isQa ? (
                <div className="board-status qa-account-status" role="status">
                  <QaStatusBadge />
                  <span>
                    QA account identity is enabled. Scores, progression and
                    challenges remain disabled.
                  </span>
                </div>
              ) : !canUseAccountIdentity ? (
                <AccountCapabilityNotice
                  authStatus={auth.status}
                  qaStatus={auth.qaStatus}
                  email={auth.user?.email ?? null}
                  emailConfirmed={Boolean(auth.user?.emailConfirmed)}
                  onRetry={auth.retryQaCapability}
                />
              ) : null}

              {canUseAccountIdentity && !player && (
                <ProfileDisplayNameForm
                  onSave={(name) => leaderboard.saveDisplayName(name)}
                />
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
            <AuthPanel
              onSignedIn={() =>
                setPhase(targetPlayerId ? "public-profile" : "category")
              }
            />
          )}

          {!(
            auth.status === "signed-in" &&
            player &&
            (auth.isQa || progress.progress)
          ) && (
            <MascotGamePreference
              enabled={mascotInGames}
              onChange={updateMascotInGames}
            />
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

      {activePhase === "friends" && player && canUseSocialCompetition && (
        <FriendsScreen
          social={social}
          modeLabels={MODE_LABELS}
          initialChallengeId={targetChallengeId}
          initialSetupFriend={profileChallengeFriend}
          externalError={challengeOpenError}
          onPlayChallenge={requestPlayChallenge}
          onBack={() => {
            setProfileChallengeFriend(null);
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
