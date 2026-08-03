import type { MascotReaction } from "./mascotState";

export type MascotSound = "bigHowl" | "growl" | "quietHowl";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const HOWL_CLIPS = {
  bigHowl: ["howl4big.wav", "howl5big.wav"],
  quietHowl: ["howl1quiet.wav", "howl2quiet.wav", "howl3quiet.wav"],
} as const;

type HowlSound = keyof typeof HOWL_CLIPS;

const howlQueues: Record<HowlSound, string[]> = {
  bigHowl: [],
  quietHowl: [],
};
const lastHowlClip: Partial<Record<HowlSound, string>> = {};

let activeHowl: HTMLAudioElement | null = null;
let sharedContext: AudioContext | null = null;

export function mascotSoundForReaction(
  reaction: MascotReaction,
): MascotSound | null {
  if (reaction === "perfectAnswer" || reaction === "closeAnswer") {
    return "bigHowl";
  }
  if (reaction === "averageAnswer") return "quietHowl";
  if (reaction === "wideAnswer") return "growl";
  return null;
}

function shuffleClips(clips: readonly string[]) {
  const shuffled = [...clips];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function nextMascotHowlClip(sound: HowlSound) {
  const queue = howlQueues[sound];
  if (queue.length === 0) {
    queue.push(...shuffleClips(HOWL_CLIPS[sound]));
    const lastClip = lastHowlClip[sound];
    const nextIndex = queue.length - 1;
    if (lastClip === queue[nextIndex] && queue.length > 1) {
      [queue[0], queue[nextIndex]] = [queue[nextIndex], queue[0]];
    }
  }

  const clip = queue.pop() ?? HOWL_CLIPS[sound][0];
  lastHowlClip[sound] = clip;
  return clip;
}

function contextForPlayback() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContextConstructor();
  }
  return sharedContext;
}

function noiseBuffer(context: AudioContext, duration: number) {
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function envelope(
  gain: AudioParam,
  start: number,
  peak: number,
  attack: number,
  duration: number,
) {
  gain.setValueAtTime(0.0001, start);
  gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.exponentialRampToValueAtTime(0.0001, start + duration);
}

function growl(context: AudioContext, start: number) {
  const output = context.createGain();
  const filter = context.createBiquadFilter();
  output.gain.value = 0.09;
  filter.type = "lowpass";
  filter.frequency.value = 380;
  filter.Q.value = 2.2;
  filter.connect(output).connect(context.destination);

  for (const frequency of [68, 76]) {
    const voice = context.createOscillator();
    const voiceGain = context.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(frequency, start);
    voice.frequency.linearRampToValueAtTime(frequency - 8, start + 0.92);
    envelope(voiceGain.gain, start, 0.22, 0.06, 0.96);
    voice.connect(voiceGain).connect(filter);
    voice.start(start);
    voice.stop(start + 0.98);
  }

  const rasp = context.createBufferSource();
  const raspGain = context.createGain();
  rasp.buffer = noiseBuffer(context, 0.9);
  envelope(raspGain.gain, start, 0.09, 0.08, 0.9);
  rasp.connect(raspGain).connect(filter);
  rasp.start(start);
}

function playHowl(sound: HowlSound) {
  if (typeof Audio === "undefined") return;

  if (activeHowl) {
    activeHowl.pause();
    activeHowl.currentTime = 0;
  }

  const clip = nextMascotHowlClip(sound);
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const audio = new Audio(`${baseUrl}audio/mascot/howls/${clip}`);
  activeHowl = audio;
  audio.preload = "auto";
  audio.volume = 0.72;

  const clearActiveHowl = () => {
    if (activeHowl === audio) activeHowl = null;
  };
  audio.addEventListener("ended", clearActiveHowl, { once: true });
  audio.addEventListener("error", clearActiveHowl, { once: true });

  const playback = audio.play();
  if (playback) void playback.catch(clearActiveHowl);
}

export function playMascotSound(reaction: MascotReaction) {
  const sound = mascotSoundForReaction(reaction);
  if (!sound || typeof document === "undefined") return;
  if (document.visibilityState === "hidden") return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return;
  }

  if (sound === "bigHowl" || sound === "quietHowl") {
    playHowl(sound);
    return;
  }

  const context = contextForPlayback();
  if (!context) return;

  const schedule = () => growl(context, context.currentTime + 0.015);
  if (context.state === "suspended") {
    void context.resume().then(schedule).catch(() => {});
  } else {
    schedule();
  }
}
