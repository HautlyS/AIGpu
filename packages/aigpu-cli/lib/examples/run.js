import { examplesHelp } from "./help.js";
import { createExamplesService } from "./service.js";
import { LocalExamplesSource } from "./local-source.js";
import { tokens } from "./search.js";
import { pullExample } from "./pull.js";
import { errorResult, usage } from "./errors.js";

const SHA = /^[a-f0-9]{64}$/;
const json = (value, pretty) => `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;

function parse(command, args) {
  const positional = [];
  const options = {};
  const allowed = {
    search: new Set(["any", "limit", "revision", "pretty", "root"]),
    show: new Set(["revision", "pretty", "root"]),
    cat: new Set(["revision", "json", "root"]),
    pull: new Set(["root", "out", "revision", "force", "pretty"]),
  }[command];
  if (!allowed) throw usage(`Unknown examples command: ${command}`);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) { positional.push(argument); continue; }
    const key = argument.slice(2);
    if (!allowed.has(key) || Object.hasOwn(options, key)) throw usage(`Invalid or duplicate option: ${argument}`);
    if (["limit", "revision", "out", "root"].includes(key)) {
      if (!args[index + 1] || args[index + 1].startsWith("--")) throw usage(`Option ${argument} requires a value`);
      options[key] = args[++index];
    } else options[key] = true;
  }
  return { positional, options };
}

export async function runExamples(args, { env = process.env, platform = process.platform } = {}) {
  try {
    const [command, ...rest] = args;
    if (command === undefined || command === "help" || command === "--help" || command === "-h") return { code: 0, stdout: examplesHelp };
    const { positional, options } = parse(command, rest);
    const counts = { search: 1, show: 1, cat: 2, pull: 1 };
    if (positional.length !== counts[command]) throw usage(`Invalid arguments for examples ${command}`);
    if (options.revision && !SHA.test(options.revision)) throw usage("--revision must be a lowercase SHA-256");
    if (options.limit !== undefined && (!/^\d+$/.test(options.limit) || +options.limit < 1 || +options.limit > 100)) throw usage("--limit must be an integer from 1 to 100");
    if (command === "pull" && !options.out) throw usage("pull requires --out <directory>");
    if (command === "search" && !tokens(positional[0]).length) throw usage("Search query must contain a letter or number");

    const source = new LocalExamplesSource({ root: options.root || env.AIGPU_EXAMPLES_DIR });
    const common = { revision: options.revision, offline: true };
    if (command === "pull") {
      const state = await source.getIndex(common);
      const manifest = await source.getManifest(state.index, positional[0]);
      const result = await pullExample(source, manifest, options.out, { force: !!options.force, platform });
      return { code: 0, stdout: json({ revision: manifest.revision, id: manifest.id, ...result, aggregateSha256: manifest.aggregateSha256 }, !!options.pretty) };
    }

    const examples = createExamplesService({ source, platform });
    if (command === "search") {
      const { operation: _operation, ...value } = await examples.execute({ operation: "search", query: positional[0], match: options.any ? "any" : "all", limit: options.limit ? +options.limit : 20, ...common });
      return { code: 0, stdout: json(value, !!options.pretty) };
    }
    if (command === "show") {
      const result = await examples.execute({ operation: "show", id: positional[0], ...common });
      return { code: 0, stdout: json({ ...result.manifest }, !!options.pretty) };
    }
    const result = await examples.execute({ operation: "read", id: positional[0], path: positional[1], ...common });
    if (!options.json) return { code: 0, stdout: Buffer.from(result.content) };
    const { operation: _operation, contentType: _contentType, ...value } = result;
    return { code: 0, stdout: json(value, false) };
  } catch (error) {
    return errorResult(error);
  }
}
