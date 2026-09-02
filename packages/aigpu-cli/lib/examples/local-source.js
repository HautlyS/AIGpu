import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { filesystem, integrity, notFound } from "./errors.js";
import { assertSafeRelativePath } from "./paths.js";

const SKIP = new Set([".git", "node_modules", "dist", "build", ".next", ".cache"]);
const CONTENT_TYPES = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".md", "text/markdown"],
  [".mjs", "text/javascript"],
  [".jsx", "text/jsx"],
  [".svelte", "text/svelte"],
  [".ts", "text/typescript"],
  [".tsx", "text/tsx"],
  [".vue", "text/vue"],
  [".wgsl", "text/plain"],
]);

/**
 * Filesystem-backed example source. It is intentionally local-only: no HTTP client, registry,
 * telemetry, or hosted catalog is involved. The directory can be changed with AIGPU_EXAMPLES_DIR.
 */
export class LocalExamplesSource {
  constructor({ root = process.env.AIGPU_EXAMPLES_DIR ?? resolve(process.cwd(), "examples") } = {}) {
    this.root = resolve(root);
  }

  async getIndex({ revision } = {}) {
    const examples = await this.#discoverExamples();
    const computedRevision = sha256(JSON.stringify(examples.map(({ files, ...entry }) => ({ ...entry, files: files.map(file => [file.path, file.sha256, file.size]) }))));
    if (revision && revision !== computedRevision) throw integrity(`Local examples revision is ${computedRevision}, not ${revision}`);
    return {
      index: { revision: computedRevision, generatedAt: new Date().toISOString(), examples },
      offline: true,
    };
  }

  async getManifest(index, id) {
    const entry = index.examples.find((candidate) => candidate.id === id);
    if (!entry) throw notFound(`Local example not found: ${id}`);
    const files = entry.files.map((file) => ({ ...file, url: `file://${resolve(this.root, id, file.path)}` }));
    return {
      id,
      revision: index.revision,
      title: entry.title,
      description: entry.description,
      files,
      aggregateSha256: sha256(JSON.stringify(files.map(file => [file.path, file.size, file.sha256]))),
    };
  }

  async getFile(manifest, file) {
    assertSafeRelativePath(file.path);
    const exampleRoot = await this.#safeExampleRoot(manifest.id);
    const path = resolve(exampleRoot, file.path);
    const fromRoot = relative(exampleRoot, path);
    if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) throw filesystem(`Example file escapes its root: ${file.path}`);
    let bytes;
    try {
      const stat = await lstat(path);
      if (!stat.isFile()) throw new Error("not a regular file");
      bytes = await readFile(path);
    } catch (error) {
      if (error?.code === "ENOENT") throw notFound(`Local example file not found: ${file.path}`);
      throw filesystem(`Cannot read local example file ${file.path}: ${error.message}`);
    }
    if (bytes.byteLength !== file.size || sha256(bytes) !== file.sha256) throw integrity(`Local example integrity mismatch: ${file.path}`);
    return bytes;
  }

  async #discoverExamples() {
    let entries;
    try {
      entries = await readdir(this.root, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") throw notFound(`Examples directory does not exist: ${this.root}`);
      throw filesystem(`Cannot read examples directory: ${error.message}`);
    }
    const examples = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
      const files = await collectFiles(resolve(this.root, entry.name));
      if (files.length === 0) continue;
      const packageInfo = await readPackageJson(resolve(this.root, entry.name));
      const tags = [...new Set([entry.name, ...entry.name.split(/[^a-z0-9]+/iu).filter(Boolean), "webgpu", "aigpu"])]
        .map((tag) => tag.toLowerCase());
      examples.push({
        id: entry.name,
        title: packageInfo?.name ?? titleFromId(entry.name),
        description: packageInfo?.description ?? `Local AIGpu example: ${titleFromId(entry.name)}.`,
        tags,
        capabilities: ["webgpu", "local"],
        fileCount: files.length,
        files,
      });
    }
    return examples;
  }

  async #safeExampleRoot(id) {
    assertSafeRelativePath(id);
    const path = resolve(this.root, id);
    const fromRoot = relative(this.root, path);
    if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) throw filesystem(`Example id escapes the examples root: ${id}`);
    const stat = await lstat(path).catch((error) => { throw error?.code === "ENOENT" ? notFound(`Local example not found: ${id}`) : error; });
    if (!stat.isDirectory()) throw notFound(`Local example not found: ${id}`);
    return path;
  }
}

async function collectFiles(root, prefix = "") {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const path = resolve(root, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await collectFiles(path, relativePath));
    else if (entry.isFile()) {
      const bytes = await readFile(path);
      files.push({ path: relativePath, size: bytes.byteLength, sha256: sha256(bytes), contentType: CONTENT_TYPES.get(extname(entry.name).toLowerCase()) ?? "application/octet-stream" });
    }
  }
  return files;
}

async function readPackageJson(root) {
  try { return JSON.parse(await readFile(resolve(root, "package.json"), "utf8")); }
  catch { return undefined; }
}

function titleFromId(id) {
  return id.replace(/[-_]+/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
