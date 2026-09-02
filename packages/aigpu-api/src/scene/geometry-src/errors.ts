import { AIGpuError } from "@aigpu/core";

export function invalidUsage(where: string, message: string): AIGpuError {
  return new AIGpuError({ code: "AIGPU-CORE-INVALID-USAGE", message, where });
}
