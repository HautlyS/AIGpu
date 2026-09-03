<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { effect, frameLoop, surface, type FrameLoopHandle } from "aigpu";
import { describeWebGPUError, getSharedGpu } from "../composables/sharedGpu";
import { retryWebGPU } from "../composables/useWebGPU";

const props = defineProps<{
  frameworks: any[];
}>();

const emit = defineEmits<{
  "open-framework": [fw: any];
  "copy-code": [code: string, event: Event];
}>();

const SHADERS: Record<string, string> = {
  fw_vue: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); let angle = atan2(uv.y - 0.5, uv.x - 0.5); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let fi = f32(i); let r = 0.08 + fi * 0.07; let ring = smoothstep(0.004, 0.0, abs(dist - r)); let seg = sin(angle * (20.0 + fi * 6.0) + u.time * (0.8 + fi * 0.25)) * 0.5 + 0.5; let vueGreen = vec3f(0.3, 0.75, 0.55); let vueDark = vec3f(0.15, 0.35, 0.3); col += mix(vueDark, vueGreen, seg) * ring * (0.25 + fi * 0.12); } let inner = smoothstep(0.04, 0.0, dist) * (0.6 + 0.4 * sin(u.time * 2.0)); col += vec3f(0.25, 0.65, 0.45) * inner; let orbit = smoothstep(0.012, 0.0, abs(length(uv - vec2f(0.5) - vec2f(cos(u.time * 1.5), sin(u.time * 1.5)) * 0.18) - 0.015)); col += vec3f(0.4, 0.9, 0.6) * orbit * 0.7; let dust = step(0.97, hash(floor(uv * 40.0 + u.time * 0.3))) * smoothstep(0.4, 0.1, dist) * 0.2; col += vec3f(0.5, 0.9, 0.7) * dust; return vec4f(col, 1); }`,
  fw_react: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let atom = smoothstep(0.06, 0.0, dist) * (0.8 + 0.2 * sin(u.time * 3.0)); let orbit1 = smoothstep(0.008, 0.0, abs(dist - 0.2)) * (0.5 + 0.5 * sin(angle * 3.0 + u.time * 2.5)); let orbit2 = smoothstep(0.008, 0.0, abs(dist - 0.3)) * (0.5 + 0.5 * sin(angle * 2.0 - u.time * 1.8 + 1.0)); let orbit3 = smoothstep(0.008, 0.0, abs(dist - 0.38)) * (0.5 + 0.5 * sin(angle * 4.0 + u.time * 1.2 + 2.0)); let electron1 = smoothstep(0.02, 0.0, length(uv - center - vec2f(cos(u.time * 2.5), sin(u.time * 2.5)) * 0.2)); let electron2 = smoothstep(0.02, 0.0, length(uv - center - vec2f(cos(u.time * 1.8 + 2.0), sin(u.time * 1.8 + 2.0)) * 0.3)); let electron3 = smoothstep(0.02, 0.0, length(uv - center - vec2f(cos(u.time * 1.2 + 4.0), sin(u.time * 1.2 + 4.0)) * 0.38)); let pulse = 0.8 + 0.2 * sin(u.time * 3.0); var col = vec3f(0.05, 0.5, 0.85) * atom * pulse; col += vec3f(0.15, 0.7, 1.0) * (orbit1 + orbit2 + orbit3) * 0.3; col += vec3f(1.0) * (electron1 + electron2 + electron3) * 0.85; let core = exp(-dist * 8.0) * 0.3; col += vec3f(0.3, 0.8, 1.0) * core; return vec4f(col, 1); }`,
  fw_svelte: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; var col = vec3f(0.0); for (var i = 0; i < 6; i++) { let fi = f32(i); let y = 0.25 + fi * 0.1; let wave = sin(uv.x * 5.0 + u.time * (1.0 + fi * 0.4) + fi * 1.3) * 0.04 + cos(uv.x * 8.0 - u.time * 0.7 + fi) * 0.02; let ring = smoothstep(0.006, 0.0, abs(uv.y - y - wave)); let intensity = 0.35 + fi * 0.1; col += vec3f(ring * intensity * (0.4 + fi * 0.1), ring * intensity * 0.6, ring * intensity); } let firefly = step(0.96, hash(floor(uv * 35.0 + u.time * 0.5))) * (0.3 + 0.7 * sin(u.time * 2.5 + hash(floor(uv * 35.0)) * 6.28)); col += vec3f(1.0, 0.6, 0.15) * firefly * 0.45; let compiled = smoothstep(0.01, 0.0, abs(uv.y - 0.5 - sin(uv.x * 12.0 + u.time * 2.0) * 0.03)) * smoothstep(0.5, 0.2, length(uv - vec2f(0.5))) * 0.3; col += vec3f(1.0, 0.4, 0.2) * compiled; return vec4f(col, 1); }`,
  fw_purejs: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; var col = vec3f(0.0); for (var i = 0; i < 80; i++) { let fi = f32(i); let x = hash(vec2f(fi, 0.0)); let y = hash(vec2f(fi, 1.0)); let speed = hash(vec2f(fi, 2.0)) * 0.5 + 0.2; let px = fract(x + u.time * speed * 0.1); let py = fract(y + sin(u.time * speed + fi) * 0.05); let d = length(uv - vec2f(px, py)); let brightness = smoothstep(0.015, 0.0, d); col += vec3f(brightness * 0.6); } let center = smoothstep(0.03, 0.0, length(uv - vec2f(0.5))) * (0.8 + 0.2 * sin(u.time * 4.0)); col += vec3f(1.0, 1.0, 0.8) * center; return vec4f(col, 1); }`,
  fw_nextjs: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let angle = atan2(uv.y - center.y, uv.x - center.x); let n = 12.0; let sectorAngle = (angle + 3.14159) % (6.28318 / n) - (3.14159 / n); let sector = floor((angle + 3.14159) / (6.28318 / n)); let pulse = 0.5 + 0.5 * sin(u.time * 2.0 + sector * 0.5); let ring = smoothstep(0.01, 0.0, abs(dist - 0.25 - pulse * 0.015)); let ring2 = smoothstep(0.006, 0.0, abs(dist - 0.35)) * 0.5; let ray = smoothstep(0.015, 0.0, abs(sectorAngle)) * (1.0 - smoothstep(0.12, 0.35, dist)); let server = smoothstep(0.05, 0.0, dist) * (0.7 + 0.3 * sin(u.time * 3.0)); var col = vec3f(0.9, 0.9, 0.95) * server; col += vec3f(0.5, 0.5, 0.6) * ring; col += vec3f(0.4, 0.4, 0.5) * ring2; col += vec3f(0.95, 0.95, 1.0) * ray * 0.25; let dataFlow = step(0.9, hash(floor(uv * 25.0 + floor(u.time * 3.0)))) * smoothstep(0.3, 0.08, dist); col += vec3f(0.5, 0.7, 1.0) * dataFlow * 0.35; let accent = step(0.93, hash(floor(uv * 15.0 + floor(u.time * 2.0)))) * smoothstep(0.2, 0.05, dist) * 0.3; col += vec3f(1.0, 1.0, 1.0) * accent; return vec4f(col, 1); }`,
  fw_threetsl: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let grid = fract(uv * vec2f(24.0, 14.0)); let line = smoothstep(0.015, 0.0, min(grid.x, grid.y)); let pulse = sin(u.time + uv.x * 3.0) * 0.3 + 0.7; let texNoise = noise(uv * 8.0 + u.time * 0.2); let tri = abs(fract(uv.x * 18.0 + u.time * 0.3) - 0.5) + abs(fract(uv.y * 12.0 - u.time * 0.2) - 0.5); let triLine = smoothstep(0.06, 0.04, tri); let node1 = smoothstep(0.025, 0.0, length(uv - vec2f(0.25, 0.35))) * (0.7 + 0.3 * sin(u.time * 2.0)); let node2 = smoothstep(0.025, 0.0, length(uv - vec2f(0.7, 0.6))) * (0.7 + 0.3 * sin(u.time * 2.5 + 1.0)); let node3 = smoothstep(0.02, 0.0, length(uv - vec2f(0.5, 0.2))) * (0.7 + 0.3 * sin(u.time * 1.8 + 2.0)); let wire1 = smoothstep(0.006, 0.0, abs(uv.y - 0.35 - (uv.x - 0.25) * 0.5 * 0.0)) * step(0.25, uv.x) * step(uv.x, 0.7) * 0.3; let flow = step(0.92, hash(floor(uv * 30.0 + floor(u.time * 4.0)))) * smoothstep(0.5, 0.1, length(uv - vec2f(0.5))); var col = vec3f(line * pulse * 0.3 + triLine * 0.2 * texNoise); col += vec3f(0.3, 0.5, 1.0) * node1 + vec3f(0.5, 0.3, 1.0) * node2 + vec3f(1.0, 0.4, 0.6) * node3; col += vec3f(0.4, 0.6, 1.0) * wire1; col += vec3f(0.6, 0.8, 1.0) * flow * 0.4; let glow = exp(-length(uv - vec2f(0.5)) * 3.0) * (0.2 + 0.15 * sin(u.time * 2.0)); col += vec3f(0.3, 0.5, 1.0) * glow; return vec4f(col, 1); }`,
};

