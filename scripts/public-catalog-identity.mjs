/** Route/relation keys are public structure, even when a new UUID is long. */
export function isPublicCatalogIdentityField(label) {
  return /\.(?:id|tagId|relatedTheoryIds|primaryTheoryIds|theoryTagIds)(?:\[\d+\])?$/.test(label);
}
