export type VisualReference = {
  title: string;
  url: string;
  imageUrl: string;
  domain: string;
  caption: string;
};

export type SavedVisualReference = VisualReference & {
  id: string;
  savedAt: number;
};

export type VisualBoardReference = SavedVisualReference & {
  saved: boolean;
};

export function buildVisualBoardReferences(saved: SavedVisualReference[], current: VisualReference[]): VisualBoardReference[] {
  const savedByUrl = new Set(saved.map((reference) => reference.url));
  return [
    ...saved.map((reference) => ({ ...reference, saved: true })),
    ...current
      .filter((reference) => !savedByUrl.has(reference.url))
      .map((reference) => ({ id: `current-${reference.url}`, ...reference, savedAt: 0, saved: false })),
  ];
}
