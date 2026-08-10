/**
 * The play screen's countdown sounds (beep on the last seconds, ring at zero).
 *
 * Browser-only glue on purpose: it is all Web Audio, which only exists in a
 * real browser and only unlocks from a user gesture, so it lives next to the
 * screen that uses it rather than in `src/lib`.
 */

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
export function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume();
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

export const BEEP_URL = "/sounds/beep.mp3";
export const RING_URL = "/sounds/ring.mp3";
const soundCache = new Map<string, AudioBuffer>();

/** Fetches + decodes a sound into the shared context, cached. */
export async function loadSound(url: string): Promise<void> {
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
export function playSound(
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
    ctx.resume();
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
