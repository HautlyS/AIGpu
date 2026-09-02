import { init, effect, frame, target } from "aigpu/node";

export const FFT_SURFACE = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn oceanWave(pos: vec2f, t: f32) -> f32 {
  var h = 0.0;
  h += sin(pos.x * 2.0 + t) * 0.3;
  h += sin(pos.y * 3.0 + t * 1.5) * 0.2;
  h += sin(length(pos) * 4.0 - t * 2.0) * 0.1;
  return h;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let wave = oceanWave(uv * 5.0, u.time);
  let col = mix(vec3f(0.05, 0.15, 0.35), vec3f(0.1, 0.4, 0.6), wave * 0.5 + 0.5);
  return vec4f(col, 1);
}
`;

export async function runFFTSurfaceExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const surface = effect(gpu, FFT_SURFACE, { label: "fft-surface", set: { time: 0, resolution: [512, 512] } });
  surface.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(surface)));
  return { gpu, target: colorTarget };
}
