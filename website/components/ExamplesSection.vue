<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { effect, frameLoop, surface, type FrameLoopHandle } from "aigpu";
import { describeWebGPUError, getSharedGpu } from "../composables/sharedGpu";
import { retryWebGPU } from "../composables/useWebGPU";

const props = defineProps<{
  examples: any[];
  filteredExamples: any[];
  categories: { id: string; label: string }[];
  filter: string;
  search: string;
}>();

const emit = defineEmits<{
  "update:filter": [value: string];
  "update:search": [value: string];
  "open-example": [ex: any];
  "copy-code": [code: string, event: Event];
}>();

function examplesByCategory(cat: string) {
  return props.examples.filter((e) => e.category === cat);
}

const SHADERS: Record<string, string> = {
  s02_fullscreen: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); let r = uv.x * 0.8 + 0.1; let g = uv.y * 0.6 + 0.2; let b = 0.46 + 0.16 * v; return vec4f(r, g, b, 1.0); }`,
  s14_raymarching: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let d = length(uv) - 0.3 + sin(u.time) * 0.05; let glow = exp(-d * 4.0) * 0.3; let col = vec3f(smoothstep(0.01, 0.0, d)) + vec3f(0.2, 0.4, 0.8) * glow; return vec4f(col, 1); }`,
  s15_noise_fields: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let n = noise(uv * 3.0 + u.time * 0.1); let n2 = noise(uv * 5.0 - u.time * 0.15); let col = vec3f(n * 0.6 + n2 * 0.2, n * 0.3 + n2 * 0.15, n * 0.15 + n2 * 0.05); return vec4f(col, 1); }`,
  cockpit: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let dist = length(uv - vec2f(0.5)); let angle = atan2(uv.y - 0.5, uv.x - 0.5); var col = vec3f(0.0); for (var i = 0; i < 5; i++) { let fi = f32(i); let r = 0.08 + fi * 0.07; let ring = smoothstep(0.004, 0.0, abs(dist - r)); let seg = sin(angle * (20.0 + fi * 6.0) + u.time * (0.8 + fi * 0.25)) * 0.5 + 0.5; col += vec3f(ring * seg * (0.25 + fi * 0.12)); } let crossH = smoothstep(0.003, 0.0, abs(uv.y - 0.5)) * smoothstep(0.5, 0.3, dist) * 0.15; let crossV = smoothstep(0.003, 0.0, abs(uv.x - 0.5)) * smoothstep(0.5, 0.3, dist) * 0.15; col += vec3f(0.4, 0.8, 1.0) * (crossH + crossV); let scan = smoothstep(0.0, 0.008, abs(fract(uv.y * 30.0 + u.time * 0.2) - 0.5)) * 0.03; col += vec3f(scan); return vec4f(col, 1); }`,
  hautly_orb: `struct Uniforms { time: f32, resolution: vec2f, status: f32, intensity: f32 } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } fn fbm(p: vec2f) -> f32 { var v = 0.0; var a = 0.5; var pp = p; for (var i = 0; i < 4; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(100.0); a *= 0.5; } return v; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let center = vec2f(0.5); let dist = length(uv - center); let breathe = sin(u.time * 2.0) * 0.02; let orbRadius = 0.3 + breathe; if (dist > orbRadius + 0.1) { let particle = noise(uv * 20.0 + u.time * 0.5); let sparkle = step(0.95, particle); return vec4f(vec3f(sparkle * 0.3), 1); } let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist); let angle = atan2(uv.y - center.y, uv.x - center.x); let ring = dist / orbRadius; let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0)); let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3)); let energy = (flow1 + flow2) * 0.5; let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5; let baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8); let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow; let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9; let core = exp(-dist * 6.0) * 0.25; var col = finalColor * ringPattern + vec3f(0.5, 0.7, 1.0) * core; return vec4f(col, edgeGlow); }`,
  gpu_gradient: `@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let v = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5))); let r = uv.x * 0.8 + 0.1; let g = uv.y * 0.6 + 0.2; let b = 0.46 + 0.16 * v; return vec4f(r, g, b, 1.0); }`,
  gpu_black_hole: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -4); let rd = normalize(vec3f(uv, 1.5)); let angle = u.time * 0.2; let c = cos(angle); let s = sin(angle); let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rotated * t; let d = length(p) - 1.0; if (d < 0.001 || t > 20.0) { break; } t += d; } let p = ro + rotated * t; let disk = smoothstep(0.02, 0.0, abs(p.y) - 0.3) * smoothstep(0.5, 0.3, length(p.xz)); let horizon = smoothstep(0.05, 0.0, length(p) - 1.0); let glow = exp(-length(p) * 2.0) * 0.15; let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1) + vec3f(0.6, 0.2, 0.05) * glow; return vec4f(col, 1); }`,
  gpu_earth: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn noise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y); } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = pos.xy / u.resolution; let n = noise(uv * 5.0 + u.time * 0.2); let n2 = noise(uv * 8.0 - u.time * 0.1); let land = smoothstep(0.45, 0.55, n); let cloud = smoothstep(0.6, 0.7, n2) * 0.3; var col = vec3f(0.1 + land * 0.2, 0.2 + n * 0.4 + land * 0.1, 0.5 + n2 * 0.3); col += vec3f(cloud); return vec4f(col, 1); }`,
  gpu_raymarch_fractal: `struct Uniforms { time: f32, resolution: vec2f } @group(0) @binding(0) var<uniform> u: Uniforms; fn sierpinski(p: vec3f) -> f32 { var z = p; var d = length(z) - 0.5; for (var i = 0; i < 8; i++) { z = abs(z); if (z.x < z.y) { z = vec3f(z.y, z.x, z.z); } if (z.x < z.z) { z = vec3f(z.z, z.y, z.x); } z = z * 2.0 - vec3f(1.0); d = min(d, length(z) - 0.5); } return d * 0.25; } @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y; let ro = vec3f(0, 0, -3); let rd = normalize(vec3f(uv, 1.5)); var t = 0.0; for (var i = 0; i < 64; i++) { let p = ro + rd * t; let d = sierpinski(p); if (d < 0.001) { break; } t += d; } let glow = exp(-t * 0.3) * 0.15; let hit = t < 10.0; let col = select(vec3f(glow * 0.4, glow * 0.2, glow * 0.6), vec3f(0.5, 0.6, 0.9) + vec3f(glow), hit); return vec4f(col, 1); }`,
  // Visual Gallery recipes — the real aigpu shaders
  vg_anime: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 0u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 { let ba = b - a; let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0); return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h))); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let head = 1.0 - smoothstep(0.31, 0.29, length(p * vec2f(0.9, 1.08))); let hair = 1.0 - smoothstep(0.12, 0.0, abs(abs(p.x) - 0.17 + 0.025 * sin(p.y * 20.0 + t))); let eyes = lineGlow(p, vec2f(-0.13, -0.025), vec2f(-0.04, -0.025), 0.012) + lineGlow(p, vec2f(0.04, -0.025), vec2f(0.13, -0.025), 0.012); let scan = 1.0 - smoothstep(0.0, 0.018, abs(fract(uv.y * 18.0 + t * 0.08) - 0.5)); color += head * params.secondary.rgb * 0.55 + hair * params.accent.rgb * 0.65 + eyes * params.accent.rgb * 1.6 + scan * params.accent.rgb * 0.08; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_enterprise: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 1u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let ring = 1.0 - smoothstep(0.012, 0.028, abs(d - 0.27 - 0.018 * pulse)); let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * (1.0 - smoothstep(0.008, 0.026, abs(d - 0.27))); let orbit = 1.0 - smoothstep(0.018, 0.035, abs(length(p - vec2f(cos(t), sin(t)) * 0.27) - 0.024)); let grid = (1.0 - smoothstep(0.0, 0.01, abs(fract(uv.x * 12.0) - 0.5))) * 0.08; color += params.secondary.rgb * ring + params.accent.rgb * (arc + orbit) + params.accent.rgb * grid; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_psychedelic: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 2u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let warp = sin(a * 7.0 + t) * 0.045 + cos(a * 11.0 - t * 0.7) * 0.025; let petals = pow(max(0.0, cos(a * 7.0 + sin(d * 18.0 - t))), 8.0); let bloom = 1.0 - smoothstep(0.34 + warp, 0.06 + warp, d); let chroma = vec3f(sin(t + 0.0) * 0.5 + 0.5, sin(t + 2.1) * 0.5 + 0.5, sin(t + 4.2) * 0.5 + 0.5); color += chroma * bloom * (0.25 + petals * 1.4) + params.accent.rgb * petals * energy; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_calm: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 3u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let wave = sin(uv.x * 18.0 + t * 0.45) * 0.018 + sin(uv.x * 37.0 - t * 0.25) * 0.009; let horizon = 1.0 - smoothstep(0.02, 0.0, abs(uv.y - 0.56 - wave)); let orb = 1.0 - smoothstep(0.18, 0.0, length(p - vec2f(0.0, 0.06))) * (0.5 + pulse * 0.4); color += params.secondary.rgb * (0.25 + uv.y * 0.5) + params.accent.rgb * (horizon * 0.35 + orb * 0.6); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_confetti: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 4u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let rays = pow(max(0.0, cos(a * 18.0 + t * 0.4)), 28.0) * (1.0 - smoothstep(0.1, 0.5, d)); let spark = pow(max(0.0, 1.0 - d * 8.0), 3.0) * pulse; let confetti = step(0.82, hash2(floor(uv * 18.0) + floor(t * 2.0))) * (1.0 - smoothstep(0.2, 0.55, d)); color += params.accent.rgb * (rays + spark) + params.secondary.rgb * confetti; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_glitch: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 5u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 { let ba = b - a; let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0); return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h))); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let band = step(0.7, hash2(vec2f(floor(uv.y * 24.0), floor(t * 7.0)))) * (1.0 - smoothstep(0.0, 0.35, d)); let bars = lineGlow(p, vec2f(-0.42, 0.12), vec2f(0.25, 0.12), 0.018) + lineGlow(p, vec2f(-0.2, -0.14), vec2f(0.42, -0.14), 0.012); let jitter = sin(floor(uv.y * 28.0) + t * 9.0) * 0.02; color += params.secondary.rgb * (0.2 + band) + params.accent.rgb * (bars + abs(jitter) * 3.0); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_minimal: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 6u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let ring = 1.0 - smoothstep(0.008, 0.02, abs(d - 0.24)); let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * ring; let center = 1.0 - smoothstep(0.13, 0.0, d); color += params.secondary.rgb * ring * 0.8 + params.accent.rgb * (arc + center * 0.12); let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
  vg_cosmic: `struct AgentParams { time: f32, progress: f32, activity: f32, status: f32, phase: f32, speed: f32, pad: vec2f, accent: vec4f, secondary: vec4f, background: vec4f } @group(0) @binding(0) var<uniform> params: AgentParams; const TAU: f32 = 6.28318530718; const STYLE: u32 = 7u; fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); } @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { let t = params.time * params.speed + params.phase; let p = uv - 0.5; let d = length(p); let a = atan2(p.y, p.x); let pulse = 0.5 + 0.5 * sin(t * 2.0); let energy = max(params.activity, 0.04); var color = params.background.rgb; let stars = step(0.985, hash2(floor(uv * 42.0) + params.phase)) * (0.4 + pulse * 0.6); let node = 1.0 - smoothstep(0.025, 0.0, length(p - vec2f(cos(t * 0.7), sin(t * 0.7)) * 0.25)); let nebula = exp(-d * 4.0) * (0.4 + 0.3 * sin(a * 3.0 + t)); color += params.secondary.rgb * (stars + nebula) + params.accent.rgb * node; let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012; return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0); }`,
};

