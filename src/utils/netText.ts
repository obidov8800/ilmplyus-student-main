/**
 * Tarmoq/xato holatlari uchun matnlar (uz/ru/en). i18n'dan ATAYLAB alohida: bu matnlar ilova endi
 * ishga tushayotganda yoki bo'lak (chunk) yuklanmay qolganda ham — i18n tayyor bo'lmasa ham — chiqishi kerak.
 * Til: `localStorage.i18nextLng` (ilovaning tanlagan tili), bo'lmasa o'zbekcha.
 */
type Lang = 'uz' | 'ru' | 'en';

interface NetTexts {
  offlineTitle: string;
  offlineMessage: string;
  failedTitle: string;
  failedMessage: string;
  retry: string;
  home: string;
  checking: string;
  badgeOffline: string;
  badgeFailed: string;
  waiting: string;
  stillOffline: string;
  serverTitle: (status: number) => string;
  serverMessage: string;
  noReplyTitle: string;
  noReplyMessage: string;
}

const TEXTS: Record<Lang, NetTexts> = {
  uz: {
    offlineTitle: 'Internet aloqasi yo‘q',
    offlineMessage: 'Qurilmangiz internetga ulanmagan. Ulanishni tekshiring — aloqa tiklangach sahifa o‘zi yangilanadi.',
    failedTitle: 'Sahifani yuklab bo‘lmadi',
    failedMessage: 'Kutilmagan xatolik yuz berdi. Sahifani yangilab ko‘ring.',
    retry: 'Qayta urinish',
    home: 'Bosh sahifa',
    checking: 'Tekshirilmoqda…',
    badgeOffline: 'Aloqa yo‘q',
    badgeFailed: 'Xatolik',
    waiting: 'Aloqa kutilmoqda — tiklanishi bilan sahifa o‘zi davom etadi',
    stillOffline: 'Aloqa hali tiklanmadi. Ulanishni tekshirib, yana urinib ko‘ring.',
    serverTitle: (status) => `Server xatosi (${status})`,
    serverMessage: 'Serverda nosozlik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.',
    noReplyTitle: 'Server bilan aloqa yo‘q',
    noReplyMessage: 'Server javob bermayapti. Birozdan so‘ng qayta urinib ko‘ring.',
  },
  ru: {
    offlineTitle: 'Нет подключения к интернету',
    offlineMessage: 'Устройство не подключено к интернету. Проверьте соединение — страница обновится сама, когда связь восстановится.',
    failedTitle: 'Не удалось загрузить страницу',
    failedMessage: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.',
    retry: 'Повторить',
    home: 'На главную',
    checking: 'Проверка…',
    badgeOffline: 'Нет связи',
    badgeFailed: 'Ошибка',
    waiting: 'Ожидание соединения — страница продолжит работу сама',
    stillOffline: 'Соединение ещё не восстановлено. Проверьте подключение и попробуйте снова.',
    serverTitle: (status) => `Ошибка сервера (${status})`,
    serverMessage: 'На сервере произошёл сбой. Повторите попытку чуть позже.',
    noReplyTitle: 'Нет связи с сервером',
    noReplyMessage: 'Сервер не отвечает. Повторите попытку чуть позже.',
  },
  en: {
    offlineTitle: 'No internet connection',
    offlineMessage: 'Your device is offline. Check your connection — the page will refresh by itself once you are back online.',
    failedTitle: 'The page could not be loaded',
    failedMessage: 'Something unexpected happened. Try refreshing the page.',
    retry: 'Try again',
    home: 'Home',
    checking: 'Checking…',
    badgeOffline: 'Offline',
    badgeFailed: 'Error',
    waiting: 'Waiting for connection — the page will carry on by itself',
    stillOffline: 'Still no connection. Check your network and try again.',
    serverTitle: (status) => `Server error (${status})`,
    serverMessage: 'Something went wrong on the server. Please try again in a moment.',
    noReplyTitle: 'Cannot reach the server',
    noReplyMessage: 'The server is not responding. Please try again in a moment.',
  },
};

export function netText(): NetTexts {
  let lang: Lang = 'uz';
  try {
    const saved = (localStorage.getItem('i18nextLng') ?? '').slice(0, 2).toLowerCase();
    if (saved === 'ru' || saved === 'en' || saved === 'uz') lang = saved;
  } catch {
    // localStorage yopiq bo'lsa o'zbekcha qoladi
  }
  return TEXTS[lang];
}

/**
 * API xatosi uchun tushunarli toast (Axios xatosidan): server xatosi (5xx) yoki javob umuman kelmagan holat.
 * `silent` — internet yo'q: buni butun ekranli «Internet yo'q» sahifasi aytadi, har bir so'rov uchun alohida xabar kerak emas.
 * `null` — bu oddiy (4xx) xato, chaqiruvchi o'zining odatiy xabarini ko'rsatadi.
 */
export function networkErrorToast(
  error: unknown,
  offline: boolean,
): { silent: true } | { silent: false; title: string; message: string } | null {
  const err = error as { code?: string; response?: { status?: number } } | null;
  if (err?.code === 'ERR_CANCELED') return null;
  const status = err?.response?.status;
  const text = netText();

  if (!err?.response) {
    // Internet yo'q: butun ekranli sahifa aytadi. Bitta so'rov uzilib, internet bor bo'lsa — jim qolmaymiz.
    if (offline) return { silent: true };
    if (err?.code === 'ERR_NETWORK') return { silent: false, title: text.noReplyTitle, message: text.noReplyMessage };
    return null;
  }
  if (status && status >= 500) {
    return {
      silent: false,
      title: status === 502 || status === 503 || status === 504 ? text.noReplyTitle : text.serverTitle(status),
      message: status === 502 || status === 503 || status === 504 ? text.noReplyMessage : text.serverMessage,
    };
  }
  return null;
}
