import { useAgentCanvas } from "@aigpu/react";

export function ReactAgent({ progress }: { progress: number }) {
  const { canvasRef, mounted } = useAgentCanvas({
    label: "react-agent",
    initial: { status: "thinking", activity: 0.7 },
    patch: { status: "working", progress, activity: 0.9 },
  });
  return (
    <div role="status" aria-live="polite">
      <canvas ref={canvasRef} aria-label="React agent" />
      <span>{mounted ? "working" : "initializing"}</span>
    </div>
  );
}
