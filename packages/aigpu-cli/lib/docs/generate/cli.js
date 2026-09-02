#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeStamp, generateDocs } from "./generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../..");
const manifestOut = resolve(root, "packages/aigpu-cli/lib/generated/docs-manifest.generated.js");
const skillDir = resolve(root, "skills/aigpu");
const { manifest } = generateDocs({ root, skillDir, manifestOut, stamp: computeStamp(root) });
const guideCount = manifest.records.filter((record) => record.kind === "guide").length;
console.log(`docs: ${manifest.records.length} records (${guideCount} guides) → manifest + skill at ${skillDir}`);
