<script lang="ts">
  import { agentCanvas } from "@aigpu/svelte";
  let status = "thinking" as const;
  let progress = 0.2;
  $: options = {
    initial: { status: "thinking" as const, activity: 0.7 },
    patch: { status, progress, activity: status === "working" ? 0.9 : 0.25 },
    surface: { dpr: [1, 2] as const },
  };
</script>

<div role="status" aria-live="polite">
  <canvas use:agentCanvas={options} aria-label="Svelte agent" />
  <span>{status}</span>
</div>
