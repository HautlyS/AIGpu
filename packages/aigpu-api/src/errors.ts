import { AIGpuError as CoreAIGpuError } from "@aigpu/core";
import type { BindingInfo } from "@aigpu/wgsl/reflect-source";

export class AIGpuError extends CoreAIGpuError {}

export function storageStageLimitError(label: string, stage: "vertex" | "fragment", entryPoint: string, count: number, limit: number, bindings: readonly BindingInfo[]): AIGpuError {
  const title = stage === "vertex" ? "Vertex" : "Fragment";
  const suffix = stage === "vertex" ? "VERTEX" : "FRAGMENT";
  const limitName = `maxStorageBuffersIn${title}Stage`;
  return new AIGpuError({
    code: `AIGPU-LIMIT-STORAGE-${suffix}`,
    message: `${title} entry '${entryPoint}' in '${label}' uses ${count} storage buffer(s), but device limit ${limitName} is ${limit}.`,
    fix: stage === "vertex"
      ? `Request init({ requiredLimits: { ${limitName}: ${count} } }) if the adapter supports it, or move vertex data to geometry(gpu, ...) vertex streams.`
      : `Request init({ requiredLimits: { ${limitName}: ${count} } }) if the adapter supports it, or reduce fragment storage buffers.`,
    where: `${label}.pipelineLayout`,
    detail: { stage, entryPoint, count, limit, bindings: bindings.map(({ name, group, binding }) => ({ name, group, binding })) },
  });
}

export function textureFilterabilityError(label: string, binding: BindingInfo, format: string, resourceName: string, sampler?: BindingInfo): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SET-TEXTURE-FILTERABILITY",
    message: `${resourceName} (${format}) cannot satisfy filtering texture '${binding.name}' @group(${binding.group}) @binding(${binding.binding}).`,
    fix: "Use a filterable format; request float32-filterable for rgba32float when supported; or use textureLoad without a sampler.",
    where: `${label}.set`,
    detail: { format, group: binding.group, binding: binding.binding, bindingName: binding.name, resourceName, samplerName: sampler?.name, samplerGroup: sampler?.group, samplerBinding: sampler?.binding },
  });
}

export function neverSetError(drawLabel: string, binding: BindingInfo): AIGpuError {
  const fix = missingBindingFix(drawLabel, binding);
  return new AIGpuError({
    code: "AIGPU-R1-BINDING-NEVER-SET",
    message: `Unset \`${binding.name}\` @group(${binding.group}) @binding(${binding.binding}) in '${drawLabel}'. Fix: ${fix}; or ${drawLabel}.group(${binding.group}, bindGroup).`,
    where: `${drawLabel}.draw`,
  });
}

export function ownershipFlipError(name: string, previous: "lib" | "user"): AIGpuError {
  const previousText = previous === "lib" ? "lib-owned by its first JS set()" : "user-owned by its first resource set()";
  const fix = previous === "lib"
    ? `Fix: pass a resource from the start: wave.set({ ${name}: new Uniform(gpu.device, { size: 4 }) }).`
    : `Fix: pass JS values from the first set(): wave.set({ ${name}: jsValue }).`;
  return new AIGpuError({
    code: "AIGPU-R1-OWNERSHIP-FLIP",
    message: `\`${name}\` is ${previousText}; ownership cannot change. ${fix}`,
    where: "set",
  });
}

export function claimedGroupSetError(label: string, group: number): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R4-GROUP-CLAIMED",
    message: `group ${group} of '${label}' is claimed; set() cannot update it.`,
    fix: `Call set() first, or build from ${label}.layout(${group}); pass dynamic offsets to p.draw().`,
    where: `${label}.set`,
  });
}

export function claimedGroupIncompatibleError(label: string, group: number, reason: string, cause?: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R4-GROUP-INCOMPATIBLE",
    message: `claimed group ${group} in '${label}' is incompatible: ${reason}.`,
    fix: `Build from ${label}.layout(${group}, { dynamicOffsets? }) then call ${label}.group(${group}, bindGroup).`,
    where: `${label}.group`,
    cause,
  });
}

