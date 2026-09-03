<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { init, effect, frameLoop, surface } from "aigpu";

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
let rafId = 0;

const SHADERS: Record<string, string> = {
  s02_fullscreen: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  gpu_gradient: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); return vec4f(uv.x, uv.y, 0.46 + 0.16 * v, 1.0); }`,
  gpu_black_hole: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -4); let rd = normalize(vec3f(uv, 1.5)); let angle = u.time * 0.2; let c = cos(angle); let s = sin(angle); let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rotated * t; let d = length(p) - 1.0; if (d < 0.001 || t > 20.0) { break; } t += d; } let p = ro + rotated * t; let disk = smoothstep(0.02, 0.0, abs(p.y) - 0.3) * smoothstep(0.5, 0.3, length(p.xz)); let horizon = smoothstep(0.05, 0.0, length(p) - 1.0); let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1); return vec4f(col, 1); }`,
  cockpit: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
  fw_vue: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let r = 0.1 + f32(i) * 0.08; let ring = smoothstep(0.005, 0.0, abs(dist - r)); let seg = sin(atan2(uv.y - 0.5, uv.x - 0.5) * (24.0 + f32(i) * 8.0) + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.3 + f32(i) * 0.15)); } return vec4f(col, 1); }`,
};

let currentShader = "";
let currentLabel = "";

function getShaderId(): string {
  if (props.type === "example" && props.example) return props.example.id;
  if (props.type === "framework" && props.framework) return "fw_" + props.framework.id;
  return "";
}

async function mountModalCanvas() {
  cancelAnimationFrame(rafId);
  const canvas = canvasRef.value;
  if (!canvas || !props.open) return;

  const id = getShaderId();
  const shader = SHADERS[id];
  if (!shader) return;

  if (id === currentShader) {
    // Re-render existing
  } else {
    currentShader = id;
    currentLabel = id;
  }

  const gpu = await init();
  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const vis = effect(gpu, shader, { label: currentLabel, set: { time: 0, resolution: [canvas.width, canvas.height] } });

  function animate() {
    if (!props.open) return;
    vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
    frameLoop(gpu, (frame) => frame.pass(output, vis));
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    setTimeout(mountModalCanvas, 50);
  } else {
    cancelAnimationFrame(rafId);
    currentShader = "";
  }
});

onUnmounted(() => cancelAnimationFrame(rafId));
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
