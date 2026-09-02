import { init, effect, frame, target } from "aigpu/node";

export const TRANSMISSION = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;

  // Background scene
  let bg = vec3f(sin(uv.x * 10.0) * 0.5 + 0.5, cos(uv.y * 10.0) * 0.5 + 0.5, 0.5);

  // Glass cube region
  let cubeCenter = vec2f(0.5);
  let cubeSize = 0.3;
  let inCube = abs(uv.x - cubeCenter.x) < cubeSize && abs(uv.y - cubeCenter.y) < cubeSize;

  if (inCube) {
    // Snell refraction
    let normal = vec3f(0, 0, 1);
    let incident = normalize(vec3f(uv - cubeCenter, 0.5));
    let eta = 1.0 / 1.5; // glass IOR
    let refracted = refract(incident, normal, eta);

    // Chromatic dispersion
    let refractR = refract(incident, normal, eta * 0.98);
    let refractB = refract(incident, normal, eta * 1.02);

    let r = bg.x + refractR.x * 0.2;
    let g = bg.y;
    let b = bg.z + refractB.z * 0.2;

    // Fresnel
    let fresnel = pow(1.0 - abs(dot(incident, normal)), 3.0);
    let col = mix(vec3f(r, g, b), vec3f(0.9, 0.95, 1.0), fresnel * 0.5);
    return vec4f(col, 1);
  }

  return vec4f(bg, 1);
}
`;

export async function runTransmissionExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const transmission = effect(gpu, TRANSMISSION, { label: "transmission", set: { time: 0, resolution: [512, 512] } });
  transmission.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(transmission)));
  return { gpu, target: colorTarget };
}
