export function readCurrentPage() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen') || '';
  const mode = params.get('mode') || '';

  return {
    name: getPageName(screen, mode),
    screen,
    mode,
    villageId: params.get('village')
  };
}

function getPageName(screen, mode) {
  if (screen === 'place' && mode === 'scavenge') return 'Raubzuege';
  if (screen === 'barracks') return 'Kaserne';
  if (screen === 'stable') return 'Stall';
  if (screen === 'main') return 'Hauptgebaeude';
  if (screen === 'overview_villages') return 'Uebersicht';
  return 'Andere';
}
