/**
 * Backend manzili BU YERDA EMAS — ilova backendga doim shu saytning O'Z domeni
 * orqali (`/api/...`, `/storage/...`) murojaat qiladi. Uni backendga uzatadi:
 *   • dev'da — Vite proksi (`vite.config.ts`),
 *   • production'da — Apache (`dist/.htaccess`).
 * Ikkalasi ham manzilni BITTA joydan oladi: `D:\ilmplyus\backend.env`
 * (`BACKEND_URL`). Backendni almashtirish uchun faqat shu faylni o'zgartiring
 * (batafsil: `D:\ilmplyus\BACKEND-MANZILI.md`).
 *
 * Shu sabab `.env`da `VITE_API_BASE_URL` kerak emas va o'qilmaydi — uni
 * absolyut manzilga (`https://...`) o'zgartirish barcha so'rovlarni buzgan edi.
 */
export const API_BASE_URL = '/api';

/** Yuklangan fayllar (`/storage/...`) ham shu domendan beriladi — shuning uchun prefiks bo'sh. */
export const FILE_BASE_URL = '';
