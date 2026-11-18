import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { netText } from '../utils/netText';
import { ERROR_ACCENT, ERROR_ART } from './errorArt';
import logoUrl from '../assets/images/logo.svg';
import './ErrorPage.css';

interface ErrorPageProps {
  kind: 'offline' | 'failed';
  /**
   * «Qayta urinish». `true`/`false` qaytarsa — tekshiruv natijasi (`false` = hali ham tiklanmagan, sahifada eslatma chiqadi);
   * hech narsa qaytarmasa (masalan sahifani qayta yuklash) — oddiy tugma.
   */
  onRetry: () => void | boolean | Promise<void | boolean>;
}

/**
 * Butun ekranli xato sahifasi (modal emas): sidebar va header ustidan to'liq yopadi, `errors/*.html` bilan BIR XIL
 * ko'rinishda (CSS — `page.css`, rasmlar — `art.mjs`). `body` ga chiziladi — qaysi joyda (Layout ichida ham) ishlatilsa
 * ham yon menyu ko'rinmaydi.
 */
export default function ErrorPage({ kind, onRetry }: ErrorPageProps) {
  const text = netText();
  const offline = kind === 'offline';
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  const retry = async () => {
    setChecking(true);
    setStillOffline(false);
    try {
      const result = await onRetry();
      if (result === false) setStillOffline(true);
    } finally {
      setChecking(false);
    }
  };

  return createPortal(
    <div className="net-page" style={{ '--np-accent-rgb': ERROR_ACCENT[kind] } as CSSProperties} role="alert">
      <div className="np-art">
        <div className="np-brand">
          <span className="np-logo">
            <img src={logoUrl} alt="" />
          </span>
          <span>
            <b>ILM PLYUS</b>
          </span>
        </div>
        <div className="np-illus" aria-hidden="true">
          <svg viewBox="0 0 240 240" dangerouslySetInnerHTML={{ __html: ERROR_ART[kind] }} />
        </div>
      </div>
      <div className="np-main">
        <div className="np-badge">
          <i />
          <span>{offline ? text.badgeOffline : text.badgeFailed}</span>
        </div>
        <h1>{offline ? text.offlineTitle : text.failedTitle}</h1>
        <p>{offline ? text.offlineMessage : text.failedMessage}</p>
        <div className="np-actions">
          <button type="button" className="net-btn net-btn--main" disabled={checking} onClick={retry}>
            {checking ? text.checking : text.retry}
          </button>
          {!offline && (
            <a className="net-btn net-btn--ghost" href="/">
              {text.home}
            </a>
          )}
        </div>
        {(offline || stillOffline) && (
          <div className="np-status">
            {offline && <span className="np-pulse" />}
            <span>{stillOffline ? text.stillOffline : text.waiting}</span>
          </div>
        )}
        <div className="np-foot">© ILM PLYUS</div>
      </div>
    </div>,
    document.body,
  );
}
