import { describe, expect, it } from "vitest";
import { getGestureMode } from "../client/src/lib/gesture";

describe("gvone gesture modes", () => {
  it("prioritizes listening and speaking over touch", () => {
    expect(getGestureMode(false, false, false)).toBe("idle");
    expect(getGestureMode(true, false, false)).toBe("touched");
    expect(getGestureMode(true, true, false)).toBe("listening");
    expect(getGestureMode(true, false, true)).toBe("speaking");
  });
});
