import { describe, expect, it } from "vitest";
import { getVideoProvider, getVideoThumbnail } from "./videoDiscovery";

describe("video discovery helpers", () => {
  it("recognizes supported video providers", () => {
    expect(getVideoProvider("https://www.youtube.com/watch?v=abc123")).toBe("YouTube");
    expect(getVideoProvider("https://vimeo.com/99123")).toBe("Vimeo");
    expect(getVideoProvider("https://example.com/article")).toBe("Video");
  });

  it("derives a stable YouTube thumbnail and safely falls back for other providers", () => {
    expect(getVideoThumbnail("https://youtu.be/abc123?t=2", "youtu.be")).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(getVideoThumbnail("https://vimeo.com/99123", "vimeo.com")).toContain("domain=vimeo.com");
  });
});
