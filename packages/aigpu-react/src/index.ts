import { useEffect, useRef, useState, type RefObject } from "react";
import { mountAgentCanvas, type AgentCanvasController, type AgentCanvasOptions, type MountedAgentCanvas } from "aigpu/dom";
import type { AgentAnimationPatch } from "aigpu";

export interface UseAgentCanvasOptions extends AgentCanvasOptions {
  /** Optional live patch applied when this value changes. */
  readonly patch?: AgentAnimationPatch;
  /** Change this key to intentionally tear down and recreate the GPU surface. */
  readonly restartKey?: string | number;
}

export interface UseAgentCanvasResult {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly controller: AgentCanvasController | null;
  readonly mounted: MountedAgentCanvas | null;
}

/**
 * React 18+ hook. React is a peer dependency of this adapter only; the AIGpu core remains React-free.
 * Keep `options` stable or provide `restartKey` when a full remount is desired.
 */
export function useAgentCanvas(options: UseAgentCanvasOptions = {}): UseAgentCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<AgentCanvasController | null>(null);
  const [controller, setController] = useState<AgentCanvasController | null>(null);
  const [mounted, setMounted] = useState<MountedAgentCanvas | null>(null);
  const patch = options.patch;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const next = mountAgentCanvas(canvas, options);
    let alive = true;
    controllerRef.current = next;
    setController(next);
    void next.ready.then((resources) => {
      if (alive) setMounted(resources);
    }).catch(() => undefined);
    return () => {
      alive = false;
      next.destroy();
      controllerRef.current = null;
      setController(null);
      setMounted(null);
    };
  }, [options.restartKey]);

  useEffect(() => {
    if (patch) controllerRef.current?.set(patch);
  }, [patch]);

  return { canvasRef, controller, mounted };
}

export { mountAgentCanvas } from "aigpu/dom";
export type { AgentCanvasController, AgentCanvasOptions, MountedAgentCanvas } from "aigpu/dom";