export function claimedGroupNativeValidationError(label: string, group: number, cause: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R4-GROUP-VALIDATION",
    message: `WebGPU rejected claimed group ${group} in '${label}'.`,
    fix: `Build from ${label}.layout(${group}); pass offsets via p.draw(draw, { offsets: { ${group}: [...] } }).`,
    where: `${label}.draw`,
    cause,
    detail: { drawLabel: label, group },
  });
}


export function blendInvalidError(label: string, value: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-BLEND-INVALID",
    message: `Invalid blend '${String(value)}' in '${label}'.`,
    fix: `Use "alpha", "additive", "premultiplied", or { color, alpha? } components.`,
    where: "draw",
  });
}

export function blendConstantInvalidError(label: string, reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-BLEND-CONSTANT-INVALID",
    message: `Invalid blendConstant in '${label}': ${reason}`,
    fix: `Use [r, g, b, a] finite numbers with a blend whose color or alpha uses "constant"/"one-minus-constant"; omit it to keep the pass default (0, 0, 0, 0).`,
    where: "draw",
  });
}

export function bundleBlendConstantError(bundleId: string, drawLabel: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-BUNDLE-BLEND-CONSTANT",
    message: `bundle '${bundleId}' cannot record draw '${drawLabel}': blendConstant is render-pass state and render bundle encoders cannot set it.`,
    fix: `Encode the draw with p.draw(...) in a frame pass, or drop blendConstant from the draw.`,
    where: "bundle",
  });
}

export function writeMaskInvalidError(label: string, preview: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-WRITEMASK-INVALID",
    message: `Invalid writeMask ${preview} in '${label}'.`,
    fix: `Use an array of r/g/b/a; omit it for all channels.`,
    where: "draw",
  });
}

export function colorsInvalidError(label: string, reason: string, where = "draw"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-COLORS-INVALID",
    message: `Invalid colors in '${label}': ${reason}`,
    fix: `Use one { blend?, writeMask? } or null entry per color attachment of the target, aligned by index; omit colors to apply the top-level blend/writeMask to every attachment.`,
    where,
  });
}

export function cullInvalidError(label: string, value: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-CULL-INVALID",
    message: `Invalid cull '${String(value)}' in '${label}'.`,
    fix: `Use "none", "front", or "back"; omit it for no culling.`,
    where: "draw",
  });
}

export function frontFaceInvalidError(label: string, value: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FRONTFACE-INVALID",
    message: `Invalid frontFace '${String(value)}' in '${label}'.`,
    fix: `Use "ccw" or "cw"; omit it for counter-clockwise.`,
    where: "draw",
  });
}

export function unclippedDepthInvalidError(label: string, reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-UNCLIPPED-DEPTH-INVALID",
    message: `Invalid unclippedDepth in '${label}': ${reason}`,
    fix: `Use a boolean. unclippedDepth: true needs the "depth-clip-control" device feature — request it with init({ requiredFeatures: ["depth-clip-control"] }) on an adapter that supports it. Omit the option to keep depth clipping.`,
    where: "draw",
  });
}

export function depthInvalidError(label: string, reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-DEPTH-INVALID",
    message: `Invalid depth in '${label}': ${reason}`,
    fix: `Use false or { write?, compare?, bias?, biasSlopeScale?, biasClamp? }; omit it for { write: true, compare: "less-equal" }.`,
    where: "draw",
  });
}

export function stencilInvalidError(label: string, reason: string, where = "draw"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-STENCIL-INVALID",
    message: `Invalid stencil in '${label}': ${reason}`,
    fix: `Use { front?, back?, readMask?, writeMask?, ref? } with GPUCompareFunction/GPUStencilOperation faces and u32 masks, against a target whose depth format has a stencil aspect (depth: "depth24plus-stencil8"); omit it for WebGPU's pass-through defaults.`,
    where,
  });
}

