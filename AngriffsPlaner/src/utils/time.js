export function getServerNow() {
  const timingNow = Number(window.Timing?.getCurrentServerTime?.());
  if (Number.isFinite(timingNow) && timingNow > 0) {
    return timingNow < 1000000000000 ? timingNow * 1000 : timingNow;
  }
  return Date.now();
}

export function parseServerTime(value) {
  const text = stripHtml(value)
    .replace(/\s+/g, ' ')
    .trim();

  const isoMatch = text.match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
  );
  if (isoMatch) return buildLocalTime(isoMatch);

  const deMatch = text.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
  );
  if (deMatch) {
    return buildDate(
      Number(deMatch[3]),
      Number(deMatch[2]),
      Number(deMatch[1]),
      Number(deMatch[4]),
      Number(deMatch[5]),
      Number(deMatch[6]),
      deMatch[7]
    );
  }

  return null;
}

export function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '-';

  const date = new Date(timestamp);
  const pad = value => String(value).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
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

function buildLocalTime(match) {
  return buildDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    match[7]
  );
}

function buildDate(year, month, day, hour, minute, second, millisecondText) {
  const millisecond = Number(String(millisecondText || '0').padEnd(3, '0'));
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond);

  const exact = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute
    && date.getSeconds() === second;

  return exact ? date.getTime() : null;
}

function stripHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = String(value || '');
  return template.content.textContent || '';
}
