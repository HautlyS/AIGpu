import { init, effect, frame, target } from "aigpu/node";

export const HAUTLY_ORB = /* wgsl */ `
struct Uniforms { 
  time: f32, 
  resolution: vec2f,
  status: f32,  // 0=idle, 1=thinking, 2=speaking, 3=listening
  intensity: f32
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1,0)), u.x),
    mix(hash(i + vec2f(0,1)), hash(i + vec2f(1,1)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// ASCII character mapping based on density
fn densityToChar(density: f32) -> f32 {
  // Returns brightness for ASCII rendering
  if (density < 0.1) { return 0.0; }  // space
  if (density < 0.2) { return 0.1; }  // .
  if (density < 0.3) { return 0.2; }  // :
  if (density < 0.4) { return 0.3; }  // =
  if (density < 0.5) { return 0.4; }  // +
  if (density < 0.6) { return 0.5; }  // *
  if (density < 0.7) { return 0.6; }  // #
  if (density < 0.8) { return 0.7; }  // %
  if (density < 0.9) { return 0.8; }  // @
  return 1.0;                          // solid
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let center = vec2f(0.5);
  let dist = length(uv - center);
  
  // Orb radius with breathing animation
  let breathe = sin(u.time * 2.0) * 0.02;
  let orbRadius = 0.3 + breathe;
  
  // Outside orb - show ambient particles
  if (dist > orbRadius + 0.1) {
    let particle = noise(uv * 20.0 + u.time * 0.5);
    let sparkle = step(0.95, particle);
    let ambient = vec3f(sparkle * 0.3);
    return vec4f(ambient, 1);
  }
  
  // Orb edge glow
  let edgeGlow = smoothstep(orbRadius + 0.05, orbRadius - 0.05, dist);
  
  // Inner orb with alive texture
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let ring = dist / orbRadius;
  
  // Flowing energy inside orb
  let flow1 = fbm(vec2f(angle * 2.0 + u.time, ring * 3.0));
  let flow2 = fbm(vec2f(angle * 3.0 - u.time * 0.7, ring * 2.0 + u.time * 0.3));
  let energy = (flow1 + flow2) * 0.5;
  
  // Status-based color modulation
  var baseColor = vec3f(0.0);
  
  // Idle: gentle white pulse
  if (u.status < 0.5) {
    baseColor = vec3f(0.5 + energy * 0.3);
  }
  // Thinking: swirling pattern
  else if (u.status < 1.5) {
    let swirl = sin(angle * 5.0 + u.time * 3.0) * 0.5 + 0.5;
    baseColor = vec3f(swirl * 0.7, swirl * 0.7, swirl * 0.8);
  }
  // Speaking: dynamic waves
  else if (u.status < 2.5) {
    let wave = sin(angle * 8.0 + u.time * 5.0) * 0.5 + 0.5;
    baseColor = vec3f(wave * 0.8, wave * 0.6, wave * 0.4);
  }
  // Listening: receptive glow
  else {
    let pulse = sin(u.time * 4.0) * 0.5 + 0.5;
    baseColor = vec3f(pulse * 0.6, pulse * 0.8, pulse * 1.0);
  }
  
  // Apply energy modulation
  let finalColor = baseColor * (0.7 + energy * 0.3) * edgeGlow;
  
  // Add subtle ring structure
  let ringPattern = sin(ring * 20.0 + u.time) * 0.1 + 0.9;
  
  return vec4f(finalColor * ringPattern, edgeGlow);
}
`;

export interface HautlyState {
  status: "idle" | "thinking" | "speaking" | "listening";
  intensity: number;
  message?: string;
}

export async function createHautly() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  
  const statusMap = { idle: 0, thinking: 1, speaking: 2, listening: 3 };
  
  const orb = effect(gpu, HAUTLY_ORB, { 
    label: "hautly-orb", 
    set: { 
      time: 0, 
      resolution: [512, 512],
      status: 0,
      intensity: 0.5
    } 
  });
  
  let currentState: HautlyState = { status: "idle", intensity: 0.5 };
  
  function updateState(newState: Partial<HautlyState>) {
    currentState = { ...currentState, ...newState };
    orb.set({ 
      status: statusMap[currentState.status],
      intensity: currentState.intensity
    });
  }
  
  function getStatus(): HautlyState {
    return currentState;
  }
  
  // Start render loop
  let time = 0;
  function render() {
    time += 0.016;
    orb.set({ time });
    frame(gpu, (currentFrame) => 
      currentFrame.pass({ target: colorTarget }, (p) => p.draw(orb))
    );
  }
  
  // Initial render
  render();
  
  return { 
    gpu, 
    target: colorTarget, 
    updateState, 
    getStatus,
    render,
    dispose: () => gpu.dispose()
  };
}

// Example usage
export async function runHautlyExample() {
  const hautly = await createHautly();
  
  // Simulate state changes
  setTimeout(() => hautly.updateState({ status: "thinking", intensity: 0.7 }), 1000);
  setTimeout(() => hautly.updateState({ status: "speaking", intensity: 1.0, message: "Hello!" }), 2000);
  setTimeout(() => hautly.updateState({ status: "listening", intensity: 0.6 }), 3000);
  setTimeout(() => hautly.updateState({ status: "idle", intensity: 0.5 }), 4000);
  
  return hautly;
}
