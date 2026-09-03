<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { effect, frameLoop, surface, type FrameLoopHandle } from "aigpu";
import { describeWebGPUError, getSharedGpu } from "../composables/sharedGpu";
import { retryWebGPU } from "../composables/useWebGPU";

const gpuError = ref<string | null>(null);
const canvasMap = new Map<HTMLCanvasElement, { output: any; vis: any; loop: FrameLoopHandle }>();
let observer: IntersectionObserver | null = null;

const RECIPES = [
  {
    id: "anime-hologram",
    title: "Anime Hologram",
    mood: "anime",
    bestFor: "Friendly copilots and character UIs",
    description: "Abstract luminous face, eyes, aura, and scanlines — personality through recognizable shapes.",
    accent: [0.35, 0.95, 1.0, 1.0],
    secondary: [0.06, 0.38, 0.65, 1.0],
    background: [0.005, 0.028, 0.06, 1.0],
    initial: { progress: 0.72, activity: 0.34, status: 1, phase: 0, speed: 1.35 },
  },
  {
    id: "enterprise-orbit",
    title: "Enterprise Orbit",
    mood: "enterprise",
    bestFor: "Mission control and workflow operations",
    description: "Clean ring geometry, progress arc, and orbiting node — readable at a glance beside logs.",
    accent: [0.35, 0.95, 1.0, 1.0],
    secondary: [0.06, 0.38, 0.65, 1.0],
    background: [0.005, 0.028, 0.06, 1.0],
    initial: { progress: 0.8, activity: 0.62, status: 2, phase: 0, speed: 0.7 },
  },
  {
    id: "psychedelic-neural",
    title: "Psychedelic Neural",
    mood: "psychedelic",
    bestFor: "Creative research and generative tools",
    description: "Domain-warped petals and chromatic bloom — high-energy creative visualization.",
    accent: [1.0, 0.2, 0.6, 1.0],
    secondary: [0.2, 0.05, 0.35, 1.0],
    background: [0.02, 0.0, 0.04, 1.0],
    initial: { progress: 0.95, activity: 0.18, status: 1, phase: 0, speed: 2.4 },
  },
  {
    id: "calm-ocean",
    title: "Calm Ocean",
    mood: "calm",
    bestFor: "Queues, approvals, rate limits",
    description: "Slow caustics, horizon line, and breathing orb — alive without pressuring.",
    accent: [0.2, 0.7, 0.9, 1.0],
    secondary: [0.02, 0.15, 0.3, 1.0],
    background: [0.005, 0.02, 0.04, 1.0],
    initial: { progress: 0.18, activity: 0.42, status: 3, phase: 0, speed: 0.35 },
  },
  {
    id: "success-confetti",
    title: "Success Confetti",
    mood: "celebration",
    bestFor: "Finished plans, tools, and deployments",
    description: "Radial rays, sparkling core, deterministic confetti — completion accent.",
    accent: [1.0, 0.85, 0.2, 1.0],
    secondary: [0.1, 0.9, 0.4, 1.0],
    background: [0.01, 0.03, 0.01, 1.0],
    initial: { progress: 0.35, activity: 1.0, status: 4, phase: 0, speed: 1.8 },
  },
  {
    id: "error-glitch",
    title: "Error Glitch",
    mood: "glitch",
    bestFor: "Retryable failures and incidents",
    description: "Scanline bands, jitter, diagnostic bars — diagnosable failure visualization.",
    accent: [1.0, 0.25, 0.25, 1.0],
    secondary: [0.15, 0.05, 0.05, 1.0],
    background: [0.03, 0.005, 0.005, 1.0],
    initial: { progress: 0.68, activity: 0.27, status: 5, phase: 0, speed: 3.1 },
  },
  {
    id: "minimal-focus",
    title: "Minimal Focus",
    mood: "minimal",
    bestFor: "Dense productivity and accessibility",
    description: "Monochrome ring, quiet center, precise task arc — low-noise baseline.",
    accent: [0.85, 0.85, 0.9, 1.0],
    secondary: [0.15, 0.15, 0.18, 1.0],
    background: [0.02, 0.02, 0.025, 1.0],
    initial: { progress: 0.5, activity: 0.5, status: 2, phase: 0, speed: 0.5 },
  },
  {
    id: "cosmic-constellation",
    title: "Cosmic Constellation",
    mood: "cosmic",
    bestFor: "Multi-agent graphs and research",
    description: "Deterministic stars, nebula, orbiting specialist — long-running investigation.",
    accent: [0.6, 0.8, 1.0, 1.0],
    secondary: [0.1, 0.15, 0.35, 1.0],
    background: [0.002, 0.005, 0.02, 1.0],
    initial: { progress: 0.84, activity: 0.12, status: 1, phase: 0, speed: 1.1 },
  },
];

