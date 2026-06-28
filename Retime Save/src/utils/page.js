export function getCurrentVillageId() {
  return new URLSearchParams(location.search).get('village');
}

export function getCurrentScreen() {
  return new URLSearchParams(location.search).get('screen') || '';
}

export function hasMode() {
  return new URLSearchParams(location.search).has('mode');
}

export function buildPlaceUrl(villageId) {
  const params = new URLSearchParams();
  if (villageId) params.set('village', villageId);
  params.set('screen', 'place');
  return `${location.origin}${location.pathname}?${params.toString()}`;
}
