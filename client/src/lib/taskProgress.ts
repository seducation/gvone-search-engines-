export const TASK_PROGRESS_STAGES = [
  "Understanding your request",
  "Researching relevant context",
  "Analyzing the details",
  "Preparing gvone’s reply",
] as const;

export type TaskProgressActivity = {
  label: string;
  detail: string;
  kind: "context" | "research" | "visual" | "reasoning" | "reply";
};

export function getTaskProgressPercent(stageIndex: number): number {
  const clamped = Math.max(0, Math.min(stageIndex, TASK_PROGRESS_STAGES.length - 1));
  return 18 + Math.round((clamped / (TASK_PROGRESS_STAGES.length - 1)) * 68);
}

export function getTaskProgressActivity(stageIndex: number, options: { usesProject: boolean; usesVisualDiscovery: boolean; usesWebResearch: boolean }): TaskProgressActivity {
  const clamped = Math.max(0, Math.min(stageIndex, TASK_PROGRESS_STAGES.length - 1));
  if (clamped === 0) return { label: "Reading your direction", detail: options.usesProject ? "Applying project and Studio context" : "Mapping intent and conversation context", kind: "context" };
  if (clamped === 1) {
    if (options.usesVisualDiscovery) return { label: "Looking for visual references", detail: "Preparing related image discovery", kind: "visual" };
    if (options.usesWebResearch) return { label: "Checking live sources", detail: "Gathering useful website context", kind: "research" };
    return { label: "Reviewing relevant context", detail: "Connecting details from this conversation", kind: "context" };
  }
  if (clamped === 2) return { label: "Connecting the details", detail: options.usesProject ? "Balancing your Studio focus with the request" : "Shaping a useful response", kind: "reasoning" };
  return { label: "Composing a considered reply", detail: "Preparing the clearest next step", kind: "reply" };
}

export function getTaskElapsedLabel(elapsedSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  return safeSeconds < 1 ? "just started" : `${safeSeconds}s active`;
}
