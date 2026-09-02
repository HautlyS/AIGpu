/**
 * Hautly Renderers — pre-built ASCII entity forms.
 *
 * Each renderer returns a grid of characters + ANSI colors for a given entity
 * form, mood, and time. These are pure functions consumed by terminal, canvas,
 * or WebGPU backends.
 */

import type { HautlyState, MoodPalette, HautlyMood } from "./hautly-core.ts";
import { MOOD_PALETTES } from "./hautly-core.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RenderedFrame {
  readonly cells: readonly string[];
  readonly colors: readonly string[];
  readonly width: number;
  readonly height: number;
}

export interface Renderer {
  readonly name: string;
  render(state: HautlyState, width: number, height: number): RenderedFrame;
}

// ─── Noise ───────────────────────────────────────────────────────────────────

function hash(x: number, y: number, s: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + s * 43.5453) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, t: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hash(ix, iy, t), b = hash(ix + 1, iy, t);
  const c = hash(ix, iy + 1, t), d = hash(ix + 1, iy + 1, t);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// ─── Orb Renderer (default) ──────────────────────────────────────────────────

export const orbRenderer: Renderer = {
  name: "orb",

  render(state: HautlyState, width: number, height: number): RenderedFrame {
    const cells: string[] = [];
    const colors: string[] = [];
    const palette = MOOD_PALETTES[state.mood];
    const cx = width / 2, cy = height / 2;
    const r = Math.min(width, height) * 0.3;
    const breathScale = 1 + state.breath * 0.06;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / (r * breathScale);
        const dy = (y - cy) / (r * breathScale);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        if (dist < 1.0) {
          // Eyes
          if (state.eye !== "blink" && dist < 0.35 && Math.abs(dy + 0.05) < 0.1) {
            const le = Math.abs(dx - 0.15) < 0.08;
            const re = Math.abs(dx + 0.15) < 0.08;
            if (le || re) {
              const ex = state.eye === "left" ? -0.02 : state.eye === "right" ? 0.02 : 0;
              const ey = state.eye === "up" ? -0.015 : state.eye === "down" ? 0.015 : 0;
              const pupil = Math.abs(dx - (le ? 0.15 : -0.15) - ex) < 0.03 && Math.abs(dy + 0.05 - ey) < 0.03;
              cells.push(pupil ? "@" : "o");
              colors.push(pupil ? "\x1b[38;2;0;0;0m" : palette.eye);
              continue;
            }
          }

          const ringDist = Math.abs(dist - 0.82);
          if (ringDist < 0.06) {
            const ci = Math.floor(((angle / Math.PI + 1) * 0.5 + state.age * 0.5) * 10) % 10;
            cells.push("·:;|=+*#%@"[ci]);
            colors.push(palette.ring);
            continue;
          }

          const glow = Math.pow(1 - dist, 0.5);
          const ci = Math.floor(glow * 14);
          cells.push(" .,:;i1tfLCG08#"[ci]);
          colors.push(palette.core);
          continue;
        }

        // Outer glow
        if (dist < 1.6) {
          const aura = Math.max(0, 1 - (dist - 1.0) / 0.6) * state.auraIntensity;
          const n = smoothNoise(x * 0.2, y * 0.2, state.age * 0.8);
          if (n < aura * 0.8) {
            cells.push("·.:*+"[Math.floor(n * 5)]);
            colors.push(palette.aura);
            continue;
          }
        }

        cells.push(" ");
        colors.push("");
      }
    }

    return { cells, colors, width, height };
  },
};

// ─── Crystal Renderer ────────────────────────────────────────────────────────

export const crystalRenderer: Renderer = {
  name: "crystal",

  render(state: HautlyState, width: number, height: number): RenderedFrame {
    const cells: string[] = [];
    const colors: string[] = [];
    const palette = MOOD_PALETTES[state.mood];
    const cx = width / 2, cy = height / 2;
    const r = Math.min(width, height) * 0.3;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / r, dy = (y - cy) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Crystal shape: diamond with facets
        const diamond = Math.abs(dx) + Math.abs(dy);
        const facet = Math.abs(Math.sin(angle * 4 + state.age * 0.3)) * 0.15;

        if (diamond < 1.0 + facet) {
          // Facet lines
          const facetLine = Math.abs(Math.sin(angle * 8)) < 0.08;
          if (facetLine && dist > 0.2) {
            cells.push("│");
            colors.push(palette.ring);
            continue;
          }

          // Internal refraction pattern
          const refract = Math.sin(dx * 5 + state.age * 2) * Math.cos(dy * 5 - state.age) * 0.5 + 0.5;
          const ci = Math.floor(refract * 8);
          cells.push("·:.:=+*#"[ci]);
          colors.push(palette.core);
          continue;
        }

        // Crystal sparkles
        if (dist < 1.5 && Math.random() < 0.03 * state.auraIntensity) {
          cells.push("✦");
          colors.push(palette.particle);
          continue;
        }

        cells.push(" ");
        colors.push("");
      }
    }

    return { cells, colors, width, height };
  },
};

// ─── Jelly Renderer ──────────────────────────────────────────────────────────

