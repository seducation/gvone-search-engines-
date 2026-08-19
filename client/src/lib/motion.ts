export type MotionVector = { x: number; y: number };

export function normalizeMotion(x: number, y: number): MotionVector {
  const scale = 0.08;
  return {
    x: Math.max(-1, Math.min(1, x * scale)),
    y: Math.max(-1, Math.min(1, y * scale)),
  };
}

export function motionSupported(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}
