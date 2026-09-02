import { init, effect, frame, target } from "aigpu/node";

export const GRADIENT = /* wgsl */ `
@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let vignette = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5)));
  return vec4f(uv.x, uv.y, 0.46 + 0.16 * vignette, 1.0);
}
`;

export async function runGradientExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [256, 256], format: "rgba8unorm" });
  const gradient = effect(gpu, GRADIENT, { label: "gradient" });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(gradient)));
  return { gpu, target: colorTarget };
}
