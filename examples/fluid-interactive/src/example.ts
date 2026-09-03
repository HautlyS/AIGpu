import { init, effect, compute, pingPong, target, frame } from "aigpu/node";

export const ADVECT = /* wgsl */ `
@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var output: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> dt: f32;

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(tex);
  if (id.x >= dims.x || id.y >= dims.y) { return; }
  let uv = vec2f(f32(id.x), f32(id.y)) / vec2f(f32(dims.x), f32(dims.y));
  let vel = textureLoad(tex, id.xy, 0).xy;
  let src = uv - vel * dt * 0.01;
  let col = textureLoad(tex, vec2u(src * vec2f(dims)), 0);
  textureStore(output, id.xy, col);
}
`;

export const DIVERGENCE = /* wgsl */ `
@group(0) @binding(0) var vel: texture_2d<f32>;
@group(0) @binding(1) var output: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(vel);
  if (id.x < 1 || id.y < 1 || id.x >= dims.x-1 || id.y >= dims.y-1) { return; }
  let l = textureLoad(vel, id.xy - vec2u(1,0), 0).x;
  let r = textureLoad(vel, id.xy + vec2u(1,0), 0).x;
  let b = textureLoad(vel, id.xy - vec2u(0,1), 0).y;
  let t = textureLoad(vel, id.xy + vec2u(0,1), 0).y;
  let div = (r - l + t - b) * 0.5;
  textureStore(output, id.xy, vec4f(div, 0, 0, 0));
}
`;

export async function runFluidExample() {
  const gpu = await init();
  const N = 128;
  const velocity = pingPong(gpu, N, N, { format: "rgba16float" });
  const pressure = pingPong(gpu, N, N, { format: "rgba16float" });
  const display = effect(gpu, `
    @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
      return vec4f(uv, sin(uv.x * 10.0) * 0.5 + 0.5, 1);
    }
  `, { label: "display" });
  
  const advect = compute(gpu, ADVECT, { label: "advect" });
  const divergence = compute(gpu, DIVERGENCE, { label: "divergence" });
  
  const colorTarget = target(gpu, { size: [N, N], format: "rgba8unorm" });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(display)));
  
  return { gpu, target: colorTarget, velocity, pressure };
}
