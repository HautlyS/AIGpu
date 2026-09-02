import { docsManifest } from "../generated/docs-manifest.generated.js";

export function loadManifest() {
  return docsManifest;
}

export function buildIndex(manifest = loadManifest()) {
  const paths = new Map();
  const symbols = new Map();
  const packages = new Set();
  for (const record of manifest.records) {
    packages.add(record.package);
    push(paths, record.virtualPath, record);
    push(symbols, record.symbol, record);
  }
  return { records: manifest.records, packages: [...packages].sort(comparePackage), paths, symbols };
}

export function resolveSymbol(index, symbol) {
  const records = index.symbols.get(symbol);
  if (!records || records.length === 0) return undefined;
  const unique = uniqueByPath(records);
  return unique.length === 1 ? unique[0] : unique;
}

export function resolvePath(index, path) {
  return uniqueByPath(index.paths.get(normalizePath(path)) ?? []);
}

export function uniqueByPath(records) {
  return [...new Map(records.map((record) => [record.virtualPath, record])).values()];
}

export function normalizePath(path) {
  if (path === "/") return path;
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

// The repo's declared "what matters most" curation ladder. Exported so `docs find`'s ranking and
// `docs ls`'s package ordering share one source of truth instead of drifting apart.
export function packageRank(name) {
  if (name === "guides") return 0;
  if (name === "aigpu") return 1;
  if (name === "aigpu/scene") return 2;
  if (name === "aigpu/core") return 3;
  if (name === "@aigpu/wgsl") return 4;
  if (name === "@aigpu/wgsl/runtime") return 5;
  if (name.startsWith("@aigpu/wgsl/loader-")) return 6;
  if (name.startsWith("@aigpu/wgsl-std/")) return 7;
  if (name.startsWith("@aigpu/render/")) return 8;
  return 9;
}

function comparePackage(left, right) {
  return packageRank(left) - packageRank(right) || left.localeCompare(right);
}

function push(map, key, value) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}
