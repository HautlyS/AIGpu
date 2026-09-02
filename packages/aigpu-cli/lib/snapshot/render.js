import { SNAPSHOT_SIZE, REPRESENTATIVE_GRADIENT_WGSL } from "./shaders.js";

export const DEFAULT_SNAPSHOT_TIME = Math.PI / 4;
export const DEFAULT_SNAPSHOT_SPEED = 2;

/** @param api The `aigpu/node` module namespace: `init` plus the free functions this render needs. */
export async function renderRepresentativeSnapshot(api) {
  const { init, effect, frame, target } = api;
  const gpu = await init();
  try {
    const colorTarget = target(gpu, { size: SNAPSHOT_SIZE, format: "rgba8unorm", label: "aigpu-snapshot-gradient" });
    const gradient = effect(gpu, REPRESENTATIVE_GRADIENT_WGSL, {
      label: "aigpu-snapshot-gradient",
      set: { speed: DEFAULT_SNAPSHOT_SPEED },
    });
    gradient.set({ time: DEFAULT_SNAPSHOT_TIME });
    frame(gpu, (current) => current.pass({ target: colorTarget }, (encoder) => encoder.draw(gradient)));
    return { pixels: await colorTarget.read(), width: SNAPSHOT_SIZE[0], height: SNAPSHOT_SIZE[1] };
  } finally {
    gpu.dispose();
  }
}
