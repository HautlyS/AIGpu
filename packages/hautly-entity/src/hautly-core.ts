/**
 * Hautly Core — alive ASCII entity engine.
 *
 * Manages the entity lifecycle: mood, breathing, eye tracking, particle aura,
 * speech state, and frame generation. The core is rendering-agnostic — any
 * renderer (terminal, canvas, WebGPU) consumes its output.
 */

// ─── Entity Types ────────────────────────────────────────────────────────────

export type HautlyMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "excited"
  | "sleepy"
  | "error"
  | "healing";

export type HautlyForm = "orb" | "crystal" | "jelly" | "phoenix" | "nebula" | "custom";

export type EyeDirection = "center" | "left" | "right" | "up" | "down" | "blink";

export interface HautlyState {
  mood: HautlyMood;
  form: HautlyForm;
  eye: EyeDirection;
  breath: number;
  pulse: number;
  energy: number;
  age: number;
  speaking: boolean;
  speechText: string;
  speechProgress: number;
  particles: readonly Particle[];
  auraIntensity: number;
  blinkTimer: number;
  emotionDecay: number;
}

export interface Particle {
  readonly char: string;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly vx: number;
  readonly vy: number;
}

export interface HautlyPatch {
  mood?: HautlyMood;
  form?: HautlyForm;
  eye?: EyeDirection;
  energy?: number;
  speaking?: boolean;
  speechText?: string;
}

export interface HautlyOptions {
  label?: string;
  form?: HautlyForm;
  initial?: HautlyPatch;
  maxParticles?: number;
  breathRate?: number;
  blinkInterval?: number;
  speechSpeed?: number;
  onMoodChange?: (mood: HautlyMood) => void;
  onSpeak?: (text: string) => void;
}

export interface HautlyEngine {
  readonly state: HautlyState;
  readonly label: string;
  set(patch: HautlyPatch): this;
  tick(dt: number): this;
  speak(text: string): this;
  stopSpeaking(): this;
  blink(): this;
  reset(): this;
  frame(width: number, height: number): FrameOutput;
}

export interface FrameOutput {
  readonly cells: readonly string[];
  readonly colors: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly speechBubble: SpeechBubble | null;
}

export interface SpeechBubble {
  readonly text: string;
  readonly progress: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly tailX: number;
  readonly tailY: number;
}

// ─── Mood Palettes ───────────────────────────────────────────────────────────

export interface MoodPalette {
  readonly core: string;
  readonly ring: string;
  readonly aura: string;
  readonly eye: string;
  readonly particle: string;
  readonly speech: string;
}

