import { competitions } from '../src/competitions';

export function competitionIdFromPath(url: string): string | null {
  const idx = url.indexOf('pk.rgsu.net/');
  const tail = idx >= 0 ? url.slice(idx + 'pk.rgsu.net/'.length) : url;
  const parts = tail.split('/').filter(Boolean);
  const type = parts[0] || '';
  const id = parts.slice(1).join('/') || '';
  const found = competitions.find((c) => {
    const cIdx = c.url.indexOf('pk.rgsu.net/');
    const cTail = cIdx >= 0 ? c.url.slice(cIdx + 'pk.rgsu.net/'.length) : c.url;
    const cParts = cTail.split('/').filter(Boolean);
    return cParts[0] === type && cParts.slice(1).join('/') === id;
  });
  return found?.id ?? null;
}

export function competitionUrlFromTypeId(type: string, id: string): string | null {
  const found = competitions.find((c) => {
    const cIdx = c.url.indexOf('pk.rgsu.net/');
    const cTail = cIdx >= 0 ? c.url.slice(cIdx + 'pk.rgsu.net/'.length) : c.url;
    const cParts = cTail.split('/').filter(Boolean);
    return cParts[0] === type && cParts.slice(1).join('/') === id;
  });
  return found?.url ?? null;
}
