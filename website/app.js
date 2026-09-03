import { createApp, ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { init, effect, frameLoop, surface, agentAnimation, mountAgentCanvas } from "aigpu";

/* ==================== WGSL SHADERS ==================== */

const GRADIENT_SHADER = /* wgsl */ `
@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let vignette = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5)));
  return vec4f(uv.x, uv.y, 0.46 + 0.16 * vignette, 1.0);
}`;

const BLACK_HOLE_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn scene(p: vec3f) -> f32 { return length(p) - 1.0; }

fn raymarch(ro: vec3f, rd: vec3f) -> f32 {
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
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
  let angle = u.time * 0.2;
  let c = cos(angle); let s = sin(angle);
  let rotated = vec3f(rd.x * c - rd.z * s, rd.y, rd.x * s + rd.z * c);
  let t = raymarch(ro, rotated);
  let p = ro + rotated * t;
  let diskY = abs(p.y);
  let disk = smoothstep(0.02, 0.0, diskY - 0.3) * smoothstep(0.5, 0.3, length(p.xz));
  let horizon = smoothstep(0.05, 0.0, length(p) - 1.0);
  let col = vec3f(disk * 1.5, disk * 0.8, disk * 0.3) + vec3f(horizon * 0.1);
  return vec4f(col, 1);
}`;

const HAUTLY_ORB_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f, status: f32, intensity: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var a = 0.5; var pp = p;
  for (var i = 0; i < 4; i++) { v += a * noise(pp); pp = pp * 2.0 + vec2f(100.0); a *= 0.5; }
  return v;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let center = vec2f(0.5);
  let dist = length(uv - center);
  let breathe = sin(u.time * 2.0) * 0.02;
  let orbRadius = 0.3 + breathe;

  if (dist > orbRadius + 0.1) {
    let particle = noise(uv * 20.0 + u.time * 0.5);
    let sparkle = step(0.95, particle);
    return vec4f(vec3f(sparkle * 0.3), 1);
  }

  let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist);
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let ring = dist / orbRadius;
  let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0));
  let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3));
  let energy = (flow1 + flow2) * 0.5;

  var baseColor = vec3f(0.0);
  if (u.status < 0.5) { baseColor = vec3f(0.5 + energy * 0.3); }
  else if (u.status < 1.5) { let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5; baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8); }
  else if (u.status < 2.5) { let wave = sin(angle * 8.0 + u.time * 5.0) * 0.5 + 0.5; baseColor = vec3f(wave * 0.8, wave * 0.6, wave * 0.4); }
  else { let pulse = sin(u.time * 4.0) * 0.5 + 0.5; baseColor = vec3f(pulse * 0.6, pulse * 0.8, pulse * 1.0); }

  let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow;
  let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9;
  return vec4f(finalColor * ringPattern, edgeGlow);
}`;

const NOISE_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var a = 0.5; var pp = p;
  for (var i = 0; i < 5; i++) { v += a * noise(pp); pp = vec2f(pp.y * 1.6 + 100.0, pp.x * 1.6 + 100.0); a *= 0.5; }
  return v;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let n = fbm(uv * 3.0 + u.time * 0.1);
  return vec4f(vec3f(n * 0.8, n * 0.4, n * 0.2), 1);
}`;

const RINGS_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let cx = 0.5; let cy = 0.5;
  let dx = uv.x - cx; let dy = uv.y - cy;
  let dist = sqrt(dx * dx + dy * dy);
  let angle = atan2(dy, dx);
  var col = vec3f(0.0);
  for (var i = 0; i < 5; i++) {
    let r = 0.1 + f32(i) * 0.08;
    let ring = smoothstep(0.005, 0.0, abs(dist - r));
    let segments = 24.0 + f32(i) * 8.0;
    let seg = sin(angle * segments + u.time * (1.0 + f32(i) * 0.3)) * 0.5 + 0.5;
    col += vec3f(ring * seg * (0.3 + f32(i) * 0.15));
  }
  return vec4f(col, 1);
}`;