export const jellyRenderer: Renderer = {
  name: "jelly",

  render(state: HautlyState, width: number, height: number): RenderedFrame {
    const cells: string[] = [];
    const colors: string[] = [];
    const palette = MOOD_PALETTES[state.mood];
    const cx = width / 2, cy = height / 2;
    const r = Math.min(width, height) * 0.3;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / r, dy = (y - cy) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Jelly wobble: sine-distorted sphere
        const wobble = Math.sin(angle * 3 + state.age * 2) * 0.12;
        const jellyDist = dist - wobble * (1 - dy);

        if (jellyDist < 1.0) {
          // Tentacles at bottom
          if (dy > 0.4 && Math.abs(dx) < 0.6) {
            const tentacle = Math.sin(dx * 8 + state.age * 3 + dy * 4) * 0.15;
            if (Math.abs(dx - tentacle) < 0.08) {
              cells.push("|");
              colors.push(palette.ring);
              continue;
            }
          }

          // Body
          const inner = Math.pow(Math.max(0, 1 - jellyDist), 0.4);
          const ci = Math.floor(inner * 8);
          cells.push(" ··::--==+"[ci]);
          colors.push(palette.core);
          continue;
        }

        // Glow
        if (jellyDist < 1.4) {
          const glow = Math.max(0, 1 - (jellyDist - 1.0) / 0.4) * state.auraIntensity;
          if (Math.random() < glow * 0.5) {
            cells.push("~");
            colors.push(palette.aura);
            continue;
          }
        }

        cells.push(" ");
        colors.push("");
      }
    }

    return { cells, colors, width, height };
  },
};

// ─── Phoenix Renderer ────────────────────────────────────────────────────────

export const phoenixRenderer: Renderer = {
  name: "phoenix",

  render(state: HautlyState, width: number, height: number): RenderedFrame {
    const cells: string[] = [];
    const colors: string[] = [];
    const palette = MOOD_PALETTES[state.mood];
    const cx = width / 2, cy = height * 0.4;
    const r = Math.min(width, height) * 0.25;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / r, dy = (y - cy) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Flame body (upward-cone)
        const coneR = 1.0 - Math.max(0, -dy) * 0.3;
        const cone = dist / Math.max(0.1, coneR);

        if (cone < 1.0 && dy < 0.5) {
          const flame = Math.sin(angle * 5 + state.age * 4) * 0.15 + 0.85;
          const ci = Math.floor((1 - cone * flame) * 14);
          cells.push(" .,:;i1tfLCG08#"[ci]);
          colors.push(palette.core);
          continue;
        }

        // Tail feathers
        if (dy > 0 && Math.abs(dx) < 0.8) {
          const tailWave = Math.sin(dx * 6 + state.age * 3) * 0.1;
          const tailDist = Math.abs(dx - tailWave);
          if (tailDist < 0.06 && dy < 1.2) {
            cells.push("|");
            colors.push(palette.ring);
            continue;
          }
        }

        // Sparks
        if (Math.random() < 0.04 * state.auraIntensity) {
          const sparkY = cy - r * (0.5 + Math.random());
          if (Math.abs(y - sparkY) < 2 && Math.abs(x - cx) < r * 0.5) {
            cells.push("*");
            colors.push(palette.particle);
            continue;
          }
        }

        cells.push(" ");
        colors.push("");
      }
    }

    return { cells, colors, width, height };
  },
};

// ─── Nebula Renderer ─────────────────────────────────────────────────────────

export const nebulaRenderer: Renderer = {
  name: "nebula",

  render(state: HautlyState, width: number, height: number): RenderedFrame {
    const cells: string[] = [];
    const colors: string[] = [];
    const palette = MOOD_PALETTES[state.mood];
    const cx = width / 2, cy = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / (width * 0.3), dy = (y - cy) / (height * 0.3);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Nebula clouds via layered noise
        const n1 = smoothNoise(dx * 2 + state.age * 0.1, dy * 2, state.age * 0.05);
        const n2 = smoothNoise(dx * 4 - state.age * 0.15, dy * 4, state.age * 0.08);
        const n3 = smoothNoise(dx * 1.5, dy * 1.5 + state.age * 0.12, state.age * 0.03);
        const density = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * Math.max(0, 1 - dist * 0.3);

        if (density > 0.15) {
          const ci = Math.min(14, Math.floor(density * 16));
          cells.push(" ·∶:░▒▓█@#*+ ausen"[ci]);
          colors.push(palette.core);
          continue;
        }

        // Stars
        if (hash(x, y, state.age * 0.01) > 0.997) {
          cells.push(".");
          colors.push(palette.particle);
          continue;
        }

        cells.push(" ");
        colors.push("");
      }
    }

    return { cells, colors, width, height };
  },
};

// ─── Custom Renderer Factory ─────────────────────────────────────────────────

export function createCustomRenderer(
  name: string,
  generator: (state: HautlyState, x: number, y: number, cx: number, cy: number, r: number) => { char: string; color: string } | null,
): Renderer {
  return {
    name,
    render(state: HautlyState, width: number, height: number): RenderedFrame {
      const cells: string[] = [];
      const colors: string[] = [];
      const cx = width / 2, cy = height / 2;
      const r = Math.min(width, height) * 0.3;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const result = generator(state, x, y, cx, cy, r);
          if (result) {
            cells.push(result.char);
            colors.push(result.color);
          } else {
            cells.push(" ");
            colors.push("");
          }
        }
      }

      return { cells, colors, width, height };
    },
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const RENDERERS: ReadonlyMap<string, Renderer> = new Map([
  ["orb", orbRenderer],
  ["crystal", crystalRenderer],
  ["jelly", jellyRenderer],
  ["phoenix", phoenixRenderer],
  ["nebula", nebulaRenderer],
]);

export function getRenderer(name: string): Renderer {
  return RENDERERS.get(name) ?? orbRenderer;
}
