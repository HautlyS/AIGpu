import { init, effect, frame, target } from "aigpu/node";

export const SCENE = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  // High-contrast checkerboard with rotated edges
  let checker = floor(uv.x * 8.0) + floor(uv.y * 8.0);
  let edge = abs(fract(uv.x * 8.0) - 0.5) + abs(fract(uv.y * 8.0) - 0.5);
  let col = mix(vec3f(0.9), vec3f(0.1), checker % 2.0);
  let edgeHighlight = smoothstep(0.05, 0.0, edge - 0.45);
  return vec4f(mix(col, vec3f(1, 0.3, 0), edgeHighlight), 1);
}
`;

export async function runAntiAliasingExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const scene = effect(gpu, SCENE, { label: "scene", set: { time: 0, resolution: [512, 512] } });
  scene.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(scene)));
  return { gpu, target: colorTarget };
}
