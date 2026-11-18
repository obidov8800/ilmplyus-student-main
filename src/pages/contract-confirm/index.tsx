import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { publicAPI } from '@/api/publicApi';
import { formatDate } from '@/utils/date';
import {
  buildStatusBlockHTML,
  buildTemplateData,
  printFromDocxTemplate,
  type ContractTemplateData,
  type ContractStatusBlockData,
} from '@/utils/contractPdf';
import { buildPreschoolDocData } from '@/utils/preschoolContractData';
import { PreschoolContractDocument } from '@/utils/preschoolContractDocument';
import { printPreschoolContract } from '@/utils/preschoolContractPrint';
import { ContractLegalText, type ContractType } from './legalTexts';
import './contractConfirm.css';

// Xuddi admin panelning shartnoma yuklash/chop etish oynasidagi (`ContractPrintModal.tsx`)
// bilan bir xil 4 ta shablon va tanlash mantig'i — foydalanuvchi shu ochiq
// sahifadan ham asl Word shartnomasini (to'ldirilgan holda) yuklab olishi shart.
import adultTemplate from '@/assets/documents/01. ILM Шартнома умумий (ўқувчи).docx?url';
import minorTemplate from '@/assets/documents/02_ILM_Шартнома_икки_томонлама_вакил+ўқувчи.docx?url';
import legalBilateralTemplate from '@/assets/documents/03_ILM_Шартнома_икки_томонлама_юридик_шахс+ўқувчи.docx?url';
import legalTrilateralTemplate from '@/assets/documents/04_ILM_Шартнома_уч_томонлама_юридик_шахс+вакил+ўқувчи.docx?url';

const getContractTemplateUrl = (contractType: string): string => {
  switch (contractType) {
    case 'minor':
      return minorTemplate;
    case 'legal_bilateral':
      return legalBilateralTemplate;
    case 'legal_trilateral':
      return legalTrilateralTemplate;
    default:
      return adultTemplate;
  }
};

/**
 * Pul summasi — butun son, minglik ajratkichi **nuqta**, o'nlik qismisiz
 * (backend spec, 6-bo'lim). Admin panelning docx eksportida ishlatiladigan
 * `uz-UZ` formatlash (bo'sh joy bilan ajratadi) bilan ataylab bir xil emas —
 * bu sahifa uchun aniq nuqta talab qilingan.
 */
