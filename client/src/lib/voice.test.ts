import { describe, expect, it } from "vitest";
import { getVoiceAvailability, voiceErrorToAvailability } from "./voice";

describe("voice utilities", () => {
  it("only reports voice ready when recognition and speech synthesis are available", () => {
    expect(getVoiceAvailability(true, true)).toBe("ready");
    expect(getVoiceAvailability(false, true)).toBe("unsupported");
    expect(getVoiceAvailability(true, false)).toBe("unsupported");
  });

  it("identifies microphone permission errors separately", () => {
    expect(voiceErrorToAvailability("not-allowed")).toBe("permission-denied");
    expect(voiceErrorToAvailability("service-not-allowed")).toBe("permission-denied");
    expect(voiceErrorToAvailability("no-speech")).toBe("ready");
  });
});
