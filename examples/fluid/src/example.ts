import { init, effect, frame, target } from "aigpu/node";

export const FLUID_DISPLAY = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(fract(sin(dot(i, vec2f(127.1, 311.7))) * 43758.5453),
        fract(sin(dot(i + vec2f(1,0), vec2f(127.1, 311.7))) * 43758.5453), u.x),
    mix(fract(sin(dot(i + vec2f(0,1), vec2f(127.1, 311.7))) * 43758.5453),
        fract(sin(dot(i + vec2f(1,1), vec2f(127.1, 311.7))) * 43758.5453), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  
  // Simulate fluid flow with noise
  let t = u.time * 0.5;
  let flow1 = fbm(uv * 3.0 + vec2f(t, t * 0.7));
  let flow2 = fbm(uv * 3.0 + vec2f(-t * 0.8, t * 0.5) + vec2f(5.0));
  
  // Color mixing based on flow
  let r = flow1 * 0.8 + 0.2;
  let g = flow2 * 0.6 + 0.3;
  let b = (flow1 + flow2) * 0.4 + 0.4;
  
  // Add some velocity-based streaks
  let streak = smoothstep(0.4, 0.6, fbm(uv * 10.0 + vec2f(t * 2.0, 0.0)));
  
  let col = vec3f(r + streak * 0.3, g + streak * 0.2, b);
  return vec4f(col, 1);
}
`;

export async function runFluidExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [256, 256], format: "rgba8unorm" });
  const fluid = effect(gpu, FLUID_DISPLAY, { label: "fluid", set: { time: 0, resolution: [256, 256] } });
  fluid.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(fluid)));
  return { gpu, target: colorTarget };
}
