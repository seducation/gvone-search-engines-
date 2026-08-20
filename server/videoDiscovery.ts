import { searchWeb } from "./webSearch";

export type VideoDiscoveryResult = {
  title: string;
  url: string;
  domain: string;
  caption: string;
  thumbnailUrl: string;
  provider: "YouTube" | "Vimeo" | "Video";
};

function getYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") ?? parsed.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? "";
  } catch {
    return "";
  }
  return "";
}

export function getVideoProvider(url: string): VideoDiscoveryResult["provider"] {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("vimeo.com")) return "Vimeo";
  } catch {
    // Return the generic provider below.
  }
  return "Video";
}

export function getVideoThumbnail(url: string, domain: string) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export async function discoverVideos(query: string): Promise<VideoDiscoveryResult[]> {
  const resultSets = await Promise.all([searchWeb(`site:youtube.com ${query}`), searchWeb(`site:vimeo.com ${query}`)]);
  const seen = new Set<string>();
  return resultSets.flat().filter((page) => {
    const provider = getVideoProvider(page.url);
    if (provider === "Video" || seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  }).slice(0, 5).map((page) => ({
    title: page.title,
    url: page.url,
    domain: page.domain,
    caption: page.snippet,
    thumbnailUrl: getVideoThumbnail(page.url, page.domain),
    provider: getVideoProvider(page.url),
  }));
}