const canvasMap = new Map<HTMLCanvasElement, { output: any; vis: any; loop: FrameLoopHandle }>();
const gpuError = ref<string | null>(null);
let observer: IntersectionObserver | null = null;

function observeCanvases() {
  if (!observer) return;
  const canvases = document.querySelectorAll<HTMLCanvasElement>(".example-canvas[data-visual]");
  canvases.forEach((c) => observer!.observe(c));
}

onMounted(async () => {
  // Eager observation only — the shared GPU is requested lazily on the first
  // canvas that actually enters the viewport (see mountCanvas).
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const canvas = entry.target as HTMLCanvasElement;
      if (entry.isIntersecting) {
        mountCanvas(canvas);
      } else {
        unmountCanvas(canvas);
      }
    });
  }, { rootMargin: "200px" });

  observeCanvases();

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
    canvasMap.forEach(({ loop }) => {
      try { loop.stop(); } catch { /* ignore */ }
    });
    canvasMap.clear();
    // Shared gpu outlives every section — never disposed here.
  });
});

// Re-observe after filter/search re-renders the grid — new canvases are never
// observed otherwise and stay empty.
watch(() => props.filteredExamples, async () => {
  await nextTick();
  observeCanvases();
});

async function mountCanvas(canvas: HTMLCanvasElement) {
  if (canvasMap.has(canvas)) return;
  let gpu: any;
  try {
    gpu = await getSharedGpu();
  } catch (e) {
    console.error("[aigpu] ExamplesSection init failed:", e);
    gpuError.value = describeWebGPUError(e);
    return;
  }
  if (!canvas.isConnected || canvasMap.has(canvas)) return;
  const id = canvas.getAttribute("data-visual") || "";
  const shader = SHADERS[id];
  if (!shader) return;

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const isGalleryShader = id.startsWith("vg_");
  const initial = isGalleryShader
    ? { time: 0, progress: 0.5, activity: 0.5, status: 2, phase: 0, speed: 1.0, pad: [0, 0], accent: [0.35, 0.95, 1, 1], secondary: [0.06, 0.38, 0.65, 1], background: [0.005, 0.028, 0.06, 1] }
    : { time: 0, resolution: [canvas.width, canvas.height], status: 0, intensity: 0.5 };
  const vis = effect(gpu, shader, { label: id, set: initial });
  // One frameLoop per canvas (owns its rAF). No outer rAF.
  const loop = frameLoop(gpu, (frame) => {
    if (isGalleryShader) {
      vis.set({ time: performance.now() / 1000 });
    } else {
      vis.set({ time: performance.now() / 1000, resolution: [canvas.width, canvas.height] });
    }
    frame.pass(output, vis);
  });
  canvasMap.set(canvas, { output, vis, loop });
}

