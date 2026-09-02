export interface MockGPUBuffer extends GPUBuffer {
  readonly __aigpuMockBytes: Uint8Array;
}

export interface MockGPUTexture extends GPUTexture {
  readonly __aigpuMockBytes: Uint8Array;
}

export function isMockGPUBuffer(buffer: GPUBuffer): buffer is MockGPUBuffer {
  return "__aigpuMockBytes" in buffer;
}

export function isMockGPUTexture(texture: GPUTexture): texture is MockGPUTexture {
  return "__aigpuMockBytes" in texture;
}