const WAVE_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  var col = vec3f(0.0);
  for (var i = 0; i < 5; i++) {
    let y = 0.3 + f32(i) * 0.1;
    let wave = sin(uv.x * 6.0 + u.time * (1.0 + f32(i) * 0.5) + f32(i) * 1.2) * 0.05;
    let ring = smoothstep(0.008, 0.0, abs(uv.y - y - wave));
    col += vec3f(ring * (0.4 + f32(i) * 0.12));
  }
  return vec4f(col, 1);
}`;

const PARTICLES_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  var col = vec3f(0.0);
  for (var i = 0; i < 80; i++) {
    let fi = f32(i);
    let x = hash(vec2f(fi, 0.0));
    let y = hash(vec2f(fi, 1.0));
    let speed = hash(vec2f(fi, 2.0)) * 0.5 + 0.2;
    let px = fract(x + u.time * speed * 0.1);
    let py = fract(y + sin(u.time * speed + fi) * 0.05);
    let d = length(uv - vec2f(px, py));
    let brightness = smoothstep(0.015, 0.0, d);
    col += vec3f(brightness * 0.6);
  }
  return vec4f(col, 1);
}`;

const FIRE_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let n = noise(vec2f(uv.x * 4.0, uv.y * 3.0 - u.time * 0.5));
  let n2 = noise(vec2f(uv.x * 8.0 + 100.0, uv.y * 6.0 - u.time * 0.8));
  let heat = (n + n2 * 0.5) * uv.y;
  let r = smoothstep(0.2, 0.8, heat);
  let g = smoothstep(0.4, 0.9, heat) * 0.5;
  let b = smoothstep(0.6, 1.0, heat) * 0.15;
  return vec4f(r, g, b, 1);
}`;

const GRID_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let grid = fract(uv * vec2f(20.0, 12.0));
  let line = smoothstep(0.02, 0.0, min(grid.x, grid.y));
  let pulse = sin(u.time + uv.x * 3.0) * 0.3 + 0.7;
  return vec4f(vec3f(line * pulse * 0.4), 1);
}`;

const FRACTAL_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn sierpinski(p: vec3f) -> f32 {
  var z = p;
  var d = length(z) - 0.5;
  for (var i = 0; i < 8; i++) {
    z = abs(z);
    if (z.x < z.y) { z = vec3f(z.y, z.x, z.z); }
    if (z.x < z.z) { z = vec3f(z.z, z.y, z.x); }
    z = z * 2.0 - vec3f(1.0);
    d = min(d, length(z) - 0.5);
  }
  return d * 0.25;
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let ro = vec3f(0, 0, -3);
  let rd = normalize(vec3f(uv, 1.5));
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = sierpinski(p);
    if (d < 0.001) { break; }
    t += d;
  }
  let col = select(vec3f(0), vec3f(0.6, 0.7, 1.0), t < 10.0);
  return vec4f(col, 1);
}`;

const TRANSMISSION_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let d = length(uv - vec2f(0.5));
  let cube = step(d, 0.25);
  let refract = sin(uv.x * 10.0 + u.time) * cos(uv.y * 10.0 - u.time) * 0.5 + 0.5;
  let col = mix(vec3f(refract * 0.3, refract * 0.5, refract * 0.8), vec3f(0.1, 0.2, 0.4), cube);
  return vec4f(col, 1);
}`;

const CLIPPING_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn icosphere(p: vec3f) -> f32 { return length(p) - 0.8; }

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - u.resolution * 0.5) / u.resolution.y;
  let ro = vec3f(0, 0, -3);
  let rd = normalize(vec3f(uv, 1.5));
  let clipY = sin(u.time * 0.8) * 0.6;
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = icosphere(p);
    if (d < 0.001 || p.y > clipY) { break; }
    t += d;
  }
  let col = select(vec3f(0), vec3f(0.8, 0.6, 1.0), t < 10.0);
  return vec4f(col, 1);
}`;

const RADIANCE_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  var col = vec3f(0.0);
  for (var i = 0; i < 6; i++) {
    let fi = f32(i);
    let angle = u.time * 0.3 + fi * 1.05;
    let r = 0.15 + fi * 0.06;
    let center = vec2f(0.5 + cos(angle) * r, 0.5 + sin(angle) * r);
    let d = length(uv - center);
    let glow = smoothstep(0.08, 0.0, d);
    let n = noise(uv * 10.0 + u.time + fi);
    col += vec3f(glow * n * (1.0 - fi * 0.12));
  }
  return vec4f(col, 1);
}`;

