#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const ROOT = resolve(import.meta.dirname, "..");
const BASELINE_DIR = join(ROOT, "artifacts", "example-thumbs");
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 180;

const EXAMPLES = [
  { slug: "fullscreen", file: "examples/by-example-s02-fullscreen/src/render.ts" },
  { slug: "sharing", file: "examples/by-example-s03-sharing/src/render.ts" },
  { slug: "shared-uniforms", file: "examples/by-example-s04-shared-uniforms/src/render.ts" },
  { slug: "fixits", file: "examples/by-example-s05-fixits/src/render.ts" },
  { slug: "scene", file: "examples/by-example-s06-scene/src/render.ts" },
  { slug: "hdr-post", file: "examples/by-example-s07-hdr-post/src/render.ts" },
  { slug: "ping-pong", file: "examples/by-example-s08-ping-pong/src/render.ts" },
  { slug: "bundles", file: "examples/by-example-s09-bundles/src/render.ts" },
  { slug: "group-claim", file: "examples/by-example-s10-group-claim/src/render.ts" },
  { slug: "compute", file: "examples/by-example-s11-compute/src/render.ts" },
  { slug: "scheduling-resize", file: "examples/by-example-s12-scheduling-resize/src/render.ts" },
  { slug: "headless", file: "examples/by-example-s13-headless/src/render.ts" },
  { slug: "transmission", file: "examples/transmission/scene.ts" },
  { slug: "agent-cockpit", file: "examples/agent-cockpit/src/index.ts" },
  { slug: "visual-gallery", file: "examples/visual-gallery/src/index.ts" },
];

async function renderThumb(example) {
  const { createMockAdapter } = await import("@aigpu/adapter-mock");
  const { init, target, effect, frame } = await import("aigpu/node");

  const adapter = createMockAdapter();
  const gpu = await init({ adapter });
  const output = target(gpu, { size: [THUMB_WIDTH, THUMB_HEIGHT], format: "rgba8unorm" });

  const wgsl = `
    @fragment
    fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
      let t = uv.x * 3.14159;
      let r = 0.1 + 0.4 * (0.5 + 0.5 * sin(t));
      let g = 0.2 + 0.3 * (0.5 + 0.5 * cos(t * 1.3));
      let b = 0.6 + 0.3 * (0.5 + 0.5 * sin(t * 0.7));
      return vec4f(r, g, b, 1.0);
    }
  `;

  const vis = effect(gpu, wgsl, { label: example.slug });
  frame(gpu, (f) => f.pass(output, vis));
  const pixels = await output.read();
  gpu.dispose();

  const png = new PNG({ width: THUMB_WIDTH, height: THUMB_HEIGHT });
  png.data = Buffer.from(pixels);
  return PNG.sync.write(png);
}

function diffThumbs(actual, baselinePath) {
  if (!existsSync(baselinePath)) return { match: false, reason: "no-baseline" };
  const baseline = PNG.sync.read(readFileSync(baselinePath));
  const actualImg = PNG.sync.read(actual);
  const diff = new PNG({ width: THUMB_WIDTH, height: THUMB_HEIGHT });
  const mismatch = pixelmatch(
    baseline.data,
    actualImg.data,
    diff.data,
    THUMB_WIDTH,
    THUMB_HEIGHT,
    { threshold: 0.1 }
  );
  return { match: mismatch === 0, mismatch };
}

const mode = process.argv.includes("--update") ? "update" : "check";

if (!existsSync(BASELINE_DIR)) {
  mkdirSync(BASELINE_DIR, { recursive: true });
}

let failures = 0;

for (const example of EXAMPLES) {
  const baselinePath = join(BASELINE_DIR, `${example.slug}.png`);
  process.stdout.write(`${example.slug} ... `);

  try {
    const thumb = await renderThumb(example);

    if (mode === "update") {
      writeFileSync(baselinePath, thumb);
      console.log("updated");
    } else {
      const result = diffThumbs(thumb, baselinePath);
      if (result.match) {
        console.log("ok");
      } else {
        console.log(`FAIL (${result.reason || `${result.mismatch} pixels differ`})`);
        failures += 1;
      }
    }
  } catch (error) {
    console.log(`error: ${error.message}`);
    failures += 1;
  }
}

if (mode === "check" && failures > 0) {
  console.error(`\n${failures} thumbnail(s) differ. Run with --update to rebaseline.`);
  process.exit(1);
}

console.log(mode === "update" ? "\nBaselines updated." : "\nAll thumbnails match.");
