export function cleanTimeInput(val: string, prevVal?: string): string {
  const cleaned = val.replace(/[.,]/g, ':').replace(/[^0-9:]/g, '');

  if (prevVal && prevVal.includes(':') && !cleaned.includes(':') && cleaned.length === 2) {
    return cleaned.slice(0, 1);
  }

  const colonIndex = cleaned.indexOf(':');
  if (colonIndex === -1) {
    if (cleaned.length === 2) {
      return `${cleaned}:`;
    }
    if (cleaned.length > 2) {
      const mins = cleaned.slice(0, 2);
      const secs = cleaned.slice(2, 4);
      return `${mins}:${secs}`;
    }
    return cleaned.slice(0, 4);
  }

  const mins = colonIndex === 0 ? '0' : cleaned.slice(0, colonIndex).slice(0, 2);
  const secs = cleaned.slice(colonIndex + 1).replace(/:/g, '').slice(0, 2);
  return `${mins}:${secs}`;
}

export function normalizeTimeOnBlur(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (trimmed.includes(':')) {
    const [m, s = ''] = trimmed.split(':');
    const mins = Number(m) || 0;
    const rawSecs = s.length === 1 ? Number(s.padStart(2, '0')) : (Number(s) || 0);
    const totalSecs = mins * 60 + rawSecs;
    const finalMins = Math.floor(totalSecs / 60);
    const finalSecs = totalSecs % 60;
    return `${finalMins}:${String(finalSecs).padStart(2, '0')}`;
  }
  const num = Number(trimmed);
  if (Number.isFinite(num) && num >= 0) {
    if (trimmed.length <= 2) {
      return `${num}:00`;
    }
    const mins = Math.floor(num / 100);
    const secs = num % 100;
    const totalSecs = mins * 60 + secs;
    const finalMins = Math.floor(totalSecs / 60);
    const finalSecs = totalSecs % 60;
    return `${finalMins}:${String(finalSecs).padStart(2, '0')}`;
  }
  return '';
}