const DEPTH_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1,0)), u.x), mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x), u.y);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let n = noise(uv * 5.0 + u.time * 0.2);
  let depth = smoothstep(0.0, 1.0, n);
  return vec4f(vec3f(depth * 0.3, depth * 0.6, depth), 1);
}`;

const SPIRAL_SHADER = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let cx = 0.5; let cy = 0.5;
  let dx = uv.x - cx; let dy = uv.y - cy;
  let dist = sqrt(dx * dx + dy * dy);
  let angle = atan2(dy, dx);
  let spiral = sin(angle * 3.0 + dist * 20.0 - u.time * 2.0) * 0.5 + 0.5;
  let fade = smoothstep(0.5, 0.0, dist);
  return vec4f(vec3f(spiral * fade * 0.6), 1);
}`;

/* ==================== SHADER MAP ==================== */

const SHADER_MAP = {
  s02_fullscreen: GRADIENT_SHADER,
  s03_sharing: GRID_SHADER,
  s04_shared_uniforms: NOISE_SHADER,
  s05_fixits: GRID_SHADER,
  s06_scene: GRID_SHADER,
  s07_hdr_post: NOISE_SHADER,
  s08_ping_pong: FIRE_SHADER,
  s09_bundles: GRID_SHADER,
  s10_group_claim: SPIRAL_SHADER,
  s11_compute: PARTICLES_SHADER,
  s12_scheduling_resize: NOISE_SHADER,
  s13_headless: NOISE_SHADER,
  s14_raymarching: BLACK_HOLE_SHADER,
  s15_noise_fields: NOISE_SHADER,
  s16_particle_system: PARTICLES_SHADER,
  s17_volumetric: NOISE_SHADER,
  s18_post_process: NOISE_SHADER,
  s19_domain_warping: NOISE_SHADER,
  s20_texture_gen: NOISE_SHADER,
  s21_edge_detect: NOISE_SHADER,
  s22_color_palette: NOISE_SHADER,
  cockpit: RINGS_SHADER,
  dashboard: FIRE_SHADER,
  replay: WAVE_SHADER,
  agent_animation: PARTICLES_SHADER,
  state_tools: GRID_SHADER,
  transmission: TRANSMISSION_SHADER,
  fluid: FIRE_SHADER,
  gallery: GRID_SHADER,
  lava: FIRE_SHADER,
  mesh_edit: GRID_SHADER,
  dom_mount: WAVE_SHADER,
  fw_vue: RINGS_SHADER,
  fw_react: GRID_SHADER,
  fw_svelte: WAVE_SHADER,
  fw_purejs: PARTICLES_SHADER,
  fw_nextjs: WAVE_SHADER,
  fw_threetsl: GRID_SHADER,
  gpu_gradient: GRADIENT_SHADER,
  gpu_triangle_led: RINGS_SHADER,
  gpu_anti_aliasing: GRID_SHADER,
  gpu_black_hole: BLACK_HOLE_SHADER,
  gpu_optimized_black_hole: BLACK_HOLE_SHADER,
  gpu_earth: NOISE_SHADER,
  gpu_fluid_sim: FIRE_SHADER,
  gpu_instanced: PARTICLES_SHADER,
  gpu_batch: PARTICLES_SHADER,
  gpu_fft_ocean: WAVE_SHADER,
  gpu_fft_surface: WAVE_SHADER,
  gpu_raymarch_fractal: FRACTAL_SHADER,
  gpu_glass_fractal: FRACTAL_SHADER,
  gpu_env_map: RINGS_SHADER,
  gpu_transmission: TRANSMISSION_SHADER,
  gpu_clipping: CLIPPING_SHADER,
  gpu_radiance: RADIANCE_SHADER,
  gpu_agent_radiance: RADIANCE_SHADER,
  gpu_depth: DEPTH_SHADER,
  gpu_mnist: GRID_SHADER,
  gpu_particle_orbit: SPIRAL_SHADER,
  hautly: HAUTLY_ORB_SHADER,
};

/* ==================== CANVAS RENDERING ==================== */

const mountedSurfaces = new Map();
let sharedGpu = null;

async function getGpu() {
  if (!sharedGpu) {
    try {
      sharedGpu = await init();
    } catch (e) {
      console.warn("WebGPU not available:", e);
      return null;
    }
  }
  return sharedGpu;
}

