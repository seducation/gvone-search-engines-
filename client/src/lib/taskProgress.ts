export const TASK_PROGRESS_STAGES = [
  "Understanding your request",
  "Researching relevant context",
  "Analyzing the details",
  "Preparing gvone’s reply",
] as const;

export function getTaskProgressPercent(stageIndex: number): number {
  const clamped = Math.max(0, Math.min(stageIndex, TASK_PROGRESS_STAGES.length - 1));
  return 18 + Math.round((clamped / (TASK_PROGRESS_STAGES.length - 1)) * 68);
}