export const MOOD_PALETTES: Readonly<Record<HautlyMood, MoodPalette>> = {
  idle: {
    core: "\x1b[38;2;100;200;255m",
    ring: "\x1b[38;2;60;120;200m",
    aura: "\x1b[38;2;30;80;160m",
    eye: "\x1b[38;2;255;255;255m",
    particle: "\x1b[38;2;150;200;255m",
    speech: "\x1b[38;2;200;230;255m",
  },
  listening: {
    core: "\x1b[38;2;120;220;180m",
    ring: "\x1b[38;2;60;180;120m",
    aura: "\x1b[38;2;30;100;60m",
    eye: "\x1b[38;2;255;255;200m",
    particle: "\x1b[38;2;150;255;200m",
    speech: "\x1b[38;2;200;255;230m",
  },
  thinking: {
    core: "\x1b[38;2;180;140;255m",
    ring: "\x1b[38;2;120;80;220m",
    aura: "\x1b[38;2;80;40;160m",
    eye: "\x1b[38;2;255;240;255m",
    particle: "\x1b[38;2;200;160;255m",
    speech: "\x1b[38;2;230;210;255m",
  },
  speaking: {
    core: "\x1b[38;2;255;200;80m",
    ring: "\x1b[38;2;220;160;40m",
    aura: "\x1b[38;2;160;100;20m",
    eye: "\x1b[38;2;255;255;220m",
    particle: "\x1b[38;2;255;220;120m",
    speech: "\x1b[38;2;255;240;180m",
  },
  excited: {
    core: "\x1b[38;2;255;100;120m",
    ring: "\x1b[38;2;255;60;80m",
    aura: "\x1b[38;2;200;30;50m",
    eye: "\x1b[38;2;255;255;255m",
    particle: "\x1b[38;2;255;150;160m",
    speech: "\x1b[38;2;255;200;210m",
  },
  sleepy: {
    core: "\x1b[38;2;120;140;180m",
    ring: "\x1b[38;2;80;100;140m",
    aura: "\x1b[38;2;50;60;90m",
    eye: "\x1b[38;2;180;200;220m",
    particle: "\x1b[38;2;100;120;160m",
    speech: "\x1b[38;2;160;180;200m",
  },
  error: {
    core: "\x1b[38;2;255;60;60m",
    ring: "\x1b[38;2;200;30;30m",
    aura: "\x1b[38;2;150;20;20m",
    eye: "\x1b[38;2;255;200;200m",
    particle: "\x1b[38;2;255;100;100m",
    speech: "\x1b[38;2;255;180;180m",
  },
  healing: {
    core: "\x1b[38;2;100;255;150m",
    ring: "\x1b[38;2;60;200;100m",
    aura: "\x1b[38;2;30;150;60m",
    eye: "\x1b[38;2;220;255;230m",
    particle: "\x1b[38;2;150;255;180m",
    speech: "\x1b[38;2;200;255;220m",
  },
};

// ─── Default Values ──────────────────────────────────────────────────────────

const DEFAULTS: Required<HautlyPatch> & { maxParticles: number; breathRate: number; blinkInterval: number; speechSpeed: number } = {
  mood: "idle",
  form: "orb",
  eye: "center",
  energy: 0.5,
  speaking: false,
  speechText: "",
  maxParticles: 40,
  breathRate: 1.2,
  blinkInterval: 3.5,
  speechSpeed: 30,
};

// ─── Noise Helper ────────────────────────────────────────────────────────────

function noise(x: number, y: number, t: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + t * 43.5453) * 43758.5453;
  return s - Math.floor(s);
}

// ─── Engine Factory ──────────────────────────────────────────────────────────

