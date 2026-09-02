import { init, effect, frame, target } from "aigpu/node";

export const EARTH = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x),
             mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let r = length(uv);
  if (r > 1.0) { return vec4f(0); }
  
  let n = normalize(vec3f(uv, sqrt(1.0 - r * r)));
  let lon = atan2(n.x, n.z) + u.time * 0.1;
  let lat = asin(n.y);
  
  // Land/ocean
  let land = noise(vec2f(lon * 3.0, lat * 4.0)) > 0.45;
  let night = cos(lon) < -0.3;
  
  // Night lights
  let lights = noise(vec2f(lon * 8.0, lat * 8.0)) > 0.7 && night && land;
  
  var col = vec3f(0.1, 0.3, 0.8); // ocean
  if (land) { col = vec3f(0.2, 0.5, 0.2); } // land
  if (lights) { col = vec3f(1.0, 0.8, 0.3); } // city lights
  
  // Atmosphere rim
  let rim = smoothstep(0.8, 1.0, r);
  col = mix(col, vec3f(0.3, 0.6, 1.0), rim * 0.5);
  
  return vec4f(col, 1);
}
`;

export async function runEarthExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const earth = effect(gpu, EARTH, { label: "earth", set: { time: 0, resolution: [512, 512] } });
  earth.set({ time: 2.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(earth)));
  return { gpu, target: colorTarget };
}
