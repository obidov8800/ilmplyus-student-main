/*
 * Maktabga tayyorlov (Parvoz) shartnomasi — hujjat matni va PDF/chop etish.
 *
 * Namuna: eski tizimdagi (mPDF) «Таълим олиш тўғрисида» shartnomasi — bo'limlari va tartibi o'sha namunadan, lotin
 * yozuvida. Maktab uchun yozilgan namunadan farqlari (foydalanuvchi talabi):
 *  - to'lov — faqat OYLIK to'lov summasi (bo'lib to'lash, to'lov jadvali, o'quv yili uchun jami summa yo'q); summa
 *    shartnomadagi `monthly_price` dan olinadi (backend uni shartnoma yaratilganda filialning FAOL va TASDIQLANGAN
 *    maktabga tayyorlov narxidan yozadi — avval filial narxi, bo'lmasa umumiy narx);
 *  - tashkilot ma'lumotlari (nomi, rahbari, manzil, INN, h/r, bank, MFO, telefon) shartnoma filialidan (Parvoz);
 *  - muddat nomuayyan: shartnoma tuzilgan kundan boshlab, tomonlardan biri bekor qilmaguncha amal qiladi.
 *
 * Uch ilovada (User, Admin, Student) bir xil fayl. Faqat shartnoma `contract_type = 'preschool'` bo'lganda ishlatiladi.
 * Fayllar: `preschoolContractData.ts` (ma'lumot, matn bandlari) · `preschoolContractDocument.tsx` (hujjat komponenti) ·
 * `preschoolContractPrint.tsx` (PDF / chop etish).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const BLANK = '______';

/** `2026-11-02…` → `02.11.2026`; bo'sh/noto'g'ri bo'lsa — bo'sh qator. */
const isoDate = (value: unknown): string => {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

const orBlank = (value: unknown): string => {
  const s = String(value ?? '').trim();
  return s && s !== '—' ? s : BLANK;
};

/** 500000 → «500 000». */
export const formatPreschoolMoney = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const ONES = ['', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz'];
const TENS = ['', 'oʻn', 'yigirma', 'oʻttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'toʻqson'];

/** Summa so'z bilan: 500000 → «besh yuz ming». */
export const preschoolMoneyWords = (value: number): string => {
  const n = Math.round(value);
  if (n <= 0) return 'nol';
  const three = (x: number): string => {
    const parts: string[] = [];
    const h = Math.floor(x / 100);
    const t = Math.floor((x % 100) / 10);
    const o = x % 10;
    if (h) parts.push(h === 1 ? 'yuz' : `${ONES[h]} yuz`);
    if (t) parts.push(TENS[t]);
    if (o) parts.push(ONES[o]);
    return parts.join(' ');
  };
  const parts: string[] = [];
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  if (billions) parts.push(`${three(billions)} milliard`);
  if (millions) parts.push(`${three(millions)} million`);
  if (thousands) parts.push(`${three(thousands)} ming`);
  if (rest) parts.push(three(rest));
  return parts.join(' ');
};

// ───────────────────────────── Ma'lumot ─────────────────────────────

export interface PreschoolDocRep {
  typeLabel: string;
  fullName: string;
  passportSeries: string;
  passportNumber: string;
  birthDate: string;
  givenDate: string;
  givenBy: string;
  address: string;
  phone: string;
}

export interface PreschoolDocData {
  number: string;
  date: string;
  city: string;
  org: {
    name: string;
    /** Rekvizitlar bloki uchun: filialning o'z nomi va manzili (Parvoz). */
    branchName: string;
    branchAddress: string;
    director: string;
    address: string;
    inn: string;
    account: string;
    bank: string;
    mfo: string;
    phone: string;
  };
  child: {
    citizenship: string;
    fullName: string;
    certSeries: string;
    certNumber: string;
    birthDate: string;
    birthPlace: string;
  };
  reps: PreschoolDocRep[];
  /** Oylik to'lov (so'm). Narx yozilmagan bo'lsa — null (matnda bo'sh joy qoladi). */
  monthlyPrice: number | null;
}

const REP_TYPE_LABELS: Record<string, string> = {
  Ota: 'Otasi',
  Ona: 'Onasi',
  Vasiy: 'Vasiysi',
  Boshqa: 'Vakili',
};

const CITIZENSHIP_LABELS: Record<string, string> = {
  citizen: 'Fuqaro',
  stateless: 'Fuqaroligi boʻlmagan shaxs',
  foreign: 'Chet el fuqarosi',
};

const fullName = (p: any): string =>
  [p?.last_name, p?.first_name, p?.father_name].filter(Boolean).join(' ').trim();

/** Backend javobi (`contract` — public yoki ro'yxat/ko'rish) → hujjat ma'lumoti. */
export function buildPreschoolDocData(contract: any): PreschoolDocData {
  const branch = contract?.branch ?? {};
  const student = contract?.contract_students?.[0] ?? {};
  const rawReps: any[] =
    contract?.representatives?.length > 0
      ? contract.representatives
      : contract?.representative
        ? [contract.representative]
        : [];

  // Oylik to'lov — shartnomadagi o'quvchi(lar) `monthly_price`i (filialning tasdiqlangan narxidan yozilgan).
  const monthly = (contract?.contract_students ?? []).reduce(
    (sum: number, s: any) => sum + (Number(s?.monthly_price) || 0),
    0,
  );

  return {
    number: orBlank(contract?.contract_number),
    date: isoDate(contract?.contract_date) || BLANK,
    city: String(branch.city ?? '').trim(),
    org: {
      name: orBlank(branch.legal_name || branch.name_uz),
      branchName: orBlank(branch.name_uz || branch.legal_name),
      branchAddress: orBlank(branch.address_uz || branch.legal_address_uz),
      director: orBlank(branch.director_name),
      address: orBlank(branch.legal_address_uz || branch.address_uz),
      inn: orBlank(branch.inn),
      account: orBlank(branch.account_number),
      bank: String(branch.bank_name ?? '').trim(),
      mfo: orBlank(branch.mfo),
      phone: orBlank(branch.phone),
    },
    child: {
      citizenship: CITIZENSHIP_LABELS[String(student.citizenship ?? 'citizen')] ?? 'Fuqaro',
      fullName: orBlank(fullName(student)),
      certSeries: orBlank(student.birth_cert_series),
      certNumber: orBlank(student.birth_cert_number),
      birthDate: isoDate(student.birth_date) || BLANK,
      birthPlace: orBlank(student.birth_place),
    },
    reps: rawReps.map((r) => ({
      typeLabel: REP_TYPE_LABELS[String(r?.representative_type ?? '')] ?? 'Vakili',
      fullName: orBlank(fullName(r)),
      passportSeries: orBlank(r?.passport_series),
      passportNumber: orBlank(r?.passport_number),
      birthDate: isoDate(r?.birth_date) || BLANK,
      givenDate: isoDate(r?.passport_given_date) || BLANK,
      givenBy: orBlank(r?.passport_given_by),
      address: orBlank(r?.residential_address || r?.registered_address),
      phone:
        [r?.phone, ...(Array.isArray(r?.extra_phones) ? r.extra_phones : [])]
          .filter(Boolean)
          .join(', ') || BLANK,
    })),
    monthlyPrice: monthly > 0 ? monthly : null,
  };
}

// ───────────────────────────── Matn ─────────────────────────────

/** Bandlar (raqam → matn). Matn namunadan, lotin yozuvida; 3.1 va 7.1 — ma'lumotga bog'liq, kodda. */
export const CLAUSES: Record<string, string> = {
  "1.1": "“Maktab” davlat taʼlim standartlari (davlat talablari), oʻquv rejalari va oʻquv dasturlari boʻyicha oʻqitish, “Vakil” esa buning uchun kelishilgan narxlarda haq toʻlash majburiyatini oladi.",
  "2.1": "“Vakil”ning huquqlari:",
  "2.1.1": "Oʻquv rejalari va oʻquv dasturlari boʻyicha taʼlim berilishini talab qilish;",
  "2.1.2": "Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim berilishini talab qilish;",
  "2.1.3": "Taʼlim-tarbiya sifatini oshirish boʻyicha “Maktab” maʼmuriyatiga oʻz fikr va mulohazalarini yozma ravishda bildirish;",
  "2.1.4": "“Maktab”da oʻquvchilarning ovqatlanishi bilan bogʻliq oʻquv kuni davomida beriladigan, tasdiqlangan taomnoma roʻyxati bilan tanishish hamda bu boʻyicha oʻz eʼtiroz va takliflarini yozma ravishda bildirish;",
  "2.1.5": "Oʻquvchining qiziqishi va xohishiga koʻra toʻgaraklar tashkil etish yuzasidan yozma murojaat qilish;",
  "2.1.6": "“Maktab”ning bank hisob raqamlariga hayriya badallarini oʻtkazish;",
  "2.2": "“Vakil”ning majburiyatlari:",
  "2.2.1": "Ushbu “Shartnoma”da belgilangan oylik toʻlovni oʻz vaqtida va kechiktirmay amalga oshirish;",
  "2.2.2": "Sanitariya-gigiyena talablariga hamda yongʻin xavfsizligi qoidalariga rioya qilinishini taʼminlash;",
  "2.2.3": "Darslarda muntazam ishtirok etilishini taʼminlash, dars mashgʻulotlarida uzrli sabablar bilan qatnasha olmagan oʻquvchi haqida “Maktab”ni ogohlantirish;",
  "2.2.4": "“Maktab” binosi, oʻquv-laboratoriya va boshqa “Maktab” mulkiga oʻquvchi tomonidan zarar yetkazilgan hollarda ushbu yetkazilgan zararni qoplash;",
  "2.2.5": "“Maktab” tomonidan berilgan oʻquv darsliklari, boshqa jihoz va buyumlarni oʻquvchi tomonidan avaylab-asrab foydalanilishini nazorat qilish;",
  "2.2.6": "“Maktab” maʼmuriyati, oʻqituvchi va oʻquvchining sinf rahbari tomonidan bildirilgan eʼtiroz va maslahatlarni ijobiy qabul qilish hamda bartaraf etish choralarini koʻrish;",
  "2.2.7": "“Maktab” maʼmuriyatini oʻquvchining jismoniy va ruhiy holatidagi oʻzgarishlar toʻgʻrisida oʻz vaqtida xabardor qilish;",
  "2.2.8": "Oʻquvchi qand kasalligi yoki shunga oʻxshash alohida taom rejimi talab qilinadigan kasallikka chalingan boʻlsa, bu haqda “Maktab” maʼmuriyatiga darhol xabar berish;",
  "2.2.9": "Oʻquvchining “Maktab”ga belgilangan oʻquv formasida kelishini taʼminlash;",
  "2.2.10": "Oʻquvchining nomaqbul xulq-atvori va tartibbuzarliklari uchun oʻqituvchi, sinf rahbari hamda “Maktab” maʼmuriyati tomonidan chora koʻrilganda ushbu holatga toʻgʻri munosabatda yondoshish;",
  "2.2.11": "Oʻquvchini dars mashgʻulotlari yakunlanganidan soʻng oʻz vaqtida olib ketish, agar oʻz vaqtida olib ketmagan taqdirda BHMning 15% (oʻn besh foizi) miqdorida jarima toʻlash;",
  "2.2.12": "Oʻquvchilar tomonidan “Maktab” hududida shaxsiy uyali aloqa vositalaridan foydalanishiga yoʻl qoʻymaslik;",
  "2.2.13": "Oʻquvchilar betobligi yoki boshqa sabablarga koʻra dars mashgʻulotlariga kela olmasa, bu haqda “Maktab” maʼmuriyatini darhol xabardor qilish;",
  "2.2.14": "“Maktab” maʼmuriyati yoki sinf rahbari tomonidan oʻtkaziladigan bevosita oʻquvchilar bilan bogʻliq boʻlgan yigʻilishlarda qatnashish;",
  "2.3": "“Maktab”ning huquqlari:",
  "2.3.1": "“Vakil”dan ushbu “Shartnoma”da belgilangan oylik toʻlovning oʻz vaqtida va kechiktirmay amalga oshirilishini talab qilish hamda toʻlov oʻz vaqtida amalga oshirilmagan taqdirda oʻquvchini dars mashgʻulotlariga kiritmaslik;",
  "2.3.2": "Taʼlim-tarbiya sifatini oshirish maqsadida ilgʻor pedagogik texnologiyalardan foydalanish;",
  "2.3.3": "Oʻquvchini dars mashgʻulotlariga oʻz vaqtida kelishini hamda muntazam ishtirok etishini talab qilish;",
  "2.3.4": "“Maktab” binosi, oʻquv-laboratoriya va boshqa “Maktab” mulkiga oʻquvchi tomonidan zarar yetkazilgan hollarda ushbu yetkazilgan zararni qoplashni “Vakil”dan talab qilish;",
  "2.3.5": "“Vakil”dan oʻquvchining “Maktab”ga belgilangan oʻquv formasida kelishini taʼminlanishini talab qilish;",
  "2.3.6": "“Vakil” ishtirokida bevosita oʻquv jarayoni bilan bogʻliq boʻlgan yigʻilishlar oʻtkazish;",
  "2.3.7": "Oʻquvchi dars mashgʻulotlarida odob-axloq meʼyorlariga hamda sinf rahbarining qonuniy talablariga rioya qilmagan taqdirda unga nisbatan chora koʻrish va bu haqda “Vakil”ga xabar berish.",
  "2.4": "“Maktab”ning majburiyatlari",
  "2.4.1": "Taʼlim-tarbiya jarayonini davlat taʼlim standartlariga (davlat talablariga), oʻquv rejalariga va taʼlim dasturlariga muvofiq tashkil etish;",
  "2.4.2": "Auditoriyalarni, oʻquv xonalarini zamonaviy axborot kommunikatsiya asbob-uskunalari, oʻqitishning texnik vositalari va anjomlari bilan taʼminlash;",
  "2.4.3": "Taʼlim dasturlarining belgilangan darajasini amalga oshirish uchun oʻquv binolarini zarur darsliklar, oʻquv-metodik adabiyotlar va boshqa kutubxona-axborot resurslari hamda vositalari bilan taʼminlash;",
  "2.4.4": "Malakali psixolog mutaxassis yordamida oʻquvchining qobiliyatini aniqlash, uni rivojlantirish hamda oʻquvchiga har tomonlama psixologik-pedagogik jihatdan koʻmak berish;",
  "2.4.5": "Taʼlim dasturlarini umumiy oʻrta va maktabdan tashqari taʼlimga qoʻyiladigan davlat talablariga muvofiq amalga oshirish;",
  "2.4.6": "Taʼlimning majburiy ravishda dunyoviy xarakterda boʻlishi, taʼlim jarayonida urushni, zoʻravonlikni targʻib qilishdan foydalanishga, fuqarolarning konstitutsiyaviy huquqlari va erkinligi kamsitilishiga, mamlakatdagi xavfsizlik va ijtimoiy-siyosiy barqarorlikka, jamiyatning huquqiy va maʼnaviy asoslari, fuqarolar osoyishtaligiga, millatlararo va dinlararo totuvlikka rahna solinishiga, Oʻzbekiston Respublikasi toʻgʻrisida notoʻgʻri axborotlar tarqatilishiga hamda uning tarixiy, madaniy va maʼnaviy qadriyatlari buzib koʻrsatilishiga yoʻl qoʻymaslik;",
  "2.4.7": "Iqtidorli bolalar va isteʼdodli yoshlarni aniqlash va qoʻllab-quvvatlash orqali taʼlim-tarbiyaning yuqori sifatini taʼminlaydigan qulay shart-sharoitlar yaratish;",
  "2.4.8": "Ilgʻor xalqaro tajribalarni inobatga olib, oʻqitishning innovatsion shakllari hamda zamonaviy texnologiyalaridan foydalanish asosida taʼlim sohasidagi samaradorlik va natijadorlikni oshirish;",
  "2.4.9": "Taʼlim jarayonini oʻqitishning eng zamonaviy texnologiyalaridan foydalangan holda fanlarni chuqurlashtirib oʻrgatish yoʻnalishida tashkil etish;",
  "2.4.10": "Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim berish;",
  "2.4.11": "Oʻquvchi tomonidan uzrli sabablarga koʻra dars mashgʻulotlarini qoldirgan taqdirda, ushbu qoldirilgan dars mashgʻulotlarini toʻldirish maqsadida mustaqil ishlash uchun barcha shart-sharoitlarni yaratish va nazorat qilish;",
  "2.4.12": "Oʻquv kuni davomida bir mahal “Maktab”da oʻquvchilarning ovqatlanishi uchun sharoit yaratish va tasdiqlangan taomnoma roʻyxati boʻyicha issiq ovqat bilan taʼminlash;",
  "2.4.13": "“Vakil” tomonidan bildirilgan ogʻzaki va yozma fikr-mulohaza va eʼtirozlarni qonun doirasida koʻrib chiqish;",
  "2.4.14": "Bitiruvchilarga belgilangan tartibda taʼlim olganlik toʻgʻrisida hujjat berish.",
  "3.2": "Oylik toʻlov “Vakil” tomonidan naqd pul, plastik kartalar orqali pul oʻtkazish yoki bank muassasalari orqali pul oʻtkazish yoʻli bilan amalga oshiriladi.",
  "3.3": "“Maktab” tomonidan ushbu “Shartnoma”da belgilangan narxlar yangi narxnoma (preyskurant) boʻyicha oʻzgartirilgan taqdirda oshirilishi mumkin.",
  "3.4": "Agar oʻquvchi tibbiy xulosa, tibbiy koʻrsatmalar yoki boshqa (oilaviy sharoiti, xorijiy safarga chiqib ketishi va shu kabi holatlar) sabablarga koʻra dars mashgʻulotlariga kela olmasa, bunda toʻlovlar toʻliq 100 % (bir yuz foiz) miqdorda “Vakil”dan undiriladi va avval amalga oshirilgan toʻlovlar qaytadan hisoblanmaydi hamda qaytarib berilmaydi.",
  "3.5": "Choraklik taʼtillar, davlat tomonidan eʼlon qilingan qoʻshimcha yoki uzaytirilgan taʼtillar (shu jumladan qish mavsumida), davlat tomonidan belgilangan bayram va dam olish kunlari davrida toʻlov narxlari va miqdori boʻyicha hech qanday chegirma taqdim etilmaydi.",
  "3.6": "Davlat tomonidan eʼlon qilingan karantin (pandemiya) davrida dars mashgʻulotlari onlayn tarzda oʻtkaziladi. Bu holda toʻlovlar toʻlov summasining 50% (ellik foiz) miqdorida amalga oshiriladi.",
  "4.1": "Tomonlarga bogʻliq boʻlmagan holda yengib boʻlmas kuch taʼsirida “Shartnoma” shartlarini bajarish imkoniyati boʻlmagan taqdirda (suv toshqini, yongʻin, yer qimirlashi va boshqa tabiiy ofatlar) tomonlar bir-birini 10 (oʻn) kun ichida bu toʻgʻrisida xabardor qilishi lozim. Ushbu davr mobaynida shartnoma boʻyicha majburiyatlar huquqiy oqibat keltirib chiqarmaydi.",
  "5.1": "Ushbu “Shartnoma” tomonlarning roziligi bilan yozma kelishuvga koʻra oʻzgartirilishi, qoʻshimchalar kiritilishi va istalgan vaqtda bekor qilinishi mumkin.",
  "5.2": "Ushbu “Shartnoma” quyidagi holatlarda “Maktab” tomonidan “Vakil”ni 10 (oʻn) kun oldin ogohlantirib bir tomonlama bekor qilinishi mumkin:",
  "5.2.1": "“Vakil” tomonidan ushbu “Shartnoma” shartlari qoʻpol ravishda buzilib, oʻz majburiyatlarini bajarmasa;",
  "5.2.2": "Oʻquvchining kasalligi yoki tibbiy xulosa “Maktab”da oʻqish uchun toʻsqinlik qilganda;",
  "5.2.3": "“Maktab” maʼmuriyatining tashabbusi bilan uning Nizomiga koʻra, oʻquvchi oʻqishdan chetlatilganda.",
  "5.2.4": "“Vakil” tomonidan “Shartnoma”ning 3.1 va 3.2-bandlariga muvofiq oylik toʻlov oʻz vaqtida amalga oshirilmaganda.",
  "5.3": "Taʼlim muassasasi tugatilgan taqdirda shartnoma oʻz-oʻzidan bekor boʻlgan hisoblanadi.",
  "5.4": "“Vakil” ushbu “Shartnoma”ni bekor qilish toʻgʻrisida “Maktab” maʼmuriyatini 1 (bir) oy oldin yozma ravishda xabardor qilishi lozim.",
  "6.1": "Ushbu “Shartnoma”da koʻzda tutilgan shartlar va majburiyatlarni bajarmaslik yoki lozim darajada bajarmaslik hollari, tomonlarni Oʻzbekiston Respublikasining amaldagi qonunchiligiga muvofiq javobgarlikka tortilishiga sabab boʻladi.",
  "6.2": "Tomonlar “Shartnoma” imzolanib kuchga kirganidan soʻng oʻz majburiyatlarini bajarmasalar yoki lozim darajada bajarmasalar BHMning 5 (besh) barobari miqdorida jarima toʻlaydilar, bunda jarima toʻlash tomonlarni “Shartnoma” boʻyicha oʻz majburiyatlarini bajarishdan ozod etmaydi.",
  "6.3": "Oʻzaro kelishmovchiliklar yuzaga kelgan taqdirda barcha masalalar ikki tomonlama muzokaralar yoʻli bilan hal qilinadi, kelishish imkoni boʻlmaganda esa nizo amaldagi qonunchilikda belgilangan tartibda fuqarolik sudida hal qilinadi.",
  "7.2": "Ushbu “Shartnoma” har bir tomonda 1 (bir) nusxadan saqlash uchun bir xil yuridik kuchga ega boʻlgan 2 (ikki) nusxada tuzildi.",
  "8.1": "“Vakil” oʻquvchining kundalik.com elektron kundaligi yuritilishi boʻyicha toʻlovlar amalga oshirilishini hamda oʻquvchining davomatini nazorat qilib borish majburiyatini oʻz zimmasiga oladi.",
  "7.3": "Ushbu “Shartnoma” tomonlarning roziligini ifodalaydigan hamda uni identifikatsiya va autentifikatsiya qilish imkonini beradigan elektron tasdiqlash usullari (“SMS” va boshqalar) ham imzo sifatida tan olinadi va shartnoma tuzilgan hisoblanadi.",
};

export const SECTION_TITLES: Record<string, string> = {
  '1': '1. “SHARTNOMA”NING PREDMETI',
  '2': '2. TOMONLARNING HUQUQ VA MAJBURIYATLARI',
  '3': '3. OʻZARO HISOB-KITOB TARTIBI',
  '4': '4. FORS-MAJOR HOLATLARI',
  '5': '5. SHARTNOMANI OʻZGARTIRISH, QOʻSHIMCHALAR KIRITISH VA BEKOR QILISH TARTIBI',
  '6': '6. TOMONLARNING JAVOBGARLIGI VA NIZOLARNI HAL QILISH TARTIBI.',
  '7': '7. SHARTNOMANING AMAL QILISHI',
  '8': '8. QOʻSHIMCHA SHARTLAR',
};

export const compareKeys = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
};

/** Hujjat uslubi — namunadagidek: serif shrift, ikki tomonga tekislangan matn, markazda qalin bo'lim sarlavhalari. */
export const DOCUMENT_CSS = `
.pcx{font-family:'Times New Roman',Cambria,Georgia,serif;font-size:13px;line-height:1.5;color:#111;text-align:left}
.pcx .pcx-title{text-align:center;font-weight:700;font-size:1.08em;margin:0}
.pcx .pcx-meta{display:flex;justify-content:space-between;font-weight:700;margin:12px 0 12px}
.pcx .pcx-p{margin:0 0 4px;text-align:justify;text-indent:1.25cm}
.pcx .pcx-bold{font-weight:700}
.pcx .pcx-h{text-align:center;font-weight:700;margin:12px 0 5px;break-after:avoid;page-break-after:avoid}
.pcx .pcx-req{width:100%;border-collapse:collapse;margin-top:6px;break-inside:avoid;page-break-inside:avoid}
.pcx .pcx-req td{width:50%;vertical-align:top;padding:0 14px 0 0}
.pcx .pcx-line{margin:0 0 2px}
.pcx .pcx-gap{height:12px}
`;

/** Chop etish oynasi (A4, chegaralar, chop etishdagi shrift o'lchami). */
export const PRINT_PAGE_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.pcx { font-size: 10pt; line-height: 1.3; }
@page { size: A4 portrait; margin: 13mm 15mm 13mm 20mm; }
@media screen { body { max-width: 800px; margin: 0 auto; padding: 24px; } }
`;

