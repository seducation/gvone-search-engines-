export type WebSearchResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string;
};

const decodeHtml = (value: string) => value
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

const normalizeUrl = (value: string) => {
  try {
    const raw = value.startsWith("//") ? `https:${value}` : value;
    const parsed = new URL(raw);
    const redirect = parsed.searchParams.get("uddg");
    return redirect ? decodeURIComponent(redirect) : parsed.toString();
  } catch {
    return "";
  }
};

export function parseDuckDuckGoResults(html: string, limit = 5): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const linkPattern = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) && results.length < limit) {
    const url = normalizeUrl(match[1]);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    let domain = "";
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
    const afterTitle = html.slice(match.index + match[0].length, match.index + match[0].length + 1600);
    const snippetMatch = afterTitle.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    results.push({
      title: decodeHtml(match[2]),
      url,
      domain,
      snippet: decodeHtml(snippetMatch?.[1] ?? `Explore relevant information from ${domain}.`),
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    });
  }
  return results;
}

async function searchWebOnce(query: string): Promise<WebSearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "user-agent": "gvone-assistant/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Web search failed (${response.status})`);
  return parseDuckDuckGoResults(await response.text(), 5);
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const primary = await searchWebOnce(query);
  if (primary.length >= 4) return primary.slice(0, 5);
  const fallback = await searchWebOnce(`${query} official guide`);
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((result) => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  }).slice(0, 5);
}
