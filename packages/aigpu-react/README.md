# @aigpu/react

Optional React 18+ adapter for AIGpu. The core package does not import React; install this package only when using React.

```sh
npm install aigpu @aigpu/react
```

```tsx
import { useAgentCanvas } from "@aigpu/react";

export function AgentOrb({ progress }: { progress: number }) {
  const { canvasRef, mounted } = useAgentCanvas({
    label: "agent-orb",
    initial: { status: "thinking", activity: 0.7 },
    patch: { status: "working", progress, activity: 0.9 },
  });
  return <canvas ref={canvasRef} aria-label={mounted ? "Agent working" : "Loading agent visual"} />;
}
```

`destroy()` is called by the hook cleanup, and `restartKey` can be used to intentionally recreate a surface. React is a peer dependency, not a core dependency.
