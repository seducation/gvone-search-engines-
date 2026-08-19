import { describe, expect, it } from "vitest";
import { normalizeMotion } from "../client/src/lib/motion";

describe("motion input", () => {
  it("normalizes acceleration into a safe bounded vector", () => {
    expect(normalizeMotion(0, 0)).toEqual({ x: 0, y: 0 });
    expect(normalizeMotion(100, -100)).toEqual({ x: 1, y: -1 });
  });
});
