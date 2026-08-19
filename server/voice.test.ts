import { describe, expect, it } from "vitest";
import { getVoiceAvailability, voiceErrorToAvailability } from "../client/src/lib/voice";

describe("gvone voice state utilities", () => {
  it("requires both recognition and speech synthesis for voice mode", () => {
    expect(getVoiceAvailability(true, true)).toBe("ready");
    expect(getVoiceAvailability(false, true)).toBe("unsupported");
    expect(getVoiceAvailability(true, false)).toBe("unsupported");
  });

  it("separates microphone permission errors from ordinary recognition errors", () => {
    expect(voiceErrorToAvailability("not-allowed")).toBe("permission-denied");
    expect(voiceErrorToAvailability("service-not-allowed")).toBe("permission-denied");
    expect(voiceErrorToAvailability("no-speech")).toBe("ready");
  });
});
