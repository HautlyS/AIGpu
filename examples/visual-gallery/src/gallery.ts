import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@aigpu/wgsl";
import type { AgentAnimationPatch, AgentStatus } from "aigpu";

export type VisualMood = "anime" | "enterprise" | "psychedelic" | "calm" | "celebration" | "glitch" | "minimal" | "cosmic";

export interface VisualRecipe {
  readonly id: string;
  readonly title: string;
  readonly mood: VisualMood;
  readonly bestFor: string;
  readonly shader: string;
  readonly initial: AgentAnimationPatch;
  readonly events: readonly AgentAnimationPatch[];
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../shaders");

const definitions = [
  ["anime-hologram", "Anime Hologram", "anime", "Friendly copilots, character UIs, and onboarding", { status: "thinking", activity: 0.72, progress: 0.34, speed: 1.35 }, [{ status: "working", progress: 0.68, activity: 0.9 }, { status: "success", progress: 1, activity: 0.2 }]],
  ["enterprise-orbit", "Enterprise Orbit", "enterprise", "Mission control, distributed jobs, and observability walls", { status: "working", activity: 0.8, progress: 0.62, speed: 0.7 }, [{ status: "waiting", activity: 0.12 }, { status: "working", progress: 0.9, activity: 0.7 }]],
  ["psychedelic-neural", "Psychedelic Neural Bloom", "psychedelic", "Creative agents, generative art, and ideation sessions", { status: "thinking", activity: 0.95, progress: 0.18, speed: 2.4 }, [{ status: "working", progress: 0.55, activity: 1, phase: 1.4 }, { status: "success", progress: 1, activity: 0.5 }]],
  ["calm-ocean", "Calm Ocean", "calm", "Waiting rooms, rate limits, human approval, and async work", { status: "waiting", activity: 0.18, progress: 0.42, speed: 0.35 }, [{ status: "working", activity: 0.45 }, { status: "success", progress: 1, activity: 0.2 }]],
  ["success-confetti", "Success Confetti", "celebration", "Completed plans, tool calls, deployments, and handoffs", { status: "success", activity: 0.35, progress: 1, speed: 1.8 }, [{ status: "success", phase: 2.1, activity: 1 }]],
  ["error-glitch", "Error Glitch", "glitch", "Recoverable errors, retries, validation, and incident states", { status: "error", activity: 0.68, progress: 0.27, speed: 3.1 }, [{ status: "working", activity: 0.45 }, { status: "error", phase: 3.14, activity: 0.95 }]],
  ["minimal-focus", "Minimal Focus", "minimal", "Dense productivity surfaces and accessible low-noise status", { status: "working", activity: 0.5, progress: 0.5, speed: 0.5 }, [{ status: "waiting", activity: 0.08 }, { status: "success", progress: 1, activity: 0.12 }]],
  ["cosmic-constellation", "Cosmic Constellation", "cosmic", "Multi-agent graphs, research maps, and long-running reasoning", { status: "thinking", activity: 0.84, progress: 0.12, speed: 1.1 }, [{ status: "working", progress: 0.48, activity: 0.9 }, { status: "success", progress: 1, activity: 0.3 }]],
] as const;

export const visualRecipes: readonly VisualRecipe[] = definitions.map(([id, title, mood, bestFor, initial, events]) => ({
  id,
  title,
  mood,
  bestFor,
  shader: resolve(root, `${id}.wgsl`),
  initial,
  events,
}));

export async function loadRecipe(recipe: VisualRecipe): Promise<string> {
  const source = await readFile(recipe.shader, "utf8");
  compile(source);
  return source;
}

export function simulateRecipe(recipe: VisualRecipe): AgentAnimationPatch[] {
  return [recipe.initial, ...recipe.events];
}

export function statusSequence(recipe: VisualRecipe): AgentStatus[] {
  return simulateRecipe(recipe).map((event) => event.status ?? "idle");
}
