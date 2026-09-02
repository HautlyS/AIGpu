import { init, effect, frame, target, geometry } from "aigpu/node";

export const INSTANCED = /* wgsl */ `
struct Uniforms { time: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput { @location(0) pos: vec3f, @location(1) offset: vec3f, @location(2) color: vec3f }
struct VertexOutput { @builtin(position) pos: vec4f, @location(0) color: vec3f }

@vertex fn vs(input: VertexInput) -> VertexOutput {
  let t = u.time + input.offset.x;
  let scale = 0.02;
  let animated = input.pos * scale + input.offset + vec3f(sin(t) * 0.1, cos(t * 0.7) * 0.1, 0);
  var out: VertexOutput;
  out.pos = vec4f(animated, 1);
  out.color = input.color;
  return out;
}

@fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(input.color, 1);
}
`;

export async function runInstancedExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  
  const count = 1000;
  const offsets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    offsets[i * 3] = (Math.random() - 0.5) * 2;
    offsets[i * 3 + 1] = (Math.random() - 0.5) * 2;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 2;
    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();
  }
  
  const cubeGeo = geometry(gpu, {
    vertices: new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]),
    attributes: { offset: offsets, color: colors },
    stepMode: "instance",
    instanceCount: count,
  });
  
  const instanced = effect(gpu, INSTANCED, { label: "instanced", set: { time: 0 } });
  instanced.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(instanced, cubeGeo)));
  return { gpu, target: colorTarget };
}
