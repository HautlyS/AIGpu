import { Buffer, ValidationError, type Device } from "@aigpu/core";
import type { BufferUsageName } from "@aigpu/core";
import type { Mesh } from "../mesh-like.ts";

export async function meshToReadable(mesh: Mesh, device: Device): Promise<Mesh> {
  const usage = mesh.vertexBuffer.gpu.usage;
  if (!Number.isFinite(usage)) throw invalidUsageError();
  if ((usage & copySrcUsage()) !== 0) return mesh;

  const options = mesh.vertexBuffer.options;
  const nextUsage: BufferUsageName[] = options.usage.includes("copy_dst")
    ? [...options.usage, "copy_src"]
    : [...options.usage, "copy_dst", "copy_src"];
  const gpu = device.gpu.createBuffer({
    label: `${options.label ?? "meshToReadable.vertex"}.readable`,
    size: options.size,
    usage: usage | copySrcUsage() | copyDstUsage(),
  });
  const encoder = device.gpu.createCommandEncoder();
  encoder.copyBufferToBuffer(mesh.vertexBuffer.gpu, 0, gpu, 0, options.size);
  device.queue.gpu.submit([encoder.finish()]);
  const srcGpu = mesh.vertexBuffer.gpu as { __aigpuMockBytes?: Uint8Array };
  const dstGpu = gpu as { __aigpuMockBytes?: Uint8Array };
  if (srcGpu.__aigpuMockBytes && dstGpu.__aigpuMockBytes) {
    dstGpu.__aigpuMockBytes.set(srcGpu.__aigpuMockBytes);
  }
  await device.queue.gpu.onSubmittedWorkDone?.();

  return Object.freeze({
    ...mesh,
    vertexBuffer: new Buffer(device, gpu, { ...options, usage: uniqueUsage(nextUsage) }),
  });
}

function uniqueUsage(usage: readonly BufferUsageName[]): BufferUsageName[] {
  return Array.from(new Set(usage));
}

function copySrcUsage(): GPUBufferUsageFlags {
  return (globalThis.GPUBufferUsage?.COPY_SRC ?? 4) as GPUBufferUsageFlags;
}

function copyDstUsage(): GPUBufferUsageFlags {
  return (globalThis.GPUBufferUsage?.COPY_DST ?? 8) as GPUBufferUsageFlags;
}

function invalidUsageError(): ValidationError {
  return new ValidationError({
    code: "AIGPU-CORE-INVALID-USAGE",
    message: "meshToReadable requires a vertex buffer with a valid GPUBuffer.usage flag mask.",
    where: "meshToReadable",
  });
}
