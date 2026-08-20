import { describe, expect, it } from "vitest";
import { getTaskElapsedLabel, getTaskProgressActivity, getTaskProgressPercent, TASK_PROGRESS_STAGES } from "../client/src/lib/taskProgress";

describe("task progress", () => {
  it("moves through an ordered set of concise working stages", () => {
    expect(TASK_PROGRESS_STAGES).toHaveLength(4);
    expect(getTaskProgressPercent(0)).toBeLessThan(getTaskProgressPercent(2));
    expect(getTaskProgressPercent(99)).toBe(getTaskProgressPercent(TASK_PROGRESS_STAGES.length - 1));
  });

  it("exposes work-aware activity detail without exposing internal reasoning", () => {
    expect(getTaskProgressActivity(0, { usesProject: true, usesVisualDiscovery: false, usesWebResearch: false }).detail).toContain("project");
    expect(getTaskProgressActivity(1, { usesProject: false, usesVisualDiscovery: true, usesWebResearch: false }).label).toContain("visual");
    expect(getTaskProgressActivity(1, { usesProject: false, usesVisualDiscovery: false, usesWebResearch: true }).label).toContain("sources");
    expect(getTaskElapsedLabel(3.8)).toBe("3s active");
  });
});
