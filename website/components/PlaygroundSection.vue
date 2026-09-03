<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { effect, frameLoop, surface } from "aigpu";
import { useGpuMount } from "../composables/useWebGPU";

const props = defineProps<{
  status: string;
  progress: number;
  activity: number;
  eventLog: string;
}>();

const emit = defineEmits<{
  "apply-patch": [];
  "next-event": [];
  "update:status": [value: string];
  "update:progress": [value: number];
  "update:activity": [value: number];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { gpuError, withGpu, setLoop, cleanup, retryWebGPU } = useGpuMount();

const SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f, status: f32, progress: f32, activity: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let grid = fract(uv * vec2f(20.0, 12.0));
  let line = smoothstep(0.02, 0.0, min(grid.x, grid.y));
  let wave = sin(uv.x * 6.0 + u.time * (1.0 + u.progress) + u.status * 1.2) * 0.05;
  let ring = smoothstep(0.008, 0.0, abs(uv.y - 0.5 - wave));
  let activityGlow = u.activity * 0.01;
  let col = vec3f(line * 0.4 + ring * 0.6 + activityGlow * noise(uv * 10.0 + u.time));
  return vec4f(col, 1);
}`;

onMounted(async () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  await withGpu(async (gpu) => {
    const output = surface(gpu, canvas, { dpr: [1, 1.5] });
    const vis = effect(gpu, SHADER, {
      label: "playground",
      set: { time: 0, resolution: [canvas.width, canvas.height], status: 2, progress: 0.64, activity: 0.42 },
    });

    const statusMap: Record<string, number> = { idle: 0, thinking: 1, working: 2, waiting: 3, success: 4, error: 5 };

    // Single frameLoop (owns its rAF); read reactive props inside the tick.
    const handle = frameLoop(gpu, (frame) => {
      vis.set({
        time: performance.now() / 1000,
        resolution: [canvas.width, canvas.height],
        status: statusMap[props.status] ?? 2,
        progress: props.progress / 100,
        activity: props.activity / 100,
      });
      frame.pass(output, vis);
    });
    setLoop(handle);
  });
});

onUnmounted(() => cleanup());
</script>

<template>
  <section id="showcase" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">live playground</p><h2>One state contract. Any interface.</h2></div>
      <p class="section-note">Simulate agent events in real time. The same patches drive any renderer.</p>
    </div>
    <div class="playground-grid">
      <div class="demo-stage">
        <div class="stage-toolbar">
          <span class="toolbar-title">agent-ops / live</span>
          <span class="toolbar-status"><i></i> local simulation</span>
        </div>
        <canvas ref="canvasRef" width="900" height="560" aria-label="Live simulated agent animation"></canvas>
        <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
        <div class="stage-footer">
          <span id="stage-status">{{ status }}</span>
          <span class="stage-progress"><span id="stage-progress-bar" :style="{ width: progress + '%' }"></span></span>
          <span id="stage-progress-label">{{ progress }}%</span>
        </div>
      </div>
      <aside class="control-panel">
        <p class="panel-kicker">// event bridge</p>
        <h3>Drive pixels with plain data</h3>
        <p class="muted">Same patches your queue, worker, WebSocket, or orchestrator sends.</p>
        <div class="control-group">
          <label for="status-select">Status</label>
          <select id="status-select" :value="status" @change="emit('update:status', ($event.target as HTMLSelectElement).value)">
            <option>idle</option><option>thinking</option><option>working</option>
            <option>waiting</option><option>success</option><option>error</option>
          </select>
        </div>
        <div class="control-group">
          <label for="progress-range">Progress <output id="progress-output">{{ progress }}%</output></label>
          <input id="progress-range" type="range" min="0" max="100" :value="progress" @input="emit('update:progress', +($event.target as HTMLInputElement).value)">
        </div>
        <div class="control-group">
          <label for="activity-range">Activity <output id="activity-output">{{ activity }}%</output></label>
          <input id="activity-range" type="range" min="0" max="100" :value="activity" @input="emit('update:activity', +($event.target as HTMLInputElement).value)">
        </div>
        <div class="control-actions">
          <button class="button button-primary button-full" @click="emit('apply-patch')">Apply patch</button>
          <button class="button button-quiet button-full" @click="emit('next-event')">Replay next event</button>
        </div>
        <pre class="event-log" aria-live="polite">{{ eventLog }}</pre>
      </aside>
    </div>
  </section>
</template>