const formatMoneyDot = (val: number | string | null | undefined): string => {
  const n = Number(val);
  if (val === null || val === undefined || val === '' || Number.isNaN(n)) return '______';
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Shartnoma matnida bo'sh/noma'lum qiymatlar uchun blade konvensiyasi —
 * pastki chiziqlar (`______`). `buildTemplateData` yetishmagan maydonlarni
 * `'—'` bilan to'ldiradi (admin PDF/Word eksporti uchun mos), shu sabab bu
 * sahifada ko'rsatishdan oldin qayta almashtiriladi.
 */
function blankify<T>(value: T): T {
  if (typeof value === 'string') {
    return (value === '—' ? '______' : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => blankify(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = blankify(v);
    }
    return out as T;
  }
  return value;
}

interface CardData {
  id: string;
  date: string;
  phone: string;
  name: string;
  org: string;
  status: 'sent' | 'confirmed';
  status_text: string;
}

interface ComputedBlock {
  is_adult: boolean;
  is_minor: boolean;
  is_legal: boolean;
  payer_label: string;
  total_price: number;
  monthly_price: number;
  show_card: boolean;
  show_otp: boolean;
  card: CardData | null;
}

const StatusCard = ({ card }: { card: CardData }) => (
  <div className={`cc-status-card cc-status-card--${card.status}`}>
    <div className="cc-status-card-top">
      <span>O‘QUVCHI</span>
      <span className="cc-status-card-date">{card.date}</span>
    </div>
    <div className="cc-status-card-status">{card.status_text}</div>
    <div className="cc-status-card-divider" />
    <div className="cc-status-card-bottom">
      <span className="cc-status-card-name">{card.name}</span>
      <span>{card.phone}</span>
      <span>{card.org}</span>
    </div>
  </div>
);

/**
 * Tashkilot tomoni: shartnoma direktor nomidan yaratilib, o'quvchiga
 * yuborilgan payt uning o'zi allaqachon imzolagan hisoblanadi (didox.uz'dagi
 * ikki tomonlama tasdiqlash ko'rinishiga o'xshab, faqat operator o'rniga
 * tashkilot direktori ko'rsatiladi) — lekin bu hali o'quvchi tomonidan
 * TASDIQLANGANI degani emas, shuning uchun status "YUBORILGAN" deb chiqadi.
 */
const OrgStatusCard = ({
  branch,
  date,
}: {
  branch: { legal_name?: string; name_uz?: string; director_name?: string } | undefined;
  date: string;
}) => (
  <div className="cc-status-card cc-status-card--sent">
    <div className="cc-status-card-top">
      <span>O‘QUV MARKAZI</span>
      <span className="cc-status-card-date">{date}</span>
    </div>
    <div className="cc-status-card-status">YUBORILGAN</div>
    <div className="cc-status-card-divider" />
    <div className="cc-status-card-bottom">
      <span className="cc-status-card-name">
        Direktor: {branch?.director_name || '—'}
      </span>
      <span>{branch?.legal_name || branch?.name_uz}</span>
    </div>
  </div>
);

const OtpModal = ({
  phone,
  onVerify,
  onClose,
  isPending,
  onResend,
  resendPending,
}: {
  phone: string;
  onVerify: (code: string) => void;
  onClose: () => void;
  isPending: boolean;
  onResend: () => void;
  resendPending: boolean;
}) => {
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(120);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleResend = () => {
    setTimer(120);
    setCode('');
    onResend();
  };

  const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
  const seconds = String(timer % 60).padStart(2, '0');

  return (
    <div className="cc-modal-overlay">
      <div className="cc-modal">
        <button className="cc-modal-close" onClick={onClose} type="button">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="cc-modal-icon">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h2 className="cc-modal-title">SMS tasdiqlash</h2>
        <p className="cc-modal-desc">
          <span>{phone}</span> raqamiga SMS kod yuborildi. Kodni kiriting:
        </p>
        <input
          className="cc-otp-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="_ _ _ _ _ _"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        {timer > 0 ? (
          <p className="cc-timer">
            Kod {minutes}:{seconds} da eskiradi
          </p>
        ) : (
          <button
            className="cc-resend-btn"
            onClick={handleResend}
            disabled={resendPending}
            type="button"
          >
            {resendPending ? 'Yuborilmoqda...' : 'Kodni qayta yuborish'}
          </button>
        )}
        <div className="cc-modal-actions">
          <button className="cc-btn-cancel" onClick={onClose} type="button">
            Bekor qilish
          </button>
          <button
            className="cc-btn-confirm"
            onClick={() => onVerify(code)}
            disabled={code.length !== 6 || isPending}
            type="button"
          >
            {isPending ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CancelModal = ({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) => (
  <div className="cc-modal-overlay">
    <div className="cc-modal">
      <div className="cc-modal-icon" style={{ background: '#fff1f0', color: '#ef4444' }}>
        <i className="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h2 className="cc-modal-title">Shartnomani bekor qilish</h2>
      <p className="cc-modal-desc">
        Shartnomani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.
      </p>
      <div className="cc-modal-actions">
        <button className="cc-btn-cancel" onClick={onClose} type="button">
          Yo‘q
        </button>
        <button className="cc-btn-danger" onClick={onConfirm} disabled={isPending} type="button">
          {isPending ? 'Bekor qilinmoqda...' : 'Ha, bekor qilish'}
        </button>
      </div>
    </div>
  </div>
);

interface Credential {
  username: string;
  student_id: number;
}

/** Backenddan kelgan xato javobidan foydalanuvchiga ko'rsatiladigan matnni oladi. */
const errorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response
    ?.data;
  return data?.error || data?.message || fallback;
};

const ContractConfirmPage = () => {
  const { hash } = useParams<{ hash: string }>();
  const [checked, setChecked] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-contract', hash],
    queryFn: () => publicAPI.get(`/contracts/public/${hash}`).then((r) => r.data),
    enabled: !!hash,
    retry: false,
  });

  const contract = data?.contract || data?.data || data;
  const computed: ComputedBlock | undefined = data?.computed;
  const statusLabel: string | undefined = data?.status_label;

  // Shartnoma matnini to'ldirish uchun ma'lumot — xuddi admin panel PDF/Word
  // eksportida ishlatiladigan `buildTemplateData` (bir xil `contract` shakli,
  // 3-bo'lim). Pul maydonlari bu yerda spec talab qilgan nuqtali formatga
  // qayta o'giriladi, bo'sh qiymatlar esa `______` bilan almashtiriladi.
  const templateData: ContractTemplateData | null = useMemo(() => {
    if (!contract) return null;
    const base = buildTemplateData(contract);
    const students = contract.contract_students || [];
    const withDotMoney: ContractTemplateData = {
      ...base,
      total_price: formatMoneyDot(computed?.total_price ?? base.total_price),
      monthly_price: formatMoneyDot(computed?.monthly_price ?? base.monthly_price),
      students: base.students.map((s, i) => ({
        ...s,
        s_monthly_price: formatMoneyDot(students[i]?.monthly_price),
        s_total_price: formatMoneyDot(students[i]?.total_price),
      })),
    };
    return blankify(withDotMoney);
  }, [contract, computed]);

  // Maktabga tayyorlov (Parvoz) shartnomasi — alohida matn (namunadagi shartnoma): oylik to'lov summasi, tashkilot
  // rekvizitlari filialdan, muddat nomuayyan. Boshqa turlar (docx shablonlar) bundan tashqari.
  const isPreschool = contract?.contract_type === 'preschool';
  const preschoolDoc = useMemo(
    () => (contract && contract.contract_type === 'preschool' ? buildPreschoolDocData(contract) : null),
    [contract],
  );

  const sendOtpMutation = useMutation({
    mutationFn: () => publicAPI.post(`/contracts/public/${hash}/otp`),
    onSuccess: () => {
      setShowOtpModal(true);
    },
    onError: (err) => {
      notifications.show({
        title: 'Xatolik',
        message: errorMessage(err, 'Kod yuborilmadi. Birozdan so‘ng qayta urinib ko‘ring.'),
        color: 'red',
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (code: string) =>
      publicAPI.post(`/contracts/public/${hash}/verify`, { otp_code: code }),
    onSuccess: (res) => {
      setShowOtpModal(false);
      setCredentials(res.data?.credentials || []);
      setResult('confirmed');
    },
    onError: (err) => {
      notifications.show({
        title: 'Xatolik',
        message: errorMessage(err, 'Kod noto‘g‘ri yoki muddati tugagan.'),
        color: 'red',
      });
    },
  });

  const handleTasdiqlash = () => {
    sendOtpMutation.mutate();
  };

  const handleBekorQilish = () => {
    setShowCancelConfirm(true);
  };

  // Shartnomani asl Word shablonida (to'ldirilgan holda) yuklab olish —
  // tasdiqlashdan oldin ham, keyin ham ishlaydi (imzolashdan oldin diqqat
  // bilan o'qib chiqish, imzolagandan keyin esa o'ziga nusxa saqlab qo'yish
  // uchun). Xuddi admin paneldagi `ContractPrintModal`dagi bilan bir xil
  // mexanizm: brauzerning "Chop etish → PDF saqlash" oynasi ochiladi.
  const handleDownload = async () => {
    if (!contract || !templateData) return;
    setDownloadLoading(true);
    try {
      if (isPreschool) {
        // Tasdiqlash kartalari boshqa turlardagi kabi hujjat oxiriga qo'shiladi (yuborilgan/tasdiqlangan holat).
        await printPreschoolContract(contract, {
          extraHtml:
            computed?.show_card && computed.card
              ? buildStatusBlockHTML({
                  orgName: branch?.legal_name || branch?.name_uz || '—',
                  orgDirector: branch?.director_name || '—',
                  date: computed.card.date,
                  studentName: computed.card.name,
                  studentPhone: computed.card.phone,
                  studentOrg: computed.card.org,
                  studentStatus: computed.card.status,
                  studentStatusText: computed.card.status_text,
                })
              : undefined,
        });
        return;
      }
      const templateUrl = getContractTemplateUrl(contract.contract_type || 'adult');
      // Ekrandagi status-kartalar (4-bo'lim, `computed.show_card`) faqat
      // shartnoma haqiqatan yuborilgan/tasdiqlangandan keyin ko'rinadi — PDF
      // ham aynan shu holatdagina, aynan shu ma'lumot bilan qo'shimcha
      // sahifa oladi (hali yuborilmagan holatda avvalgidek faqat matn).
      const statusBlock: ContractStatusBlockData | undefined =
        computed?.show_card && computed.card
          ? {
              orgName: branch?.legal_name || branch?.name_uz || '—',
              orgDirector: branch?.director_name || '—',
              date: computed.card.date,
              studentName: computed.card.name,
              studentPhone: computed.card.phone,
              studentOrg: computed.card.org,
              studentStatus: computed.card.status,
              studentStatusText: computed.card.status_text,
            }
          : undefined;
      await printFromDocxTemplate(
        templateUrl,
        templateData,
        contract.contract_number || hash || '',
        'pdf',
        statusBlock,
      );
    } catch (err) {
      console.error('Shartnomani yuklashda xatolik:', err);
      notifications.show({
        title: 'Xatolik',
        message: 'Shartnomani yuklab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.',
        color: 'red',
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cc-wrapper">
        <div className="cc-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  if (isError || !contract || !templateData) {
    return (
      <div className="cc-wrapper">
        <div className="cc-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <h2>Shartnoma topilmadi</h2>
          <p>Havola noto‘g‘ri yoki muddati o‘tgan bo‘lishi mumkin.</p>
        </div>
      </div>
    );
  }

  if (result === 'confirmed') {
    return (
      <div className="cc-wrapper">
        <div className="cc-result confirmed">
          <i className="fa-solid fa-circle-check"></i>
          <h2>Shartnoma tasdiqlandi!</h2>
          <p>Shartnoma muvaffaqiyatli imzolandi. Login va parol SMS orqali yuborildi.</p>
          {credentials.length > 0 && (
            <div className="cc-credentials">
              <p className="cc-credentials-title">
                <i className="fa-solid fa-key"></i> Login ma'lumotlari SMS orqali yuborildi
              </p>
              {credentials.map((c) => (
                <div key={c.student_id} className="cc-credential-item">
                  <span>Login:</span>
                  <strong>{c.username}</strong>
                </div>
              ))}
            </div>
          )}
          <button
            className="cc-btn-download"
            onClick={handleDownload}
            disabled={downloadLoading}
            type="button"
          >
            {downloadLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-download"></i>
            )}
            Shartnomani yuklab olish
          </button>
        </div>
      </div>
    );
  }

  if (result === 'cancelled') {
    return (
      <div className="cc-wrapper">
        <div className="cc-result cancelled">
          <i className="fa-solid fa-circle-xmark"></i>
          <h2>Shartnoma rad etildi</h2>
          <p>Siz shartnomani rad etdingiz. Savollar bo‘lsa o‘quv markazi bilan bog'laning.</p>
        </div>
      </div>
    );
  }

  const student = contract.contract_students?.[0];
  const branch = contract.branch;
  const contractType: ContractType = contract.contract_type || 'adult';
  const showFooter = !!computed?.show_otp;
  // Tasdiqlash kodi vakilli shartnomalarda (minor, maktabga tayyorlov) VAKIL telefoniga ketadi (backend `getMainPhone`) —
  // oynada ham shu raqam ko'rsatilsin (ilgari o'quvchi/bolaning telefoni chiqardi, u bo'sh bo'lishi mumkin).
  const representativePhone: string =
    contract.representatives?.[0]?.phone || contract.representative?.phone || '';
  const otpPhone =
    contractType === 'minor' || isPreschool
      ? representativePhone || student?.phone || ''
      : student?.phone || '';

  return (
    <div className="cc-wrapper">
      <div className="cc-page">
        {/* Header */}
        <div className="cc-header">
          <div className="cc-header-logo">
            <i className="fa-solid fa-graduation-cap"></i>
            <span>{branch?.legal_name || branch?.name_uz || 'o‘quv markazi'}</span>
          </div>
          <div className="cc-header-contract">
            <span className="cc-contract-number">{contract.contract_number}</span>
            <span className="cc-contract-date">{formatDate(contract.contract_date)}</span>
          </div>
        </div>

        <div className="cc-title">
          <h1>O‘QUVCHI BILAN SHARTNOMA</h1>
          <p className="cc-subtitle">Ushbu shartnomani diqqat bilan o‘qib chiqing va tasdiqlang</p>
          {statusLabel && <p className="cc-status-label">Holat: {statusLabel}</p>}
          <button
            className="cc-btn-download cc-btn-download--top"
            onClick={handleDownload}
            disabled={downloadLoading}
            type="button"
          >
            {downloadLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-download"></i>
            )}
            Shartnomani yuklab olish
          </button>
        </div>

        {/* Tashkilot, o'quvchi va kurs ma'lumotlari bu yerda ATAYIN yo'q —
            ular pastdagi "Shartnoma matni"ning o'zida (1-bo'lim — kurs,
            8-bo'lim — tomonlarning manzillari va imzolari) allaqachon bor,
            shu sahifa endi haqiqiy PDF/Word hujjatiga imkon qadar yaqin,
            faqat matn — ustidan qo'shimcha karta ko'rinishlari yo'q. */}

        {/* Notes */}
        {contract.notes && (
          <div className="cc-section">
            <div className="cc-section-title">
              <i className="fa-solid fa-circle-info"></i> Qo‘shimcha izoh
            </div>
            <p className="cc-notes">{contract.notes}</p>
          </div>
        )}

        {/* Shartnoma matni — huquqiy band, so'zma-so'z (7-bo'lim) */}
        <div className="cc-section cc-section--legal">
          <div className="cc-section-title">
            <i className="fa-solid fa-file-contract"></i> Shartnoma matni
          </div>
          {isPreschool && preschoolDoc ? (
            <PreschoolContractDocument data={preschoolDoc} />
          ) : (
            <ContractLegalText contractType={contractType} data={templateData} />
          )}
        </div>

        {/* Status-kartalar (4-bo'lim) — ikkala tomon: tashkilot va o'quvchi */}
        {computed?.show_card && computed.card && (
          <div className="cc-section">
            <div className="cc-status-row">
              <OrgStatusCard branch={branch} date={computed.card.date} />
              <StatusCard card={computed.card} />
            </div>
            <button
              className="cc-btn-download cc-btn-download--bottom"
              onClick={handleDownload}
              disabled={downloadLoading}
              type="button"
            >
              {downloadLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-download"></i>
              )}
              Shartnomani yuklab olish
            </button>
          </div>
        )}

        {/* Actions — faqat computed.show_otp bo'lganda (5-bo'lim) */}
        {showFooter && (
          <div className="cc-footer">
            <label className="cc-checkbox-label">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="cc-checkbox"
              />
              <span className="cc-checkmark"></span>
              <span>Shartnoma to‘liq o‘qib chiqtim va mazmuni bilan tanishdim</span>
            </label>

            <div className="cc-actions">
              <button
                className="cc-btn-bekor"
                disabled={!checked}
                onClick={handleBekorQilish}
                type="button"
              >
                <i className="fa-solid fa-xmark"></i>
                Rad etish
              </button>
              <button
                className="cc-btn-tasdiq"
                disabled={!checked || sendOtpMutation.isPending}
                onClick={handleTasdiqlash}
                type="button"
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    SMS yuborilmoqda...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Tasdiqlash
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showOtpModal && (
        <OtpModal
          phone={otpPhone}
          onVerify={(code) => verifyOtpMutation.mutate(code)}
          onClose={() => setShowOtpModal(false)}
          isPending={verifyOtpMutation.isPending}
          onResend={() => sendOtpMutation.mutate()}
          resendPending={sendOtpMutation.isPending}
        />
      )}

      {showCancelConfirm && (
        <CancelModal
          onConfirm={() => {
            setShowCancelConfirm(false);
            setResult('cancelled');
          }}
          onClose={() => setShowCancelConfirm(false)}
          isPending={false}
        />
      )}
    </div>
  );
};

export default ContractConfirmPage;