export function bundleStencilReferenceError(bundleId: string, drawLabel: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-BUNDLE-STENCIL-REF",
    message: `bundle '${bundleId}' cannot record draw '${drawLabel}': stencil.ref is render-pass state and render bundle encoders cannot set it.`,
    fix: `Encode the draw with p.draw(...) in a frame pass, or drop ref from the draw's stencil.`,
    where: "bundle",
  });
}

export function multisampleInvalidError(label: string, reason: string, where = "draw"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-MULTISAMPLE-INVALID",
    message: `Invalid multisample in '${label}': ${reason}`,
    fix: `Use { alphaToCoverage?, mask? }: alphaToCoverage needs a target created with msaa: true, and mask must be an integer in [0, 0xFFFFFFFF] (bits above the target's sampleCount are ignored). Omit multisample for full-coverage defaults.`,
    where,
  });
}

export function constantsInvalidError(label: string, reason: string, where = "draw"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-CONSTANTS-INVALID",
    message: `Invalid constants in '${label}': ${reason}`,
    fix: `Key WGSL \`override\` constants by name, or by the decimal string of N when the declaration has @id(N); values are finite numbers or booleans, converted to the override's WGSL type (bool/i32/u32/f32/f16). Every override without a default value must be provided. Omit constants to keep the WGSL defaults.`,
    where,
  });
}

export function entryInvalidError(label: string, reason: string, where = "draw"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-ENTRY-INVALID",
    message: `Invalid entry in '${label}': ${reason}`,
    fix: `Name an entry point declared in the shader with the matching stage — { vertex?, fragment? } strings for draw, one @compute name string for compute. Omit entry (or a field) to use the first entry point of that stage.`,
    where,
  });
}

export function indirectInvalidError(label: string, reason: string, where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-INDIRECT-INVALID",
    message: `Invalid indirect in '${label}': ${reason}`,
    fix: `Pass a storage buffer created with storage(gpu, bytes, { indirect: true }) — bare, or as { buffer, offset? } with a 4-aligned byte offset — sized so the GPU-read arguments fit: 16 bytes for drawIndirect, 20 for drawIndexedIndirect, 12 for dispatchWorkgroupsIndirect. Omit indirect to use CPU-side counts.`,
    where,
  });
}

export function passPreserveMsaaError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-PRESERVE-MSAA",
    message: "clear:false cannot preserve MSAA; use a non-MSAA target.",
    fix: "Use non-MSAA for accumulation.",
    where: "Frame.pass",
  });
}

export function passClearDepthInvalidError(
  value: unknown,
  reason = "expected a number in [0, 1].",
  fix = `Use 1 (default), or 0 with depth: { compare: "greater" } for reversed-Z.`,
): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-CLEARDEPTH-INVALID",
    message: `clearDepth received ${String(value)}; ${reason}`,
    fix,
    where: "Frame.pass",
  });
}

export function passViewportInvalidError(reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-VIEWPORT-INVALID",
    message: `Invalid viewport: ${reason}`,
    fix: `Use { x?, y?, width, height, minDepth?, maxDepth? } finite numbers within device limits; omit it for the full target.`,
    where: "Frame.pass",
  });
}

export function passScissorInvalidError(reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-SCISSOR-INVALID",
    message: `Invalid scissor: ${reason}`,
    fix: `Use [x, y, width, height] non-negative integers with x + width and y + height within the target's current pixel size; omit it for the full target.`,
    where: "Frame.pass",
  });
}

export function passPreserveClearDepthError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-PRESERVE-CLEARDEPTH",
    message: "clear:false preserves depth; clearDepth cannot apply.",
    fix: "Remove clearDepth, or let the pass clear.",
    where: "Frame.pass",
  });
}

export function passClearStencilInvalidError(reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-CLEARSTENCIL-INVALID",
    message: `clearStencil ${reason}`,
    fix: `Use an integer in [0, 0xFFFFFFFF] on a target whose depth format has a stencil aspect, e.g. depth: "depth24plus-stencil8"; the value is masked to the stencil aspect's bit width.`,
    where: "Frame.pass",
  });
}

export function passPreserveClearStencilError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-PRESERVE-CLEARSTENCIL",
    message: "clear:false preserves stencil; clearStencil cannot apply.",
    fix: "Remove clearStencil, or let the pass clear.",
    where: "Frame.pass",
  });
}

