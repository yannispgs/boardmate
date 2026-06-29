"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { GameId, PlayerId, PopulatedGame } from "@/lib/domain";
import { countdownColor } from "@/lib/game/colors";
import { useTurnTimer } from "@/lib/hooks/use-turn-timer";
import { getGameRepository } from "@/lib/repositories";

const DEFAULT_DURATION_S = 60;

export function PlayScreen({ gameId }: { gameId: GameId }) {
  const repo = getGameRepository();
  const [game, setGame] = useState<PopulatedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [durationS, setDurationS] = useState(DEFAULT_DURATION_S);
  const [busy, setBusy] = useState(false);

  const timer = useTurnTimer();

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

  async function handleNext() {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      await repo.advanceTurn(game.id, timer.elapsedS);
      await load();
      timer.reset();
    } catch {
      setError("Impossible de passer au tour suivant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd(winnerId: PlayerId) {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      await repo.end(game.id, winnerId);
      await load();
    } catch {
      setError("Impossible de terminer la partie.");
    } finally {
      setBusy(false);
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
    const winner = game.players.find(p => p.isWinner)?.player;
    return <Congrats winnerName={winner?.name ?? null} />;
  }

  const remainingS = durationS - timer.elapsedS;

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-sm uppercase tracking-wide text-zinc-400">
        Tour {game.round}
      </p>

      <CurrentPlayer name={game.currentPlayer?.name ?? "—"} />

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

      <WinnerPicker
        players={game.players.map(p => p.player)}
        onPick={handleEnd}
        disabled={busy}
      />

      <PlayerOrder
        players={game.players.map(p => p.player)}
        currentId={game.currentPlayerId}
      />
    </div>
  );
}

function CurrentPlayer({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase tracking-wide text-zinc-400">
        Au tour de
      </span>
      <span className="text-3xl font-bold tracking-tight">{name}</span>
    </div>
  );
}

const RING_SIZE = 240;
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

/** Neutral "on hold" colour (violet-500) the ring/readout adopt while paused. */
const PAUSE_COLOR = "#8b5cf6";

/**
 * The big ring readout. Under a minute we show raw seconds; from a minute up we
 * switch to m:ss so long turns (e.g. "3:00") stay readable instead of "180".
 */
function formatCountdown(remainingS: number): { value: string; label: string } {
  if (remainingS <= 0) {
    return { value: "0", label: "temps écoulé" };
  }

  if (remainingS >= 60) {
    const minutes = Math.floor(remainingS / 60);
    const seconds = remainingS % 60;

    return {
      value: `${minutes}:${String(seconds).padStart(2, "0")}`,
      label: minutes > 1 ? "minutes" : "minute",
    };
  }

  return { value: String(remainingS), label: "secondes" };
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
  const ringColor = paused
    ? PAUSE_COLOR
    : countdownColor(remainingS, durationS);
  const progress = Math.max(0, Math.min(1, remainingS / durationS));
  const display = formatCountdown(remainingS);

  // A light tick on each of the last 10 seconds, then a stronger ring at 0
  // (Web Audio, no asset needed). Paused → silent (the effect bails on !running).
  const beepedAt = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!running) {
      return;
    }

    if (remainingS >= 1 && remainingS <= 10) {
      playTone(880, 0.07, beepedAt.current, remainingS, 0.08);
    }

    if (remainingS === 0) {
      playTone(440, 0.4, beepedAt.current, 0, 0.2);
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
          style={{
            transition: "stroke-dashoffset 0.3s linear, stroke 0.2s ease",
          }}
        />
      </svg>

      {/* Big pause glyph fading in behind the readout while on hold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: paused ? 0.2 : 0 }}
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
          className="text-5xl font-bold tabular-nums"
          style={{ color: ringColor, transition: "color 0.2s ease" }}
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
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
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

function PlayerOrder({
  players,
  currentId,
}: {
  players: { id: PlayerId; name: string }[];
  currentId: PlayerId | null;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {players.map(player => (
        <li
          key={player.id}
          className={`rounded-full border px-3 py-1 text-sm ${
            player.id === currentId
              ? "border-indigo-500 font-semibold text-indigo-600 dark:text-indigo-400"
              : "border-black/10 text-zinc-500 dark:border-white/10"
          }`}
        >
          {player.name}
        </li>
      ))}
    </ul>
  );
}

function Congrats({ winnerName }: { winnerName: string | null }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <span aria-hidden className="text-6xl">
        🏆
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Partie terminée !</h2>
        {winnerName ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            Bravo <span className="font-semibold">{winnerName}</span> 🎉
          </p>
        ) : null}
      </div>
      <Link
        href="/games"
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
      >
        Retour aux parties
      </Link>
    </div>
  );
}

/** Plays a short tone via Web Audio; deduped per `key` so it fires once. */
function playTone(
  freq: number,
  durationS: number,
  fired: Set<number>,
  key: number,
  volume = 0.2,
) {
  if (fired.has(key)) {
    return;
  }
  fired.add(key);
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      return;
    }
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationS);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio is best-effort; ignore unsupported environments.
  }
}
