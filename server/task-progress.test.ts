import { describe, expect, it } from "vitest";
import { getTaskProgressPercent, TASK_PROGRESS_STAGES } from "../client/src/lib/taskProgress";

describe("task progress", () => {
  it("moves through an ordered set of concise working stages", () => {
    expect(TASK_PROGRESS_STAGES).toHaveLength(4);
    expect(getTaskProgressPercent(0)).toBeLessThan(getTaskProgressPercent(2));
    expect(getTaskProgressPercent(99)).toBe(getTaskProgressPercent(TASK_PROGRESS_STAGES.length - 1));
  });
});