export function passDepthReadOnlyError(reason: string, fix: string, where: "Frame.pass" | "FramePass.draw" | "FramePass.bundles" = "Frame.pass"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-DEPTH-READONLY",
    message: `depthReadOnly ${reason}`,
    fix,
    where,
  });
}


export function passDepthReadOnlyMsaaError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PASS-DEPTH-READONLY-MSAA",
    message: "depthReadOnly cannot read an MSAA target's depth: multisampled depth is stored with storeOp \"discard\", so a read-only pass tests against discarded contents.",
    fix: "Use a non-MSAA target for read-only depth, or drop depthReadOnly and let the pass own its depth.",
    where: "Frame.pass",
  });
}

export function timerInvalidError(reason: string, fix: string, where = "timer"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-TIMER-INVALID",
    message: `Invalid timer use: ${reason}`,
    fix,
    where,
  });
}

export function timerCapacityError(maxSpans: number, maxQueries: number): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-TIMER-CAPACITY",
    message: `frame exceeds ${maxSpans} timed spans; a timer holds one timestamp query set and WebGPU createQuerySet requires count <= ${maxQueries} (2 queries per span).`,
    fix: "Time fewer passes per frame, or spread timing across frames.",
    where: "Frame.pass",
  });
}

export function visibilityInvalidError(reason: string, fix: string, where = "visibility"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-INVALID",
    message: `Invalid visibility use: ${reason}`,
    fix,
    where,
  });
}

export function visibilityCapacityLimitError(value: unknown, maxQueries: number): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-CAPACITY-LIMIT",
    message: `capacity received ${String(value)}; expected an integer in [1, ${maxQueries}] — a visibility instance holds one occlusion query set and WebGPU createQuerySet requires count <= ${maxQueries}.`,
    fix: `Use visibility(gpu, { capacity }) with an integer capacity of at most ${maxQueries} (default 64), or create several visibility instances.`,
    where: "visibility",
  });
}

export function visibilityCapacityError(capacity: number): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-CAPACITY",
    message: `frame uses more than the declared ${capacity} occlusion query slot(s); the query set is bound to this frame's pass descriptors and cannot grow mid-frame.`,
    fix: `Raise visibility(gpu, { capacity }) (max 4096), or dispose() unused query handles so fewer slots are needed per frame.`,
    where: "FramePass.occlusion",
  });
}

export function visibilityLabelDuplicateError(label: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-LABEL-DUPLICATE",
    message: `query label '${label}' is already live on this visibility instance.`,
    fix: `Reuse the existing handle — vis.query(label) handles are stable, created once outside the loop — or dispose() the old handle first, or pick a distinct label.`,
    where: "Visibility.query",
  });
}

export function visibilityDisposedError(what: "visibility" | "query handle", where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-DISPOSED",
    message: `the ${what} is disposed.`,
    fix: what === "visibility" ? "Create a new instance with visibility(gpu)." : "Create a new handle with vis.query(label).",
    where,
  });
}

export function visibilityNoDepthError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-VIS-NO-DEPTH",
    message: "visibility is set, but the pass target has no depth attachment; without depth testing an occlusion query passes for anything rasterized, so it always reports \"visible\" and is useless for culling.",
    fix: "Create the target with depth: true (or a depth format), or drop visibility from this pass.",
    where: "Frame.pass",
  });
}

export function queryNoVisibilityError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-QUERY-NO-VISIBILITY",
    message: "occlusion() needs the pass to be opened with a visibility instance; the render pass has no occlusionQuerySet to write into.",
    fix: "Open the pass with f.pass({ target, visibility: vis }, ...) using the visibility(gpu) instance that created the query handle.",
    where: "FramePass.occlusion",
  });
}

export function queryNestedError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-QUERY-NESTED",
    message: "occlusion() cannot nest inside an active occlusion() body; WebGPU allows one active occlusion query per pass at a time.",
    fix: "Encode each occlusion scope sequentially: p.occlusion(a, ...); p.occlusion(b, ...).",
    where: "FramePass.occlusion",
  });
}

