import { init, effect, frame, target } from "aigpu/node";

export const AI_COMPANION = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  aiState: f32,      // 0=idle, 1=processing, 2=responding, 3=error
  responseIntensity: f32,
  connectionStrength: f32
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

// Connection line between orb and AI
fn connectionLine(pos: vec2f, start: vec2f, end: vec2f, width: f32) -> f32 {
  let dir = end - start;
  let len = length(dir);
  let dirNorm = dir / len;
  
  let toPos = pos - start;
  let proj = dot(toPos, dirNorm);
  let closest = start + dirNorm * clamp(proj, 0.0, len);
  
  let dist = length(pos - closest);
  return smoothstep(width, width * 0.5, dist);
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  
  // Background with subtle neural network pattern
  let neural = fbm(uv * 8.0 + u.time * 0.1) * 0.1;
  var col = vec3f(0.02 + neural);
  
  // Orb position (bottom left)
  let orbCenter = vec2f(0.2, 0.2);
  let orbRadius = 0.1;
  let orbDist = length(uv - orbCenter);
  let orb = smoothstep(orbRadius, orbRadius - 0.02, orbDist);
  
  // AI core position (top right)
  let aiCenter = vec2f(0.8, 0.8);
  let aiRadius = 0.08;
  let aiDist = length(uv - aiCenter);
  let ai = smoothstep(aiRadius, aiRadius - 0.015, aiDist);
  
  // Connection line
  let connectionStrength = u.connectionStrength;
  let connection = connectionLine(uv, orbCenter, aiCenter, 0.005 + connectionStrength * 0.01);
  
  // Data flow along connection
  let flow = sin(uv.x * 20.0 + u.time * 5.0) * 0.5 + 0.5;
  let dataFlow = connection * flow * connectionStrength;
  
  // Orb energy
  let orbEnergy = fbm(uv * 10.0 + u.time) * orb;
  col = mix(col, vec3f(0.5 + orbEnergy * 0.5), orb);
  
  // AI core energy
  let aiEnergy = fbm(uv * 12.0 - u.time * 0.5) * ai;
  var aiColor = vec3f(0.3, 0.6, 0.9);
  
  // AI state visualization
  if (u.aiState > 0.5) {  // Processing
    let processing = sin(u.time * 10.0) * 0.5 + 0.5;
    aiColor = mix(aiColor, vec3f(0.9, 0.6, 0.3), processing * 0.5);
  }
  if (u.aiState > 1.5) {  // Responding
    let responding = sin(u.time * 8.0) * 0.5 + 0.5;
    aiColor = mix(aiColor, vec3f(0.3, 0.9, 0.6), responding * 0.5);
  }
  if (u.aiState > 2.5) {  // Error
    let error = sin(u.time * 15.0) * 0.5 + 0.5;
    aiColor = mix(aiColor, vec3f(0.9, 0.3, 0.3), error * 0.7);
  }
  
  col = mix(col, aiColor * (0.7 + aiEnergy * 0.3), ai);
  
  // Connection with data flow
  let connectionColor = mix(vec3f(0.3, 0.5, 0.8), vec3f(0.8, 0.5, 0.3), dataFlow);
  col = mix(col, connectionColor, connection * connectionStrength);
  
  // Response intensity visualization
  let responseGlow = smoothstep(0.3, 0.0, orbDist) * u.responseIntensity;
  col += vec3f(0.2, 0.4, 0.6) * responseGlow;
  
  // Ambient particles
  let particles = noise(uv * 40.0 + u.time * 0.2);
  let sparkle = step(0.97, particles) * 0.2;
  col += vec3f(sparkle);
  
  return vec4f(col, 1);
}
`;

export interface AICompanionState {
  aiState: "idle" | "processing" | "responding" | "error";
  responseIntensity: number;
  connectionStrength: number;
  lastResponse?: string;
}

export async function createAICompanion() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  
  const companion = effect(gpu, AI_COMPANION, {
    label: "ai-companion",
    set: {
      time: 0,
      resolution: [512, 512],
      aiState: 0,
      responseIntensity: 0,
      connectionStrength: 0.5
    }
  });
  
  let state: AICompanionState = {
    aiState: "idle",
    responseIntensity: 0,
    connectionStrength: 0.5
  };
  
  const stateMap = { idle: 0, processing: 1, responding: 2, error: 3 };
  
  function updateState(newState: Partial<AICompanionState>) {
    state = { ...state, ...newState };
    companion.set({
      aiState: stateMap[state.aiState],
      responseIntensity: state.responseIntensity,
      connectionStrength: state.connectionStrength
    });
  }
  
  function simulateAIResponse(input: string): Promise<string> {
    return new Promise((resolve) => {
      updateState({ aiState: "processing", responseIntensity: 0.3 });
      
      // Simulate processing time
      setTimeout(() => {
        updateState({ aiState: "responding", responseIntensity: 0.8 });
        
        // Generate response
        const responses = [
          `I understand: "${input}"`,
          `Processing your request: "${input}"`,
          `Acknowledged: "${input}"`,
          `AI response to: "${input}"`
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        updateState({ lastResponse: response });
        
        // Fade out response
        setTimeout(() => {
          updateState({ aiState: "idle", responseIntensity: 0 });
        }, 1000);
        
        resolve(response);
      }, 500);
    });
  }
  
  function getState(): AICompanionState {
    return state;
  }
  
  // Render loop
  let time = 0;
  function render() {
    time += 0.016;
    companion.set({ time });
    frame(gpu, (currentFrame) =>
      currentFrame.pass({ target: colorTarget }, (p) => p.draw(companion))
    );
  }
  
  render();
  
  return {
    gpu,
    target: colorTarget,
    updateState,
    simulateAIResponse,
    getState,
    render,
    dispose: () => gpu.dispose()
  };
}

export async function runAICompanionExample() {
  const companion = await createAICompanion();
  
  // Simulate AI interaction
  setTimeout(async () => {
    const response = await companion.simulateAIResponse("Hello AI!");
    console.log("AI Response:", response);
  }, 1000);
  
  setTimeout(async () => {
    const response = await companion.simulateAIResponse("What can you do?");
    console.log("AI Response:", response);
  }, 3000);
  
  return companion;
}
