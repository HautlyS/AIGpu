# @aigpu/core

Core layer (`aigpu/core`) runtime primitives.

`@aigpu/core` contains the low-level WebGPU wrappers used by `aigpu/core`: `Device`, `Buffer`, `Texture`, `Queue`, shader modules, bind-group helpers, resource identities, and validation errors. Most applications should start from `init()` in `aigpu`, `aigpu/node`, or `aigpu/mock` and drop to these primitives only for explicit native control.

## Install

```bash
pnpm add aigpu
```

## Use from the main API (`aigpu`)

```ts
import { init, draw } from "aigpu/mock";
import { UniformPool } from "aigpu/core";

const gpu = await init();
const drawable = draw(gpu, { shader: OBJ_WGSL });
const pool = new UniformPool(gpu.device, { capacityBytes: 1 << 20 });
const slot = pool.alloc({ size: 64, bindGroupLayout: drawable.layout(1, { dynamicOffsets: true }) });
drawable.group(1, slot.bindGroup);
```

Use raw `.gpu` handles deliberately. Wrapper lifecycle methods (`buffer.destroy()`, `texture.destroy()`, `device.destroy()`) remain preferred for resources created through aigpu.

## License

MIT.
