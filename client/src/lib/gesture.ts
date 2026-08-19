export type GestureMode = "idle" | "touched" | "listening" | "speaking";

export function getGestureMode(isTouched: boolean, isListening: boolean, isSpeaking: boolean): GestureMode {
  if (isListening) return "listening";
  if (isSpeaking) return "speaking";
  if (isTouched) return "touched";
  return "idle";
}
