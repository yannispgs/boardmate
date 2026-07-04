"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  GameId,
  PlayerId,
  PopulatedGame,
  WinCondition,
} from "@/lib/domain";
import { countdownColor } from "@/lib/game/colors";
import { leaderByScore, winnerDirection } from "@/lib/game/scoring";
import { useTurnTimer } from "@/lib/hooks/use-turn-timer";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getGameRepository } from "@/lib/repositories";
import { EndedGame } from "./EndedGame";
import { LiveEndPrompt } from "./LiveEndPrompt";
import { ScorePanel } from "./ScorePanel";
import { TurnFlow } from "./turn-flow";

const DEFAULT_DURATION_S = 60;

export function PlayScreen({ gameId }: { gameId: GameId }) {
  const repo = getGameRepository();
  const [game, setGame] = useState<PopulatedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [durationS, setDurationS] = useState(DEFAULT_DURATION_S);
  const [busy, setBusy] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  // Live running scores, seeded once from the loaded game then owned here so
  // they survive turn reloads and feed both the score panel and the end prompt.
  const [scores, setScores] = useState<Record<string, number> | null>(null);

  const timer = useTurnTimer();
  // Keep the screen awake while a turn is actively running; let it sleep on
  // pause / once the game ends, to spare the battery.
  useWakeLock(game?.status === "ongoing" && timer.running);

  const load = useCallback(async () => {
    try {
      setGame(await repo.getPopulated(gameId));
      setError(null);
    } catch {
      setError("Impossible de charger la partie.");
    } finally {
      setLoading(false);
    }
  }, [repo, gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Seed the live scores from the game the first time it loads (later turn
  // reloads must not clobber scores entered since).
  useEffect(() => {
    if (game && scores === null) {
      setScores(
        Object.fromEntries(game.players.map(p => [p.playerId, p.score ?? 0])),
      );
    }
  }, [game, scores]);

  // Unlock audio on the first interaction with the play screen: mobile browsers
  // only let an AudioContext start from a user gesture. iOS in particular needs
  // a touchend/click (not just pointerdown), so we listen broadly; re-running on
  // each event keeps it unlocked for the rest of the game.
  useEffect(() => {
    const handle = () => unlockAudio();
    const events = ["touchend", "pointerup", "mousedown", "keydown"] as const;

    for (const e of events) {
      window.addEventListener(e, handle);
    }

    return () => {
      for (const e of events) {
        window.removeEventListener(e, handle);
      }
    };
  }, []);

  // Decode the beep/ring up front so they're ready before the countdown.
  useEffect(() => {
    void loadSound(BEEP_URL);
    void loadSound(RING_URL);
  }, []);

  async function handleNext() {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      const pauses = timer.pauseStats();
      const overtimeS = Math.max(0, timer.elapsedS - durationS);
      await repo.advanceTurn(
        game.id,
        timer.elapsedS,
        pauses.count,
        pauses.durationS,
        overtimeS,
      );
      await load();
      timer.reset();
    } catch {
      setError("Impossible de passer au tour suivant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd(
    winnerId: PlayerId,
    scores?: Array<{ playerId: PlayerId; score: number }>,
  ) {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      await repo.end(game.id, winnerId, scores);
      await load();
    } catch {
      setError("Impossible de terminer la partie.");
    } finally {
      setBusy(false);
    }
  }

  // Live scoring: set a player's absolute total (clamped for positive-only
  // games), persist it, then offer to end when the target is reached OR
  // exceeded — a turn can bring several points at once.
  async function setPlayerScore(playerId: PlayerId, raw: number) {
    if (!game) {
      return;
    }

    const allowNegative = game.boardgame.scoring?.allowNegative ?? false;
    const next = allowNegative ? Math.round(raw) : Math.max(0, Math.round(raw));

    setScores(s => ({ ...(s ?? {}), [playerId]: next }));
    try {
      await repo.setScore(game.id, playerId, next, game.round);
    } catch {
      setError("Impossible d'enregistrer le score.");

      return;
    }

    if (game.winThreshold !== null && next >= game.winThreshold) {
      // Close the score sheet and let the end prompt (which can override the
      // winner) take over — the two modals never stack.
      setScoreOpen(false);
      setEndOpen(true);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }
  if (error && !game) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (!game) {
    return <p className="text-sm text-zinc-500">Partie introuvable.</p>;
  }

  if (game.status === "ended") {
    return <EndedGame game={game} />;
  }

  const remainingS = durationS - timer.elapsedS;

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-sm uppercase tracking-wide text-zinc-400">
        Tour {game.round}
      </p>

      <TurnFlow
        players={game.players.map(p => p.player)}
        currentPlayerId={game.currentPlayerId}
        round={game.round}
      />

      <TimerRing
        remainingS={remainingS}
        durationS={durationS}
        running={timer.running}
        onToggle={timer.toggle}
      />

      <DurationEditor
        durationS={durationS}
        onChange={s => setDurationS(s)}
        onPause={timer.pause}
      />

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleNext}
        disabled={busy}
        className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Tour suivant →
      </button>

      {game.boardgame.scoring?.timing === "live" ? (
        <ScorePanel
          players={game.players}
          scores={scores ?? {}}
          threshold={game.winThreshold}
          allowNegative={game.boardgame.scoring.allowNegative ?? false}
          onSet={setPlayerScore}
          disabled={busy}
          open={scoreOpen}
          onOpenChange={setScoreOpen}
        />
      ) : null}

      {game.boardgame.scoring?.timing === "final" ? (
        <ScoreEntry
          players={game.players.map(p => p.player)}
          winCondition={game.boardgame.scoring.winCondition}
          onEnd={handleEnd}
          disabled={busy}
        />
      ) : (
        <WinnerPicker
          players={game.players.map(p => p.player)}
          onPick={handleEnd}
          disabled={busy}
        />
      )}

      {endOpen && scores ? (
        <LiveEndPrompt
          players={game.players.map(p => ({
            id: p.playerId,
            name: p.player.name,
          }))}
          scores={scores}
          defaultWinnerId={leaderByScore(
            game.players.map(p => ({
              playerId: p.playerId,
              score: scores[p.playerId] ?? 0,
            })),
            "highest",
          )}
          onEnd={winnerId => {
            setEndOpen(false);
            void handleEnd(winnerId);
          }}
          onCancel={() => setEndOpen(false)}
          disabled={busy}
        />
      ) : null}
    </div>
  );
}

const RING_SIZE = 240;
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

/** Neutral "on hold" colour (violet-500) the ring/readout adopt while paused. */
const PAUSE_COLOR = "#8b5cf6";

/** Formats a seconds count as raw seconds under a minute, else m:ss. */
function formatClock(totalS: number): string {
  if (totalS >= 60) {
    const minutes = Math.floor(totalS / 60);
    const seconds = totalS % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return String(totalS);
}

/**
 * The big ring readout. Under a minute we show raw seconds; from a minute up we
 * switch to m:ss so long turns (e.g. "3:00") stay readable instead of "180".
 * Once the turn runs out the readout flips to a count-up of the overtime taken
 * (prefixed with "+").
 */
function formatCountdown(remainingS: number): { value: string; label: string } {
  if (remainingS < 0) {
    return { value: `+${formatClock(-remainingS)}`, label: "dépassement" };
  }

  if (remainingS === 0) {
    return { value: "0", label: "temps écoulé" };
  }

  return {
    value: formatClock(remainingS),
    label:
      remainingS >= 60
        ? remainingS >= 120
          ? "minutes"
          : "minute"
        : "secondes",
  };
}

function TimerRing({
  remainingS,
  durationS,
  running,
  onToggle,
}: {
  remainingS: number;
  durationS: number;
  running: boolean;
  onToggle: () => void;
}) {
  const paused = !running;
  const overtime = remainingS < 0;
  // Running past zero → alarm: fill the ring and pulse it red (paused overtime
  // stays the neutral hold colour instead).
  const alarming = overtime && !paused;
  const ringColor = paused
    ? PAUSE_COLOR
    : countdownColor(remainingS, durationS);
  const progress = overtime
    ? 1
    : Math.max(0, Math.min(1, remainingS / durationS));
  const display = formatCountdown(remainingS);

  // A beep on each of the last 10 seconds, then the ring at 0 (real sounds
  // ported from board-nest). Paused → silent (the effect bails on !running).
  const beepedAt = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!running) {
      return;
    }

    if (remainingS >= 1 && remainingS <= 10) {
      playSound(BEEP_URL, 0.6, beepedAt.current, remainingS);
    }

    if (remainingS === 0) {
      playSound(RING_URL, 1, beepedAt.current, 0);
    }

    if (remainingS > 10) {
      beepedAt.current.clear();
    }
  }, [remainingS, running]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={running ? "Mettre en pause" : "Reprendre"}
      className="relative"
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      >
        <title>Chronomètre du tour</title>
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          className="text-black/10 dark:text-white/10"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke={ringColor}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - progress)}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          className={alarming ? "animate-overtime-ring" : undefined}
          style={{
            transition: "stroke-dashoffset 0.3s linear, stroke 0.2s ease",
          }}
        />
      </svg>

      {/* Big pause glyph fading in behind the readout while on hold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: paused ? 0.25 : 0 }}
      >
        <svg
          width="168"
          height="168"
          viewBox="0 0 24 24"
          fill={PAUSE_COLOR}
          aria-hidden
        >
          <title>Pause</title>
          <rect x="6" y="5" width="4" height="14" rx="1.5" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" />
        </svg>
      </span>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-5xl font-bold tabular-nums ${
            alarming ? "animate-overtime-text" : ""
          }`}
          style={
            alarming
              ? undefined
              : { color: ringColor, transition: "color 0.2s ease" }
          }
        >
          {display.value}
        </span>
        <span className="text-xs uppercase tracking-wide text-zinc-400">
          {display.label}
        </span>
        {paused ? (
          <span className="mt-1 text-xs font-semibold text-zinc-500">
            EN PAUSE
          </span>
        ) : null}
      </span>
    </button>
  );
}

function DurationEditor({
  durationS,
  onChange,
  onPause,
}: {
  durationS: number;
  onChange: (seconds: number) => void;
  onPause: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(durationS.toString());

  function start() {
    onPause(); // editing pauses the turn, as in board-nest
    setValue(durationS.toString());
    setOpen(true);
  }

  function apply() {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      onChange(Math.round(n));
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        Durée du tour : {durationS}s — modifier
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="Durée du tour en secondes"
        className="w-24 rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
      >
        Annuler
      </button>
    </div>
  );
}

function WinnerPicker({
  players,
  onPick,
  disabled,
}: {
  players: { id: PlayerId; name: string }[];
  onPick: (id: PlayerId) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
      >
        Terminer la partie
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Qui a gagné ?</p>
      {players.map(p => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(p.id)}
          className="rounded-lg border border-black/10 px-3 py-2 text-left transition hover:border-indigo-400 disabled:opacity-60 dark:border-white/10"
        >
          {p.name}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}

/**
 * End-of-game score entry for a game scored at the end (final total). Each
 * player gets a number; the leader (by the win condition's direction) is
 * proposed as winner and can be overridden by tapping a name (ties, house
 * rules). Ends once every score is in.
 */
function ScoreEntry({
  players,
  winCondition,
  onEnd,
  disabled,
}: {
  players: { id: PlayerId; name: string }[];
  winCondition: WinCondition;
  onEnd: (
    winnerId: PlayerId,
    scores: Array<{ playerId: PlayerId; score: number }>,
  ) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [override, setOverride] = useState<PlayerId | null>(null);

  const entries = players.map(p => {
    const text = raw[p.id]?.trim() ?? "";
    const n = Number(text);

    return {
      playerId: p.id,
      score: text !== "" && Number.isFinite(n) ? n : null,
    };
  });
  const allEntered = entries.every(e => e.score !== null);
  const winnerId =
    override ?? leaderByScore(entries, winnerDirection(winCondition));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
      >
        Terminer la partie
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Scores de fin</p>
      {players.map(p => {
        const isWinner = winnerId === p.id;

        return (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOverride(p.id)}
              className={`min-w-0 flex-1 truncate text-left text-sm ${
                isWinner
                  ? "font-semibold text-amber-600 dark:text-amber-500"
                  : ""
              }`}
            >
              {isWinner ? "🏆 " : ""}
              {p.name}
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={raw[p.id] ?? ""}
              onChange={e => setRaw(s => ({ ...s, [p.id]: e.target.value }))}
              aria-label={`Score de ${p.name}`}
              className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled || !allEntered || !winnerId}
        onClick={() => {
          if (winnerId) {
            onEnd(
              winnerId,
              entries.map(e => ({ playerId: e.playerId, score: e.score ?? 0 })),
            );
          }
        }}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Terminer
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}

// A single shared AudioContext, reused for every beep. Mobile browsers cap the
// number of AudioContexts (iOS allows only a handful) and suspend any created
// outside a user gesture — so creating one per beep (the previous approach)
// silently stopped firing after the first second or two on phones. We keep one
// and resume it on interaction instead.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }

  return sharedCtx;
}

/**
 * Resumes the shared AudioContext. Must be called from within a user gesture to
 * unlock audio on mobile (browsers start the context suspended otherwise).
 */
function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  // iOS won't unlock the audio output on resume() alone — it needs an actual
  // (silent) sound started from within the user gesture. Kick a 1-sample buffer.
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // best-effort
  }
}

const BEEP_URL = "/sounds/beep.mp3";
const RING_URL = "/sounds/ring.mp3";
const soundCache = new Map<string, AudioBuffer>();

/** Fetches + decodes a sound into the shared context, cached. */
async function loadSound(url: string): Promise<void> {
  if (soundCache.has(url)) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const bytes = await fetch(url).then(r => r.arrayBuffer());
    soundCache.set(url, await ctx.decodeAudioData(bytes));
  } catch {
    // Audio is best-effort; ignore load/decode failures.
  }
}

/** Plays a decoded sound on the shared context; deduped per `key`. */
function playSound(
  url: string,
  volume: number,
  fired: Set<number>,
  key: number,
) {
  if (fired.has(key)) {
    return;
  }
  fired.add(key);

  const ctx = getAudioContext();
  const buffer = soundCache.get(url);
  if (!ctx || !buffer) {
    return;
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  try {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio is best-effort; ignore unsupported environments.
  }
}
