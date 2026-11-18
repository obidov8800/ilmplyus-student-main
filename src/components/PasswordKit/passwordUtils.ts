interface ApiErrorShape {
  message?: string;
  errors?: Record<string, string[]>;
}

/** Muayyan maydon uchun backend xatosi (masalan `errors.phone[0]`). */
export function getFieldError(err: unknown, field: string): string {
  const data = (err as { response?: { data?: ApiErrorShape } })?.response?.data;
  return data?.errors?.[field]?.[0] ?? '';
}

/** Umumiy xato — birinchi maydon xatosi, bo'lmasa `message`, bo'lmasa zaxira matn. */
export function getGeneralError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: ApiErrorShape } })?.response?.data;
  const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstFieldError || data?.message || fallback;
}

/** 0 — bo'sh, 1…4 — zaif → kuchli (faqat ko'rsatish uchun). */
export function passwordScore(value: string): number {
  if (!value) return 0;
  if (value.length < 6) return 1;
  let score = 2;
  if (value.length >= 10) score += 1;
  if (/[a-zA-Z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value) && score < 4) score += 1;
  return Math.min(score, 4);
}

/**
 * SMS'dagi havola `…/set-password?username=…#p=KOD` ko'rinishida keladi — vaqtinchalik parol
 * fragmentda (`#`), shuning uchun serverga ketmaydi va access-log'ga tushmaydi.
 */
export function readSmsCodeFromHash(): string {
  const match = /(?:^#|&)p=([^&]+)/.exec(window.location.hash);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return '';
  }
}

/** Kod o'qilgach manzil satrida/tarixda qolmasin. */
export function clearHash(): void {
  if (!window.location.hash) return;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
}

/** 125 → «2:05». */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
