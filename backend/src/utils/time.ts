export function timeToSeconds(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') return Number.POSITIVE_INFINITY;
  const cleaned = value.trim();
  if (!cleaned) return Number.POSITIVE_INFINITY;

  const colonMatch = /^(\d+)\s*[:.,]\s*(\d+)$/.exec(cleaned);
  if (colonMatch) {
    const mins = Number(colonMatch[1]);
    const rawSecs = colonMatch[2];
    const secs = Number(rawSecs);
    if (Number.isFinite(mins) && Number.isFinite(secs)) {
      return mins * 60 + secs;
    }
  }

  const hmsMatch = /^(\d+)\s*[:.]\s*(\d+)\s*[:.]\s*(\d+)$/.exec(cleaned);
  if (hmsMatch) {
    const hours = Number(hmsMatch[1]);
    const mins = Number(hmsMatch[2]);
    const secs = Number(hmsMatch[3]);
    if (Number.isFinite(hours) && Number.isFinite(mins) && Number.isFinite(secs)) {
      return hours * 3600 + mins * 60 + secs;
    }
  }

  const num = Number(cleaned);
  if (Number.isFinite(num) && num >= 0) {
    return num;
  }

  return Number.POSITIVE_INFINITY;
}

export function secondsToTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}