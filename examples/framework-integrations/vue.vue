<script setup lang="ts">
import { ref, watch } from "vue";
import { useAgentCanvas } from "@aigpu/vue";

const status = ref<"thinking" | "working" | "success">("working");
const progress = ref(0.45);
const { canvas, controller, mounted } = useAgentCanvas({
  label: "vue-agent",
  initial: { status: "thinking", activity: 0.7 },
});
watch([status, progress], () => controller.value?.set({ status: status.value, progress: progress.value, activity: 0.85 }));
</script>

<template>
  <div role="status" aria-live="polite">
    <canvas ref="canvas" aria-label="Vue agent" />
    <span>{{ mounted ? status : 'initializing' }}</span>
  </div>
</template>
