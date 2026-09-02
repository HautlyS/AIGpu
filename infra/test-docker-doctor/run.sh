#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DAWN=${AIGPU_DAWN_BINARY:-$HOME/.cache/aigpu/dawn/0.4.0-aigpu.1/linux-arm64-gnu/dawn-linux-arm64-gnu.node}
platform=${DOCTOR_DOCKER_PLATFORM:-linux/arm64}
images=()
cleanup() {
  docker ps -aq --filter label=aigpu-doctor-test=1 | xargs -r docker rm -f >/dev/null
  ((${#images[@]} == 0)) || docker image rm -f "${images[@]}" >/dev/null 2>&1 || true
  docker images -q --filter label=aigpu-doctor-test=1 | xargs -r docker image rm -f >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
for mode in vulkan broken xvfb; do
  image="aigpu-doctor-${mode}:test"
  images+=("$image")
  docker build --platform "$platform" --label aigpu-test=1 --label aigpu-doctor-test=1 -t "$image" -f "$ROOT/infra/test-docker-doctor/Dockerfile.$mode" "$ROOT"
  docker run --rm --platform "$platform" --label aigpu-test=1 --label aigpu-doctor-test=1 -e AIGPU_DAWN_BINARY=/dawn.node -v "$DAWN:/dawn.node:ro" "$image"
done