export function createHautly(options: HautlyOptions = {}): HautlyEngine {
  const label = options.label ?? "hautly";
  const maxParticles = options.maxParticles ?? DEFAULTS.maxParticles;
  const breathRate = options.breathRate ?? DEFAULTS.breathRate;
  const blinkInterval = options.blinkInterval ?? DEFAULTS.blinkInterval;
  const speechSpeed = options.speechSpeed ?? DEFAULTS.speechSpeed;

  const state: HautlyState = {
    mood: options.initial?.mood ?? DEFAULTS.mood,
    form: options.initial?.form ?? DEFAULTS.form,
    eye: DEFAULTS.eye,
    breath: 0,
    pulse: 0,
    energy: options.initial?.energy ?? DEFAULTS.energy,
    age: 0,
    speaking: DEFAULTS.speaking,
    speechText: DEFAULTS.speechText,
    speechProgress: 0,
    particles: [],
    auraIntensity: 0.5,
    blinkTimer: blinkInterval,
    emotionDecay: 0,
  };

  const initialMood = state.mood;

  return {
    get state(): HautlyState { return { ...state, particles: [...state.particles] }; },
    label,

    set(patch: HautlyPatch): HautlyEngine {
      if (patch.mood !== undefined && patch.mood !== state.mood) {
        const prev = state.mood;
        state.mood = patch.mood;
        state.emotionDecay = 0;
        options.onMoodChange?.(patch.mood);
      }
      if (patch.form !== undefined) state.form = patch.form;
      if (patch.eye !== undefined) state.eye = patch.eye;
      if (patch.energy !== undefined) state.energy = clamp01(patch.energy);
      if (patch.speaking !== undefined) state.speaking = patch.speaking;
      if (patch.speechText !== undefined) {
        state.speechText = patch.speechText;
        state.speechProgress = 0;
        state.speaking = patch.speechText.length > 0;
        options.onSpeak?.(patch.speechText);
      }
      return this;
    },

    tick(dt: number): HautlyEngine {
      const t = state.age;
      state.age += dt;

      // Breathing: sinusoidal with mood-dependent rate
      const rate = state.mood === "excited" ? breathRate * 2 : state.mood === "sleepy" ? breathRate * 0.4 : breathRate;
      state.breath = Math.sin(state.age * rate * Math.PI * 2) * 0.5 + 0.5;

      // Pulse: heartbeat-like
      state.pulse = Math.pow(Math.sin(state.age * Math.PI * 2) * 0.5 + 0.5, 3);

      // Eye tracking
      state.blinkTimer -= dt;
      if (state.blinkTimer <= 0) {
        state.eye = "blink";
        state.blinkTimer = blinkInterval + (Math.random() - 0.5) * 0.8;
        setTimeout(() => { if (state.eye === "blink") state.eye = "center"; }, 120);
      }

      // Random eye wander when idle
      if (state.eye !== "blink" && state.mood === "idle" && Math.random() < 0.02) {
        const dirs: EyeDirection[] = ["center", "left", "right", "up", "down"];
        state.eye = dirs[Math.floor(Math.random() * dirs.length)];
      }

      // Aura intensity
      state.auraIntensity = 0.3 + state.breath * 0.4 + (state.speaking ? 0.3 : 0);

      // Speech progress
      if (state.speaking && state.speechText) {
        state.speechProgress = Math.min(1, state.speechProgress + dt * speechSpeed / state.speechText.length);
      }

      // Particle system
      const particles = [...state.particles] as Particle[];
      // Update existing
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const alpha = p.alpha - dt * 0.6;
        if (alpha <= 0) { particles.splice(i, 1); continue; }
        particles[i] = { ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, alpha } as Particle;
      }
      // Spawn new
      const spawnRate = state.speaking ? 6 : state.mood === "excited" ? 4 : 2;
      while (particles.length < maxParticles) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.8;
        particles.push({
          char: pickParticleChar(state.mood),
          x: Math.cos(angle) * (0.3 + Math.random() * 0.2),
          y: Math.sin(angle) * (0.3 + Math.random() * 0.2),
          alpha: 0.3 + Math.random() * 0.7,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      }
      state.particles = particles;

      // Emotion decay toward idle
      state.emotionDecay += dt;
      if (state.emotionDecay > 8 && state.mood !== "error" && state.mood !== "healing") {
        state.mood = "idle";
      }

      return this;
    },

    speak(text: string): HautlyEngine {
      return this.set({ speaking: true, speechText: text, mood: "speaking" });
    },

    stopSpeaking(): HautlyEngine {
      return this.set({ speaking: false, speechProgress: 0 });
    },

    blink(): HautlyEngine {
      state.eye = "blink";
      setTimeout(() => { if (state.eye === "blink") state.eye = "center"; }, 120);
      return this;
    },

    reset(): HautlyEngine {
      state.mood = initialMood;
      state.eye = "center";
      state.breath = 0;
      state.pulse = 0;
      state.age = 0;
      state.speaking = false;
      state.speechText = "";
      state.speechProgress = 0;
      state.particles = [];
      state.auraIntensity = 0.5;
      return this;
    },

    frame(width: number, height: number): FrameOutput {
      return generateFrame(state, width, height);
    },
  };
}

// ─── Frame Generation ────────────────────────────────────────────────────────

