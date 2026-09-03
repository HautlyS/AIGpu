<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useAgentCanvas } from "@aigpu/vue";
import type { AgentStatus } from "aigpu";
import { isWebGPUAvailable, WEBGPU_UNAVAILABLE_MSG } from "../composables/useWebGPU";

const props = defineProps<{
  status: string;
  progress: number;
  activity: number;
}>();

const gpuError = ref<string | null>(
  isWebGPUAvailable() ? null : WEBGPU_UNAVAILABLE_MSG,
);

// Official Vue adapter: owns init + surface + frame loop + visibility gating.
// The returned `canvas` ref must stay bound to the <canvas> below.
const { canvas, controller } = useAgentCanvas({
  initial: { status: "working", progress: 0.64, activity: 0.42 },
  visibility: true,
});

const VALID_STATUSES: readonly AgentStatus[] = [
  "idle",
  "thinking",
  "working",
  "waiting",
  "success",
  "error",
];

function pushPatch() {
  const status = VALID_STATUSES.includes(props.status as AgentStatus)
    ? (props.status as AgentStatus)
    : "working";
  // set() queues until GPU setup completes, so this is safe before ready.
  controller.value?.set({
    status,
    progress: props.progress / 100,
    activity: props.activity / 100,
  });
}

watch(
  () => [props.status, props.progress, props.activity],
  pushPatch,
);

onMounted(() => {
  pushPatch();
  controller.value?.ready
    .then(() => pushPatch())
    .catch((e) => {
      console.error("[aigpu] Vue adapter init failed:", e);
      gpuError.value = e instanceof Error ? e.message : WEBGPU_UNAVAILABLE_MSG;
    });
});
</script>

<template>
  <section id="vue-adapter" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">vue adapter</p><h2>The official Vue adapter. Live.</h2></div>
      <p class="section-note">This canvas is mounted by <code>useAgentCanvas</code> from <code>@aigpu/vue</code> — no manual <code>init() / surface() / frameLoop()</code>. The playground state above drives it.</p>
    </div>
    <div class="demo-stage">
      <div class="stage-toolbar">
        <span class="toolbar-title">agent-ops / @aigpu/vue</span>
        <span class="toolbar-status"><i></i> useAgentCanvas</span>
      </div>
      <canvas ref="canvas" width="900" height="360" aria-label="Vue adapter agent animation"></canvas>
      <p v-if="gpuError" class="gpu-fallback">{{ gpuError }}</p>
      <div class="stage-footer">
        <span id="vue-adapter-status">{{ status }}</span>
        <span class="stage-progress"><span :style="{ width: progress + '%' }"></span></span>
        <span>{{ progress }}%</span>
      </div>
    </div>
  </section>
</template>
