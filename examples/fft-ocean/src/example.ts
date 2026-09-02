import { init, effect, compute, storage, frame, target } from "aigpu/node";

export const SPECTRUM_INIT = /* wgsl */ `
@group(0) @binding(0) var output: texture_storage_2d<rgba16float>;
@group(0) @binding(1) var<uniform> time: f32;

fn phillips(k: vec2f, wind: vec2f) -> f32 {
  let kLen = length(k);
  if (kLen < 0.0001) { return 0.0; }
  let kDir = k / kLen;
  let wDotK = max(dot(normalize(wind), kDir), 0.0);
  let L = dot(wind, wind);
  return 3.0 / (kLen * kLen * kLen * kLen) * exp(-1.0 / (kLen * kLen * L * L)) * wDotK * wDotK;
}

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(output);
  if (id.x >= dims.x || id.y >= dims.y) { return; }
  let k = vec2f(f32(id.x) - f32(dims.x) * 0.5, f32(id.y) - f32(dims.y) * 0.5);
  let wind = vec2f(10.0, 10.0);
  let h = phillips(k * 0.01, wind);
  textureStore(output, id.xy, vec4f(h, 0, 0, 1));
}
`;

export const IFFT = /* wgsl */ `
@group(0) @binding(0) var input: texture_2d<f32>;
@group(0) @binding(1) var output: texture_storage_2d<rgba16float>;
@group(0) @binding(2) var<uniform> inverse: u32;

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(input);
  if (id.x >= dims.x || id.y >= dims.y) { return; }
  let uv = vec2f(f32(id.x), f32(id.y)) / vec2f(f32(dims.x), f32(dims.y));
  let val = textureLoad(input, id.xy, 0);
  // Simplified IFFT — just show wave pattern
  let wave = sin(uv.x * 6.28 + f32(inverse) * 0.1) * cos(uv.y * 6.28) * 0.5 + 0.5;
  textureStore(output, id.xy, vec4f(wave, wave * 0.8, wave * 0.6, 1));
}
`;

export async function runFFTOceanExample() {
  const gpu = await init();
  const N = 256;
  const spectrumTarget = target(gpu, { size: [N, N], format: "rgba16float" });
  const outputTarget = target(gpu, { size: [N, N], format: "rgba8unorm" });

  const spectrumInit = compute(gpu, SPECTRUM_INIT, { label: "spectrum-init", set: { time: 0 } });
  const ifft = compute(gpu, IFFT, { label: "ifft", set: { inverse: 0 } });

  const present = effect(gpu, `
    @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
      let wave = sin(uv.x * 20.0) * cos(uv.y * 20.0) * 0.5 + 0.5;
      return vec4f(wave * 0.2, wave * 0.5, wave, 1);
    }
  `, { label: "present" });

  frame(gpu, (currentFrame) => currentFrame.pass({ target: outputTarget }, (p) => p.draw(present)));
  return { gpu, target: outputTarget };
}
