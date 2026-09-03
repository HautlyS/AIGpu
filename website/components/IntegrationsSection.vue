<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { init, effect, frameLoop, surface } from "aigpu";

const props = defineProps<{
  frameworks: any[];
}>();

const emit = defineEmits<{
  "open-framework": [fw: any];
  "copy-code": [code: string, event: Event];
}>();

const SHADERS: Record<string, string> = {
  fw_vue: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
  fw_react: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let grid = fract(uv * vec2f(20.0, 12.0)); let line = smoothstep(0.02, 0.0, min(grid.x, grid.y)); let pulse = sin(u.time + uv.x * 3.0) * 0.3 + 0.7; return vec4f(vec3f(line * pulse * 0.4), 1); }`,
  fw_svelte: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let y = 0.3 + f32(i) * 0.1; let wave = sin(uv.x * 6.0 + u.time * (1.0 + f32(i) * 0.5) + f32(i) * 1.2) * 0.05; let ring = smoothstep(0.008, 0.0, abs(uv.y - y - wave)); col += vec3f(ring * (0.4 + f32(i) * 0.12)); } return vec4f(col, 1); }`,
  fw_purejs: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; var col = vec3f(0.0); for (var i = 0; i < 80; i++) { let fi = f32(i); let x = hash(vec2f(fi, 0.0)); let y = hash(vec2f(fi, 1.0)); let speed = hash(vec2f(fi, 2.0)) * 0.5 + 0.2; let px = fract(x + u.time * speed * 0.1); let py = fract(y + sin(u.time * speed + fi) * 0.05); let d = length(uv - vec2f(px, py)); let brightness = smoothstep(0.015, 0.0, d); col += vec3f(brightness * 0.6); } return vec4f(col, 1); }`,
  fw_nextjs: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let y = 0.3 + f32(i) * 0.1; let wave = sin(uv.x * 6.0 + u.time * (1.0 + f32(i) * 0.5) + f32(i) * 1.2) * 0.05; let ring = smoothstep(0.008, 0.0, abs(uv.y - y - wave)); col += vec3f(ring * (0.4 + f32(i) * 0.12)); } return vec4f(col, 1); }`,
  fw_threetsl: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let grid = fract(uv * vec2f(20.0, 12.0)); let line = smoothstep(0.02, 0.0, min(grid.x, grid.y)); let pulse = sin(u.time + uv.x * 3.0) * 0.3 + 0.7; return vec4f(vec3f(line * pulse * 0.4), 1); }`,
};

const canvasMap = new Map<HTMLCanvasElement, { gpu: any; output: any; vis: any }>();

onMounted(async () => {
  const canvases = document.querySelectorAll<HTMLElement>(".integration-canvas[data-visual]");
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
  const vis = effect(gpu, shader, { label: id, set: { time: 0, resolution: [canvas.width, canvas.height] } });
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
  <section id="integrations" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">framework integrations</p><h2>Full integration for each framework.</h2></div>
      <p class="section-note">Click any card to see the complete integration code.</p>
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
