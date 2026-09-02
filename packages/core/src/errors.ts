export type AIGpuErrorSeverity = "error" | "warning" | "info";

export interface AIGpuErrorDetail {
  readonly drawLabel?: string;
  readonly group?: number;
  readonly signature?: string;
  readonly stage?: "vertex" | "fragment";
  readonly entryPoint?: string;
  readonly count?: number;
  readonly limit?: number;
  readonly bindings?: readonly { readonly name: string; readonly group: number; readonly binding: number }[];
  readonly format?: string;
  readonly binding?: number;
  readonly bindingName?: string;
  readonly resourceName?: string;
  readonly samplerName?: string;
  readonly samplerGroup?: number;
  readonly samplerBinding?: number;
}

export interface AIGpuErrorData {
  readonly code: string;
  readonly message: string;
  readonly severity?: AIGpuErrorSeverity;
  readonly fix?: string;
  readonly where?: string;
  readonly cause?: unknown;
  readonly detail?: AIGpuErrorDetail;
}

export class AIGpuError extends Error {
  readonly code: string;
  readonly severity: AIGpuErrorSeverity;
  readonly fix?: string;
  readonly where?: string;
  override readonly cause?: unknown;
  readonly detail?: AIGpuErrorDetail;

  constructor(data: AIGpuErrorData) {
    super(data.message, { cause: data.cause });
    this.name = "AIGpuError";
    this.code = data.code;
    this.severity = data.severity ?? "error";
    this.fix = data.fix;
    this.where = data.where;
    this.cause = data.cause;
    this.detail = data.detail;
  }
}

export class ValidationError extends AIGpuError {
  constructor(data: Omit<AIGpuErrorData, "severity">) {
    super({ ...data, severity: "error" });
    this.name = "ValidationError";
  }
}

export function unsupportedFeaturesError(missing: readonly string[]): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FEATURE-UNSUPPORTED",
    message: `Adapter does not support requested feature(s): ${missing.map((name) => `"${name}"`).join(", ")}.`,
    fix: "Remove the unsupported name(s) from init({ requiredFeatures: [...] }) or run on an adapter that supports them; gate optional code paths on device.features after init.",
    where: "init",
  });
}

/** Adapters call this before requestDevice so an unsupported requiredFeatures entry fails init with AIGPU-FEATURE-UNSUPPORTED instead of a native rejection. An adapter that reports no feature set cannot be pre-checked; native requestDevice validation still applies. */
export function validateRequiredFeatures(supported: { has(name: string): boolean } | undefined, required: readonly GPUFeatureName[] | undefined): void {
  if (!supported) return;
  const missing = (required ?? []).filter((feature) => !supported.has(feature));
  if (missing.length) throw unsupportedFeaturesError(missing);
}
