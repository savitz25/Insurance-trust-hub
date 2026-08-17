import { resolveDirectoryZip } from '../lib/directory/zip-geo';
import { looksLikeZip } from '../lib/tools/zip-resolve';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const boca = resolveDirectoryZip('33486');
assert(boca, '33486 should resolve');
assert(boca!.stateCode === 'FL', boca!.stateCode);
assert(boca!.countyName === 'Palm Beach', String(boca!.countyName));
assert(boca!.launchCounty?.id === 'palm_beach', String(boca!.launchCounty?.id));
assert(boca!.hubHref === '/hubs/florida/palm-beach-county', String(boca!.hubHref));
assert(looksLikeZip('33486'), 'looksLikeZip 33486');
assert(!looksLikeZip('BBS'), 'BBS is not a ZIP');

const mo = resolveDirectoryZip('64062');
assert(mo?.stateCode === 'MO', 'Lawson MO ZIP should stay MO');
assert(mo?.launchCounty == null, 'MO ZIP is not an FL launch county');

console.log('directory zip geo checks ok');
