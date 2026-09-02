// AIGpu Visual Gallery: one shader, eight art directions selected at build time.
struct AgentParams {
  time: f32,
  progress: f32,
  activity: f32,
  status: f32,
  phase: f32,
  speed: f32,
  pad: vec2f,
  accent: vec4f,
  secondary: vec4f,
  background: vec4f,
}

@group(0) @binding(0) var<uniform> params: AgentParams;
const TAU: f32 = 6.28318530718;
// Replace this constant with 0..7 to select a recipe without changing the runtime contract.
const STYLE: u32 = 3u;

fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn rotate(p: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn lineGlow(p: vec2f, a: vec2f, b: vec2f, width: f32) -> f32 {
  let ba = b - a;
  let h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width * 0.2, width, length(p - (a + ba * h)));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * params.speed + params.phase;
  let p = uv - 0.5;
  let d = length(p);
  let a = atan2(p.y, p.x);
  let pulse = 0.5 + 0.5 * sin(t * 2.0);
  let energy = max(params.activity, 0.04);
  var color = params.background.rgb;

  if (STYLE == 0u) {
    // Anime hologram: layered eyes, aura, and a crisp cyan/magenta rim.
    let head = 1.0 - smoothstep(0.31, 0.29, length(p * vec2f(0.9, 1.08)));
    let hair = 1.0 - smoothstep(0.12, 0.0, abs(abs(p.x) - 0.17 + 0.025 * sin(p.y * 20.0 + t)));
    let eyes = lineGlow(p, vec2f(-0.13, -0.025), vec2f(-0.04, -0.025), 0.012) + lineGlow(p, vec2f(0.04, -0.025), vec2f(0.13, -0.025), 0.012);
    let scan = 1.0 - smoothstep(0.0, 0.018, abs(fract(uv.y * 18.0 + t * 0.08) - 0.5));
    color += head * params.secondary.rgb * 0.55 + hair * params.accent.rgb * 0.65 + eyes * params.accent.rgb * 1.6 + scan * params.accent.rgb * 0.08;
  } else if (STYLE == 1u) {
    // Enterprise orbit: clean ring geometry and a progress arc for dashboards.
    let ring = 1.0 - smoothstep(0.012, 0.028, abs(d - 0.27 - 0.018 * pulse));
    let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * (1.0 - smoothstep(0.008, 0.026, abs(d - 0.27)));
    let orbit = 1.0 - smoothstep(0.018, 0.035, abs(length(p - vec2f(cos(t), sin(t)) * 0.27) - 0.024));
    let grid = (1.0 - smoothstep(0.0, 0.01, abs(fract(uv.x * 12.0) - 0.5))) * 0.08;
    color += params.secondary.rgb * ring + params.accent.rgb * (arc + orbit) + params.accent.rgb * grid;
  } else if (STYLE == 2u) {
    // Psychedelic bloom: domain-warped petals and a saturated chromatic core.
    let warp = sin(a * 7.0 + t) * 0.045 + cos(a * 11.0 - t * 0.7) * 0.025;
    let petals = pow(max(0.0, cos(a * 7.0 + sin(d * 18.0 - t))), 8.0);
    let bloom = 1.0 - smoothstep(0.34 + warp, 0.06 + warp, d);
    let chroma = vec3f(sin(t + 0.0) * 0.5 + 0.5, sin(t + 2.1) * 0.5 + 0.5, sin(t + 4.2) * 0.5 + 0.5);
    color += chroma * bloom * (0.25 + petals * 1.4) + params.accent.rgb * petals * energy;
  } else if (STYLE == 3u) {
    // Calm ocean: slow caustics, horizon, and a gentle breathing orb.
    let wave = sin(uv.x * 18.0 + t * 0.45) * 0.018 + sin(uv.x * 37.0 - t * 0.25) * 0.009;
    let horizon = 1.0 - smoothstep(0.02, 0.0, abs(uv.y - 0.56 - wave));
    let orb = 1.0 - smoothstep(0.18, 0.0, length(p - vec2f(0.0, 0.06))) * (0.5 + pulse * 0.4);
    color += params.secondary.rgb * (0.25 + uv.y * 0.5) + params.accent.rgb * (horizon * 0.35 + orb * 0.6);
  } else if (STYLE == 4u) {
    // Celebration: radial confetti, sparkling core, and a completed progress halo.
    let rays = pow(max(0.0, cos(a * 18.0 + t * 0.4)), 28.0) * (1.0 - smoothstep(0.1, 0.5, d));
    let spark = pow(max(0.0, 1.0 - d * 8.0), 3.0) * pulse;
    let confetti = step(0.82, hash2(floor(uv * 18.0) + floor(t * 2.0))) * (1.0 - smoothstep(0.2, 0.55, d));
    color += params.accent.rgb * (rays + spark) + params.secondary.rgb * confetti;
  } else if (STYLE == 5u) {
    // Glitch: segmented scanlines and offset error bars for retry states.
    let band = step(0.7, hash2(vec2f(floor(uv.y * 24.0), floor(t * 7.0)))) * (1.0 - smoothstep(0.0, 0.35, d));
    let bars = lineGlow(p, vec2f(-0.42, 0.12), vec2f(0.25, 0.12), 0.018) + lineGlow(p, vec2f(-0.2, -0.14), vec2f(0.42, -0.14), 0.012);
    let jitter = sin(floor(uv.y * 28.0) + t * 9.0) * 0.02;
    color += params.secondary.rgb * (0.2 + band) + params.accent.rgb * (bars + abs(jitter) * 3.0);
  } else if (STYLE == 6u) {
    // Minimal focus: monochrome ring, quiet center, and a precise task arc.
    let ring = 1.0 - smoothstep(0.008, 0.02, abs(d - 0.24));
    let arc = select(0.0, 1.0, fract(a / TAU + 1.0) < params.progress) * ring;
    let center = 1.0 - smoothstep(0.13, 0.0, d);
    color += params.secondary.rgb * ring * 0.8 + params.accent.rgb * (arc + center * 0.12);
  } else {
    // Cosmic constellation: deterministic stars, orbiting nodes, and a research nebula.
    let stars = step(0.985, hash2(floor(uv * 42.0) + params.phase)) * (0.4 + pulse * 0.6);
    let node = 1.0 - smoothstep(0.025, 0.0, length(p - vec2f(cos(t * 0.7), sin(t * 0.7)) * 0.25));
    let nebula = exp(-d * 4.0) * (0.4 + 0.3 * sin(a * 3.0 + t));
    color += params.secondary.rgb * (stars + nebula) + params.accent.rgb * node;
  }

  let grain = (hash2(uv * 900.0 + t) - 0.5) * 0.012;
  return vec4f(max(color + vec3f(grain), vec3f(0.0)), 1.0);
}
