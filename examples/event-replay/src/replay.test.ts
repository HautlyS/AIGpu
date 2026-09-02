import { expect, test } from "vitest";
import { createReplayDemo } from "./replay.ts";

test("replay demo captures serializable agent history", () => {
  const demo = createReplayDemo();
  expect(demo.events).toHaveLength(2);
  expect(demo.events[1].patch?.status).toBe("success");
  expect(demo.replayed).toEqual([]);
});
