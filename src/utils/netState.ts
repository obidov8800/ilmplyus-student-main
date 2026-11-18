import { useSyncExternalStore } from 'react';

/**
 * «Internet bormi?» holati — butun ilova uchun bitta joyda.
 *
 * Faqat `navigator.onLine` ga ishonib bo'lmaydi: Wi-Fi'ga ulangan, lekin internet yo'q bo'lsa u `true` qoladi.
 * Shu sabab ikkinchi belgi bor: API so'rovi tarmoq xatosi bilan tugasa (javob umuman kelmasa) `reportNetworkFailure()`,
 * biror so'rov muvaffaqiyatli bo'lsa `reportNetworkOk()` chaqiriladi (`api/api.ts` interceptor'lari).
 * Offline holatida `probeConnection()` bilan aloqa tiklanganini tekshirib turiladi.
 */
let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
let unreachable = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    browserOnline = true;
    emit();
  });
  window.addEventListener('offline', () => {
    browserOnline = false;
    emit();
  });
}

export const isOffline = (): boolean => !browserOnline || unreachable;

export function reportNetworkFailure(): void {
  if (unreachable) return;
  unreachable = true;
  emit();
}

let confirming = false;

/**
 * API so'rovi tarmoq xatosi bilan tugaganda chaqiriladi. Bitta so'rovning uzilishi «internet yo'q» degani emas —
 * shu sabab avval saytning o'ziga kichik so'rov bilan tekshiriladi; u ham o'tmasagina offline holati yoqiladi.
 */
export function confirmNetworkFailure(): void {
  if (unreachable || confirming) return;
  confirming = true;
  void probeConnection()
    .then((connected) => {
      if (!connected) reportNetworkFailure();
    })
    .finally(() => {
      confirming = false;
    });
}

export function reportNetworkOk(): void {
  if (!unreachable && browserOnline) return;
  unreachable = false;
  browserOnline = true;
  emit();
}

export const subscribeNet = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Internet yo'q (yoki server umuman javob bermayapti) bo'lsa `true`. */
export function useOffline(): boolean {
  return useSyncExternalStore(subscribeNet, isOffline, () => false);
}

/**
 * Saytning o'ziga kichik so'rov: javob kelsa aloqa bor. `offline.html` — har bir ilovada (public/) bor, juda yengil,
 * keshlanmaydi (`cache: 'no-store'` + vaqt belgisi).
 */
export async function probeConnection(): Promise<boolean> {
  try {
    const res = await fetch(`/offline.html?ts=${Date.now()}`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
