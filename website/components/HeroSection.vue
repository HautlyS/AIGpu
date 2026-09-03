<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { effect, frameLoop, surface } from "aigpu";
import { useGpuMount } from "../composables/useWebGPU";

const props = defineProps<{ status: string; progress: number }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { gpuError, withGpu, setLoop, cleanup, retryWebGPU } = useGpuMount();

const SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var a = 0.5; var pp = p;
  for (var i = 0; i < 5; i++) { v += a * noise(pp); pp = vec2f(pp.y * 1.6 + 100.0, pp.x * 1.6 + 100.0); a *= 0.5; }
  return v;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let center = vec2f(0.5);
  let dist = length(uv - center);
  let breathe = sin(u.time * 2.0) * 0.02;
  let orbRadius = 0.3 + breathe;
  let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist);
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let ring = dist / orbRadius;
  let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0));
  let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3));
  let energy = (flow1 + flow2) * 0.5;
  let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5;
  let baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8);
  let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow;
  let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9;
  return vec4f(finalColor * ringPattern, edgeGlow);
}`;

onMounted(async () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  await withGpu(async (gpu) => {
    const output = surface(gpu, canvas, { dpr: [1, 1.5] });
    const vis = effect(gpu, SHADER, { label: "hero-orb", set: { time: 0, resolution: [canvas.width, canvas.height] } });

    // frameLoop owns its own rAF — never nest it inside another rAF.
    const handle = frameLoop(gpu, (frame) => {
      vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
      frame.pass(output, vis);
    });
    setLoop(handle);
  });
});

onUnmounted(() => cleanup());
</script>

<template>
  <section class="hero section-shell">
    <div class="hero-copy">
      <p class="eyebrow">open gpu interface layer</p>
      <h1>Make agent state <em>visible.</em></h1>
      <p class="hero-lede">AIGpu turns serializable agent events into expressive GPU visuals. WebGPU + WGSL. Framework-free. Offline-first. Every capability animated below.</p>
      <div class="hero-actions">
        <a class="button button-primary" href="#examples">Browse examples</a>
        <a class="button button-quiet" href="https://github.com/hautlys/AIGpu">Read source</a>
      </div>
      <div class="trust-row">
        <span>MIT licensed</span>
        <span>WebGPU + WGSL</span>
        <span>HTML / React / Vue / Svelte</span>
        <span>Offline-first</span>
      </div>
    </div>
    <div class="hero-orb" aria-label="Animated AIGpu status visual">
      <canvas ref="canvasRef" class="hero-canvas" data-visual="hero" width="720" height="520"></canvas>
      <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
      <div class="orb-label">
        <span class="orb-label-dot"></span>
        <span id="hero-state">{{ status }}</span>
        <span class="orb-label-metric" id="hero-progress">{{ progress }}%</span>
      </div>
    </div>
  </section>
</template>
