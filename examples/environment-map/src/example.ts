import { init, effect, frame, target } from "aigpu/node";

export const ENV_MAP = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn sky(uv: vec2f) -> vec3f {
  let y = uv.y;
  let sunset = smoothstep(0.0, 0.3, y) * smoothstep(0.6, 0.3, y);
  return mix(vec3f(0.1, 0.2, 0.4), vec3f(0.8, 0.4, 0.2), sunset);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let angle = uv.x * 6.28 + u.time * 0.1;
  let elevation = uv.y * 3.14;
  let dir = vec3f(cos(angle) * sin(elevation), cos(elevation), sin(angle) * sin(elevation));

  // Simple sky gradient
  let col = sky(vec2f(uv.x, dir.y * 0.5 + 0.5));

  // Mirror cube reflection
  let cubeCenter = vec2f(0.5, 0.5);
  let cubeSize = 0.2;
  if (abs(uv.x - cubeCenter.x) < cubeSize && abs(uv.y - cubeCenter.y) < cubeSize) {
    let cubeUV = (uv - cubeCenter) / cubeSize;
    let reflected = reflect(dir, vec3f(0, 0, 1));
    let refCol = sky(vec2f(reflected.x * 0.5 + 0.5, reflected.y * 0.5 + 0.5));
    return vec4f(mix(col, refCol, 0.8), 1);
  }

  return vec4f(col, 1);
}
`;

export async function runEnvMapExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const envMap = effect(gpu, ENV_MAP, { label: "env-map", set: { time: 0, resolution: [512, 512] } });
  envMap.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(envMap)));
  return { gpu, target: colorTarget };
}
