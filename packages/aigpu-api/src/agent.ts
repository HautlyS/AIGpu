import { effect, type Effect } from "./effect.ts";
import type { Gpu } from "./kernel.ts";

/** Visual states understood by the built-in agent animation shader. */
export type AgentStatus = "idle" | "thinking" | "working" | "waiting" | "success" | "error";

export type AgentColor = readonly [number, number, number, number];

export interface AgentColors {
  readonly accent: AgentColor;
  readonly secondary: AgentColor;
  readonly background: AgentColor;
}

export interface AgentAnimationState {
  readonly status: AgentStatus;
  readonly progress: number;
  readonly activity: number;
  readonly phase: number;
  readonly speed: number;
  readonly colors: AgentColors;
}

export interface AgentAnimationPatch {
  readonly status?: AgentStatus;
  /** Normalized task completion from 0 to 1. */
  readonly progress?: number;
  /** Normalized live activity from 0 to 1. */
  readonly activity?: number;
  /** Extra phase offset in radians. */
  readonly phase?: number;
  /** Pulse speed multiplier. */
  readonly speed?: number;
  readonly colors?: Partial<AgentColors>;
}

export interface AgentAnimationOptions {
  readonly label?: string;
  readonly initial?: AgentAnimationPatch;
  readonly colors?: Partial<AgentColors>;
}

export interface AgentAnimation {
  /** The fullscreen Effect to pass to frame.pass(). */
  readonly effect: Effect;
  /** A defensive snapshot of the current state. */
  readonly state: AgentAnimationState;
  /** Apply only the state fields that changed. */
  set(patch: AgentAnimationPatch): this;
  /** Feed the shader clock from aigpu's clock, an XR loop, or another ticker. */
  tick(timeSeconds: number): this;
  /** Return to the state supplied at construction time. */
  reset(): this;
}

const STATUS_INDEX: Readonly<Record<AgentStatus, number>> = {
  idle: 0,
  thinking: 1,
  working: 2,
  waiting: 3,
  success: 4,
  error: 5,
};

const PALETTES: Readonly<Record<AgentStatus, AgentColors>> = {
  idle: {
    accent: [0.36, 0.53, 0.9, 1],
    secondary: [0.1, 0.16, 0.34, 1],
    background: [0.008, 0.014, 0.04, 1],
  },
  thinking: {
    accent: [0.55, 0.7, 1, 1],
    secondary: [0.18, 0.25, 0.62, 1],
    background: [0.012, 0.018, 0.075, 1],
  },
  working: {
    accent: [0.35, 0.95, 1, 1],
    secondary: [0.06, 0.38, 0.65, 1],
    background: [0.005, 0.028, 0.06, 1],
  },
  waiting: {
    accent: [1, 0.72, 0.28, 1],
    secondary: [0.65, 0.23, 0.06, 1],
    background: [0.055, 0.022, 0.006, 1],
  },
  success: {
    accent: [0.3, 1, 0.55, 1],
    secondary: [0.04, 0.42, 0.2, 1],
    background: [0.004, 0.035, 0.018, 1],
  },
  error: {
    accent: [1, 0.32, 0.4, 1],
    secondary: [0.58, 0.06, 0.12, 1],
    background: [0.055, 0.006, 0.014, 1],
  },
};

/**
 * Fullscreen GPU animation for an AI agent. AIGpu does not own the agent or call a model:
 * set() is the only bridge from orchestration state to the shader.
 */
export function agentAnimation(gpu: Gpu, options: AgentAnimationOptions = {}): AgentAnimation {
  const initial = normalizePatch(options.initial ?? {});
  const initialColors = mergeColors(PALETTES[initial.status], options.colors, initial.colors);
  const state: MutableAgentState = {
    status: initial.status,
    progress: initial.progress,
    activity: initial.activity,
    phase: initial.phase,
    speed: initial.speed,
    colors: initialColors,
    time: 0,
  };
  const initialSnapshot = snapshot(state);
  const visual = effect(gpu, AGENT_ANIMATION_SHADER, {
    label: options.label ?? "agent-animation",
    set: uniforms(state),
  });

  return {
    effect: visual,
    get state(): AgentAnimationState { return snapshot(state); },
    set(patch: AgentAnimationPatch): AgentAnimation {
      applyPatch(state, patch);
      visual.set(uniforms(state));
      return this;
    },
    tick(timeSeconds: number): AgentAnimation {
      if (typeof timeSeconds !== "number" || !Number.isFinite(timeSeconds)) {
        throw new TypeError("agentAnimation.tick() expects a finite number of seconds");
      }
      state.time = Math.max(0, timeSeconds);
      visual.set({ params: { time: state.time } });
      return this;
    },
    reset(): AgentAnimation {
      state.status = initialSnapshot.status;
      state.progress = initialSnapshot.progress;
      state.activity = initialSnapshot.activity;
      state.phase = initialSnapshot.phase;
      state.speed = initialSnapshot.speed;
      state.colors = cloneColors(initialSnapshot.colors);
      state.time = 0;
      visual.set(uniforms(state));
      return this;
    },
  };
}

/** Stable numeric mapping used by custom shaders that consume the same status vocabulary. */
export function agentStatusIndex(status: AgentStatus): number {
  if (!Object.hasOwn(STATUS_INDEX, status)) throw new TypeError(`Unknown agent status: ${String(status)}`);
  return STATUS_INDEX[status];
}

const DEFAULT_STATE: AgentAnimationState = {
  status: "idle",
  progress: 0,
  activity: 0,
  phase: 0,
  speed: 1,
  colors: PALETTES.idle,
};

