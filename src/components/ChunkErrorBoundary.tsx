import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import ErrorPage from './ErrorPage';
import { isOffline, probeConnection, reportNetworkFailure, useOffline } from '../utils/netState';

/**
 * Sahifa bo'lagi (chunk) yuklanmay qolgan holatni ushlaydi.
 *
 * Nega kerak: sahifalar `lazy` bilan alohida fayllarga bo'lingan, fayl nomida
 * esa versiya xeshi bor (`index-D6RulgdV.js`). Yangi versiya chiqarilgach,
 * ochiq turgan eski oynadagi ilova hali eski nomlarni biladi — u fayl serverda
 * yo'q. Server 404 emas, `index.html` qaytarsa, brauzer HTML'ni JS deb o'qiy
 * olmay xato beradi va butun ilova oq ekranga aylanadi.
 *
 * Shu sababli bu yerda bo'lak xatosi alohida ajratiladi va sahifa bir marta
 * qayta yuklanadi — brauzer yangi `index.html` ni olib, to'g'ri nomlarni
 * biladi. Qayta yuklash faqat bir marta, tsiklga tushmasligi uchun.
 *
 * INTERNET YO'Q bo'lsa qayta yuklash befoyda (brauzerning o'z «sahifa yuklanmadi» oynasiga olib boradi):
 * bunda butun ekranli «Internet aloqasi yo'q» sahifasi chiqadi (`NetworkStatus`) va aloqa tiklanishi bilan sahifa o'zi
 * yangilanadi. Boshqa sabab bo'lsa — butun ekranli «Sahifani yuklab bo'lmadi» sahifasi (sidebar ko'rinmaydi).
 */

const RELOAD_FLAG = 'chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;

/** Bo'lak yuklanmagani haqidagi xato — brauzerlar turlicha ifodalaydi. */
function isChunkLoadError(error: Error): boolean {
  const text = `${error.name} ${error.message}`;
  return (
    /dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text) ||
    /error loading dynamically imported module/i.test(text) ||
    /ChunkLoadError/i.test(text) ||
    // Vite: `lazy` sahifaga bog'langan CSS fayli eski xesh bilan so'ralib,
    // yangi deploydan keyin 404 bo'lganda (`vite:preloadError`).
    /Unable to preload CSS/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    // HTML JS o'rniga kelganda parser shunday deydi.
    /Unexpected token '<'/i.test(text)
  );
}

function reloadPage() {
  sessionStorage.removeItem(RELOAD_FLAG);
  window.location.reload();
}

/** Xato sahifasi. Internet yo'q bo'lsa uni `NetworkStatus` ko'rsatadi — bu yerda faqat aloqa qaytishini kutamiz. */
function FailedView() {
  const offline = useOffline();
  const wasOffline = useRef(offline);

  useEffect(() => {
    if (offline) wasOffline.current = true;
    else if (wasOffline.current) reloadPage();
  }, [offline]);

  return offline ? null : <ErrorPage kind="failed" onRetry={reloadPage} />;
}

interface Props {
  children: ReactNode;
  /**
   * O'zgarganda xato holati tozalanadi. Odatda joriy manzil (`pathname`) beriladi:
   * bitta sahifa xato bergach, foydalanuvchi menyudan boshqa sahifaga o'tsa —
   * u endi xato ekranini ko'rmasdan, yangi sahifani ko'rsin.
   * (Aks holda chegara F5 bosilguncha "buzilgan" holatda qolib, butun ilovani
   * ishdan chiqargan ko'rinishga olib kelardi.)
   */
  resetKey?: string;
}

interface State {
  failed: boolean;
}

class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!isChunkLoadError(error)) {
      console.error('Sahifa xatosi:', error, info.componentStack);
      return;
    }

    // Internet yo'q — qayta yuklash befoyda; `NetworkStatus` sahifasi chiqadi, `FailedView` aloqa qaytishini kutadi.
    if (isOffline()) return;

    // Ketma-ket qayta yuklanib qolmaslik uchun oxirgi urinish vaqti eslanadi.
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) {
      console.error('Bo‘lak qayta yuklashdan keyin ham kelmadi:', error);
      return;
    }

    // Brauzer «online» desa ham internet bo'lmasligi mumkin (Wi-Fi bor, internet yo'q): avval aloqani tekshiramiz.
    void probeConnection().then((connected) => {
      if (!connected) {
        reportNetworkFailure(); // `NetworkStatus` butun ekranli «Internet yo'q» sahifasini ochadi
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <FailedView />;
  }
}

export default ChunkErrorBoundary;
