# @aigpu/svelte

Dependency-free Svelte action for AIGpu. It follows the standard action contract and works with Svelte 3, 4, and 5.

```sh
npm install aigpu @aigpu/svelte
```

```svelte
<script lang="ts">
  import { agentCanvas } from "@aigpu/svelte";
  let patch = { status: "working" as const, progress: 0.65, activity: 0.9 };
</script>

<canvas use:agentCanvas={{ initial: { status: "thinking" }, patch, surface: { dpr: [1, 2] } }} />
<!-- Svelte calls action.update when this object changes. -->
```

The action calls `destroy()` when Svelte removes the node. Svelte itself is not imported at runtime by this adapter.
