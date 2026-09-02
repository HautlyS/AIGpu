# @aigpu/adapter-node

Dawn adapter for `aigpu/node`.

`@aigpu/adapter-node` connects aigpu to Node.js through the `webgpu` Dawn native prebuild. Most callers should import `init` from `aigpu/node`; direct adapter/device helpers remain for core layer (`aigpu/core`) tooling.

## Install

```bash
pnpm add aigpu
```

## Usage

```ts
import { init, draw, frame, target } from "aigpu/node";

const gpu = await init();
const colorTarget = target(gpu, { size: [256, 256], format: "rgba8unorm" });
const drawable = draw(gpu, { shader: TRIANGLE_WGSL, targets: [colorTarget] });
frame(gpu, (f) => f.pass({ target: colorTarget, clear: [0, 0, 0, 1] }, (p) => p.draw(drawable)));
const rgba = await colorTarget.read();
gpu.dispose();
```

## System requirements

- Node.js 22+ is the supported engine.
- Linux Dawn prebuilds require a compatible GLIBC. Use the repository Docker runner for reproducible CI and snapshots.
- Linux lets Dawn discover available backends. X11/OpenGL software rendering can use `LIBGL_ALWAYS_SOFTWARE=1` and `DISPLAY`; display-free Vulkan/lavapipe uses a valid `VK_ICD_FILENAMES` and `XDG_RUNTIME_DIR`.
- `AIGPU_DAWN_FLAGS=backend=vulkan` or `backend=opengl` pins a backend when automatic discovery is not desired.
- `AIGPU-NODE-NO-ADAPTER` includes the attempted Dawn flags and adapter options plus Mesa, Vulkan ICD, and display diagnostics.

## License

MIT.
