export type VoiceAvailability = "ready" | "unsupported" | "permission-denied";

export function getVoiceAvailability(hasRecognition: boolean, hasSpeechSynthesis: boolean): VoiceAvailability {
  return hasRecognition && hasSpeechSynthesis ? "ready" : "unsupported";
}

export function voiceErrorToAvailability(errorName: string): VoiceAvailability {
  return errorName === "not-allowed" || errorName === "service-not-allowed"
    ? "permission-denied"
    : "ready";
}