type MutableAgentState = {
  status: AgentStatus;
  progress: number;
  activity: number;
  phase: number;
  speed: number;
  colors: AgentColors;
  time: number;
};

function normalizePatch(patch: AgentAnimationPatch): Required<Omit<AgentAnimationPatch, "colors">> & { colors?: Partial<AgentColors> } {
  const status = patch.status ?? DEFAULT_STATE.status;
  agentStatusIndex(status);
  return {
    status,
    progress: normalized(patch.progress ?? DEFAULT_STATE.progress, "progress"),
    activity: normalized(patch.activity ?? DEFAULT_STATE.activity, "activity"),
    phase: finite(patch.phase ?? DEFAULT_STATE.phase, "phase"),
    speed: nonNegative(patch.speed ?? DEFAULT_STATE.speed, "speed"),
    colors: patch.colors,
  };
}

function applyPatch(state: MutableAgentState, patch: AgentAnimationPatch): void {
  const normalizedPatch = normalizePatch({
    status: patch.status ?? state.status,
    progress: patch.progress ?? state.progress,
    activity: patch.activity ?? state.activity,
    phase: patch.phase ?? state.phase,
    speed: patch.speed ?? state.speed,
    colors: patch.colors,
  });
  const statusChanged = normalizedPatch.status !== state.status;
  state.status = normalizedPatch.status;
  state.progress = normalizedPatch.progress;
  state.activity = normalizedPatch.activity;
  state.phase = normalizedPatch.phase;
  state.speed = normalizedPatch.speed;
  state.colors = mergeColors(statusChanged ? PALETTES[state.status] : state.colors, patch.colors, undefined);
}

function uniforms(state: MutableAgentState): { params: Record<string, unknown> } {
  return {
    params: {
      time: state.time,
      progress: state.progress,
      activity: state.activity,
      status: agentStatusIndex(state.status),
      phase: state.phase,
      speed: state.speed,
      pad: [0, 0],
      accent: state.colors.accent,
      secondary: state.colors.secondary,
      background: state.colors.background,
    },
  };
}

function snapshot(state: MutableAgentState): AgentAnimationState {
  return {
    status: state.status,
    progress: state.progress,
    activity: state.activity,
    phase: state.phase,
    speed: state.speed,
    colors: cloneColors(state.colors),
  };
}

function mergeColors(base: AgentColors, ...patches: Array<Partial<AgentColors> | undefined>): AgentColors {
  const result = { accent: base.accent, secondary: base.secondary, background: base.background };
  for (const patch of patches) {
    if (!patch) continue;
    for (const key of ["accent", "secondary", "background"] as const) {
      if (patch[key] !== undefined) result[key] = color(patch[key], `colors.${key}`);
    }
  }
  return result;
}

function cloneColors(colors: AgentColors): AgentColors {
  return {
    accent: [...colors.accent] as AgentColor,
    secondary: [...colors.secondary] as AgentColor,
    background: [...colors.background] as AgentColor,
  };
}

function color(value: readonly number[], name: string): AgentColor {
  if ((value.length !== 3 && value.length !== 4) || value.some((channel) => typeof channel !== "number" || !Number.isFinite(channel) || channel < 0 || channel > 1)) {
    throw new TypeError(`${name} must contain 3 or 4 finite numbers in the [0, 1] range`);
  }
  return [value[0], value[1], value[2], value[3] ?? 1];
}

function normalized(value: number, name: string): number {
  return clamp(finite(value, name), 0, 1);
}

function nonNegative(value: number, name: string): number {
  return Math.max(0, finite(value, name));
}

function finite(value: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const AGENT_ANIMATION_SHADER = /* wgsl */ `
struct AgentParams {
  time: f32,
  progress: f32,
  activity: f32,
  status: f32,
  phase: f32,
  speed: f32,
  pad: vec2f,
  accent: vec4f,
  secondary: vec4f,
  background: vec4f,
}

@group(0) @binding(0) var<uniform> params: AgentParams;

const TAU: f32 = 6.28318530718;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = uv - vec2f(0.5);
  let distance = length(p);
  let angle = atan2(p.y, p.x);
  let normalizedAngle = fract(angle / TAU + 1.0);
  let statusPulse = 0.65 + 0.35 * sin(params.time * params.speed + params.phase);
  let activity = max(params.activity, 0.08);
  let radius = 0.205 + activity * 0.035;
  let core = 1.0 - smoothstep(radius - 0.025, radius, distance);
  let ringDistance = abs(distance - radius - 0.055 - statusPulse * 0.018);
  let ring = 1.0 - smoothstep(0.012, 0.035, ringDistance);
  let progressArc = select(0.0, 1.0, normalizedAngle <= params.progress);
  let arcDistance = abs(distance - radius - 0.055);
  let arc = progressArc * (1.0 - smoothstep(0.012, 0.03, arcDistance));
  let haloDistance = abs(distance - radius - 0.11 - statusPulse * 0.025);
  let halo = (1.0 - smoothstep(0.01, 0.08, haloDistance)) * (0.25 + activity * 0.35);
  let grain = fract(sin(dot(uv + params.phase, vec2f(12.9898, 78.233))) * 43758.5453);
  let glow = core * (0.75 + statusPulse * 0.25) + ring * 0.45 + halo * 0.3;
  let mixed = params.secondary.rgb * (0.45 + halo) + params.background.rgb * (1.0 - halo) + params.accent.rgb * glow;
  let progressColor = mix(mixed, params.accent.rgb, arc);
  let grainAmount = (grain - 0.5) * 0.012;
  return vec4f(max(progressColor + vec3f(grainAmount), vec3f(0.0)), 1.0);
}
`;