export function queryDuplicateError(label: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-QUERY-DUPLICATE",
    message: `query '${label}' was already used this frame; a slot holds one result per frame, so reuse would silently overwrite it.`,
    fix: `Use one handle per measured object per frame, e.g. vis.query("${label}-2") for a second scope.`,
    where: "FramePass.occlusion",
  });
}

export function targetRequiredError(where = "Frame.pass"): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-TARGET-REQUIRED",
    message: "Target required. Fix: pass surface(gpu, canvas) or target(gpu, { size }) as { target }.",
    where,
  });
}

function meshError(code: string, where: string, message: string, fix: string): AIGpuError {
  return new AIGpuError({ code, message: `${code}: ${message}`, fix, where });
}

export function meshLayoutInvalidError(where: string, message: string): AIGpuError {
  return meshError("AIGPU-MESH-LAYOUT-INVALID", where, message, "Fix attributes/formats/offsets; use non-numeric names and 4-aligned stride <= 2048.");
}
export function meshLimitExceededError(where: string, message: string): AIGpuError {
  return meshError("AIGPU-MESH-LIMIT-EXCEEDED", where, message, "Use <= 8 buffers and <= 16 attributes (or the device limits).");
}
export function meshLocationConflictError(where: string, location: number): AIGpuError {
  return meshError("AIGPU-MESH-LOCATION-CONFLICT", where, `Duplicate geometry @location(${location}).`, "Use unique locations, or omit them for name matching.");
}
export function meshDataMisalignedError(where: string, message: string): AIGpuError {
  return meshError("AIGPU-MESH-DATA-MISALIGNED", where, message, "Fix: repack data, set matching stride, or give raw buffers an explicit count.");
}
export function meshRangeInvalidError(where: string, message: string): AIGpuError {
  return meshError("AIGPU-MESH-RANGE-INVALID", where, message, "Use index ranges for indexed geometries, vertex ranges otherwise, within geometry counts.");
}
export function meshWriteRangeError(where: string, message: string): AIGpuError {
  return meshError("AIGPU-MESH-WRITE-RANGE", where, message, "Write within the buffer byteLength, or create a larger geometry.");
}
export function meshAttributeUnmatchedError(where: string, name: string, available: readonly string[] = []): AIGpuError {
  return meshError("AIGPU-MESH-ATTRIBUTE-UNMATCHED", where, `Geometry attribute '${name}' has no shader input.`, `Use shader name${available.length ? ` (${available.join(",")})` : ""} or { location:n }.`);
}
export function meshAttributeAmbiguousError(where: string, name: string, locations: readonly number[]): AIGpuError {
  return meshError("AIGPU-MESH-ATTRIBUTE-UNMATCHED", where, `Geometry attribute '${name}' matches locations ${locations.join(",")}.`, "Rename inputs or set { location:n }.");
}
export function meshInputMissingError(where: string, name: string, available: readonly string[] = []): AIGpuError {
  return meshError("AIGPU-MESH-INPUT-MISSING", where, `Geometry lacks shader input '${name}'.`, `Add/remove it. Geometry attributes: ${available.join(",") || "none"}.`);
}
export function meshFormatMismatchError(where: string, name: string, meshFormat: string, shaderType: string): AIGpuError {
  return meshError("AIGPU-MESH-FORMAT-MISMATCH", where, `Attribute '${name}' ${meshFormat} != shader ${shaderType}.`, "Match the float/sint/uint shader base type; widths may differ.");
}

export function pipelineLayoutGapError(group: number): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-PIPELINE-LAYOUT-GAP",
    message: `Pipeline bind group ${group} is missing.`,
    fix: "Use consecutive @group() indices starting at 0.",
    where: "pipeline layout",
  });
}

export function compileFailedError(where: string, cause: unknown, signature?: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-COMPILE-FAILED",
    message: "WebGPU pipeline compilation failed.",
    fix: "Check WGSL, vertex layouts, and target signature.",
    where,
    cause,
    detail: signature ? { signature } : undefined,
  });
}

