import { describe, expect, it } from "vitest";
import { extractPreviewImage } from "./imageDiscovery";

describe("image discovery preview extraction", () => {
  it("reads a page’s Open Graph image and resolves relative URLs", () => {
    expect(extractPreviewImage('<meta property="og:image" content="/images/reference.jpg">', "https://example.com/article")).toBe("https://example.com/images/reference.jpg");
  });

  it("returns an empty string when no usable social image is present", () => {
    expect(extractPreviewImage("<title>Example</title>", "https://example.com")).toBe("");
  });
});