const canvasMap = new Map<HTMLCanvasElement, { output: any; vis: any; loop: FrameLoopHandle }>();
const gpuError = ref<string | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(async () => {
  const canvases = document.querySelectorAll<HTMLElement>(".integration-canvas[data-visual]");
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
    console.error("[aigpu] IntegrationsSection init failed:", e);
    gpuError.value = describeWebGPUError(e);
    return;
  }
  if (!canvas.isConnected || canvasMap.has(canvas)) return;
  const id = canvas.getAttribute("data-visual") || "";
  const shader = SHADERS[id];
  if (!shader) return;

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const vis = effect(gpu, shader, { label: id, set: { time: 0, resolution: [canvas.width, canvas.height] } });

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
</script>

<template>
  <section id="integrations" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">framework integrations</p><h2>Full integration for each framework.</h2></div>
      <p class="section-note">Click any card to see the complete integration code. Each preview is a unique GPU animation.</p>
      <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
    </div>
    <div class="integration-grid">
      <article v-for="(fw, idx) in frameworks" :key="fw.name" class="integration-card" @click="emit('open-framework', fw)">
        <div class="card-index">{{ String(idx + 1).padStart(2, '0') }}</div>
        <h3>{{ fw.name }}</h3>
        <p>{{ fw.desc }}</p>
        <canvas class="integration-canvas" :data-visual="'fw_' + fw.id" width="400" height="120"></canvas>
        <button class="copy-trigger" @click.stop="emit('copy-code', fw.code, $event)">View full code</button>
      </article>
    </div>
  </section>
</template>