// Single master shader with all 8 styles — the real aigpu visual gallery pattern
const GALLERY_SHADER = `// AIGpu Visual Gallery: one shader, eight art directions selected at build time.
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
const STYLE: u32 = 0u;

fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn rotate(p: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 {
  let ba = b - a;
  let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h)));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * params.speed + params.phase;
  let p = uv - 0.5;
  let d = length(p);
  let a = atan2(p.y, p.x);
  let pulse = 0.5 + 0.5 * sin(t * 2.0);
  let energy = max(params.activity, 0.04);
  var color = params.background.rgb;

  if (STYLE == 0u) {
    let head = 1.0 - smoothstep(0.31, 0.29, length(p * vec2f(0.9, 1.08)));
    let hair = 1.0 - smoothstep(0.12, 0.0, abs(abs(p.x) - 0.17 + 0.025 * sin(p.y * 20.0 + t)));
    let eyes = lineGlow(p, vec2f(-0.13, -0.025), vec2f(-0.04, -0.025), 0.012) + lineGlow(p, vec2f(0.04, -0.025), vec2f(0.13, -0.025), 0.012);
    let scan = 1.0 - smoothstep(0.0, 0.018, abs(fract(uv.y * 18.0 + t * 0.08) - 0.5));
    color += head * params.secondary.rgb * 0.55 + hair * params.accent.rgb * 0.65 + eyes * params.accent.rgb * 1.6 + scan * params.accent.rgb * 0.08;
  } else if (STYLE == 1u) {
    let ring = 1.0 - smoothstep(0.012, 0.028, abs(d - 0.27 - 0.018 * pulse));
    let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * (1.0 - smoothstep(0.008, 0.026, abs(d - 0.27)));
    let orbit = 1.0 - smoothstep(0.018, 0.035, abs(length(p - vec2f(cos(t), sin(t)) * 0.27) - 0.024));
    let grid = (1.0 - smoothstep(0.0, 0.01, abs(fract(uv.x * 12.0) - 0.5))) * 0.08;
    color += params.secondary.rgb * ring + params.accent.rgb * (arc + orbit) + params.accent.rgb * grid;
  } else if (STYLE == 2u) {
    let warp = sin(a * 7.0 + t) * 0.045 + cos(a * 11.0 - t * 0.7) * 0.025;
    let petals = pow(max(0.0, cos(a * 7.0 + sin(d * 18.0 - t))), 8.0);
    let bloom = 1.0 - smoothstep(0.34 + warp, 0.06 + warp, d);
    let chroma = vec3f(sin(t + 0.0) * 0.5 + 0.5, sin(t + 2.1) * 0.5 + 0.5, sin(t + 4.2) * 0.5 + 0.5);
    color += chroma * bloom * (0.25 + petals * 1.4) + params.accent.rgb * petals * energy;
  } else if (STYLE == 3u) {
    let wave = sin(uv.x * 18.0 + t * 0.45) * 0.018 + sin(uv.x * 37.0 - t * 0.25) * 0.009;
    let horizon = 1.0 - smoothstep(0.02, 0.0, abs(uv.y - 0.56 - wave));
    let orb = 1.0 - smoothstep(0.18, 0.0, length(p - vec2f(0.0, 0.06))) * (0.5 + pulse * 0.4);
    color += params.secondary.rgb * (0.25 + uv.y * 0.5) + params.accent.rgb * (horizon * 0.35 + orb * 0.6);
  } else if (STYLE == 4u) {
    let rays = pow(max(0.0, cos(a * 18.0 + t * 0.4)), 28.0) * (1.0 - smoothstep(0.1, 0.5, d));
    let spark = pow(max(0.0, 1.0 - d * 8.0), 3.0) * pulse;
    let confetti = step(0.82, hash2(floor(uv * 18.0) + floor(t * 2.0))) * (1.0 - smoothstep(0.2, 0.55, d));
    color += params.accent.rgb * (rays + spark) + params.secondary.rgb * confetti;
  } else if (STYLE == 5u) {
    let band = step(0.7, hash2(vec2f(floor(uv.y * 24.0), floor(t * 7.0)))) * (1.0 - smoothstep(0.0, 0.35, d));
    let bars = lineGlow(p, vec2f(-0.42, 0.12), vec2f(0.25, 0.12), 0.018) + lineGlow(p, vec2f(-0.2, -0.14), vec2f(0.42, -0.14), 0.012);
    let jitter = sin(floor(uv.y * 28.0) + t * 9.0) * 0.02;
    color += params.secondary.rgb * (0.2 + band) + params.accent.rgb * (bars + abs(jitter) * 3.0);
  } else if (STYLE == 6u) {
    let ring = 1.0 - smoothstep(0.008, 0.02, abs(d - 0.24));
    let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * ring;
    let center = 1.0 - smoothstep(0.13, 0.0, d);
    color += params.secondary.rgb * ring * 0.8 + params.accent.rgb * (arc + center * 0.12);
  } else {
    let stars = step(0.985, hash2(floor(uv * 42.0) + params.phase)) * (0.4 + pulse * 0.6);
    let node = 1.0 - smoothstep(0.025, 0.0, length(p - vec2f(cos(t * 0.7), sin(t * 0.7)) * 0.25));
    let nebula = exp(-d * 4.0) * (0.4 + 0.3 * sin(a * 3.0 + t));
    color += params.secondary.rgb * (stars + nebula) + params.accent.rgb * node;
  }

  let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012;
  return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0);
}`;

