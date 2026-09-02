import { init, effect, frame, target } from "aigpu/node";

export const SPEAKING_BUBBLES = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  bubbleCount: f32,
  speaking: f32
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

// Bubble shape with smooth edges
fn bubbleSDF(pos: vec2f, center: vec2f, radius: f32) -> f32 {
  return length(pos - center) - radius;
}

// Draw ASCII character at position
fn drawChar(pos: vec2f, charPos: vec2f, charSize: f32) -> f32 {
  let d = length(pos - charPos);
  return smoothstep(charSize, charSize * 0.8, d);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  
  // Background - subtle grid pattern
  let grid = sin(uv.x * 50.0) * sin(uv.y * 50.0) * 0.02;
  var col = vec3f(0.02 + grid);
  
  // Main orb at bottom center
  let orbCenter = vec2f(0.5, 0.2);
  let orbRadius = 0.12;
  let orbDist = length(uv - orbCenter);
  
  // Orb breathing animation
  let breathe = sin(u.time * 2.0) * 0.01;
  let orb = smoothstep(orbRadius + breathe, orbRadius - 0.02 + breathe, orbDist);
  
  // Orb inner energy
  let energy = noise(uv * 10.0 + u.time) * orb;
  col = mix(col, vec3f(0.6 + energy * 0.4), orb);
  
  // Speaking bubbles
  if (u.speaking > 0.5) {
    // Multiple bubbles rising
    for (var i = 0.0; i < 5.0; i++) {
      let bubbleY = 0.3 + i * 0.12 + sin(u.time + i) * 0.02;
      let bubbleX = 0.5 + sin(u.time * 0.5 + i * 1.5) * 0.1;
      let bubbleRadius = 0.03 + i * 0.01;
      
      // Bubble animation
      let rise = fract(u.time * 0.3 + i * 0.2);
      let bubblePos = vec2f(bubbleX, bubbleY + rise * 0.3);
      
      let bubbleDist = bubbleSDF(uv, bubblePos, bubbleRadius);
      let bubble = smoothstep(0.005, 0.0, bubbleDist);
      
      // Bubble edge highlight
      let edge = smoothstep(0.008, 0.003, abs(bubbleDist));
      
      // Inner content (ASCII characters)
      let charPos = bubblePos + vec2f(0.0, 0.01);
      let charSize = bubbleRadius * 0.3;
      
      // Different characters for different bubbles
      let char1 = drawChar(uv, charPos + vec2f(-0.01, 0.0), charSize);
      let char2 = drawChar(uv, charPos + vec2f(0.01, 0.0), charSize);
      let char3 = drawChar(uv, charPos + vec2f(0.0, 0.015), charSize);
      
      let charPattern = max(max(char1, char2), char3);
      
      // Combine bubble and content
      let bubbleContent = bubble * 0.3 + edge * 0.5 + charPattern * bubble * 0.8;
      col = mix(col, vec3f(0.8, 0.9, 1.0), bubbleContent);
    }
    
    // Thought bubbles connecting to orb
    for (var j = 0.0; j < 3.0; j++) {
      let thoughtY = 0.25 + j * 0.05;
      let thoughtX = 0.5 + sin(u.time + j * 2.0) * 0.05;
      let thoughtRadius = 0.015 - j * 0.003;
      
      let thoughtDist = length(uv - vec2f(thoughtX, thoughtY));
      let thought = smoothstep(thoughtRadius, thoughtRadius - 0.005, thoughtDist);
      
      col = mix(col, vec3f(0.7, 0.8, 0.9), thought * 0.6);
    }
  }
  
  // Ambient particles
  let particles = noise(uv * 30.0 + u.time * 0.3);
  let sparkle = step(0.98, particles) * 0.3;
  col += vec3f(sparkle);
  
  return vec4f(col, 1);
}
`;

export interface BubbleState {
  speaking: boolean;
  bubbleCount: number;
  messages: string[];
}

export async function createSpeakingBubbles() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  
  const bubbles = effect(gpu, SPEAKING_BUBBLES, {
    label: "speaking-bubbles",
    set: {
      time: 0,
      resolution: [512, 512],
      bubbleCount: 0,
      speaking: 0
    }
  });
  
  let state: BubbleState = {
    speaking: false,
    bubbleCount: 0,
    messages: []
  };
  
  function startSpeaking(message: string) {
    state.speaking = true;
    state.messages.push(message);
    state.bubbleCount = Math.min(state.messages.length, 5);
    bubbles.set({ speaking: 1, bubbleCount: state.bubbleCount });
  }
  
  function stopSpeaking() {
    state.speaking = false;
    state.bubbleCount = 0;
    state.messages = [];
    bubbles.set({ speaking: 0, bubbleCount: 0 });
  }
  
  function getState(): BubbleState {
    return state;
  }
  
  // Render loop
  let time = 0;
  function render() {
    time += 0.016;
    bubbles.set({ time });
    frame(gpu, (currentFrame) =>
      currentFrame.pass({ target: colorTarget }, (p) => p.draw(bubbles))
    );
  }
  
  render();
  
  return {
    gpu,
    target: colorTarget,
    startSpeaking,
    stopSpeaking,
    getState,
    render,
    dispose: () => gpu.dispose()
  };
}

export async function runSpeakingBubblesExample() {
  const bubbleSystem = await createSpeakingBubbles();
  
  // Simulate speaking
  setTimeout(() => bubbleSystem.startSpeaking("Hello!"), 500);
  setTimeout(() => bubbleSystem.startSpeaking("I am Hautly"), 1500);
  setTimeout(() => bubbleSystem.startSpeaking("Your AI companion"), 2500);
  setTimeout(() => bubbleSystem.stopSpeaking(), 3500);
  
  return bubbleSystem;
}
