import { init, effect, frame, target } from "aigpu/node";

export const AGENT_MARK = /* wgsl */ `
struct Uniforms { time: f32, resolution: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;

fn agentDot(pos: vec2f, center: vec2f, radius: f32) -> f32 {
  return smoothstep(radius, radius * 0.8, length(pos - center));
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let center = vec2f(0.5);

  // Agent mark — 10 dots in a circle
  var brightness = 0.0;
  for (var i = 0; i < 10; i++) {
    let angle = f32(i) * 0.62832;
    let dotPos = center + vec2f(cos(angle), sin(angle)) * 0.2;
    brightness += agentDot(uv, dotPos, 0.02 + 0.01 * sin(u.time + f32(i)));
  }

  // Radiance cascade effect
  let glow = brightness * 0.3;
  let col = vec3f(glow, glow * 0.8, glow * 0.6);

  // Background
  let bg = vec3f(0.02, 0.02, 0.05);
  return vec4f(mix(bg, col, min(brightness, 1.0)), 1);
}
`;

export async function runAgentRadianceExample() {
  const gpu = await init();
  const colorTarget = target(gpu, { size: [512, 512], format: "rgba8unorm" });
  const agentRadiance = effect(gpu, AGENT_MARK, { label: "agent-radiance", set: { time: 0, resolution: [512, 512] } });
  agentRadiance.set({ time: 1.0 });
  frame(gpu, (currentFrame) => currentFrame.pass({ target: colorTarget }, (p) => p.draw(agentRadiance)));
  return { gpu, target: colorTarget };
}
