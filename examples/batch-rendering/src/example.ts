import { init, draw, frame, target, geometry } from "aigpu/node";

export const BATCH = /* wgsl */ `
struct Uniforms { time: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@location(0) pos: vec3f) -> @builtin(position) vec4f {
  let animated = pos * (0.5 + 0.1 * sin(u.time));
  return vec4f(animated, 1);
}

@fragment fn fs() -> @location(0) vec4f {
  return vec4f(1);
}
`;

export async function runBatchExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  
  // Triangle + Quad + Pentagon + Hexagon in one buffer
  const vertices = new Float32Array([
    // Triangle
    0, 0.8, 0,  -0.5, 0.2, 0,  0.5, 0.2, 0,
    // Quad
    -0.3, 0, 0,  0.3, 0, 0,  0.3, 0.4, 0,  -0.3, 0.4, 0,
    // Pentagon
    0, 0.5, 0,  -0.47, 0.15, 0,  -0.29, -0.4, 0,  0.29, -0.4, 0,  0.47, 0.15, 0,
    // Hexagon
    0, 0.4, 0,  -0.35, 0.2, 0,  -0.35, -0.2, 0,  0, -0.4, 0,  0.35, -0.2, 0,  0.35, 0.2, 0,
  ]);
  
  const batchGeo = geometry(gpu, {
    buffers: [{ data: vertices, attributes: { pos: "float32x3" } }],
  });
  const batch = draw(gpu, { shader: BATCH, geometry: batchGeo, label: "batch", targets: [colorTarget], set: { time: 0 } });
  batch.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(batch)));
  return { gpu, target: colorTarget };
}