const STYLE_MAP: Record<string, number> = {
  "anime-hologram": 0,
  "enterprise-orbit": 1,
  "psychedelic-neural": 2,
  "calm-ocean": 3,
  "success-confetti": 4,
  "error-glitch": 5,
  "minimal-focus": 6,
  "cosmic-constellation": 7,
};

onMounted(async () => {
  const canvases = document.querySelectorAll<HTMLElement>(".gallery-canvas[data-recipe]");
  if (!canvases.length) return;

  // Eager observation only — the shared GPU is requested lazily on the first
  // canvas that actually enters the viewport (see mountCanvas).
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const canvas = entry.target as HTMLCanvasElement;
      if (entry.isIntersecting) {
        mountCanvas(canvas);
      } else {
        unmountCanvas(canvas);
      }
    });
  }, { rootMargin: "200px" });

  canvases.forEach((c) => observer!.observe(c));

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
    canvasMap.forEach(({ loop }) => {
      try { loop.stop(); } catch { /* ignore */ }
    });
    canvasMap.clear();
    // Shared gpu outlives every section — never disposed here.
  });
});

function getShaderForRecipe(recipeId: string): string {
  const styleIdx = STYLE_MAP[recipeId] ?? 0;
  return GALLERY_SHADER.replace("const STYLE: u32 = 0u;", `const STYLE: u32 = ${styleIdx}u;`);
}

async function mountCanvas(canvas: HTMLCanvasElement) {
  if (canvasMap.has(canvas)) return;
  let gpu: any;
  try {
    gpu = await getSharedGpu();
  } catch (e) {
    console.error("[aigpu] VisualGallery init failed:", e);
    gpuError.value = describeWebGPUError(e);
    return;
  }
  if (!canvas.isConnected || canvasMap.has(canvas)) return;
  const recipeId = canvas.getAttribute("data-recipe") || "";
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return;

  const shader = getShaderForRecipe(recipeId);
  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const vis = effect(gpu, shader, {
    label: recipeId,
    set: {
      time: 0,
      progress: recipe.initial.progress,
      activity: recipe.initial.activity,
      status: recipe.initial.status,
      phase: recipe.initial.phase,
      speed: recipe.initial.speed,
      pad: [0, 0],
      accent: recipe.accent,
      secondary: recipe.secondary,
      background: recipe.background,
    },
  });

  // One frameLoop per canvas (owns its rAF). No outer rAF.
  const loop = frameLoop(gpu, (frame) => {
    vis.set({ time: performance.now() / 1000 });
    frame.pass(output, vis);
  });
  canvasMap.set(canvas, { output, vis, loop });
}

function unmountCanvas(canvas: HTMLCanvasElement) {
  const entry = canvasMap.get(canvas);
  if (entry) {
    try { entry.loop.stop(); } catch { /* ignore */ }
    canvasMap.delete(canvas);
  }
}
</script>

<template>
  <section id="visual-gallery" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">visual gallery</p><h2>Eight GPU recipes. One shader contract. Any agent state.</h2></div>
      <p class="section-note">Each recipe is a real WGSL fragment shader rendered live via WebGPU. The same <code>AgentParams</code> uniform drives all eight art directions.</p>
      <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
    </div>
    <div class="gallery-grid">
      <article v-for="recipe in RECIPES" :key="recipe.id" class="gallery-card">
        <canvas class="gallery-canvas" :data-recipe="recipe.id" width="400" height="260"></canvas>
        <div class="gallery-info">
          <div class="gallery-header">
            <h3>{{ recipe.title }}</h3>
            <span class="gallery-mood-badge" :class="'mood-' + recipe.mood">{{ recipe.mood }}</span>
          </div>
          <p class="gallery-best-for">{{ recipe.bestFor }}</p>
          <p class="gallery-desc">{{ recipe.description }}</p>
          <div class="gallery-params">
            <span class="param-tag" v-for="(val, key) in recipe.initial" :key="key">{{ key }}: {{ typeof val === 'number' ? val.toFixed(2) : val }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
