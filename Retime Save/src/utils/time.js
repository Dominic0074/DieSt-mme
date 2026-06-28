export function getServerNow() {
  const timingNow = Number(window.Timing?.getCurrentServerTime?.());
  if (Number.isFinite(timingNow) && timingNow > 0) {
    return timingNow < 1000000000000 ? timingNow * 1000 : timingNow;
  }
  return Date.now();
}

export function parseServerTime(value) {
  const match = String(value).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/
  );
  if (!match) return null;

  const parts = match.slice(1, 7).map(Number);
  const milliseconds = Number(String(match[7] || '0').padEnd(3, '0'));
  const date = new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5],
    milliseconds
  );

  const isExactDate = date.getFullYear() === parts[0]
    && date.getMonth() === parts[1] - 1
    && date.getDate() === parts[2]
    && date.getHours() === parts[3]
    && date.getMinutes() === parts[4]
    && date.getSeconds() === parts[5];

  return isExactDate ? date.getTime() : null;
}

export function formatRemaining(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(restSeconds).padStart(2, '0')
  ].join(':');
}
