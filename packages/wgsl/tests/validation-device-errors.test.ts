import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { resolveShader } from "@aigpu/wgsl/runtime";
import { wgslErrorWithFix } from "../src/runtime/errors.ts";
import { acquireValidationDevice } from "../src/runtime/validation-device.ts";
import { __resetValidationWarnOnceForTests } from "../src/runtime/validation.ts";

vi.mock("../src/runtime/validation-device.ts", () => ({ acquireValidationDevice: vi.fn(), retainValidationDevice: vi.fn(), releaseValidationDevice: vi.fn(), __resetValidationDeviceForTests: vi.fn() }));

const modules = { "/m.wgsl": "@compute @workgroup_size(1) fn main(){}" };
const adapterMissing = () =>
  wgslErrorWithFix("AIGPU-WGSL-VALIDATE-ADAPTER-MISSING", "WGSL validation needs @aigpu/adapter-node to acquire a WebGPU device, but it could not be imported.", {
    fix: 'Install @aigpu/adapter-node (pnpm add -D @aigpu/adapter-node), or pass validate: "off" (or set AIGPU_VALIDATE=off) to skip device-backed validation.',
    cause: Object.assign(new Error("Cannot find package '@aigpu/adapter-node'"), { code: "ERR_MODULE_NOT_FOUND" }),
    where: "resolveShader",
  });
const noDevice = (fix: string, causeCode: string) =>
  wgslErrorWithFix("AIGPU-WGSL-VALIDATE-NO-DEVICE", `device acquisition failed via @aigpu/adapter-node (${causeCode}): No WebGPU adapter available with Dawn flags [].`, {
    fix,
    cause: { code: causeCode, fix, message: "No WebGPU adapter available with Dawn flags []." },
    where: "resolveShader",
    metadata: { causeCode },
  });

const previousEnv = process.env.AIGPU_VALIDATE;
let stderr: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  delete process.env.AIGPU_VALIDATE;
  __resetValidationWarnOnceForTests();
  vi.mocked(acquireValidationDevice).mockReset();
  stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  stderr.mockRestore();
  if (previousEnv === undefined) delete process.env.AIGPU_VALIDATE;
  else process.env.AIGPU_VALIDATE = previousEnv;
});

test('"require" rethrows the adapter-missing error with its fix', async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  await expect(resolveShader({ entry: "/m.wgsl", validate: "require", modules })).rejects.toMatchObject({
    code: "AIGPU-WGSL-VALIDATE-ADAPTER-MISSING",
    fix: expect.stringContaining("pnpm add -D @aigpu/adapter-node"),
    where: "resolveShader",
  });
});

test('"auto" warns once and records the skip instead of pretending it validated', async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  const result = await resolveShader({ entry: "/m.wgsl", validate: "auto", modules });
  expect(result.validation).toMatchObject({ mode: "auto", attempted: true, ok: false, skipped: { code: "AIGPU-WGSL-VALIDATE-ADAPTER-MISSING", fix: expect.stringContaining("pnpm add -D") } });
  expect(stderr).toHaveBeenCalledTimes(1);
  expect(String(stderr.mock.calls[0]?.[0])).toContain("AIGPU-WGSL-VALIDATE-ADAPTER-MISSING");

  await resolveShader({ entry: "/m.wgsl", validate: "auto", modules });
  expect(stderr).toHaveBeenCalledTimes(1);
});

test('"require" forwards the adapter-node fix verbatim and keeps the cause', async () => {
  const fix = "Install the portable CPU renderer with `npx aigpu install-software-renderer`, then retry.";
  vi.mocked(acquireValidationDevice).mockRejectedValue(noDevice(fix, "AIGPU-NODE-NO-ADAPTER"));
  const error = await resolveShader({ entry: "/m.wgsl", validate: "require", modules }).then(
    () => { throw new Error("expected a rejection"); },
    (rejection: unknown) => rejection as { code?: string; fix?: string; metadata?: Record<string, unknown>; cause?: unknown },
  );
  expect(error).toMatchObject({ code: "AIGPU-WGSL-VALIDATE-NO-DEVICE", fix, metadata: { causeCode: "AIGPU-NODE-NO-ADAPTER" } });
  expect(error.cause).toMatchObject({ code: "AIGPU-NODE-NO-ADAPTER", fix });
});

test('"off" never asks for a device', async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  const result = await resolveShader({ entry: "/m.wgsl", validate: "off", modules });
  expect(result.validation).toEqual({ mode: "off", attempted: false, ok: true });
  expect(vi.mocked(acquireValidationDevice)).not.toHaveBeenCalled();
});

test("validate: false is off and validate: true is require", async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  await expect(resolveShader({ entry: "/m.wgsl", validate: false, modules })).resolves.toMatchObject({ validation: { mode: "off", attempted: false, ok: true } });
  expect(vi.mocked(acquireValidationDevice)).not.toHaveBeenCalled();
  await expect(resolveShader({ entry: "/m.wgsl", validate: true, modules })).rejects.toMatchObject({ code: "AIGPU-WGSL-VALIDATE-ADAPTER-MISSING" });
});

test("AIGPU_VALIDATE=require sets the default, and an explicit option still wins", async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  process.env.AIGPU_VALIDATE = "require";
  await expect(resolveShader({ entry: "/m.wgsl", modules })).rejects.toMatchObject({ code: "AIGPU-WGSL-VALIDATE-ADAPTER-MISSING" });
  await expect(resolveShader({ entry: "/m.wgsl", validate: "auto", modules })).resolves.toMatchObject({ validation: { mode: "auto", ok: false } });
});

test("AIGPU_VALIDATE=off skips the device by default", async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(adapterMissing());
  process.env.AIGPU_VALIDATE = "off";
  await expect(resolveShader({ entry: "/m.wgsl", modules })).resolves.toMatchObject({ validation: { mode: "off", attempted: false, ok: true } });
  expect(vi.mocked(acquireValidationDevice)).not.toHaveBeenCalled();
});

test("an unrecognized AIGPU_VALIDATE value fails loudly", async () => {
  process.env.AIGPU_VALIDATE = "bogus";
  await expect(resolveShader({ entry: "/m.wgsl", modules })).rejects.toMatchObject({
    code: "AIGPU-WGSL-VALIDATE-ENV-INVALID",
    message: 'Invalid AIGPU_VALIDATE="bogus"; expected "off", "auto", or "require".',
    fix: expect.stringContaining("Unset AIGPU_VALIDATE"),
  });
});

test("an unexpected acquisition failure is never swallowed by auto mode", async () => {
  vi.mocked(acquireValidationDevice).mockRejectedValue(new Error("boom"));
  await expect(resolveShader({ entry: "/m.wgsl", validate: "auto", modules })).rejects.toThrow("boom");
});
