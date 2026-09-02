---
title: Quickstart: Browser
summary: Copy the model output once into a aigpu-owned buffer, then release the tensor.
websitePath: /ml/browser
relatedSymbols: [initFromDevice, Device, Buffer]
---

# Quickstart: Browser

In this quickstart you run an ONNX model with ONNX Runtime Web's WebGPU execution provider and consume its output with aigpu shaders — on one shared `GPUDevice`, without the result ever leaving the GPU.

Prerequisites:

- A browser with WebGPU enabled.
- `onnxruntime-web` in your app — aigpu does not bundle or import ORT.
- A model that runs on the WebGPU execution provider.

Create the ORT session first so ORT owns the device, then pass `ort.env.webgpu.device` to `initFromDevice`. Set `preferredOutputLocation: "gpu-buffer"` so outputs stay on the GPU.

## Browser snapshot

Copy the model output once into a aigpu-owned buffer, then release the tensor:

```ts
import * as ort from "onnxruntime-web/webgpu";
import { initFromDevice } from "aigpu";

declare const modelBytes: Uint8Array;
declare const input: ort.Tensor;

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("WebGPU adapter unavailable");
ort.env.webgpu.adapter = adapter;
const session = await ort.InferenceSession.create(modelBytes, {
  executionProviders: ["webgpu"],
  preferredOutputLocation: "gpu-buffer",
});
const gpu = await initFromDevice(await ort.env.webgpu.device);
const output = (await session.run({ input })).output;
const destination = gpu.device.createBuffer({ size: output.gpuBuffer.size, usage: ["storage", "copy_dst"] });
try {
  const encoder = gpu.gpu.createCommandEncoder();
  encoder.copyBufferToBuffer(output.gpuBuffer, 0, destination.gpu, 0, output.gpuBuffer.size);
  gpu.gpu.queue.submit([encoder.finish()]);
  await gpu.device.queue.flush();
} finally {
  destination.dispose();
  output.dispose();
  gpu.dispose();
  await session.release();
}
```

## Browser reference

Wrap the model output directly — zero copies, strict lifetime:

```ts
import * as ort from "onnxruntime-web/webgpu";
import { initFromDevice, type Buffer, type Compute } from "aigpu";

declare const modelBytes: Uint8Array;
declare const input: ort.Tensor;
declare const compute: Compute;
declare const destination: Buffer;
declare const workgroups: number;

const session = await ort.InferenceSession.create(modelBytes, {
  executionProviders: ["webgpu"],
  preferredOutputLocation: "gpu-buffer",
});
const gpu = await initFromDevice(await ort.env.webgpu.device);
const output = (await session.run({ input })).output;
const source = gpu.device.wrapBuffer(output.gpuBuffer);
try {
  compute.set({ source, destination }).dispatch(workgroups);
  await gpu.device.queue.flush();
} finally {
  source.dispose();
  output.dispose();
  gpu.dispose();
  await session.release();
}
```
