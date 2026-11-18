import { useEffect } from 'react';
import ErrorPage from './ErrorPage';
import { probeConnection, reportNetworkOk, useOffline } from '../utils/netState';

/**
 * Internet yo'q bo'lsa — butun ekranli «Internet aloqasi yo'q» sahifasi (modal/banner emas, sidebar ko'rinmaydi).
 * Ostidagi ilova joyida qoladi (holati yo'qolmaydi): aloqa tiklanishi bilan sahifa o'zi yo'qoladi va ish davom etadi.
 * Internet yo'q paytda har 5 soniyada aloqa tekshirib turiladi; «Qayta urinish» tugmasi ham darhol tekshiradi.
 */
export default function NetworkStatus() {
  const offline = useOffline();

  useEffect(() => {
    if (!offline) return;
    const timer = window.setInterval(() => {
      void probeConnection().then((ok) => ok && reportNetworkOk());
    }, 5000);
    return () => window.clearInterval(timer);
  }, [offline]);

  if (!offline) return null;
  return (
    <ErrorPage
      kind="offline"
      onRetry={async () => {
        const ok = await probeConnection();
        if (ok) reportNetworkOk();
        return ok;
      }}
    />
  );
}
