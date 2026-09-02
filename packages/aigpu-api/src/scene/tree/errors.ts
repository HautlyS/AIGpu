import { AIGpuError } from "../../errors.ts";

export function sceneCycleError(where: string, label: string | undefined): AIGpuError {
  const name = label ? `'${label}'` : "the node";
  return new AIGpuError({
    code: "AIGPU-SCENE-CYCLE",
    message: `add() would make ${name} an ancestor of itself.`,
    fix: "Remove the node from the ancestor chain first, or add a different node.",
    where,
  });
}

export function sceneValueError(where: string, name: string, expected: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SCENE-VALUE-INVALID",
    message: `\`${name}\` is invalid; expected ${expected}.`,
    fix: `Pass ${expected} for \`${name}\`.`,
    where,
  });
}
