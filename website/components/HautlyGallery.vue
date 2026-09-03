<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { effect, frameLoop, surface, type FrameLoopHandle } from "aigpu";
import { describeWebGPUError, getSharedGpu } from "../composables/sharedGpu";
import { retryWebGPU } from "../composables/useWebGPU";

const gpuError = ref<string | null>(null);

const hautlyGallerySelected = ref("");

const hautlyForms = ["orb", "crystal", "jelly", "phoenix", "nebula"];
const hautlyMoods = ["idle", "thinking", "speaking", "excited", "sleepy", "error"];

const hautlyGallery = computed(() => {
  const items = [];
  for (const form of hautlyForms) {
    for (const mood of hautlyMoods) {
      items.push({ form, mood });
    }
  }
  return items;
});

// Form-specific shaders — each form has unique visual behavior
const FORM_SHADERS: Record<string, string> = {
  orb: `struct Uniforms { time: f32, resolution: vec2f, mood: f32, energy: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } fn fbm(p: vec2f) -> f32 { var v = 0.0; var a = 0.5; var pp = p; for (var i = 0; i < 4; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(100.0); a *= 0.5; } return v; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let breathe = sin(u.time * 2.0) * 0.02; let orbRadius = 0.3 + breathe; if (dist > orbRadius + 0.1) { let particle = noise(uv * 20.0 + u.time * 0.5); let sparkle = step(0.95, particle); return vec4f(vec3f(sparkle * 0.3), 1); } let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist); let angle = atan2(uv.y - center.y, uv.x - center.x); let ring = dist / orbRadius; let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0)); let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3)); let energy = (flow1 + flow2) * 0.5; let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5; let baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8); let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow; let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9; return vec4f(finalColor * ringPattern, edgeGlow); }`,
  crystal: `struct Uniforms { time: f32, resolution: vec2f, mood: f32, energy: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let facets = 6.0; let facetAngle = angle * facets; let facetDist = abs(sin(facetAngle)); let crystalShape = smoothstep(0.35, 0.25, dist * (0.8 + facetDist * 0.4)); let innerRefraction = sin(dist * 30.0 + u.time * 2.0) * 0.3 + 0.7; let caustic = sin((uv.x + uv.y) * 40.0 + u.time * 3.0) * sin((uv.x - uv.y) * 35.0 - u.time * 2.5) * 0.15; let edgeLight = smoothstep(0.02, 0.0, abs(dist - 0.3)) * 1.5; let rim = smoothstep(0.4, 0.25, dist) * smoothstep(0.15, 0.25, dist) * 0.6; let sparkle = step(0.97, hash(floor(uv * 50.0 + u.time * 0.7))) * smoothstep(0.4, 0.1, dist); let hue = sin(angle * 2.0 + u.time) * 0.5 + 0.5; let dispersion = vec3f(sin(angle * 1.0 + u.time * 0.8) * 0.15 + 0.5, sin(angle * 1.0 + u.time * 0.8 + 2.1) * 0.15 + 0.6, sin(angle * 1.0 + u.time * 0.8 + 4.2) * 0.15 + 0.85); var col = dispersion * crystalShape * (innerRefraction + caustic); col += vec3f(0.5, 0.7, 1.0) * edgeLight * 0.7; col += vec3f(0.7, 0.85, 1.0) * rim; col += vec3f(sparkle * 0.9); let facetLine = smoothstep(0.008, 0.0, abs(sin(facetAngle))) * smoothstep(0.4, 0.1, dist) * 0.25; col += vec3f(facetLine); return vec4f(col, crystalShape); }`,
  jelly: `struct Uniforms { time: f32, resolution: vec2f, mood: f32, energy: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } fn fbm(p: vec2f) -> f32 { var v = 0.0; var a = 0.5; var pp = p; for (var i = 0; i < 3; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(45.0); a *= 0.5; } return v; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let wobble = sin(angle * 3.0 + u.time * 1.5) * 0.03 + cos(angle * 5.0 - u.time) * 0.02; let jellyRadius = 0.28 + wobble; let body = smoothstep(jellyRadius + 0.05, jellyRadius - 0.05, dist); let tentacle = noise(vec2f(angle * 4.0 + u.time * 0.8, dist * 8.0)) * smoothstep(0.35, 0.25, dist); let tentacle2 = noise(vec2f(angle * 6.0 - u.time * 0.6, dist * 12.0 + u.time * 0.3)) * smoothstep(0.3, 0.2, dist) * 0.5; let translucent = body * 0.6 + (tentacle + tentacle2) * 0.4; let inner = fbm(uv * 8.0 + u.time * 0.2) * body; let subsurface = exp(-dist * 4.0) * (0.3 + 0.2 * sin(u.time * 1.5)); var col = vec3f(0.2 + inner * 0.3, 0.4 + inner * 0.4, 0.75 + inner * 0.25) * translucent; col += vec3f(0.1, 0.3, 0.5) * subsurface; let edge = smoothstep(0.015, 0.0, abs(dist - jellyRadius)) * 0.9; col += vec3f(edge * 0.3, edge * 0.6, edge * 0.9); let biolum = step(0.96, hash(floor(uv * 25.0 + u.time * 0.4))) * smoothstep(0.35, 0.1, dist) * (0.5 + 0.5 * sin(u.time * 3.0 + hash(floor(uv * 25.0)) * 6.28)); col += vec3f(0.2, 0.8, 1.0) * biolum * 0.6; return vec4f(col, translucent * 0.9); }`,
  phoenix: `struct Uniforms { time: f32, resolution: vec2f, mood: f32, energy: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let body = smoothstep(0.3, 0.2, dist); let flame1 = noise(vec2f(angle * 3.0, dist * 10.0 - u.time * 2.0)) * smoothstep(0.4, 0.2, dist); let flame2 = noise(vec2f(angle * 5.0 + 1.0, dist * 8.0 - u.time * 3.0)) * smoothstep(0.35, 0.15, dist); let flame3 = noise(vec2f(angle * 7.0 - 2.0, dist * 12.0 - u.time * 4.0)) * smoothstep(0.3, 0.1, dist) * 0.4; let fire = flame1 * 0.6 + flame2 * 0.4 + flame3; let rise = sin(u.time * 1.2) * 0.02; let ember = step(0.96, hash(floor(uv * 35.0 + vec2f(0.0, u.time * 1.5)))) * smoothstep(0.5, 0.15, dist); let ember2 = step(0.97, hash(floor(uv * 25.0 + vec2f(u.time * 0.8, 0.0)))) * smoothstep(0.4, 0.1, dist) * 0.6; let heatShimmer = sin(uv.y * 50.0 + u.time * 5.0) * 0.015 * smoothstep(0.5, 0.15, dist); let core = exp(-dist * 6.0) * (0.6 + 0.4 * sin(u.time * 4.0)); var col = vec3f(1.0, 0.2 + fire * 0.5, 0.02) * fire; col += vec3f(1.0, 0.6, 0.05) * core * 0.4; col += vec3f(1.0, 0.8, 0.2) * body * 0.4; col += vec3f(1.0, 0.5, 0.1) * ember * 0.7; col += vec3f(1.0, 0.9, 0.4) * ember2 * 0.5; let outerGlow = exp(-dist * 2.5) * 0.15; col += vec3f(0.8, 0.2, 0.05) * outerGlow; return vec4f(col, (fire + body * 0.5) * 0.95); }`,
  nebula: `struct Uniforms { time: f32, resolution: vec2f, mood: f32, energy: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } fn fbm(p: vec2f) -> f32 { var v = 0.0; var a = 0.5; var pp = p; for (var i = 0; i < 5; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(50.0); a *= 0.5; } return v; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let gas = fbm(vec2f(angle * 2.0 + u.time * 0.1, dist * 4.0 + u.time * 0.05)); let gas2 = fbm(vec2f(angle * 3.0 - u.time * 0.15, dist * 3.0 + u.time * 0.08)); let swirl = fbm(vec2f(angle * 3.0 - u.time * 0.15, dist * 3.0)); let nebulaGlow = exp(-dist * 3.0) * gas; let nebulaGlow2 = exp(-dist * 2.0) * gas2 * 0.5; let starGrid = hash(floor(uv * 80.0)); let stars = step(0.992, starGrid) * (0.5 + 0.5 * sin(u.time * 2.0 + starGrid * 6.28)) * smoothstep(0.5, 0.0, dist); let faintStars = step(0.97, hash(floor(uv * 40.0 + hash(floor(uv * 5.0))))) * 0.3; let core = exp(-dist * 5.0) * (0.4 + 0.3 * sin(u.time * 0.5)); var col = vec3f(0.05, 0.02, 0.12); col += vec3f(0.5, 0.1, 0.6) * nebulaGlow; col += vec3f(0.1, 0.3, 0.7) * nebulaGlow2; col += vec3f(0.3, 0.08, 0.5) * swirl * 0.25; col += vec3f(0.6, 0.3, 0.8) * core; col += vec3f(stars * 0.9); col += vec3f(0.4, 0.5, 0.7) * faintStars; let dust = fbm(uv * 15.0 + u.time * 0.03) * exp(-dist * 1.5) * 0.15; col += vec3f(0.3, 0.15, 0.4) * dust; return vec4f(col, (nebulaGlow + stars * 0.3 + core * 0.3) * 0.9); }`,
};

