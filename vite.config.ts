import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadBackend } from '../_shared/backend';

/**
 * BACKEND MANZILI — butun loyiha uchun BITTA joyda: `D:\ilmplyus\backend.env`
 * (`BACKEND_URL`). Bu yerda, `public/.htaccess`da, `.env`da yoki kodda manzil
 * YOZILMAYDI — hammasi shu yerdan olinadi. Batafsil: `D:\ilmplyus\BACKEND-MANZILI.md`.
 */
const backend = loadBackend(__dirname);

/**
 * Backend manzilini `backend.env`dan qo'llaydi:
 *  • dev — fayl o'zgarsa server O'ZI qayta ishga tushadi (proksi yangi manzilni oladi);
 *  • build — `dist/.htaccess`dagi `/api` va `/storage` qoidalariga manzilni yozadi
 *    (+ deploy skriptlari o'qiydigan `dist/.htbackend` belgisi).
 */
function backendPlugin(): Plugin {
  let outDir = '';
  return {
    name: 'ilmplyus-backend',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      const onFile = (file: string) => {
        if (!backend.isBackendFile(file)) return;
        server.config.logger.info('\x1b[36m[backend]\x1b[0m backend.env o‘zgardi — server qayta ishga tushmoqda…');
        void server.restart();
      };
      server.watcher.add(backend.file);
      server.watcher.on('change', onFile);
      server.watcher.on('add', onFile);
    },
    writeBundle() {
      backend.stamp(outDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), backendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      /*
       * DEV proxy — `/api` va `/storage` so'rovlari Vite dev serverining
       * o'ziga ketadi, u esa backendga (`backend.env`dagi `BACKEND_URL`)
       * SERVER TOMONIDAN uzatadi. Production'da xuddi shu vazifani Apache
       * bajaradi (`dist/.htaccess`, build paytida shu YAGONA manzildan
       * yoziladi). Kod esa doim nisbiy `/api` ga murojaat qiladi
       * (`src/api/baseUrl.ts`).
       *
       * Natija: brauzer (DevTools > Network) faqat shu saytning o'z domenini
       * ko'radi, backend manzili tashqariga chiqmaydi; CORS ham kerak emas
       * (so'rov bir xil origin ichida qoladi).
       */
      ...backend.proxy,
    },
  },
});
