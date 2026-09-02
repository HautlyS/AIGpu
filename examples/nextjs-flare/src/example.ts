import { init, effect, frame, target } from "aigpu/node";

export const FLARE = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let center = vec2f(0.5);
  let d = length(uv - center);

  // Volumetric rim glow
  let rim = smoothstep(0.4, 0.2, d) * (0.5 + 0.5 * sin(u.time * 2.0));
  let scatter = exp(-d * 5.0) * 0.3;

  // N glyph shape (simplified)
  let n1 = smoothstep(0.02, 0.0, abs(uv.x - 0.35) - 0.01) * smoothstep(0.2, 0.5, uv.y);
  let n2 = smoothstep(0.02, 0.0, abs(uv.x - 0.65) - 0.01) * smoothstep(0.2, 0.5, uv.y);
  let nDiag = smoothstep(0.02, 0.0, abs((uv.x - 0.35) - (uv.y - 0.2) * 0.6) - 0.01) * smoothstep(0.2, 0.5, uv.y);
  let glyph = max(max(n1, n2), nDiag) * rim;

  let col = vec3f(glyph + scatter, glyph * 0.8 + scatter * 0.5, glyph * 0.6);
  return vec4f(col, 1);
}
`;

export async function runNextjsFlareExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const flare = effect(gpu, FLARE, { label: "flare", set: { time: 0, resolution: [512, 512] } });
  flare.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(flare)));
  return { gpu, target: colorTarget };
}
