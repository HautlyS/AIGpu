import { init, effect, frame, target } from "aigpu/node";

export const PARTICLES = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  var col = vec3f(0);

  // Orbiting particles
  for (var i = 0; i < 50; i++) {
    let fi = f32(i);
    let angle = fi * 0.12566 + u.time * (0.5 + hash(vec2f(fi, 0)) * 0.5);
    let radius = 0.2 + hash(vec2f(fi, 1)) * 0.3;
    let particlePos = vec2f(0.5) + vec2f(cos(angle), sin(angle)) * radius;
    let d = length(uv - particlePos);
    let brightness = exp(-d * 50.0) * (0.5 + 0.5 * sin(u.time * 2.0 + fi));
    col += vec3f(brightness * 0.5, brightness * 0.3, brightness);
  }

  return vec4f(col, 1);
}
`;

export async function runParticleOrbitExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const particles = effect(gpu, PARTICLES, { label: "particles", set: { time: 0, resolution: [512, 512] } });
  particles.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(particles)));
  return { gpu, target: colorTarget };
}
