import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock, passwordScore } from './passwordUtils';
import './PasswordKit.css';

/**
 * Parol oynalari/sahifasi uchun YAGONA ixcham dizayn — User, Admin va Student ilovalarida
 * aynan bir xil fayl. Maydonlar faqat ikonka + placeholder (alohida yorliq/izoh matni yo'q),
 * xato matni faqat xato bo'lganda chiqadi.
 */

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

/* ── Karta ── */
interface CardProps {
  /** Font Awesome ikonka (masalan `fa-key`). */
  icon?: string;
  title: string;
  /** Berilsa — o'ng tepada yopish tugmasi (oynada). */
  onClose?: () => void;
  /** Berilsa — chap tepada orqaga tugmasi. */
  onBack?: () => void;
  /** Sarlavha ostidagi kichik yashil belgi (masalan «SMS yuborildi»). */
  badge?: string;
  children: ReactNode;
}

export function PwdCard({ icon = 'fa-key', title, onClose, onBack, badge, children }: CardProps) {
  const { t } = useTranslation();
  return (
    <div className="pwd-card">
      {onBack && (
        <button type="button" className="pwd-back" aria-label={t('pwd.back')} onClick={onBack}>
          <i className="fa-solid fa-arrow-left" />
        </button>
      )}
      {onClose && (
        <button type="button" className="pwd-x" aria-label={t('pwd.close')} onClick={onClose}>
          <i className="fa-solid fa-xmark" />
        </button>
      )}
      <div className="pwd-head">
        <div className="pwd-icon" aria-hidden="true">
          <i className={`fa-solid ${icon}`} />
        </div>
        <h2 className="pwd-title">{title}</h2>
        {badge && (
          <span className="pwd-sent">
            <i className="fa-solid fa-circle-check" /> {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Maydon qobig'i (ikonka + xato) — ichiga istalgan input qo'yiladi ── */
interface FieldProps {
  icon: string;
  error?: string;
  valid?: boolean;
  locked?: boolean;
  /** Input o'ng tomonidagi element (masalan ko'z tugmasi). */
  trailing?: ReactNode;
  /** Xato matnidan keyin chiqadigan blok (masalan parol kuchi). */
  below?: ReactNode;
  children: ReactNode;
}

export function PwdField({ icon, error, valid, locked, trailing, below, children }: FieldProps) {
  return (
    <div className="pwd-field">
      <div className={cx('pwd-control', !!error && 'has-error', !!valid && 'is-valid', !!locked && 'is-locked')}>
        <i className={`fa-solid ${icon} pwd-control__icon`} aria-hidden="true" />
        {children}
        {trailing}
      </div>
      {error && (
        <p className="pwd-error" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      {below}
    </div>
  );
}

/* ── Oddiy matn / parol input (parol bo'lsa ko'z tugmasi bilan) ── */
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  icon: string;
  secret?: boolean;
  error?: string;
  valid?: boolean;
  locked?: boolean;
  below?: ReactNode;
};

export function PwdInput({ icon, secret, error, valid, locked, below, ...rest }: InputProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <PwdField
      icon={icon}
      error={error}
      valid={valid}
      locked={locked}
      below={below}
      trailing={
        secret ? (
          <button
            type="button"
            className="pwd-eye"
            tabIndex={-1}
            aria-label={t('pwd.toggle')}
            onClick={() => setShown((v) => !v)}
          >
            <i className={`fa-solid ${shown ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        ) : undefined
      }
    >
      <input
        {...rest}
        className="pwd-input"
        type={secret && !shown ? 'password' : 'text'}
        readOnly={locked || rest.readOnly}
        aria-invalid={!!error}
      />
    </PwdField>
  );
}

/* ── Parol kuchi: 4 ta ingichka chiziq (matnsiz) ── */
export function PwdStrength({ value }: { value: string }) {
  const score = passwordScore(value);
  if (!score) return null;
  return (
    <div className={`pwd-bars level-${score}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/* ── Asosiy tugma ── */
interface SubmitProps {
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  children: ReactNode;
}

export function PwdSubmit({ loading, disabled, icon = 'fa-check', children }: SubmitProps) {
  return (
    <button type="submit" className="pwd-btn" disabled={disabled || loading}>
      <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : icon}`} />
      {children}
    </button>
  );
}

/* ── SMS taymeri / «Qayta yuborish» ──
   Sanoq ketayotganda — faqat soat (matnsiz); tugagach yoki parol o'tmay qolsa — qayta yuborish tugmasi. */
interface ResendProps {
  /** Qolgan soniya (0 — sanoq yo'q yoki tugagan). */
  left: number;
  expired: boolean;
  loading?: boolean;
  error?: string;
  onResend: () => void;
}

export function PwdResend({ left, expired, loading, error, onResend }: ResendProps) {
  const { t } = useTranslation();
  return (
    <>
      {expired ? (
        <button type="button" className="pwd-resend" disabled={loading} onClick={onResend}>
          <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-rotate-right'}`} />
          {t('pwd.resend')}
        </button>
      ) : left > 0 ? (
        <div className="pwd-timer" role="timer">
          <i className="fa-regular fa-clock" /> {formatClock(left)}
        </div>
      ) : null}
      {error && (
        <p className="pwd-error" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
    </>
  );
}
