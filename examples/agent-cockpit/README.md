# AIGpu agent cockpit

This example is intentionally framework-free. It shows the data contract that an AI agent, local process, or orchestration runtime can send to `agentAnimation()`.

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const visual = agentAnimation(gpu, { initial: { status: "thinking" } });
const canvasSurface = surface(gpu, document.querySelector("canvas")!);
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  visual.tick(time.time);
  frame.pass(canvasSurface, visual.effect);
});

// Replace this with your own model/event adapter.
function onAgentEvent(event: { status: "working" | "success" | "error"; progress?: number }) {
  visual.set(event);
}
```

No API key, hosted endpoint, framework, or vendor SDK is needed.
