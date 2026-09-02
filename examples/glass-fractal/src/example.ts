import { init, effect, frame, target } from "aigpu/node";

export const GLASS = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let r = length(uv - 0.5);

  // Glass sphere
  let sphereDist = smoothstep(0.25, 0.24, r);

  // Refraction
  let refractUV = uv + vec2f(sin(uv.y * 20.0 + u.time), cos(uv.x * 20.0 + u.time)) * 0.02 * sphereDist;
  let refracted = vec3f(sin(refractUV.x * 10.0) * 0.5 + 0.5, cos(refractUV.y * 10.0) * 0.5 + 0.5, 0.8);

  // Fresnel
  let fresnel = pow(1.0 - max(dot(normalize(vec3f(uv - 0.5, 0.5)), vec3f(0, 0, 1)), 0.0), 3.0);

  // Reflection
  let reflected = vec3f(0.8, 0.9, 1.0) * fresnel;

  let col = mix(refracted, reflected, fresnel * sphereDist);
  return vec4f(col, sphereDist);
}
`;

export async function runGlassExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const glass = effect(gpu, GLASS, { label: "glass", set: { time: 0, resolution: [512, 512] } });
  glass.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(glass)));
  return { gpu, target: colorTarget };
}
