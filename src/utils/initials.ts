/**
 * Ism-familiyani (F.I.Sh) ko'rsatish — User, Admin va Student ilovalarida BIR XIL fayl.
 *
 * Bitta joyda — sarlavha (Header), profil, ro'yxatlar shu funksiyadan foydalanadi (`services/account.ts`).
 *
 * QOIDA (`auto` = `short`, HAR DOIM): birinchi so'z TO'LIQ, o'rtadagi so'zlar faqat bosh harf + nuqta,
 * oxiridagi "o'g'li" / "qizi" umuman chiqmaydi (uzunligidan qat'i nazar — qisqa ism ham qisqartiriladi):
 *   "Abdukarimov Mahmudjon Beknazar o'g'li" → "Abdukarimov M. B."
 *   "Madaminova Shoxista Jahongir qizi"     → "Madaminova S. J."
 *   "Izzatulloh Jololov Qurbonali"          → "Izzatulloh J. Q."
 *   "Aliyev Vali o'g'li"                    → "Aliyev V."
 * Rejimlar (`mode`):
 *  - `auto` (standart) va `short` — yuqoridagi qoida;
 *  - `full` — to'liq (hech narsa kesilmaydi, "o'g'li"/"qizi" ham qoladi) — to'liq ism sichqoncha ustida (`title`) shu bilan chiqadi.
 */
export type NameMode = 'auto' | 'short' | 'full';

export interface NameFormatOptions {
  mode?: NameMode;
}

/**
 * Apostrof sifatida yoziladigan belgilar (ba'zilari — `ʻ` U+02BB, `ʼ` U+02BC — Unicode'da HARF hisoblanadi,
 * shuning uchun "harf bo'lmagan belgi" deb bo'lmaydi): ' ‘ ’ ‛ ` ´ ʹ ʻ ʼ ʽ ʿ ˊ ′.
 */
const APOS = "['‘’‛`´ʹʻʼʽʿˊ′]?";

/**
 * Otasining ismiga qo'shiladigan oxirgi so'z: "o'g'li", "qizi" — lotin va kirill, har qanday apostrof
 * yoki apostrofsiz ("ogli"), "ugli", "kizi" ham.
 */
const PATRONYMIC_SUFFIX = new RegExp(
  `^(o${APOS}g${APOS}li|u${APOS}gli|ogli|ugli|qizi|kizi|ўғли|ўгли|қизи|оглы|кызы)$`,
  'iu',
);

/** So'z boshidagi tinish belgilari (qo'shtirnoq, apostrof, qavs) bosh harf olishda o'tkazib yuboriladi. */
const LEADING_NON_LETTER = /^[^\p{L}\p{N}]+/u;

/** So'zning bosh harfi + nuqta: "Qurbonali" → "Q." (harf topilmasa — so'zning o'zi). */
function initialOf(word: string): string {
  const first = Array.from(word.replace(LEADING_NON_LETTER, ''))[0];
  return first ? `${first.toLocaleUpperCase()}.` : word;
}

const splitName = (name: string | null | undefined): string[] => (name ?? '').trim().split(/\s+/).filter(Boolean);

/** Ism-familiyani tanlangan rejimda qaytaradi (qarang: fayl boshidagi izoh). */
export function formatPersonName(name: string | null | undefined, options: NameFormatOptions = {}): string {
  const { mode = 'auto' } = options;
  const words = splitName(name);
  if (mode === 'full') return words.join(' ');

  // Oxiridagi "o'g'li" / "qizi" chiqmaydi (faqat OXIRIDAGISI: ismning o'rtasidagisi qoladi).
  if (words.length > 1 && PATRONYMIC_SUFFIX.test(words[words.length - 1])) words.pop();

  const [first, ...rest] = words;
  if (!first) return '';
  return [first, ...rest.map(initialOf)].join(' ');
}

/** Sarlavhada ko'rsatiladigan profil nomi: birinchi so'z to'liq, qolganlari bosh harf, "o'g'li/qizi" yo'q. */
export function shortenProfileName(name: string | null | undefined): string {
  return formatPersonName(name, { mode: 'short' });
}

/** Avatar uchun bosh harflar: "Abdullayeva Mohichehra" → "AM" (eng ko'pi bilan 2 ta). */
export function nameInitials(name: string | null | undefined, count = 2): string {
  return splitName(name)
    .slice(0, count)
    .map((w) => Array.from(w.replace(LEADING_NON_LETTER, ''))[0]?.toLocaleUpperCase() ?? '')
    .join('');
}
