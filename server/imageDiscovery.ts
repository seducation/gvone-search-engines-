import { searchWeb } from "./webSearch";

export type VisualDiscoveryResult = {
  title: string;
  url: string;
  domain: string;
  caption: string;
  imageUrl: string;
};

function getMetaValue(tag: string, attribute: string) {
  const expression = new RegExp(`${attribute}=["']([^"']+)["']`, "i");
  return tag.match(expression)?.[1] ?? "";
}

function resolveImageUrl(value: string, pageUrl: string) {
  try {
    const url = new URL(value, pageUrl);
    return /^https?:$/.test(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function extractPreviewImage(html: string, pageUrl: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const property = `${getMetaValue(tag, "property")} ${getMetaValue(tag, "name")}`.toLowerCase();
    if (!property.includes("og:image") && !property.includes("twitter:image")) continue;
    const image = resolveImageUrl(getMetaValue(tag, "content"), pageUrl);
    if (image) return image;
  }
  return "";
}

async function previewForPage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { headers: { "user-agent": "gvone-visual-discovery/1.0" }, signal: controller.signal });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return "";
    return extractPreviewImage((await response.text()).slice(0, 750_000), url);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverImages(query: string): Promise<VisualDiscoveryResult[]> {
  const pages = await searchWeb(query);
  const previews = await Promise.all(pages.map((page) => previewForPage(page.url)));
  return pages.map((page, index) => ({
    title: page.title,
    url: page.url,
    domain: page.domain,
    caption: page.snippet,
    imageUrl: previews[index] || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(page.domain)}&sz=128`,
  })).slice(0, 5);
}
