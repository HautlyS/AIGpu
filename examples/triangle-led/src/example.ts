import { init, effect, frame, target, geometry } from "aigpu/node";

export const LED_EMITTERS = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@location(0) pos: vec3f) -> @builtin(position) out {
  return vec4f(pos, 1);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  // Triangle vertices
  let v1 = vec2f(0.5, 0.9); let v2 = vec2f(0.1, 0.1); let v3 = vec2f(0.9, 0.1);
  // Distance to edges
  let d1 = abs((v2.y-v1.y)*uv.x - (v2.x-v1.x)*uv.y + v2.x*v1.y - v2.y*v1.x);
  let d2 = abs((v3.y-v2.y)*uv.x - (v3.x-v2.x)*uv.y + v3.x*v2.y - v3.y*v2.x);
  let d3 = abs((v1.y-v3.y)*uv.x - (v1.x-v3.x)*uv.y + v1.x*v3.y - v1.y*v3.x);
  let edge = min(min(d1, d2), d3);
  let glow = exp(-edge * 20.0) * (0.5 + 0.5 * sin(u.time * 3.0));
  let col = vec3f(glow * 0.8, glow * 0.4, glow);
  return vec4f(col, 1);
}
`;

export async function runTriangleLedExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const led = effect(gpu, LED_EMITTERS, { label: "led", set: { time: 0, resolution: [512, 512] } });
  led.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(led)));
  return { gpu, target: colorTarget };
}
