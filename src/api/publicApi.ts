import axios from 'axios';
import { API_BASE_URL } from './baseUrl';

/**
 * Auth talab qilmaydigan (ochiq) so'rovlar uchun alohida axios nusxasi —
 * `api.ts`dagi asosiy `API`dan farqli, bu yerga token (hatto eskirgan/yaroqsiz
 * bo'lsa ham) hech qachon qo'shilmaydi. Shartnoma tasdiqlash sahifasi
 * (`/contract/:hash`) kabi login talab qilmaydigan ochiq sahifalar shundan
 * foydalanadi.
 */
export const publicAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
