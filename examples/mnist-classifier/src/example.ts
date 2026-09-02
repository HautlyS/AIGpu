import { init, effect, frame, target } from "aigpu/node";

export const MNIST_VISUALIZE = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  // Simulated digit grid
  let grid = floor(uv * 10.0);
  let cell = fract(uv * 10.0);
  let digit = hash(grid + floor(u.time));
  let stroke = smoothstep(0.3, 0.2, length(cell - 0.5));
  let col = vec3f(stroke * digit);
  return vec4f(col, 1);
}
`;

export async function runMnistExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const mnist = effect(gpu, MNIST_VISUALIZE, { label: "mnist", set: { time: 0, resolution: [512, 512] } });
  mnist.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(mnist)));
  return { gpu, target: colorTarget };
}
