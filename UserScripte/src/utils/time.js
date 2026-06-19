export function parseCountdownMs(text) {
  const match = (text || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);

  if (third === null) return ((first * 60) + second) * 1000;
  return (((first * 60 * 60) + (second * 60) + third) * 1000);
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '-';
  if (ms <= 0) return 'jetzt';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