function generateFrame(state: HautlyState, width: number, height: number): FrameOutput {
  const cells: string[] = [];
  const colors: string[] = [];
  const palette = MOOD_PALETTES[state.mood];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;
  const breathOffset = state.breath * 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Core orb
      if (dist < 1.0 + breathOffset * 0.05) {
        const innerGlow = Math.max(0, 1 - dist);
        const ringZone = Math.abs(dist - 0.85 - breathOffset * 0.03);

        // Eye region
        if (state.eye !== "blink" && dist < 0.35 && Math.abs(dy + 0.05) < 0.12) {
          const isLeftEye = Math.abs(dx - 0.15) < 0.1;
          const isRightEye = Math.abs(dx + 0.15) < 0.1;
          if (isLeftEye || isRightEye) {
            const eyeOffX = state.eye === "left" ? -0.03 : state.eye === "right" ? 0.03 : 0;
            const eyeOffY = state.eye === "up" ? -0.02 : state.eye === "down" ? 0.02 : 0;
            const inPupil = Math.abs(dx - (isLeftEye ? 0.15 : -0.15) - eyeOffX) < 0.04 && Math.abs(dy + 0.05 - eyeOffY) < 0.04;
            if (inPupil) {
              cells.push("@");
              colors.push(palette.eye);
              continue;
            }
            cells.push("o");
            colors.push(palette.eye);
            continue;
          }
        }

        // Ring
        if (ringZone < 0.06) {
          const ch = pickRingChar(angle, state.age);
          cells.push(ch);
          colors.push(palette.ring);
          continue;
        }

        // Core body
        const ch = pickCoreChar(dist, angle, state.age, state.mood);
        const intensity = 0.3 + innerGlow * 0.5 + state.pulse * 0.2;
        cells.push(ch);
        colors.push(palette.core + ";2;" + String(Math.round(intensity * 255)));
        continue;
      }

      // Aura / outer glow
      if (dist < 1.8) {
        const auraAlpha = Math.max(0, 1 - (dist - 1.0) / 0.8) * state.auraIntensity;
        if (auraAlpha > 0.1) {
          const n = noise(x * 0.3, y * 0.3, state.age);
          if (n < auraAlpha) {
            cells.push(pickAuraChar(angle + state.age));
            colors.push(palette.aura);
            continue;
          }
        }
      }

      // Particles
      let particleHit = false;
      for (const p of state.particles) {
        const px = cx + p.x * radius;
        const py = cy + p.y * radius;
        if (Math.abs(x - px) < 1 && Math.abs(y - py) < 1 && p.alpha > 0.2) {
          cells.push(p.char);
          colors.push(p.palette ? p.palette : palette.particle);
          particleHit = true;
          break;
        }
      }
      if (particleHit) continue;

      // Empty space
      cells.push(" ");
      colors.push("");
    }
  }

  // Speech bubble overlay
  const speechBubble = state.speaking && state.speechText
    ? computeSpeechBubble(state, width, height)
    : null;

  if (speechBubble) {
    renderSpeechBubble(cells, colors, speechBubble, palette, width);
  }

  return { cells, colors, width, height, speechBubble };
}

// ─── Character Pickers ───────────────────────────────────────────────────────

const CORE_CHARS_IDLE = " .,:;i1tfLCG08#";
const CORE_CHARS_THINKING = " ·∶:░▒▓█";
const CORE_CHARS_SPEAKING = " .oO0@*#";
const CORE_CHARS_EXCITED = " *+.#@%&";
const CORE_CHARS_SLEEPY = " .··::---";
const CORE_CHARS_ERROR = " !@#$%^&";
const CORE_CHARS_HEALING = " +*.:oO@";