export function compileDisposedError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-COMPILE-DISPOSED",
    message: "GPU disposed during pipeline compilation.",
    where,
  });
}

export function compileSignatureInvalidError(where: string, reason: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-COMPILE-SIGNATURE-INVALID",
    message: `Invalid TargetSignature: ${reason}`,
    fix: "Pass { colors, depth?, sampleCount?:1|4 } or a Target.",
    where,
  });
}

export function targetStencilOnlyDepthError(format: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-TARGET-DEPTH-STENCIL-ONLY",
    message: `depth received '${format}'; stencil-only depth targets are not supported yet.`,
    fix: `Use a format with a depth aspect such as "depth24plus" or "depth24plus-stencil8".`,
    where: "target",
  });
}

export function targetSizeRequiredError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-TARGET-SIZE-REQUIRED",
    message: "Target size required. Fix: target(gpu, { size: [w,h] }); update surface-derived targets in onResize.",
    where: "target",
  });
}

export function surfaceNotInFrameError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-NOT-IN-FRAME",
    message: "Surface targets are only available inside frame(gpu).",
    fix: "surface passes must run inside frame(gpu, ...); precompile against an offscreen target(gpu, ...) instead",
    where,
  });
}

export function surfaceContextError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-CONTEXT",
    message: "Canvas WebGPU context failed. Fix: check navigator.gpu and remove any existing 2d/webgl context.",
    where: "surface",
  });
}

export function surfaceDuplicateError(label?: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-DUPLICATE",
    message: `Canvas already has surface${label ? ` '${label}'` : ""}. Fix: reuse or dispose it.`,
    where: "surface",
  });
}

export function surfaceDisposedError(label?: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-DISPOSED",
    message: `Surface '${label ?? "surface"}' is disposed. Fix: call surface(gpu, canvas).`,
    where: "surface",
  });
}

export function surfaceAutoResizeUnsupportedError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-AUTORESIZE-UNSUPPORTED",
    message: "autoResize needs clientWidth. Fix: call surface.resize([w,h]) for OffscreenCanvas; onResize still fires.",
    where: "surface",
  });
}

export function surfaceResizeReentrantError(label?: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-SURFACE-RESIZE-REENTRANT",
    message: `Cannot resize this surface${label ? ` '${label}'` : ""} in onResize. Fix: resize derived targets only.`,
    where: "surface.resize",
  });
}

export function clearColorInvalidError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-CLEAR-COLOR-INVALID",
    message: `Invalid ${where}: expected four finite numbers.`,
    fix: "Assign [r, g, b, a] or a GPUColor object ({ r, g, b, a }).",
    where,
  });
}

export function clockDeltaInvalidError(received: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-CLOCK-DELTA-INVALID",
    message: `clock.advance() received ${String(received)}; expected a finite, non-negative number of seconds.`,
    fix: "Pass the elapsed seconds, e.g. clock(gpu).advance(1 / 60); use frame(gpu) alone to advance with wall-clock time.",
    where: "clock.advance",
  });
}

export function frameReentrantError(): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FRAME-REENTRANT",
    message: "Nested frame(gpu) is invalid. Fix: queue work for the next frame.",
    where: "frame",
  });
}

/**
 * A query readback (timer span pair or occlusion slot) that could not be decoded: the map, the
 * mapped-range copy, or the unmap failed. Reported on gpu.onError instead of rejecting the frame —
 * the ring drops the readback and keeps going.
 */
export function queryReadbackError(label: string, cause: unknown): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-QUERY-READBACK",
    message: `${label} dropped a query readback: ${describeCause(cause)}`,
    fix: "Usually a lost or destroyed device: recreate the gpu (and the timer/visibility instance) before reading queries again. Results resume on the next successful readback; the frame itself is unaffected.",
    where: "QueryRing.onSubmitted",
    cause,
  });
}

