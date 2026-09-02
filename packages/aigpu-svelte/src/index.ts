import { mountAgentCanvas, type AgentCanvasController, type AgentCanvasOptions } from "aigpu/dom";
import type { AgentAnimationPatch } from "aigpu";

export interface AgentCanvasAction {
  readonly controller: AgentCanvasController;
  update(patch: AgentAnimationPatch | AgentCanvasActionOptions): void;
  destroy(): void;
}

export type AgentCanvasActionOptions = AgentCanvasOptions & { readonly patch?: AgentAnimationPatch };

/**
 * Svelte action. It uses the standard action contract and imports no Svelte runtime, so it works
 * with Svelte 3, 4, and 5. Use it as `use:agentCanvas={patch}` on a canvas element.
 */
export function agentCanvas(node: HTMLCanvasElement, options: AgentCanvasActionOptions = {}): AgentCanvasAction {
  const controller = mountAgentCanvas(node, options);
  return {
    controller,
    update(next) { controller.set("patch" in next ? (next.patch ?? {}) : next); },
    destroy() { controller.destroy(); },
  };
}

export { mountAgentCanvas } from "aigpu/dom";
export type { AgentCanvasController, AgentCanvasOptions, MountedAgentCanvas } from "aigpu/dom";
