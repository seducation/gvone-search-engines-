import { describe, expect, it } from "vitest";
import { parseDuckDuckGoResults } from "./webSearch";

describe("web search result parsing", () => {
  it("extracts titles, redirect URLs, domains, and snippets", () => {
    const html = `<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fguide">Example guide</a><a class="result__snippet">A useful guide for the topic.</a>`;
    expect(parseDuckDuckGoResults(html)).toEqual([expect.objectContaining({ title: "Example guide", url: "https://example.com/guide", domain: "example.com", snippet: "A useful guide for the topic." })]);
  });

  it("limits the result list to five sources", () => {
    const html = Array.from({ length: 7 }, (_, index) => `<a class="result__a" href="https://example${index}.com">Result ${index}</a><a class="result__snippet">Snippet ${index}</a>`).join("");
    expect(parseDuckDuckGoResults(html)).toHaveLength(5);
  });
});
