import shaderSource from "./shader.wgsl";
import { wgslVitePlugin, type AIGPUClientEnvironment } from "aigpu/client";

const defaultEnv: AIGPUClientEnvironment = {};
const shaderText: string = shaderSource.wgsl;
const shaderVersion: 1 = shaderSource.version;
const pluginName: string = wgslVitePlugin().name;

export function useShader(env: AIGPUClientEnvironment = defaultEnv) {
  return {
    env,
    shader: shaderText,
    shaderVersion,
  };
}
