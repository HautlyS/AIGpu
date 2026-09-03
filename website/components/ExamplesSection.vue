<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { init, effect, frameLoop, surface } from "aigpu";

const props = defineProps<{
  examples: any[];
  filteredExamples: any[];
  categories: { id: string; label: string }[];
  filter: string;
  search: string;
  examplesByCategory: (cat: string) => any[];
}>();

const emit = defineEmits<{
  "update:filter": [value: string];
  "update:search": [value: string];
  "open-example": [ex: any];
  "copy-code": [code: string, event: Event];
}>();

const SHADERS: Record<string, string> = {
  s02_fullscreen: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  s14_raymarching: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let d = length(uv) - 0.3 + sin(u.time) * 0.05; let col = vec3f(smoothstep(0.01, 0.0, d)); return vec4f(col, 1); }`,
  s15_noise_fields: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let n = noise(uv * 3.0 + u.time * 0.1); return vec4f(vec3f(n * 0.8, n * 0.4, n * 0.2), 1); }`,
  cockpit: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
  hautly_orb: `struct Uniforms { time: f32, resolution: vec2f, status: f32, intensity: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } fn fbm(p: vec2f) -> f32 { var v = 0.0; var a = 0.5; var pp = p; for (var i = 0; i < 4; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(100.0); a *= 0.5; } return v; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let breathe = sin(u.time * 2.0) * 0.02; let orbRadius = 0.3 + breathe; if (dist > orbRadius + 0.1) { let particle = noise(uv * 20.0 + u.time * 0.5); let sparkle = step(0.95, particle); return vec4f(vec3f(sparkle * 0.3), 1); } let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist); let angle = atan2(uv.y - center.y, uv.x - center.x); let ring = dist / orbRadius; let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0)); let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3)); let energy = (flow1 + flow2) * 0.5; let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5; let baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8); let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow; let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9; return vec4f(finalColor * ringPattern, edgeGlow); }`,
  gpu_gradient: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  gpu_black_hole: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -4); let rd = normalize(vec3f(uv, 1.5)); let angle = u.time * 0.2; let c = cos(angle); let s = sin(angle); let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rotated * t; let d = length(p) - 1.0; if (d < 0.001 || t > 20.0) { break; } t += d; } let p = ro + rotated * t; let disk = smoothstep(0.02, 0.0, abs(p.y) - 0.3) * smoothstep(0.5, 0.3, length(p.xz)); let horizon = smoothstep(0.05, 0.0, length(p) - 1.0); let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1); return vec4f(col, 1); }`,
  gpu_earth: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let n = noise(uv * 5.0 + u.time * 0.2); let col = vec3f(n * 0.3, n * 0.6, n); return vec4f(col, 1); }`,
  gpu_raymarch_fractal: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn sierpinski(p: vec3f) -> f32 { var z = p; var d = length(z) - 0.5; for (var i = 0; i < 8; i++) { z = abs(z); if (z.x < z.y) { z = vec3f(z.y, z.x, z.z); } if (z.x < z.z) { z = vec3f(z.z, z.y, z.x); } z = z * 2.0 - vec3f(1.0); d = min(d, length(z) - 0.5); } return d * 0.25; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -3); let rd = normalize(vec3f(uv, 1.5)); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rd * t; let d = sierpinski(p); if (d < 0.001) { break; } t += d; } let col = select(vec3f(0), vec3f(0.6, 0.7, 1.0), t < 10.0); return vec4f(col, 1); }`,
};

const canvasMap = new Map<HTMLCanvasElement, { gpu: any; output: any; vis: any }>();

onMounted(async () => {
  const canvases = document.querySelectorAll<HTMLElement>(".example-canvas[data-visual]");
  if (!canvases.length) return;

  const gpu = await init();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const canvas = entry.target as HTMLCanvasElement;
      if (entry.isIntersecting) {
        mountCanvas(canvas, gpu);
      } else {
        unmountCanvas(canvas);
      }
    });
  }, { rootMargin: "200px" });

  canvases.forEach((c) => observer.observe(c));

  onUnmounted(() => {
    observer.disconnect();
    canvasMap.forEach(({ gpu }) => gpu.dispose());
    canvasMap.clear();
  });
});

async function mountCanvas(canvas: HTMLCanvasElement, gpu: any) {
  if (canvasMap.has(canvas)) return;
  const id = canvas.getAttribute("data-visual") || "";
  const shader = SHADERS[id];
  if (!shader) return;

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const vis = effect(gpu, shader, { label: id, set: { time: 0, resolution: [canvas.width, canvas.height], status: 0, intensity: 0.5 } });
  canvasMap.set(canvas, { gpu, output, vis });

  let rafId = 0;
  function animate() {
    if (!canvasMap.has(canvas)) return;
    vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
    frameLoop(gpu, (frame) => frame.pass(output, vis));
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);
}

function unmountCanvas(canvas: HTMLCanvasElement) {
  canvasMap.delete(canvas);
}
</script>

<template>
  <section id="examples" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">source library</p><h2>Every capability. Animated. Copyable.</h2></div>
      <div class="filter-group" role="group" aria-label="Filter examples">
        <button class="filter-button" :class="{ active: filter === 'all' }" @click="emit('update:filter', 'all')">
          All <span class="filter-count">{{ examples.length }}</span>
        </button>
        <button v-for="cat in categories" :key="cat.id" class="filter-button" :class="{ active: filter === cat.id }" @click="emit('update:filter', cat.id)">
          {{ cat.label }} <span class="filter-count">{{ examplesByCategory(cat.id).length }}</span>
        </button>
      </div>
    </div>
    <div class="search-row">
      <input type="search" class="search-input" placeholder="> grep examples..." :value="search" @input="emit('update:search', ($event.target as HTMLInputElement).value)" aria-label="Search examples">
    </div>
    <div class="example-grid">
      <article v-for="ex in filteredExamples" :key="ex.id" class="example-card" :data-tags="ex.tags" @click="emit('open-example', ex)">
        <canvas class="example-canvas" :data-visual="ex.id" width="400" height="220"></canvas>
        <div class="example-body">
          <div class="example-meta">
            <span>{{ ex.category }}</span>
            <a :href="ex.source" target="_blank" rel="noopener" @click.stop>source &nearr;</a>
          </div>
          <h3>{{ ex.title }}</h3>
          <p>{{ ex.description }}</p>
          <button class="copy-trigger" @click.stop="emit('copy-code', ex.code, $event)">Copy source</button>
        </div>
      </article>
    </div>
    <p v-if="filteredExamples.length === 0" class="empty-state">> no matches found</p>
  </section>
</template>