function unmountCanvas(canvas: HTMLCanvasElement) {
  const entry = canvasMap.get(canvas);
  if (entry) {
    try { entry.loop.stop(); } catch { /* ignore */ }
    canvasMap.delete(canvas);
  }
}
</script>

<template>
  <section id="examples" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">source library</p><h2>Every capability. Animated. Copyable.</h2></div>
      <div class="filter-group" role="group" aria-label="Filter examples">
        <button class="filter-button" :class="{ active: filter === 'all' }" @click="emit('update:filter', 'all')">
          All <span class="filter-count">{{ examples.length }}</span>
        </button>
        <button v-for="cat in categories" :key="cat.id" class="filter-button" :class="{ active: filter === cat.id }" @click="emit('update:filter', cat.id)">
          {{ cat.label }} <span class="filter-count">{{ examplesByCategory(cat.id).length }}</span>
        </button>
      </div>
    </div>
    <div class="search-row">
      <input type="search" class="search-input" placeholder="> grep examples..." :value="search" @input="emit('update:search', ($event.target as HTMLInputElement).value)" aria-label="Search examples">
    </div>
    <p v-if="gpuError" class="gpu-fallback">{{ gpuError }} <button class="button button-quiet" @click="retryWebGPU">Retry</button></p>
    <div class="example-grid">
      <article v-for="ex in filteredExamples" :key="ex.id" class="example-card" :data-tags="ex.tags" @click="emit('open-example', ex)">
        <canvas class="example-canvas" :data-visual="ex.id" width="400" height="220"></canvas>
        <div class="example-body">
          <div class="example-meta">
            <span>{{ ex.category }}</span>
            <a :href="ex.source" target="_blank" rel="noopener" @click.stop>source &nearr;</a>
          </div>
          <h3>{{ ex.title }}</h3>
          <p>{{ ex.description }}</p>
          <button class="copy-trigger" @click.stop="emit('copy-code', ex.code, $event)">Copy source</button>
        </div>
      </article>
    </div>
    <p v-if="filteredExamples.length === 0" class="empty-state">> no matches found</p>
  </section>
</template>