/** Using a frame that `cancel()` closed: its encoder was dropped, so anything encoded into it would never run. */
export function frameCanceledError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FRAME-CANCELED",
    message: "the frame was canceled; its command encoder was dropped and nothing more can be encoded or submitted on it.",
    fix: "Open a new frame(gpu) for further work; cancel() is the last operation on a frame.",
    where,
  });
}

/** cancel() from inside an active pass would release resources still referenced by its descriptor. */
export function framePassActiveError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FRAME-PASS-ACTIVE",
    message: "the frame cannot be canceled while a pass callback is active.",
    fix: "Return from the frame.pass(...) callback first, then call frame.cancel(); this keeps pass descriptor resources alive until the pass is closed.",
    where,
  });
}

/** cancel() after submit(): the command buffer is already on the queue, so there is nothing left to release. */
export function frameAlreadySubmittedError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-FRAME-SUBMITTED",
    message: "the frame was already submitted; submitted GPU work cannot be canceled.",
    fix: "Call cancel() only on a frame you decided not to submit; the frame you did submit needs no cleanup.",
    where,
  });
}

export function incompatibleResourceError(binding: BindingInfo, expected: string, fix?: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R1-BINDING-INCOMPATIBLE-RESOURCE",
    message: `binding \`${binding.name}\` @group(${binding.group}) @binding(${binding.binding}) needs ${expected}.`,
    fix,
    where: "set",
  });
}

export function unsupportedError(where: string, message: string, fix?: string): AIGpuError {
  return new AIGpuError({ code: "AIGPU-RING1-UNSUPPORTED", message, fix, where });
}

export function malformedShaderSourceError(input: unknown): AIGpuError {
  if (hasVersion(input) && input.version !== 1) {
    return new AIGpuError({
      code: "AIGPU-SHADER-SOURCE-INVALID",
      message: `AIGPU-SHADER-SOURCE-INVALID: unsupported ShaderSource v${String(input.version)}; expected v1. Fix: update aigpu or regenerate it.`,
      where: "shader source",
    });
  }
  return new AIGpuError({
    code: "AIGPU-SHADER-SOURCE-INVALID",
    message: `AIGPU-SHADER-SOURCE-INVALID: expected WGSL or { version, wgsl }, got ${previewShaderSource(input)}. Fix: configure @aigpu/wgsl loader-vite or loader-webpack.`,
    where: "shader source",
  });
}

export function writableStorageAliasingError(where: string): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R1-STORAGE-ALIASING",
    message: "`src` and writable `dst` alias. Fix: alternate them with pingPongStorage(gpu).",
    where,
  });
}

export function sharedUniformLayoutMismatchError(opts: {
  readonly bindingName: string;
  readonly adoptedLayout: string;
  readonly adoptedSource: string;
  readonly incomingLayout: string;
  readonly incomingSource: string;
}): AIGpuError {
  return new AIGpuError({
    code: "AIGPU-R1-SHARED-UNIFORMS-LAYOUT-MISMATCH",
    message: `Uniform '${opts.bindingName}' layout ${opts.adoptedLayout} from ${opts.adoptedSource} != ${opts.incomingLayout} from ${opts.incomingSource}. Fix: align structs or split uniforms.`,
    where: "uniforms",
  });
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

function hasVersion(input: unknown): input is { readonly version: unknown } {
  return typeof input === "object" && input !== null && "version" in input;
}

function previewShaderSource(input: unknown): string {
  if (typeof input !== "object" || input === null) return typeof input;
  try {
    const json = JSON.stringify(input);
    return json.length > 80 ? `${json.slice(0, 77)}...` : json;
  } catch {
    return "object";
  }
}

function missingBindingFix(drawLabel: string, binding: BindingInfo): string {
  switch (binding.kind) {
    case "sampler": return `${drawLabel}.set({${binding.name}:sampler(gpu)})`;
    case "texture": return `${drawLabel}.set({${binding.name}:scene.color})`;
    case "buffer": return binding.addressSpace === "uniform"
      ? `${drawLabel}.set({${binding.name}:{ /* values */ }})`
      : `${drawLabel}.set({${binding.name}:buffer})`;
    default: return `${drawLabel}.set({${binding.name}:resource})`;
  }
}