// Mood color palettes for overlay tinting
const MOOD_COLORS: Record<string, [number, number, number]> = {
  idle: [0.4, 0.8, 1.0],
  thinking: [0.7, 0.55, 1.0],
  speaking: [1.0, 0.8, 0.3],
  excited: [1.0, 0.4, 0.5],
  sleepy: [0.5, 0.6, 0.7],
  error: [1.0, 0.2, 0.2],
};

const canvasMap = new Map<HTMLCanvasElement, { output: any; vis: any; loop: FrameLoopHandle }>();
let observer: IntersectionObserver | null = null;

onMounted(async () => {
  const canvases = document.querySelectorAll<HTMLElement>(".hautly-gallery-canvas[data-form]");
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

async function mountCanvas(canvas: HTMLCanvasElement) {
  if (canvasMap.has(canvas)) return;
  let gpu: any;
  try {
    gpu = await getSharedGpu();
  } catch (e) {
    console.error("[aigpu] HautlyGallery init failed:", e);
    gpuError.value = describeWebGPUError(e);
    return;
  }
  if (!canvas.isConnected || canvasMap.has(canvas)) return;
  const form = canvas.getAttribute("data-form") || "orb";
  const mood = canvas.getAttribute("data-mood") || "idle";
  const shader = FORM_SHADERS[form] || FORM_SHADERS.orb;

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const moodIdx = ["idle", "thinking", "speaking", "excited", "sleepy", "error"].indexOf(mood);
  const vis = effect(gpu, shader, {
    label: `hautly-${form}-${mood}`,
    set: { time: 0, resolution: [canvas.width, canvas.height], mood: moodIdx / 5, energy: 0.5 },
  });

  // One frameLoop per canvas (owns its rAF). No outer rAF.
  const loop = frameLoop(gpu, (frame) => {
    vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
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

function hautlyGallerySelect(item: { form: string; mood: string }) {
  hautlyGallerySelected.value = item.form + "-" + item.mood;
}
</script>

<template>
  <section id="hautly-gallery" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">entity gallery</p><h2>Every form. Every mood. Animated.</h2></div>
      <p class="section-note">Click any entity to preview it live. Each form has unique breathing, particles, and expression patterns.</p>
      <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
    </div>
    <div class="hautly-gallery-grid">
      <div v-for="item in hautlyGallery" :key="item.form + '-' + item.mood"
           class="hautly-gallery-card"
           :class="{ selected: hautlyGallerySelected === item.form + '-' + item.mood }"
           @click="hautlyGallerySelect(item)">
        <canvas
          class="hautly-gallery-canvas"
          :data-entity="item.form + '-' + item.mood"
          :data-form="item.form"
          :data-mood="item.mood"
          width="320" height="200"
        ></canvas>
        <div class="hautly-gallery-info">
          <span class="hautly-gallery-form">{{ item.form }}</span>
          <span class="hautly-gallery-mood" :class="'mood-' + item.mood">{{ item.mood }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
