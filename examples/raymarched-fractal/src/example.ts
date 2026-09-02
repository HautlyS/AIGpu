import { init, effect, frame, target } from "aigpu/node";

export const FRACTAL = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn sierpinski(p: vec3f) -> f32 {
  var q = p;
  var s = 1.0;
  for (var i = 0; i < 8; i++) {
    q = abs(q);
    if (q.x < q.y) { q = vec3f(q.y, q.x, q.z); }
    if (q.x < q.z) { q = vec3f(q.z, q.y, q.x); }
    q = q * 2.0 - vec3f(1.0);
    s *= 2.0;
  }
  return length(q) / s;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let ro = vec3f(0, 0, -3);
  let rd = normalize(vec3f(uv, 1.5));

  var t = 0.0;
  for (var i = 0; i < 128; i++) {
    let p = ro + rd * t;
    let d = sierpinski(p * 1.5);
    if (d < 0.001 || t > 20.0) { break; }
    t += d;
  }

  var col = vec3f(0);
  if (t < 20.0) {
    let p = ro + rd * t;
    let n = normalize(p);
    col = vec3f(0.5 + n.x * 0.5, 0.5 + n.y * 0.5, 0.5 + n.z * 0.5);
  }
  return vec4f(col, 1);
}
`;

export async function runFractalExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const fractal = effect(gpu, FRACTAL, { label: "fractal", set: { time: 0, resolution: [512, 512] } });
  fractal.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(fractal)));
  return { gpu, target: colorTarget };
}
