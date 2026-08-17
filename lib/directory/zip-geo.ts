/**
 * Directory ZIP → geography. Never treat a ZIP as a free-text name query.
 */
import {
  looksLikeZip,
  normalizeZip,
  resolveZip,
  type ZipLocation,
} from '@/lib/tools/zip-resolve';
import {
  matchLaunchCounty,
  primaryHubPathForCounty,
  type FlLaunchCounty,
} from '@/lib/dfs/launch-counties';

export type DirectoryZipGeo = ZipLocation & {
  launchCounty: FlLaunchCounty | null;
  hubSlug: string | null;
  hubHref: string | null;
};

export { looksLikeZip, normalizeZip };

export function resolveDirectoryZip(input: string | null | undefined): DirectoryZipGeo | null {
  if (!input) return null;
  const loc = resolveZip(input);
  if (!loc) return null;

  const launchCounty =
    loc.stateCode === 'FL' && loc.countyName
      ? matchLaunchCounty(loc.countyName)
      : null;
  const hubSlug = launchCounty
    ? launchCounty.hubSlugs.find((s) => s !== 'miami-fort-lauderdale') ??
      launchCounty.hubSlugs[0] ??
      null
    : null;

  return {
    ...loc,
    launchCounty,
    hubSlug,
    hubHref: launchCounty ? primaryHubPathForCounty(launchCounty) : null,
  };
}