async function mountWebGpuCanvas(canvas) {
  const gpu = await getGpu();
  if (!gpu) return null;

  const id = canvas.getAttribute("data-visual") || canvas.id;
  if (mountedSurfaces.has(canvas)) return mountedSurfaces.get(canvas);

  const output = surface(gpu, canvas, { dpr: [1, 1.5] });
  const shaderSource = SHADER_MAP[id];
  if (!shaderSource) return null;

  const vis = effect(gpu, shaderSource, {
    label: id,
    set: { time: 0, resolution: [canvas.width, canvas.height], status: 0, intensity: 0.5 },
  });

  const entry = { gpu, output, vis, canvas };
  mountedSurfaces.set(canvas, entry);
  return entry;
}

/* ==================== HAUTLY ORB STATE ==================== */

const HAUTLY_MOCK_RESPONSES = [
  "I notice a potential memory leak in the render loop.",
  "The WGSL shader compiles clean.",
  "Nice use of ping-pong buffers there.",
  "I'd suggest caching that pipeline.",
  "The bind group layout looks correct.",
  "Frame time is within budget.",
  "Ready to trace the next dispatch.",
  "That compute shader is well-optimized.",
  "I see a pattern that could be simplified.",
];

/* ==================== APP ==================== */

createApp({
  setup() {
    const status = ref("working");
    const progress = ref(64);
    const activity = ref(42);
    const filter = ref("all");
    const search = ref("");
    const eventLog = ref("// waiting for events...");
    const modalOpen = ref(false);
    const modalType = ref("");
    const modalExample = ref(null);
    const modalFramework = ref(null);

    // Hautly entity state
    const hautlyMood = ref("idle");
    const hautlyForm = ref("orb");
    const hautlyEnergy = ref(0.5);
    const hautlySpeech = ref("");
    const hautlySpeechVisible = ref("");
    const hautlyTyping = ref(false);
    const hautlyAgent = ref("opencode");
    const hautlyParticleCount = ref(12);
    const hautlyBreathSpeed = ref(1.2);
    const hautlyAuraIntensity = ref(0.3);
    const hautlyEyeTrack = ref(true);
    const hautlyGallerySelected = ref("");
    const hautlyChatRef = ref(null);

    const hautlyFormDescs = {
      orb: "Classic alive orb with breathing, eye tracking, and particle aura.",
      crystal: "Faceted crystal with internal refraction patterns and sharp edges.",
      jelly: "Translucent jelly with tentacle-like particle trails and wobble.",
      phoenix: "Fiery phoenix with rising ember particles and heat shimmer.",
      nebula: "Cosmic nebula with swirling gas clouds and starfield particles.",
    };
    const hautlyFormDesc = computed(() => hautlyFormDescs[hautlyForm.value] || "");
    const hautlyChatLog = ref([
      { role: "hautly", text: "Hello! I am Hautly, your alive orb companion. Click me or pick a mood." },
    ]);
    let hautlyTypeTimer = null;
    let hautlySpeechTimer = null;

    const hautlyForms = ["orb", "crystal", "jelly", "phoenix", "nebula"];
    const hautlyMoods = ["idle", "listening", "thinking", "speaking", "excited", "sleepy", "error", "healing"];

    const hautlyGallery = computed(() => {
      const items = [];
      for (const form of hautlyForms) {
        for (const mood of ["idle", "thinking", "speaking", "excited", "sleepy", "error"]) {
          items.push({ form, mood });
        }
      }
      return items;
    });

    function hautlyGallerySelect(item) {
      hautlyGallerySelected.value = item.form + "-" + item.mood;
      hautlyForm.value = item.form;
      hautlyMood.value = item.mood;
    }

    function hautlySetForm(f) { hautlyForm.value = f; }
    function hautlySetMood(m) { hautlyMood.value = m; }

    function hautlySpeak() {
      const msgs = [
        "Hello! I'm alive and breathing.",
        "The codebase looks great today.",
        "I'm tracking your mouse cursor!",
        "Ready to assist with anything.",
        "GPU-accelerated visuals at your service.",
        "I notice the imports could be optimized.",
        "The type safety here is solid.",
        "Want me to review the tests?",
        "This architecture scales well.",
      ];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      hautlyShowSpeech(msg);
      hautlyChatLog.value.push({ role: "user", text: msg });
      hautlyScrollChat();
      setTimeout(() => {
        const reply = HAUTLY_MOCK_RESPONSES[Math.floor(Math.random() * HAUTLY_MOCK_RESPONSES.length)];
        hautlyShowSpeech(reply);
        hautlyChatLog.value.push({ role: "hautly", text: reply });
        if (hautlyChatLog.value.length > 16) hautlyChatLog.value.shift();
        hautlyScrollChat();
      }, 1200);
    }

    function hautlyShowSpeech(text) {
      clearTimeout(hautlyTypeTimer);
      clearTimeout(hautlySpeechTimer);
      hautlySpeech.value = text;
      hautlySpeechVisible.value = "";
      hautlyTyping.value = true;
      let i = 0;
      function typeChar() {
        if (i < text.length) {
          hautlySpeechVisible.value = text.slice(0, i + 1);
          i++;
          hautlyTypeTimer = setTimeout(typeChar, 25 + Math.random() * 20);
        } else {
          hautlyTyping.value = false;
          hautlySpeechTimer = setTimeout(() => { hautlySpeech.value = ""; }, 4000);
        }
      }
      typeChar();
    }

    function hautlyScrollChat() {
      nextTick(() => {
        const el = hautlyChatRef.value;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }

    function hautlySimulateAgent() {
      const events = [
        { mood: "thinking", text: "Analyzing codebase structure..." },
        { mood: "thinking", text: "Found 5 files to review." },
        { mood: "speaking", text: "Generating refactoring suggestions..." },
        { mood: "excited", text: "Refactoring complete! 3 improvements applied." },
        { mood: "listening", text: "Waiting for next command..." },
        { mood: "idle", text: "Ready for next task." },
      ];
      let i = 0;
      function nextEvent() {
        if (i >= events.length) return;
        const ev = events[i];
        hautlyMood.value = ev.mood;
        hautlyShowSpeech(ev.text);
        hautlyChatLog.value.push({ role: "hautly", text: ev.text });
        if (hautlyChatLog.value.length > 16) hautlyChatLog.value.shift();
        hautlyScrollChat();
        i++;
        setTimeout(nextEvent, 2500);
      }
      hautlyChatLog.value.push({ role: "user", text: "Run agent simulation" });
      hautlyScrollChat();
      nextEvent();
    }

    let hautlyMouseX = 0, hautlyMouseY = 0, hautlyMouseOver = false;
    const hautlyMeshEffects = [];

    function hautlyMouseMove(e) {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      hautlyMouseX = (e.clientX - rect.left) / rect.width;
      hautlyMouseY = (e.clientY - rect.top) / rect.height;
      hautlyMouseOver = true;
    }

    function hautlyMouseLeave() { hautlyMouseOver = false; }

    function hautlyClick(e) {
      const clickMsgs = [
        "*bloop* That tickles!",
        "I'm here! What do you need?",
        "Click detected. Energy boosted!",
        "Hello, human!",
        "My particles are dancing!",
      ];
      const msg = clickMsgs[Math.floor(Math.random() * clickMsgs.length)];
      hautlyShowSpeech(msg);
      hautlyEnergy.value = Math.min(1, hautlyEnergy.value + 0.1);
      const prev = hautlyMood.value;
      hautlyMood.value = "excited";
      setTimeout(() => { hautlyMood.value = prev; }, 800);
    }

    // Gallery hover
    const galleryAnimFrames = new Map();
    function hautlyGalleryHover(item, e) {
      const canvas = e.currentTarget.querySelector(".hautly-gallery-canvas");
      if (!canvas) return;
      const startTime = performance.now();
      const existing = galleryAnimFrames.get(canvas);
      if (existing) cancelAnimationFrame(existing);
      function animate() {
        if (canvas.matches(":hover")) {
          const entry = mountedSurfaces.get(canvas);
          if (entry) {
            entry.vis.set({ time: (performance.now() - startTime) / 1000, status: hautlyMoods.indexOf(item.mood) });
            frameLoop(entry.gpu, (f) => f.pass(entry.output, entry.vis));
          }
          const id = requestAnimationFrame(animate);
          galleryAnimFrames.set(canvas, id);
        } else {
          galleryAnimFrames.delete(canvas);
        }
      }
      animate();
    }

    function hautlyGalleryLeave() {}

    const categories = [
      { id: "gpu_core", label: "GPU Core" },
      { id: "agent", label: "Agent" },
      { id: "hautly", label: "Hautly Entity" },
      { id: "advanced", label: "Advanced" },
      { id: "gpu_extra", label: "GPU Extras" },
      { id: "gpu_gallery", label: "GPU Gallery" },
    ];

    const examples = ref([
      { id: "s02_fullscreen", title: "s02 \u2014 fullscreen triangle", category: "gpu_core", tags: "fullscreen triangle wgsl", description: "One triangle. No vertex buffer. The simplest GPU entry point.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst canvas = document.querySelector("canvas")\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, /* wgsl */\n  "@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { return vec4f(uv.x, uv.y, 0.8, 1.0); }"\n)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/by-example-s02-fullscreen/src/example.ts" },
      { id: "s14_raymarching", title: "s14 \u2014 raymarching", category: "gpu_extra", tags: "raymarching sdf ray tracing", description: "GPU raymarching for procedural 3D scenes with SDFs.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, RAYMARCH_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/s14_raymarching/renderer.ts" },
      { id: "s15_noise_fields", title: "s15 \u2014 procedural noise", category: "gpu_extra", tags: "noise perlin simplex procedural", description: "Procedural noise fields for terrain, textures, and effects.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, NOISE_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/s15_noise_fields/renderer.ts" },
      { id: "cockpit", title: "Cockpit: agent flight deck", category: "agent", tags: "cockpit status progress activity", description: "Aircraft instrument panel showing agent status, CPU/GPU load, and event history.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, RINGS_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/cockpit/renderer.ts" },
      { id: "hautly_orb", title: "Hautly Orb: alive companion", category: "hautly", tags: "hautly orb companion alive", description: "The core Hautly orb entity with breathing, eye tracking, and particle aura. Click to interact.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst orb = effect(gpu, HAUTLY_ORB_SHADER, { set: { time: 0, resolution: [512, 512], status: 0, intensity: 0.5 } })\nframeLoop(gpu, (frame) => {\n  orb.set({ time: performance.now() / 1000, status: 1 })\n  frame.pass(output, orb)\n})`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/hautly-orb/src/example.ts" },
      { id: "gpu_gradient", title: "Simple Gradient", category: "gpu_gallery", tags: "gradient fragment shader vignette", description: "Map screen coordinates to color with a tiny fullscreen fragment shader.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, GRADIENT_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/gradient" },
      { id: "gpu_black_hole", title: "Black Hole", category: "gpu_gallery", tags: "black-hole raymarching lensing hdr", description: "Raymarched gravitational lensing with Keplerian accretion disk and Doppler beaming.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, BLACK_HOLE_SHADER, { set: { time: 0, resolution: [512, 512] } })\nframeLoop(gpu, (frame) => {\n  vis.set({ time: performance.now() / 1000 })\n  frame.pass(output, vis)\n})`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/black-hole" },
      { id: "gpu_earth", title: "Earth", category: "gpu_gallery", tags: "planet procedural hdr bloom lighting", description: "Procedural planet with GPU-baked albedo, night lights, clouds, and atmosphere.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, NOISE_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/earth" },
      { id: "gpu_raymarch_fractal", title: "Raymarched Fractal", category: "gpu_gallery", tags: "raymarching fractal sierpinski tetrahedron", description: "Raymarched Sierpinski tetrahedron with directional light and HDR bloom.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, FRACTAL_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/raymarched-fractal" },
    ]);

    const frameworks = ref([
      { id: "vue", name: "Vue 3", lang: "Vue SFC", desc: "Reactive refs drive GPU state. Single-file components with Composition API.", code: `<script setup>\nimport { ref, onMounted, watch } from "vue"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nconst canvasRef = ref(null)\nconst status = ref("working")\nconst progress = ref(64)\n\nonMounted(() => {\n  const gpu = await init()\n  const output = surface(gpu, canvasRef.value)\n  const vis = effect(gpu, AGENT_SHADER, { set: { status: 0, progress: 0.64 } })\n  frameLoop(gpu, (frame) => frame.pass(output, vis))\n})\n\nwatch([status, progress], () => {\n  vis.set({ status: statusToFloat(status.value), progress: progress.value / 100 })\n})\n<\/script>\n\n<template>\n  <canvas ref="canvasRef" width="400" height="300" />\n</template>` },
      { id: "react", name: "React", lang: "TSX", desc: "useRef for canvas. useEffect for lifecycle. GPU state via props/callbacks.", code: `import { useRef, useEffect, useState } from "react"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nexport function AIGpuAgent({ status = "working", progress = 64 }) {\n  const canvasRef = useRef(null)\n\n  useEffect(() => {\n    const gpu = await init()\n    const output = surface(gpu, canvasRef.current)\n    const vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n    return () => gpu.dispose()\n  }, [])\n\n  return <canvas ref={canvasRef} width={400} height={300} />\n}` },
      { id: "svelte", name: "Svelte", lang: "Svelte", desc: "Reactive statements auto-sync GPU state. Compile-time optimized.", code: `<script>\n  import { onMount, onDestroy } from "svelte"\n  import { init, effect, frameLoop, surface } from "aigpu"\n\n  export let status = "working"\n  export let progress = 64\n\n  let canvas\n  let gpu, output, vis\n\n  onMount(() => {\n    gpu = await init()\n    output = surface(gpu, canvas)\n    vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n  })\n\n  onDestroy(() => gpu?.dispose())\n\n  $: vis?.set({ status: statusToFloat(status), progress: progress / 100 })\n</script>\n\n<canvas bind:this={canvas} width="400" height="300" />` },
      { id: "purejs", name: "Pure JS", lang: "JavaScript", desc: "Zero dependencies. Direct GPU API. Works anywhere with WebGPU.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, document.querySelector("canvas"))\nconst vis = effect(gpu, AGENT_SHADER)\n\nframeLoop(gpu, (frame) => {\n  vis.set({ time: performance.now() / 1000 })\n  frame.pass(output, vis)\n})` },
      { id: "nextjs", name: "Next.js", lang: "TypeScript", desc: "Server-only + client boundaries. Dynamic imports. SSR-safe GPU rendering.", code: `// app/agent/page.tsx (Server Component)\nimport dynamic from "next/dynamic"\nconst AIGpuAgent = dynamic(() => import("./AIGpuAgent"), { ssr: false })\n\nexport default function AgentPage() {\n  return <AIGpuAgent status="working" progress={64} />\n}\n\n// app/agent/AIGpuAgent.tsx (Client Component)\n"use client"\nimport { useRef, useEffect } from "react"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nexport default function AIGpuAgent({ status, progress }) {\n  const canvasRef = useRef(null)\n  useEffect(() => {\n    const gpu = await init()\n    const output = surface(gpu, canvasRef.current)\n    const vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n    return () => gpu.dispose()\n  }, [])\n  return <canvas ref={canvasRef} width={400} height={300} />\n}` },
    ]);

    const filteredExamples = computed(() => {
      let list = examples.value;
      if (filter.value !== "all") list = list.filter((e) => e.category === filter.value);
      if (search.value) {
        const q = search.value.toLowerCase();
        list = list.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.includes(q));
      }
      return list;
    });

    function examplesByCategory(cat) {
      return examples.value.filter((e) => e.category === cat);
    }

    let eventIndex = 0;
    const replayEvents = [
      { type: "patch", state: "thinking", progress: 10, activity: 25 },
      { type: "patch", state: "working", progress: 35, activity: 60 },
      { type: "patch", state: "working", progress: 55, activity: 78 },
      { type: "patch", state: "working", progress: 72, activity: 42 },
      { type: "patch", state: "success", progress: 100, activity: 0 },
      { type: "patch", state: "error", progress: 33, activity: 10 },
    ];

    function applyPatch() {
      const entry = { status: status.value, progress: progress.value, activity: activity.value, time: new Date().toLocaleTimeString() };
      eventLog.value = `> patch ${JSON.stringify(entry)}\n` + eventLog.value;
    }

    function nextEvent() {
      const e = replayEvents[eventIndex % replayEvents.length];
      status.value = e.state;
      progress.value = e.progress;
      activity.value = e.activity;
      eventLog.value = `> replay[${eventIndex % replayEvents.length}] ${e.type} \u2192 ${e.state} ${e.progress}%\n` + eventLog.value;
      eventIndex++;
    }

    function copyCode(code, event) {
      navigator.clipboard.writeText(code).then(() => {
        const btn = event.target;
        btn.classList.add("copied");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.classList.remove("copied"); btn.textContent = "Copy source"; }, 1600);
      });
    }

    function openExample(ex) {
      modalType.value = "example";
      modalExample.value = ex;
      modalOpen.value = true;
    }

    function openFramework(fw) {
      modalType.value = "framework";
      modalFramework.value = fw;
      modalOpen.value = true;
    }

    function closeModal() {
      modalOpen.value = false;
      modalExample.value = null;
      modalFramework.value = null;
    }

    /* ==================== WEBGPU RENDER LOOP ==================== */

    let mainRaf;
    const visibleCanvases = new Map();
    let observer = null;
    let resizeObserver = null;

    function fitCanvasToLayout(canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }

    async function animateAll(time) {
      const gpu = await getGpu();
      if (!gpu) return;

      for (const [canvas, entry] of visibleCanvases) {
        if (!canvas.isConnected) { visibleCanvases.delete(canvas); continue; }
        fitCanvasToLayout(canvas);

        const id = canvas.getAttribute("data-visual") || canvas.id;
        const isHautly = canvas.id === "hautly-canvas";
        const isGallery = canvas.classList.contains("hautly-gallery-canvas");
        const isModal = canvas.classList.contains("modal-canvas");

        let mounted = mountedSurfaces.get(canvas);
        if (!mounted) {
          mounted = await mountWebGpuCanvas(canvas);
          if (!mounted) continue;
        }

        const t = time / 1000;
        const statusMap = { idle: 0, thinking: 1, working: 2, waiting: 3, success: 4, error: 5 };

        if (isHautly) {
          mounted.vis.set({
            time: t,
            resolution: [canvas.width, canvas.height],
            status: statusMap[hautlyMood.value] || 0,
            intensity: hautlyEnergy.value,
          });
        } else if (isGallery) {
          const entity = canvas.getAttribute("data-entity");
          if (entity) {
            const [form, mood] = entity.split("-");
            mounted.vis.set({ time: t, resolution: [canvas.width, canvas.height], status: statusMap[mood] || 0, intensity: 0.5 });
          }
        } else {
          mounted.vis.set({ time: t, resolution: [canvas.width, canvas.height] });
        }

        frameLoop(gpu, (frame) => frame.pass(mounted.output, mounted.vis));
      }

      if (visibleCanvases.size > 0) {
        mainRaf = requestAnimationFrame(animateAll);
      } else {
        mainRaf = null;
      }
    }

    function startAnimLoop() {
      if (!mainRaf) mainRaf = requestAnimationFrame(animateAll);
    }

    function registerCanvas(canvas) {
      fitCanvasToLayout(canvas);
      visibleCanvases.set(canvas, true);
      startAnimLoop();
    }

    function unregisterCanvas(canvas) {
      visibleCanvases.delete(canvas);
      const mounted = mountedSurfaces.get(canvas);
      if (mounted) {
        mounted.gpu.dispose();
        mountedSurfaces.delete(canvas);
      }
    }

    function setupViewportObserver() {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            registerCanvas(e.target);
          } else {
            unregisterCanvas(e.target);
          }
        });
      }, { rootMargin: "200px" });

      document.querySelectorAll("[data-visual], #hautly-canvas, .hautly-gallery-canvas").forEach((el) => {
        observer.observe(el);
      });

      resizeObserver = new ResizeObserver(() => {
        for (const canvas of visibleCanvases.keys()) {
          fitCanvasToLayout(canvas);
          const mounted = mountedSurfaces.get(canvas);
          if (mounted) {
            mounted.output = surface(mounted.gpu, canvas, { dpr: [1, 1.5] });
          }
        }
      });
      document.querySelectorAll("[data-visual], #hautly-canvas, .hautly-gallery-canvas").forEach((el) => {
        resizeObserver.observe(el);
      });
    }

    onMounted(() => {
      setupViewportObserver();
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOpen.value) closeModal();
      });
    });

    onUnmounted(() => {
      if (observer) observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      if (mainRaf) cancelAnimationFrame(mainRaf);
      for (const [, mounted] of mountedSurfaces) {
        mounted.gpu.dispose();
      }
      mountedSurfaces.clear();
    });

    return {
      status, progress, activity, filter, search, categories, examples, filteredExamples,
      frameworks, eventLog, modalOpen, modalType, modalExample, modalFramework,
      applyPatch, nextEvent, copyCode, openExample, openFramework, closeModal, examplesByCategory,
      hautlyMood, hautlyForm, hautlyEnergy, hautlySpeech, hautlySpeechVisible, hautlyTyping,
      hautlyAgent, hautlyChatLog, hautlyForms, hautlyMoods, hautlyGallery,
      hautlySetForm, hautlySetMood, hautlySpeak, hautlySimulateAgent,
      hautlyMouseMove, hautlyMouseLeave, hautlyClick, hautlyGalleryHover, hautlyGalleryLeave,
      hautlyParticleCount, hautlyBreathSpeed, hautlyAuraIntensity, hautlyEyeTrack,
      hautlyGallerySelected, hautlyGallerySelect, hautlyFormDesc, hautlyChatRef,
    };
  },
}).mount("#app");
