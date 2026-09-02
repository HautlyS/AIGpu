import { init, effect, frame, target } from "aigpu/node";

export const BLACK_HOLE = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn scene(p: vec3f) -> f32 {
  return length(p) - 1.0;
}

fn raymarch(ro: vec3f, rd: vec3f) -> f32 {
  var t = 0.0;
  for (var i = 0; i < 128; i++) {
    let d = scene(ro + rd * t);
    if (d < 0.001 || t > 20.0) { break; }
    t += d;
  }
  return t;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let ro = vec3f(0, 0, -4);
  let rd = normalize(vec3f(uv, 1.5));
  
  // Gravitational lensing distortion
  let angle = u.time * 0.2;
  let c = cos(angle); let s = sin(angle);
  let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c);
  
  let t = raymarch(ro, rotated);
  let p = ro + rotated * t;
  let n = normalize(p);
  
  // Accretion disk
  let diskY = abs(p.y);
  let disk = smoothstep(0.02, 0.0, diskY - 0.3) * smoothstep(0.5, 0.3, length(p.xz));
  
  // Event horizon
  let horizon = smoothstep(0.05, 0.0, length(p) - 1.0);
  
  let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1);
  return vec4f(col, 1);
}
`;

export async function runBlackHoleExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const blackHole = effect(gpu, BLACK_HOLE, { label: "black-hole", set: { time: 0, resolution: [512, 512] } });
  blackHole.set({ time: 1.5 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(blackHole)));
  return { gpu, target: colorTarget };
}
