# @aigpu/vue

Optional Vue 3 adapter for AIGpu. The core package remains framework-free.

```sh
npm install aigpu @aigpu/vue vue
```

```vue
<script setup lang="ts">
import { useAgentCanvas } from "@aigpu/vue";

const { canvas, mounted } = useAgentCanvas({
  initial: { status: "thinking", activity: 0.7 },
  patch: { status: "working", progress: 0.65, activity: 0.9 },
});
</script>

<template>
  <canvas ref="canvas" :aria-label="mounted ? 'Agent working' : 'Loading agent visual'" />
</template>
```

The composable creates the surface in `onMounted` and releases it in `onBeforeUnmount`. Vue is an optional peer dependency.
