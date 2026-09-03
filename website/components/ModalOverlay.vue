<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { init, effect, frameLoop, surface, type FrameLoopHandle } from "aigpu";
import { isWebGPUAvailable, WEBGPU_UNAVAILABLE_MSG } from "../composables/useWebGPU";

const props = defineProps<{
  open: boolean;
  type: string;
  example: any;
  framework: any;
}>();

const emit = defineEmits<{
  close: [];
  "copy-code": [code: string, event: Event];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const gpuError = ref<string | null>(null);
// One shared gpu across opens — init lazily, dispose once on unmount.
let gpu: any = null;
let loop: FrameLoopHandle | null = null;

const SHADERS: Record<string, string> = {
  s02_fullscreen: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  gpu_gradient: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  gpu_black_hole: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -4); let rd = normalize(vec3f(uv, 1.5)); let angle = u.time * 0.2; let c = cos(angle); let s = sin(angle); let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rotated * t; let d = length(p) - 1.0; if (d < 0.001 || t > 20.0) { break; } t += d; } let p = ro + rotated * t; let disk = smoothstep(0.02, 0.0, abs(p.y) - 0.3) * smoothstep(0.5, 0.3, length(p.xz)); let horizon = smoothstep(0.05, 0.0, length(p) - 1.0); let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1); return vec4f(col, 1); }`,
  cockpit: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
  fw_vue: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
  // Visual Gallery recipes
  vg_anime: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 { let ba = b - a; let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0); return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h))); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let head = 1.0 - smoothstep(0.31, 0.29, length(p * vec2f(0.9, 1.08))); let hair = 1.0 - smoothstep(0.12, 0.0, abs(abs(p.x) - 0.17 + 0.025 * sin(p.y * 20.0 + t))); let eyes = lineGlow(p, vec2f(-0.13, -0.025), vec2f(-0.04, -0.025), 0.012) + lineGlow(p, vec2f(0.04, -0.025), vec2f(0.13, -0.025), 0.012); let scan = 1.0 - smoothstep(0.0, 0.018, abs(fract(uv.y * 18.0 + t * 0.08) - 0.5)); color += head * params.secondary.rgb * 0.55 + hair * params.accent.rgb * 0.65 + eyes * params.accent.rgb * 1.6 + scan * params.accent.rgb * 0.08; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_enterprise: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let ring = 1.0 - smoothstep(0.012, 0.028, abs(d - 0.27 - 0.018 * pulse)); let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * (1.0 - smoothstep(0.008, 0.026, abs(d - 0.27))); let orbit = 1.0 - smoothstep(0.018, 0.035, abs(length(p - vec2f(cos(t), sin(t)) * 0.27) - 0.024)); let grid = (1.0 - smoothstep(0.0, 0.01, abs(fract(uv.x * 12.0) - 0.5))) * 0.08; color += params.secondary.rgb * ring + params.accent.rgb * (arc + orbit) + params.accent.rgb * grid; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_psychedelic: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let warp = sin(a * 7.0 + t) * 0.045 + cos(a * 11.0 - t * 0.7) * 0.025; let petals = pow(max(0.0, cos(a * 7.0 + sin(d * 18.0 - t))), 8.0); let bloom = 1.0 - smoothstep(0.34 + warp, 0.06 + warp, d); let chroma = vec3f(sin(t + 0.0) * 0.5 + 0.5, sin(t + 2.1) * 0.5 + 0.5, sin(t + 4.2) * 0.5 + 0.5); color += chroma * bloom * (0.25 + petals * 1.4) + params.accent.rgb * petals * energy; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_calm: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let wave = sin(uv.x * 18.0 + t * 0.45) * 0.018 + sin(uv.x * 37.0 - t * 0.25) * 0.009; let horizon = 1.0 - smoothstep(0.02, 0.0, abs(uv.y - 0.56 - wave)); let orb = 1.0 - smoothstep(0.18, 0.0, length(p - vec2f(0.0, 0.06))) * (0.5 + pulse * 0.4); color += params.secondary.rgb * (0.25 + uv.y * 0.5) + params.accent.rgb * (horizon * 0.35 + orb * 0.6); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_confetti: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let rays = pow(max(0.0, cos(a * 18.0 + t * 0.4)), 28.0) * (1.0 - smoothstep(0.1, 0.5, d)); let spark = pow(max(0.0, 1.0 - d * 8.0), 3.0) * pulse; let confetti = step(0.82, hash2(floor(uv * 18.0) + floor(t * 2.0))) * (1.0 - smoothstep(0.2, 0.55, d)); color += params.accent.rgb * (rays + spark) + params.secondary.rgb * confetti; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_glitch: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 { let ba = b - a; let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0); return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h))); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let band = step(0.7, hash2(vec2f(floor(uv.y * 24.0), floor(t * 7.0)))) * (1.0 - smoothstep(0.0, 0.35, d)); let bars = lineGlow(p, vec2f(-0.42, 0.12), vec2f(0.25, 0.12), 0.018) + lineGlow(p, vec2f(-0.2, -0.14), vec2f(0.42, -0.14), 0.012); let jitter = sin(floor(uv.y * 28.0) + t * 9.0) * 0.02; color += params.secondary.rgb * (0.2 + band) + params.accent.rgb * (bars + abs(jitter) * 3.0); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_minimal: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let ring = 1.0 - smoothstep(0.008, 0.02, abs(d - 0.24)); let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * ring; let center = 1.0 - smoothstep(0.13, 0.0, d); color += params.secondary.rgb * ring * 0.8 + params.accent.rgb * (arc + center * 0.12); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_cosmic: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let stars = step(0.985, hash2(floor(uv * 42.0) + params.phase)) * (0.4 + pulse * 0.6); let node = 1.0 - smoothstep(0.025, 0.0, length(p - vec2f(cos(t * 0.7), sin(t * 0.7)) * 0.25)); let nebula = exp(-d * 4.0) * (0.4 + 0.3 * sin(a * 3.0 + t)); color += params.secondary.rgb * (stars + nebula) + params.accent.rgb * node; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
};

let currentShader = "";
let currentLabel = "";

function getShaderId(): string {
  if (props.type === "example" && props.example) return props.example.id;
  if (props.type === "framework" && props.framework) return "fw_" + props.framework.id;
  return "";
}

function isGalleryShader(id: string): boolean {
  return id.startsWith("vg_");
}

function getInitialParams(id: string): Record<string, any> {
  if (isGalleryShader(id)) {
    return { time: 0, progress: 0.5, activity: 0.5, status: 2, phase: 0, speed: 1.0, pad: [0, 0], accent: [0.35, 0.95, 1, 1], secondary: [0.06, 0.38, 0.65, 1], background: [0.005, 0.028, 0.06, 1] };
  }
  return { time: 0, resolution: [800, 400] };
}

async function mountModalCanvas() {
  stopLoop();
  const canvas = canvasRef.value;
  if (!canvas || !props.open) return;

  const id = getShaderId();
  const shader = SHADERS[id];
  if (!shader) return;

  gpuError.value = null;
  if (!isWebGPUAvailable()) {
    gpuError.value = WEBGPU_UNAVAILABLE_MSG;
    return;
  }
  try {
    if (!gpu) gpu = await init();
  } catch (e) {
    console.error("[aigpu] Modal init failed:", e);
    gpuError.value = e instanceof Error ? e.message : WEBGPU_UNAVAILABLE_MSG;
    return;
  }

  if (id !== currentShader) {
    currentShader = id;
    currentLabel = id;
  }

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const vis = effect(gpu, shader, { label: currentLabel, set: getInitialParams(id) });

  // Single frameLoop (owns its rAF). Stopped on close.
  loop = frameLoop(gpu, (frame) => {
    if (!props.open) return;
    if (isGalleryShader(id)) {
      vis.set({ time: performance.now() / 1000 });
    } else {
      vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
    }
    frame.pass(output, vis);
  });
}

function stopLoop() {
  try { loop?.stop(); } catch { /* ignore */ }
  loop = null;
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    setTimeout(mountModalCanvas, 50);
  } else {
    stopLoop();
    currentShader = "";
  }
});

onUnmounted(() => {
  stopLoop();
  try { gpu?.dispose(); } catch { /* ignore */ }
  gpu = null;
});
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <p class="eyebrow">{{ type === 'example' ? example?.category : 'Framework' }}</p>
          <h2>{{ type === 'example' ? example?.title : framework?.name }}</h2>
        </div>
        <button class="modal-close" @click="emit('close')">[x]</button>
      </div>
      <div class="modal-body">
        <div class="modal-preview">
          <p v-if="gpuError" class="gpu-fallback">{{ gpuError }}</p>
          <canvas v-if="type === 'example'" ref="canvasRef" class="modal-canvas" :data-visual="example?.id" width="800" height="400"></canvas>
          <div v-else class="modal-integration-preview">
            <canvas ref="canvasRef" class="integration-canvas-large" :data-visual="'fw_' + framework?.id" width="800" height="300"></canvas>
          </div>
        </div>
        <div class="modal-code">
          <div class="code-header">
            <span class="code-lang">{{ type === 'example' ? 'TypeScript' : framework?.lang || 'TypeScript' }}</span>
            <button class="copy-trigger" @click="emit('copy-code', type === 'example' ? example?.code : framework?.code, $event)">Copy all</button>
          </div>
          <pre class="code-block"><code>{{ type === 'example' ? example?.code : framework?.code }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>
