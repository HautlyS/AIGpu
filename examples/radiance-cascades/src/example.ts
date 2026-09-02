import { init, effect, compute, storage, frame, target } from "aigpu/node";

export const JFA_INIT = /* wgsl */ `
@group(0) @binding(0) var<storage, read> seeds: array<vec4f>;
@group(0) @binding(1) var output: texture_storage_2d<rgba16float>;

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(output);
  if (id.x >= dims.x || id.y >= dims.y) { return; }
  var minDist = 1e10;
  var seedColor = vec4f(0);
  for (var i = 0; i < arrayLength(&seeds); i++) {
    let seed = seeds[i].xy;
    let dist = length(vec2f(f32(id.x), f32(id.y)) - seed);
    if (dist < minDist) {
      minDist = dist;
      seedColor = seeds[i];
    }
  }
  textureStore(output, id.xy, vec4f(seedColor.xy, minDist, 1));
}
`;

export const RADIANCE_CASCADE = /* wgsl */ `
@group(0) @binding(0) var sdf: texture_2d<f32>;
@group(0) @binding(1) var output: texture_storage_2d<rgba16float>;
@group(0) @binding(2) var<uniform> cascade: u32;

@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(output);
  if (id.x >= dims.x || id.y >= dims.y) { return; }
  let base = 4u;
  let interval = base * (1u << cascade);
  var radiance = vec4f(0);
  let rays = 4u;
  for (var r = 0u; r < rays; r++) {
    let angle = (f32(r) + 0.5) / f32(rays) * 6.2832;
    let dir = vec2f(cos(angle), sin(angle));
    let origin = vec2f(f32(id.x), f32(id.y));
    var t = 0.0;
    for (var s = 0u; s < interval; s++) {
      let samplePos = origin + dir * t;
      let sdfCoord = vec2i(clamp(samplePos, vec2f(0), vec2f(dims) - 1.0));
      let sdfVal = textureLoad(sdf, sdfCoord, 0).z;
      t += max(sdfVal, 1.0);
    }
    radiance += vec4f(1.0 / f32(rays));
  }
  textureStore(output, id.xy, radiance);
}
`;

export async function runRadianceExample() {
  const gpu = await init();
  const W = 256, H = 256;
  const sdfTarget = target(gpu, { size: [W, H], format: "rgba16float" });
  const cascadeTargets = Array.from({ length: 6 }, (_, i) =>
    target(gpu, { size: [W >> i, H >> i], format: "rgba16float" })
  );
  
  const jfaInit = compute(gpu, JFA_INIT, { label: "jfa-init" });
  const rc = compute(gpu, RADIANCE_CASCADE, { label: "rc" });
  
  const present = effect(gpu, `
    @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
      return vec4f(uv, 0.5, 1);
    }
  `, { label: "present" });
  
  const outputTarget = target(gpu, { size: [W, H], format: "rgba8unorm" });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: outputTarget }, (p) => p.draw(present)));
  
  return { gpu, target: outputTarget, cascades: cascadeTargets };
}
