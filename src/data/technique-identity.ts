import source from './technique-id-redirects.json';

const redirects: Record<string, string> = source;

export const mergedTechniqueIds = Object.keys(redirects);

export function resolveTechniqueId(id: string) {
  return Object.hasOwn(redirects, id) ? redirects[id] : id;
}
