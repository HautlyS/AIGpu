# @aigpu/render

Slim legacy/utility render package, kept for compatibility while the old thick render surface is removed from the public path.

New applications should use the public `aigpu` package. `@aigpu/render` remains as a slim package for edit/inspect/utils/perf helpers and compatibility while the old thick render surface is removed from the public path.

## What stays here

- `@aigpu/render/inspect`: wireframe/normal debug helpers and inspect materials.
- `@aigpu/render/edit`: mesh edit utilities.
- `@aigpu/render/utils`: canvas/mouse/frame-clock helpers that are independent from the main API (`aigpu`).
- `@aigpu/render/perf`: measurement utilities such as frame timing and pixel diff.

## Preferred rendering API

```ts
import { init, draw, frameLoop, surface } from "aigpu";

const gpu = await init();
const canvasSurface = surface(gpu, canvas);
const drawable = draw(gpu, { shader: WGSL, targets: [canvasSurface] });
frameLoop(gpu, (f) => f.pass({ target: canvasSurface }, (p) => p.draw(drawable)));
```

Keep performance-sensitive rendering in `aigpu`: use `bundle(gpu)` for static replay, `targets: [...]` for pipeline pre-warm, `uniforms(gpu)` for shared values, and `draw.group()` with dynamic offsets for many objects.

## License

MIT.