function pickCoreChar(dist: number, angle: number, t: number, mood: HautlyMood): string {
  const chars =
    mood === "thinking" ? CORE_CHARS_THINKING :
    mood === "speaking" ? CORE_CHARS_SPEAKING :
    mood === "excited" ? CORE_CHARS_EXCITED :
    mood === "sleepy" ? CORE_CHARS_SLEEPY :
    mood === "error" ? CORE_CHARS_ERROR :
    mood === "healing" ? CORE_CHARS_HEALING :
    CORE_CHARS_IDLE;
  const idx = Math.floor((dist * 0.5 + Math.sin(angle * 3 + t * 2) * 0.3 + 0.5) * (chars.length - 1));
  return chars[Math.max(0, Math.min(chars.length - 1, idx))];
}

function pickRingChar(angle: number, t: number): string {
  const chars = "·:;|=+*#%@";
  const idx = Math.floor(((angle / Math.PI + 1) * 0.5 + Math.sin(t * 3) * 0.1) * chars.length) % chars.length;
  return chars[Math.abs(idx)];
}

function pickAuraChar(angle: number): string {
  const chars = "·.:*+";
  const idx = Math.floor(((angle / Math.PI + 1) * 0.5) * chars.length) % chars.length;
  return chars[Math.abs(idx)];
}

function pickParticleChar(mood: HautlyMood): string {
  const sets: Record<string, string[]> = {
    idle: [".", "+", "~"],
    listening: ["o", "O", "."],
    thinking: ["?", ".", "·"],
    speaking: ["~", "!", "*"],
    excited: ["*", "!", "+", "#"],
    sleepy: ["z", "Z", "."],
    error: ["!", "x", "#"],
    healing: ["+", "*", "o"],
  };
  const s = sets[mood] ?? sets.idle;
  return s[Math.floor(Math.random() * s.length)];
}

// ─── Speech Bubble ───────────────────────────────────────────────────────────

function computeSpeechBubble(state: HautlyState, width: number, height: number): SpeechBubble {
  const visibleChars = Math.floor(state.speechText.length * state.speechProgress);
  const text = state.speechText.slice(0, visibleChars);
  const maxW = Math.min(width - 4, 40);
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(line);

  const bw = Math.min(maxW + 4, Math.max(...lines.map(l => l.length)) + 4);
  const bh = lines.length + 2;
  const bx = Math.min(width - bw - 1, Math.max(1, width / 2 - bw / 2));
  const by = Math.max(1, Math.floor(height * 0.15));
  const tailX = Math.floor(width / 2);
  const tailY = by + bh;

  return { text, progress: state.speechProgress, x: bx, y: by, width: bw, height: bh, tailX, tailY };
}

function renderSpeechBubble(
  cells: string[],
  colors: string[],
  bubble: SpeechBubble,
  palette: MoodPalette,
  width: number,
): void {
  const { x, y, width: bw, height: bh, text } = bubble;
  const visibleChars = Math.floor(text.length * bubble.progress);
  const visibleText = text.slice(0, visibleChars);
  const lines = wrapText(visibleText, bw - 2);

  for (let row = 0; row < bh; row++) {
    for (let col = 0; col < bw; col++) {
      const idx = (y + row) * width + (x + col);
      if (idx < 0 || idx >= cells.length) continue;

      let ch = " ";
      if (row === 0) ch = col === 0 ? "╭" : col === bw - 1 ? "╮" : "─";
      else if (row === bh - 1) ch = col === 0 ? "╰" : col === bw - 1 ? "╯" : "─";
      else if (col === 0 || col === bw - 1) ch = "│";
      else if (row - 1 < lines.length) {
        const lineText = lines[row - 1];
        const charIdx = col - 1;
        if (charIdx < lineText.length) ch = lineText[charIdx];
      }

      cells[idx] = ch;
      colors[idx] = palette.speech;
    }
  }

  // Tail
  const tailIdx = bubble.tailY * width + bubble.tailX;
  if (tailIdx >= 0 && tailIdx < cells.length) {
    cells[tailIdx] = "∧";
    colors[tailIdx] = palette.speech;
  }
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > maxLen && line) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
