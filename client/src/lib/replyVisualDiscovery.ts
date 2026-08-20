export function buildReplyVisualDiscoveryPrompt(response: string) {
  const direction = response.replace(/\n+/g, " ").trim().slice(0, 520);
  return `Find image references and a visual direction related to this gvone response: ${direction}`;
}
