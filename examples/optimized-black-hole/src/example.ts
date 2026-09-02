import { init, effect, frame, target } from "aigpu/node";

export const OPTIMIZED_BH = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;

  // Gravitational lensing
  let r = length(uv);
  let theta = atan2(uv.y, uv.x);
  let lens = 1.0 / (r + 0.1);
  let lensedUV = uv * lens * 0.3;

  // Accretion disk
  let diskR = length(lensedUV);
  let disk = smoothstep(0.3, 0.2, abs(diskR - 0.5));

  // Doppler beaming
  let doppler = 0.5 + 0.5 * cos(theta + u.time);

  // Stars background
  let stars = step(0.998, fract(sin(dot(floor(uv * 50.0), vec2f(12.9898, 78.233))) * 43758.5453));

  // Event horizon
  let horizon = smoothstep(0.05, 0.0, r - 0.1);

  let col = vec3f(disk * doppler * 2.0, disk * doppler * 0.8, disk * 0.3);
  col += vec3f(stars * 0.5);
  col += vec3f(horizon * 0.2);

  return vec4f(col, 1);
}
`;

export async function runOptimizedBlackHoleExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const bh = effect(gpu, OPTIMIZED_BH, { label: "optimized-bh", set: { time: 0, resolution: [512, 512] } });
  bh.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(bh)));
  return { gpu, target: colorTarget };
}
