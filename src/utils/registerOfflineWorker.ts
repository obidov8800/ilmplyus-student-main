/**
 * `public/sw.js` ni ro'yxatdan o'tkazadi: internet yo'qligida sahifa o'rniga saytning o'z «Internet aloqasi yo'q»
 * sahifasi chiqadi (brauzerning «sahifa yuklanmadi» oynasi o'rniga). Faqat production'da (dev serverda kerak emas).
 * Birinchi tashrifda o'rnatiladi, keyingi tashriflardan boshlab ishlaydi.
 */
export function registerOfflineWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ro'yxatdan o'tmasa ilova baribir ishlayveradi
    });
  });
}
