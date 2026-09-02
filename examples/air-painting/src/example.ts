import { init, effect, frame, target } from "aigpu/node";

export const FROST = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x),
             mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let frost = noise(uv * 20.0 + u.time * 0.5);
  let cleared = smoothstep(0.3, 0.7, length(uv - vec2f(0.5 + sin(u.time) * 0.2, 0.5)));
  let col = mix(vec3f(0.9), vec3f(0.1, 0.2, 0.4), frost * cleared);
  return vec4f(col, 1);
}
`;

export async function runAirPaintingExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const frost = effect(gpu, FROST, { label: "frost", set: { time: 0, resolution: [512, 512] } });
  frost.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(frost)));
  return { gpu, target: colorTarget };
}
