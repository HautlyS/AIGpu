import { init, effect, frame, target } from "aigpu/node";

export const CLIPPING = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn icosphere(p: vec3f) -> f32 {
  let q = abs(p);
  return (sqrt(q.x*q.x + q.y*q.y + q.z*q.z) - 1.0) * 0.8;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let ro = vec3f(0, 0, -3);
  let rd = normalize(vec3f(uv, 1.5));
  
  let clipY = sin(u.time * 0.8) * 0.6;
  var t = 0.0;
  var hit = false;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = icosphere(p);
    if (d < 0.001 || p.y > clipY) { break; }
    t += d;
    if (d < 0.01) { hit = true; break; }
  }
  
  var col = vec3f(0);
  if (hit) {
    let p = ro + rd * t;
    let n = normalize(p);
    col = vec3f(0.5 + n.x * 0.5, 0.5 + n.y * 0.5, 0.5 + n.z * 0.5);
  }
  
  // Clipping plane indicator
  let planeDist = abs(uv.y - clipY / 3.0);
  if (planeDist < 0.01) { col = vec3f(0.5); }
  
  return vec4f(col, 1);
}
`;

export async function runClippingExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const clipping = effect(gpu, CLIPPING, { label: "clipping", set: { time: 0, resolution: [512, 512] } });
  clipping.set({ time: 1.5 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(clipping)));
  return { gpu, target: colorTarget };
}
