# AIGpu production checklist

This repository is prepared for source-controlled production releases. The default workflow is intentionally open-source and does not require a hosted AIGpu service.

## Required repository settings

Protect the `main` branch and require the `quality`, `full-suite`, `wgsl-loaders`, `package-smoke`, `docker-gpu`, `codeql`, `audit`, and `docs` checks before merging. Enable Dependabot pull requests for pnpm and GitHub Actions updates. Restrict release creation to maintainers.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | Push, pull request, manual | Build, typecheck, tests, bundles, package archives, WGSL loaders, and software WebGPU validation. |
| `docs.yml` | Documentation and skill changes | Generate and validate the offline docs manifest, Agent Skills discovery, and snippets. |
| `security.yml` | Push, pull request, weekly schedule | CodeQL, dependency review, production audit, and secret scanning. |
| `release-verify.yml` | Published release or manual | Verify a ref, create package archives, generate SBOM, and create checksums. |
| `release.yml` | Published `v*` release | Publish npm packages with stable or `next` dist-tags after release gates. |
| `dawn-build.yml` | Manual | Build portable Dawn artifacts. |
| `lavapipe-build.yml` | Manual | Build portable Lavapipe artifacts and validation evidence. |

## Release sequence

1. Merge only when the required checks are green.
2. Update package versions and changelog entries.
3. Create a signed or reviewed GitHub release with a `v` tag.
4. Mark prereleases explicitly so the release workflow selects the `next` npm dist-tag.
5. Inspect the `release-verify` artifact, including `SHA256SUMS` and the CycloneDX SBOM.
6. Confirm npm publication and the generated package contents.

The release workflow uses npm trusted publishing with `id-token: write`; configure the npm trusted publisher for the repository before publishing. Do not add an npm token to the repository unless trusted publishing is unavailable and a maintainer has explicitly chosen that fallback.

## Local production gates

```sh
pnpm install --frozen-lockfile
pnpm validate:workflows
pnpm validate:agent-integrations
pnpm build
pnpm typecheck
pnpm test:fast
pnpm bundle-check
pnpm docs:generate
pnpm check:skill-drift
pnpm check:filenames
```

The production ZIP should contain source, lockfiles, documentation, workflows, skills, plugins, examples, and release metadata. It should not contain `node_modules`, build output, `.git`, caches, or local credentials.
