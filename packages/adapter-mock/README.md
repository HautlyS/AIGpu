# @aigpu/adapter-mock

Deterministic adapter for `aigpu/mock`.

`@aigpu/adapter-mock` backs the `aigpu/mock` entrypoint for tests that need the public `Gpu` API without real GPU hardware.

## Install

```bash
pnpm add -D @aigpu/adapter-mock
```

## Usage

```ts
import { init, storage } from "aigpu/mock";

const gpu = await init();
const buffer = storage(gpu, 16);
buffer.write(new Float32Array([1, 2, 3, 4]));
await buffer.read();
gpu.dispose();
```

Use `aigpu/mock` for command/resource tests and `aigpu/node` for real rendering/readback snapshots.

## License

MIT.
