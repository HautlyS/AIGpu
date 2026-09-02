#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DAWN=${AIGPU_DAWN_BINARY:-$HOME/.cache/aigpu/dawn/0.4.0-aigpu.1/linux-arm64-gnu/dawn-linux-arm64-gnu.node}
docker build --platform linux/arm64 -t aigpu-test-vulkan -f "$ROOT/infra/test-docker-vulkan/Dockerfile" "$ROOT"
docker run --rm --platform linux/arm64 --label aigpu-test=1 -e AIGPU_DAWN_BINARY=/dawn.node -v "$DAWN:/dawn.node:ro" aigpu-test-vulkan
