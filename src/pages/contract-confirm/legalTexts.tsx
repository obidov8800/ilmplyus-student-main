/**
 * Shartnoma matni (huquqiy bandlar) — statik, API orqali kelmaydi.
 *
 * Manba: backend `resources/views/contract/show.blade.php` (bevosita ochib
 * bo'lmagani sabab) o'rniga shu repodagi 4 ta Word shablon
 * (`src/assets/documents/01-04 ... .docx`) — ular xuddi shu yuridik
 * shartnoma matnini tashiydi (admin panelning "Shartnoma yuklab olish"
 * funksiyasi ham shulardan foydalanadi, `pages/students-contract/ContractPrintModal.tsx`).
 * Matn so'zma-so'z ko'chirilgan, faqat `{maydon}` o'rniga `data.maydon` qo'yilgan.
 *
 * Agar backenddagi asl blade matni bu shablonlardan biror joyda farq qilsa —
 * shu fayl yangilanishi kerak (ikkalasi ham bir xil shartnomani tasvirlaydi,
 * lekin blade — veb-sahifa, docx — yuklab olinadigan hujjat uchun yozilgan).
 */
import type { ReactNode } from 'react';
import type { ContractTemplateData } from '@/utils/contractPdf';

export type ContractType = 'adult' | 'minor' | 'legal_bilateral' | 'legal_trilateral';

/** Ism-familiya kabi maydonlarni katta harfga o'tkazadi (bo'sh bo'lsa ham xato bermaydi). */
const U = (v: string | null | undefined): string => (v ? v.toUpperCase() : '');

/**
 * Asl .docx shablonda har bir qo'shtirnoqli atama ("Shartnoma", "O'quv
 * markazi", "O'quvchi", "Tomonlar", "Vakil" va h.k.) qalin — bu butun
 * hujjat bo'ylab yuzlab marta takrorlanadi (tekshirilgan: 4 ta shablonning
 * hammasida). Har birini qo'lda belgilash o'rniga shu yerda avtomatik
 * aniqlanadi — bitta joydagi tuzatish butun hujjat bo'ylab ishlaydi.
 */
const QUOTE_RE = /“[^”]*”/g;

function boldQuotedTerms(text: string, keyPrefix: string | number): ReactNode[] {
  const matches = text.match(QUOTE_RE) || [];
  if (!matches.length) return [text];
  const parts = text.split(QUOTE_RE);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) out.push(part);
    if (matches[i]) out.push(<strong key={`${keyPrefix}-${i}`}>{matches[i]}</strong>);
  });
  return out;
}

const Meta = ({ city, date }: { city: string; date: string }) => (
  <div className="cc-legal-meta">
    <span>{city}</span>
    <span>{date}</span>
  </div>
);

const Band = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="cc-legal-band">
    {title && <div className="cc-legal-band-title">{title}</div>}
    {children}
  </div>
);

const P = ({ children }: { children: ReactNode }) => {
  const nodes = Array.isArray(children) ? children : [children];
  const processed = nodes.flatMap((child, i) =>
    typeof child === 'string' ? boldQuotedTerms(child, i) : [child],
  );
  return <p>{processed}</p>;
};

const Heading = ({ number }: { number: string }) => (
  <>
    <h2 className="cc-legal-heading">Haq evaziga ta’lim xizmati ko‘rsatish to‘g‘risida</h2>
    <div className="cc-legal-number">{number}-sonli SHARTNOMA</div>
  </>
);

interface StudentsTableProps {
  students: ContractTemplateData['students'];
}

const StudentsTable = ({ students }: StudentsTableProps) => (
  <table className="cc-legal-students-table">
    <thead>
      <tr>
        <th>T/R</th>
        <th>F. I. Sh.</th>
        <th>Tug‘ilgan sanasi</th>
        <th>Kurs nomi va bosqichi</th>
        <th>
          Xizmat ko‘rsatish narxi
          <br />
          (so‘m)
        </th>
      </tr>
    </thead>
    <tbody>
      {students.map((s) => (
        <tr key={s.s_index}>
          <td>{s.s_index}</td>
          <td>{U(s.s_full_name)}</td>
          <td>{s.s_birth_date}</td>
          <td>
            {s.s_course_name}({s.s_level_name})
          </td>
          <td>{s.s_monthly_price}</td>
        </tr>
      ))}
      <tr>
        <td colSpan={3}></td>
        <td className="cc-legal-td-strong">Jami</td>
        <td className="cc-legal-td-strong">{students.length ? students[0].s_total_price : ''}</td>
      </tr>
    </tbody>
  </table>
);

/** 8-band — «Tomonlar»ning manzillari va imzolari. 2 yoki 3 ustunli. */
const SignatureTable = ({ columns }: { columns: { title: string; lines: ReactNode[] }[] }) => (
  <table className="cc-legal-signature-table">
    <thead>
      <tr>
        {columns.map((c) => (
          <th key={c.title}>{c.title}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      <tr>
        {columns.map((c) => (
          <td key={c.title}>
            {c.lines.map((line, i) => (
              <div key={i} className="cc-legal-sig-line">
                {line}
              </div>
            ))}
          </td>
        ))}
      </tr>
    </tbody>
  </table>
);

// ───────────────────────── 01. Voyaga yetgan o'quvchi (adult) ─────────────────────────

const AdultText = ({ data }: { data: ContractTemplateData }) => (
  <div className="cc-legal">
    <Heading number={data.contract_number} />
    <Meta city={data.city} date={data.contract_date} />

    <P>
      Ushbu Haq evaziga ta’lim xizmati ko‘rsatish to‘g‘risidagi (ikki tomonlama) shartnoma (keyingi
      o‘rinlarda ‒ “Shartnoma” deb yuritiladi) birinchi tomondan o‘z Nizomi asosida faoliyat
      yurituvchi <strong>{data.branch_legal_name}</strong> (keyingi o‘rinlarda – “O‘quv markazi” deb
      yuritiladi) nomidan ish yurituvchi Bosh direktor <strong>{U(data.director_name)}</strong>,
      ikkinchi tomondan {data.citizenship_text}{' '}
      <strong>
        {U(data.student_last_name)} {U(data.student_first_father_name)}
      </strong>{' '}
      (pasport/ID-karta: seriyasi:{data.passport_series} raqami:
      <strong>{data.passport_number}</strong>; tug‘ilgan sanasi:
      <strong>{data.student_birth_date}</strong>; berilgan sanasi:
      <strong>{data.passport_given_date}</strong>; amal qilish muddati:
      <strong>{data.passport_expiry_date}</strong>; berilgan joyi:
      <strong>{data.passport_given_by}</strong>; keyingi o‘rinlarda – “O‘quvchi” deb yuritiladi)
      o‘rtasida (keyingi o‘rinlarda ‒ “Tomonlar” deb yuritiladi) ushbu “Shartnoma” quyidagi mazmunda
      tuzildi.
    </P>

    <Band title="“SHARTNOMA”NING PREDMETI">
      <P>
        1.1. “O‘quv markazi” “O‘quvchi”ga <strong>{data.course_name}</strong> o‘quv kursi bo‘yicha
        ta’lim berish, “O‘quvchi” esa buning uchun “O‘quv markazi”ga kelishilgan narxda haq to‘lash
        majburiyatini oladi.
      </P>
    </Band>

    <Band title="“TOMONLAR”NING MAJBURIYATLARI">
      <P>2.1. “O‘quvchi”ning huquqlari:</P>
      <P>
        2.1.1. “O‘quv markazi” o‘quv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha ta’lim olish;
      </P>
      <P>
        2.1.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda ta’lim olish;
      </P>
      <P>
        2.1.3. Uzrli sabablarga ko‘ra ariza asosida bir o‘quv guruhidan boshqa o‘quv guruhiga
        o‘tkazishni talab qilish;
      </P>
      <P>
        2.1.4. “Shartnoma”da ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha o‘quv muddati so‘nggida
        yakuniy imtihonlardan ijobiy natijalar bilan o‘tgan taqdirda belgilangan tartibda
        “Qo‘shimcha ta’lim dasturini tamomlaganlik to‘g‘risidagi sertifikat” (keyingi o‘rinlarda ‒
        “Sertifikat” deb yuritiladi) olish.
      </P>
      <P>2.2.“O‘quvchi”ning majburiyatlari:</P>
      <P>
        2.2.1. Ushbu “Shartnoma”da ko‘rsatilgan narxda “O‘quv markazi”ga oldindan 100 (bir yuz)
        foiz miqdorida haq to‘lash;
      </P>
      <P>
        2.2.2. Sanitariya-gigiyena talablariga hamda yong‘in xavfsizligi qoidalariga rioya qilish;
      </P>
      <P>
        2.2.3. O‘quv guruhi mashg‘ulotlarida muntazam ishtirok etish, dars mashg‘ulotlarida uzrli
        sabablar bilan qatnasha olmasa, bu haqda “O‘quv markazi”ni oldindan ogohlantirish;
      </P>
      <P>
        2.2.4. O‘quv guruhi mashg‘ulotlarida odob-axloq meʼyorlariga hamda o‘quv guruhi
        rahbarining qonuniy talablariga rioya qilish.
      </P>
      <P>2.3. “O‘quv markazi”ning huquqlari:</P>
      <P>
        2.3.1. “O‘quvchi”dan ushbu “Shartnoma”da ko‘rsatilgan narxda “O‘quv markazi”ga oldindan
        100 % (bir yuz) foiz miqdorida haq to‘lashni talab qilish hamda oldindan to‘lov amalga
        oshirilmagan taqdirda, “O‘quvchi”ni o‘quv mashg‘ulotlariga kiritmaslik;
      </P>
      <P>
        2.3.2. “O‘quvchi”ning sababsiz o‘quv mashg‘ulotlariga kelmaganligi yoki boshqa aybi bilan
        qoldirilgan darslarni o‘tib bermaslik (bunda “O‘quvchi” qoldirilgan o‘quv mashg‘ulotlarini
        mustaqil o‘zlashtiradi);
      </P>
      <P>
        2.3.3. O‘quv guruhlarida to‘lmagan taqdirda hamda uzrli sabablarga ko‘ra o‘quv
        mashg‘ulotlari va o‘quv davrini boshqa vaqtga bir tomonlama “O‘quvchi”ning roziligisiz
        ko‘chirish;
      </P>
      <P>
        2.3.4. O‘quv guruhlarida o‘quvchilar soni 5 (besh) nafardan kam bo‘lsa o‘quv mashg‘ulotlari
        bo‘yicha ma’lumotlar to‘liq saqlangan holda o‘quv soatlarini bir tomonlama “O‘quvchi”ning
        roziligisiz qisqartirish;
      </P>
      <P>
        2.3.5. “O‘quv markazi”da o‘quv xonalari band bo‘lgan taqdirda mashg‘ulotlar jadvalini bir
        tomonlama “O‘quvchi”ning roziligisiz o‘zgartirish;
      </P>
      <P>
        2.3.6. “O‘quvchi” sanitariya-gigiyena talablariga hamda yong‘in xavfsizligi qoidalariga
        rioya qilmagan taqdirda o‘quv mashg‘ulotlaridan chetlatish;
      </P>
      <P>
        2.3.7. “O‘quvchi” o‘quv guruhi mashg‘ulotlarida odob-axloq meʼyorlariga hamda o‘quv guruhi
        rahbarining qonuniy talablariga rioya qilmagan taqdirda o‘quv mashg‘ulotlaridan
        chetlashtirish.
      </P>
      <P>2.4.“O‘quv markazi”ning majburiyatlari:</P>
      <P>
        2.4.1. “O‘quv markazi” o‘quv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha ta’lim berish;
      </P>
      <P>
        2.4.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda ta’lim
        berish;
      </P>
      <P>
        2.4.3. “Shartnoma”da ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha o‘quv muddati so‘nggida
        yakuniy imtihonlardan ijobiy natijalar bilan o‘tgan taqdirda belgilangan tartibda
        “Sertifikat” berish;
      </P>
      <P>
        2.4.4. Dars va mashg‘ulotlarda urushni, zo‘ravonlikni targ‘ib qilishdan foydalanishga,
        fuqarolarning konstitutsiyaviy huquqlari va erkinligi kamsitilishiga, mamlakatdagi
        xavfsizlik va ijtimoiy-siyosiy barqarorlikka, jamiyatning huquqiy va ma’naviy asoslari,
        fuqarolar osoyishtaligiga, millatlararo va dinlararo totuvlikka raxna solinishiga,
        O‘zbekiston Respublikasi to‘g‘risida noto‘g‘ri axborotlar tarqatilishiga hamda uning
        tarixiy, madaniy va ma’naviy qadriyatlari buzib ko‘rsatilishiga yo‘l qo‘ymaslik.
      </P>
    </Band>

    <Band title="3. O‘ZARO HISOB-KITOB TARTIBI">
      <P>
        3.1.“O‘quvchi” tomonidan oldindan biryo‘la {data.total_price}({data.total_price_text}) so‘m
        miqdorida yoki har oyning 10-sanasiga qadar shu oy uchun oldindan {data.monthly_price}(
        {data.monthly_price_text}) so‘m miqdorida naqd pul, pul o‘tkazish yoki bank muassasalari
        orqali to‘lov amalga oshiriladi.
      </P>
      <P>
        3.2.“O‘quvchi” “Shartnoma” imzolanib, to‘lovlar amalga oshirilgandan so‘ng o‘quv
        mashg‘ulotlari boshlanishiga 48 soat vaqt qolgandan so‘ng “Shartnoma”ni bekor qilish
        to‘g‘risida murojaat etgan taqdirda to‘lov summasining 50% (ellik) foizi kompensatsiya
        sifatida ushlab qolinadi hamda ushlanib qolgan qismi “O‘quvchi”ga qaytarib berilmaydi.
      </P>
      <P>
        3.3.“O‘quv markazi” tomonidan to‘lov narxi yangi narxnoma (preyskurant) bo‘yicha o‘zgargan
        taqdirda oshirilishi mumkin.
      </P>
      <P>
        3.4.Bunda “O‘quvchi” tomonidan oldindan qilingan to‘lovlar miqdori to‘lov muddati
        oxirigacha oshirilishiga va “O‘quvchi”dan qo‘shimcha to‘lovlar undirilishiga yo‘l
        qo‘yilmaydi.
      </P>
    </Band>

    <Band title="FORS-MAJOR HOLATLARI">
      <P>
        4.1.“Tomonlar”ga bog‘liq bo‘lmagan holda yengib bo‘lmas kuch ta’sirida “Shartnoma”
        shartlarini bajarish imkoniyati bo‘lmagan taqdirda (suv toshqini, yongʻin, yer qimirlashi
        va boshqa tabiiy ofatlar, epidemiya, epizootiya, karantin va boshqalar), shuningdek
        hukumat qarori bilan majburiyatlarni bajarishga taʼsir koʻrsatadigan maʼlum cheklovlar
        oʻrnatilgan taqdirda taraflar bir birini 10 (oʻn) kun muddat ichida bu toʻgʻrisida xabardor
        qilishi lozim.
        <br />
        Ushbu davr mobaynida “Shartnoma” boʻyicha majburiyatlar huquqiy oqibat keltirib chiqarmaydi.
      </P>
    </Band>

    <Band title="5. “SHARTNOMA”NI OʻZGARTIRISH, UNGA QOʻSHIMCHALAR KIRITISH VA UNI BEKOR QILISH TARTIBI">
      <P>
        5.1. Ushbu “Shartnoma” “Tomonlar”ning roziligi bilan yozma kelishuviga koʻra
        oʻzgartirilishi, qoʻshimchalar kiritilishi va istalgan vaqtda bekor qilinishi mumkin.
      </P>
      <P>
        5.2. Ushbu “Shartnoma” quyidagi holatlarda “Oʻquv markazi” tomonidan “O‘quvchi”ni og‘zaki
        yoki yozma 10 (oʻn) kun oldin ogohlantirib bir tomonlama bekor qilinishi mumkin:
      </P>
      <P>
        5.2.1. “Oʻquvchi” tomonidan ushbu “Shartnoma” shartlari qoʻpol ravishda buzilib, oʻz
        majburiyatlarini bajarmasa, shuningdek shartnomada belgilangan toʻlovlarni oʻz vaqtida
        amalga oshirmagan taqdirda;
      </P>
      <P>
        5.2.2. “Oʻquvchi” sanitariya-gigiyena talablariga, yongʻin xavfsizligi qoidalariga rioya
        qilmaganda, oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga, oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilmaganda;
      </P>
      <P>
        5.2.3. “Oʻquv markazi”ning tashabbusi bilan uning ustaviga (nizomiga) koʻra, “Oʻquvchi”
        oʻqishdan chetlatilganda.
      </P>
      <P>5.3.Taʼlim muassasasi tugatilgan taqdirda “Shartnoma” oʻz-oʻzidan bekor boʻlgan hisoblanadi.</P>
    </Band>

    <Band title="6. “TOMONLAR”NING JAVOBGARLIGI VA NIZOLARNI HAL QILISH TARTIBI">
      <P>
        6.1. Mazkur “Shartnoma”da koʻzda tutilgan shartlar va majburiyatlarni bajarmaslik yoki
        lozim darajada bajarmaslik hollari, “Tomonlar”ni Oʻzbekiston Respublikasining amaldagi
        qonunchiligiga muvofiq javobgarlikka tortilishiga sabab boʻladi.
      </P>
      <P>
        6.2.“Tomonlar” “Shartnoma” imzolanib kuchga kirganidan soʻng oʻz majburiyatlarini
        bajarmasalar yoki lozim darajada bajarmasalar 15% miqdorida jarima toʻlaydilar.
      </P>
      <P>
        6.3.Oʻzaro kelishmovchiliklar yuzaga kelgan taqdirda barcha masalalar ikki tomonlama
        muzokaralar yoʻli bilan hal qilinadi, kelishish imkoni boʻlmaganda esa nizo qonunda
        belgilangan tartibda Andijon shahar fuqarolik sudida hal qilinadi.
      </P>
    </Band>

    <Band title="7. “SHARTNOMA”NING AMAL QILISHI">
      <P>
        7.1. Ushbu “Shartnoma” {data.contract_start_date} sanasida tuzildi hamda{' '}
        {data.contract_expiry_date} sanasigacha amal qiladi. “Shartnoma” muddati tugashi bilan
        “Shartnoma” bekor bo‘lgan hisoblanadi.
      </P>
      <P>
        7.2.Ushbu “Shartnoma” har bir tomonga bir nusxadan saqlash uchun bir xil yuridik kuchga ega
        bo‘lgan 2 (ikki) nusxada tuzildi.
      </P>
      <P>
        7.3. Ushbu “Shartnoma” tomonlarning roziligini ifodalaydigan hamda uni identifikatsiya va
        autentifikatsiya qilish imkonini beradigan elektron tasdiqlash usullari (“SMS”, “Face-ID”
        va boshqalar) ham imzo sifatida tan olinadi va shartnoma tuzilgan hisoblanadi.
      </P>
    </Band>

    <Band title="8. “TOMONLAR”NING MANZILLARI VA IMZOLARI:">
      <SignatureTable
        columns={[
          {
            title: '“O‘QUV MARKAZI”',
            lines: [
              data.branch_legal_name,
              `“ILM PLYUS” o‘quv markazi (${data.branch_short_name})`,
              `Yuridik manzil: ${data.branch_legal_address}`,
              `Filial manzili: ${data.branch_address}`,
              `Tel: ${data.branch_phone}`,
              `STIR:${data.branch_inn}; IFUT (OKED): ${data.branch_oked}`,
              `H/R: ${data.account_number}`,
              data.bank_name,
              `MFO: ${data.mfo}`,
            ],
          },
          {
            title: '“O‘QUVCHI”',
            lines: [
              U(data.student_last_name),
              U(data.student_first_father_name),
              `Ro‘yxatga qo‘yilgan manzili: ${data.registered_address}`,
              `Yashash manzili: ${data.residential_address}`,
              `Tel: ${data.phone}`,
              `Pasport/ID-karta: ${data.passport_full}`,
              `JSHSHIR: ${data.jshshir}`,
            ],
          },
        ]}
      />
    </Band>
  </div>
);

// ───────────────────────── 02. Voyaga yetmagan o'quvchi, Vakil orqali (minor) ─────────────────────────

const MinorText = ({ data }: { data: ContractTemplateData }) => (
  <div className="cc-legal">
    <Heading number={data.contract_number} />
    <Meta city={data.city} date={data.contract_date} />

    <P>
      Ushbu Haq evaziga taʼlim xizmati koʻrsatish toʻgʻrisidagi (ikki tomonlama) shartnoma (keyingi
      oʻrinlarda ‒ “Shartnoma” deb yuritiladi) birinchi tomondan oʻz Nizomi asosida faoliyat
      yurituvchi <strong>{data.branch_legal_name}</strong>(keyingi oʻrinlarda – “Oʻquv markazi” deb
      yuritiladi) nomidan ish yurituvchi Bosh direktor <strong>{U(data.director_name)}</strong>,
      ikkinchi tomondan {data.citizenship_text}{' '}
      <strong>{U(data.representative_full_name)}</strong>(pasport/ID-karta: seriyasi:{' '}
      {data.passport_series} raqami: <strong>{data.passport_number}</strong>; tugʻilgan sanasi:{' '}
      {data.representative_birth_date}; berilgan sanasi: {data.passport_given_date}; amal qilish
      muddati: {data.passport_expiry_date}; berilgan joyi: {data.passport}; keyingi oʻrinlarda –
      “Vakil” deb yuritiladi) oʻrtasida (keyingi oʻrinlarda ‒ “Tomonlar” deb yuritiladi) ushbu
      “Shartnoma” quyidagi mazmunda tuzildi.
    </P>

    <Band title="1. “SHARTNOMA”NING PREDMETI">
      <P>
        1.1. “Oʻquv markazi” “<strong>{data.course_name}</strong>” oʻquv kursi boʻyicha “Vakil”ning
        farzandi yoki farzandlarini (keyingi oʻrinlarda – “Oʻquvchi” deb yuritiladi) oʻqitish,
        “Vakil” esa buning uchun kelishilgan narxlarda haq toʻlash majburiyatini oladi.
      </P>
      <P>1.2. “Oʻquvchi”lar:</P>
      <StudentsTable students={data.students} />
      <P>jami qiymati soʻz bilan: {data.total_price_text} soʻm.</P>
    </Band>

    <Band title="2. “TOMONLAR”NING MAJBURIYATLARI">
      <P>2.1. “Vakil”ning huquqlari:</P>
      <P>
        2.1.1. “Oʻquv markazi” oʻquv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        koʻrsatilgan oʻquv kursi yoki fanlari boʻyicha “Oʻquvchi”ga taʼlim berilishini talab
        qilish;
      </P>
      <P>
        2.1.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim
        berilishini talab qilish;
      </P>
      <P>
        2.1.3. Oʻquv jarayoniga xalal bermagan holda qatnashish va oʻz fikr mulohazalari yoki
        eʼtirozlarini mashgʻulot yakunlanganidan soʻng bayon etish;
      </P>
      <P>
        2.1.4. “Shartnoma”da koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha oʻquv muddati soʻnggida
        yakuniy imtihonlardan ijobiy natijalar bilan oʻtgan taqdirda belgilangan tartibda
        “Qoʻshimcha taʼlim dasturini tamomlaganlik toʻgʻrisidagi sertifikat” (keyingi oʻrinlarda ‒
        “Sertifikat” deb yuritiladi) olish.
      </P>
      <P>2.2. “Vakil”ning majburiyatlari:</P>
      <P>
        2.2.1. Ushbu “Shartnoma”da koʻrsatilgan narxlarda “Oʻquv markazi”ga oldindan 100 (bir yuz)
        foiz miqdorida haq toʻlash;
      </P>
      <P>
        2.2.2. Sanitariya-gigiyena talablariga hamda yongʻin xavfsizligi qoidalariga rioya
        qilinishini taʼminlash;
      </P>
      <P>
        2.2.3. Oʻquv guruhi mashgʻulotlarida muntazam ishtirok etilishini, dars mashgʻulotlarida
        uzrli sabablar bilan qatnasha olmagan taqdirda, bu haqida “Oʻquv markazi”ni oldindan
        ogohlantirish;
      </P>
      <P>
        2.2.4. Oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga hamda oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilinishini taʼminlash.
      </P>
      <P>2.3. “Oʻquv markazi”ning huquqlari:</P>
      <P>
        2.3.1. “Vakil”dan ushbu “Shartnoma”da koʻrsatilgan narxda “Oʻquv markazi”ga oldindan 100
        (bir yuz) foiz miqdorida haq toʻlashni talab qilish hamda oldindan toʻlov amalga
        oshirilmagan taqdirda, “Oʻquvchi”ni oʻquv mashgʻulotlariga kiritmaslik;
      </P>
      <P>
        2.3.2. “Oʻquvchi” sababsiz oʻquv mashgʻulotlariga kelmaganligi yoki boshqa aybi bilan
        qoldirilgan darslarni oʻtib bermaslik (bunda “Oʻquvchi” qoldirilgan oʻquv mashgʻulotlarini
        mustaqil oʻzlashtiradi yoki taraflar kelishuviga koʻra qoʻshimcha haq evaziga oʻqitilishi
        mumkin);
      </P>
      <P>
        2.3.3. Oʻquv guruhlari toʻlmagan taqdirda hamda uzrli sabablarga koʻra oʻquv mashgʻulotlari
        va oʻquv davrini boshqa vaqtga bir tomonlama “Vakil”ning roziligisiz uni ogohlantirgan
        holda koʻchirish;
      </P>
      <P>
        2.3.4. Oʻquv guruhlarida oʻquvchilar soni 5 (besh) nafardan kam boʻlsa oʻquv mashgʻulotlari
        boʻyicha maʼlumotlar toʻliq saqlangan holda oʻquv soatlarini bir tomonlama “Vakil”ning
        roziligisiz qisqartirish;
      </P>
      <P>
        2.3.5. “Oʻquv markazi”da oʻquv xonalari band boʻlgan taqdirda mashgʻulotlar jadvalini bir
        tomonlama “Vakil”ning roziligisiz uni ogohlantirgan holda oʻzgartirish;
      </P>
      <P>
        2.3.6. “Oʻquvchi” sanitariya-gigiyena talablariga hamda yongʻin xavfsizligi qoidalariga
        rioya qilmagan taqdirda oʻquv mashgʻulotlaridan chetlatish va bu haqda “Vakil”ga xabar
        berish;
      </P>
      <P>
        2.3.7. “Oʻquvchi” oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga hamda oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilmagan taqdirda oʻquv mashgʻulotlaridan
        chetlashtirish va bu haqda “Vakil”ga xabar berish.
      </P>
      <P>2.4. “Oʻquv markazi”ning majburiyatlari:</P>
      <P>
        2.4.1. “Oʻquv markazi” oʻquv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha taʼlim berish;
      </P>
      <P>
        2.4.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim
        berish;
      </P>
      <P>
        2.4.3. “Shartnoma”da koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha oʻquv muddati soʻnggida
        yakuniy imtihonlardan ijobiy natijalar bilan oʻtgan taqdirda belgilangan tartibda
        “Sertifikat” berish;
      </P>
      <P>
        2.4.4. Dars va mashgʻulotlarda urushni, zoʻravonlikni targʻib qilishdan foydalanishga,
        fuqarolarning konstitutsiyaviy huquqlari va erkinligi kamsitilishiga, mamlakatdagi
        xavfsizlik va ijtimoiy-siyosiy barqarorlikka, jamiyatning huquqiy va maʼnaviy asoslari,
        fuqarolar osoyishtaligiga, millatlararo va dinlararo totuvlikka raxna solinishiga,
        Oʻzbekiston Respublikasi toʻgʻrisida notoʻgʻri axborotlar tarqatilishiga hamda uning
        tarixiy, madaniy va maʼnaviy qadriyatlari buzib koʻrsatilishiga yoʻl qoʻymaslik.
      </P>
    </Band>

    <Band title="3. OʻZARO HISOB-KITOB TARTIBI">
      <P>
        3.1.“Vakil” tomonidan “Shartnoma” imzolanganidan soʻng 10 kun muddat ichida oldindan
        biryoʻla {data.total_price} ({data.total_price_text}) soʻm miqdorida yoki har oyning
        10-sanasiga qadar shu oy uchun oldindan {data.monthly_price}({data.monthly_price_text})
        soʻm miqdorida naqd pul, pul oʻtkazish yoki bank muassasalari orqali toʻlov amalga
        oshiriladi.
      </P>
      <P>
        3.2.“Vakil” “Shartnoma” imzolanib, to‘lovlar amalga oshirilgandan so‘ng o‘quv
        mashg‘ulotlari boshlanishiga 48 soat vaqt qolgandan so‘ng “Shartnoma”ni bekor qilish
        to‘g‘risida murojaat etgan taqdirda to‘lov summasining 50 (ellik) foizi kompensatsiya
        sifatida ushlab qolinadi hamda ushlanib qolgan qismi “Vakil”ga qaytarib berilmaydi.
      </P>
      <P>
        3.3.“O‘quv markazi” tomonidan to‘lov narxi yangi narxnoma (preyskurant) bo‘yicha o‘zgargan
        taqdirda oshirilishi mumkin.
      </P>
      <P>
        3.4.Bunda “Vakil” tomonidan oldindan qilingan to‘lovlar miqdori to‘lov muddati oxirigacha
        oshirilishiga va “Vakil”dan qo‘shimcha to‘lovlar undirilishiga yo‘l qo‘yilmaydi.
      </P>
    </Band>

    <Band title="4. FORS-MAJOR HOLATLARI">
      <P>
        4.1.“Tomonlar”ga bogʻliq boʻlmagan holda yengib boʻlmas kuch taʼsirida “Shartnoma”
        shartlarini bajarish imkoniyati boʻlmagan taqdirda (suv toshqini, yongʻin, yer qimirlashi
        va boshqa tabiiy ofatlar, epidemiya, epizootiya, karantin va boshqalar), shuningdek
        hukumat qarori bilan majburiyatlarni bajarishga taʼsir koʻrsatadigan maʼlum cheklovlar
        oʻrnatilgan taqdirda taraflar bir birini 10 (oʻn) kun muddat ichida bu toʻgʻrisida xabardor
        qilishi lozim.
        <br />
        Ushbu davr mobaynida “Shartnoma” boʻyicha majburiyatlar huquqiy oqibat keltirib chiqarmaydi.
      </P>
    </Band>

    <Band title="5. “SHARTNOMA”NI OʻZGARTIRISH, UNGA QOʻSHIMCHALAR KIRITISH VA UNI BEKOR QILISH TARTIBI">
      <P>
        5.1. Ushbu “Shartnoma” “Tomonlar”ning roziligi bilan yozma kelishuviga koʻra
        oʻzgartirilishi, qoʻshimchalar kiritilishi va istalgan vaqtda bekor qilinishi mumkin.
      </P>
      <P>
        5.2. Ushbu “Shartnoma” quyidagi holatlarda “Oʻquv markazi” tomonidan “Vakil”ni 10 (oʻn) kun
        oldin ogohlantirib bir tomonlama bekor qilinishi mumkin:
      </P>
      <P>
        5.2.1. “Vakil” tomonidan ushbu “Shartnoma” shartlari qoʻpol ravishda buzilib, oʻz
        majburiyatlarini bajarmasa, shuningdek shartnomada belgilangan toʻlovlarni oʻz vaqtida
        amalga oshirmagan taqdirda;
      </P>
      <P>
        5.2.2. “Oʻquvchi” sanitariya-gigiyena talablariga, yongʻin xavfsizligi qoidalariga rioya
        qilmaganda, oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga, oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilmaganda;
      </P>
      <P>
        5.2.3. “Oʻquv markazi”ning tashabbusi bilan uning ustaviga (nizomiga) koʻra, “Oʻquvchi”
        oʻqishdan chetlatilganda.
      </P>
      <P>5.3.Taʼlim muassasasi tugatilgan taqdirda “Shartnoma” oʻz-oʻzidan bekor boʻlgan hisoblanadi.</P>
    </Band>

    <Band title="6. “TOMONLAR”NING JAVOBGARLIGI VA NIZOLARNI HAL QILISH TARTIBI">
      <P>
        6.1.Mazkur “Shartnoma”da koʻzda tutilgan shartlar va majburiyatlarni bajarmaslik yoki lozim
        darajada bajarmaslik hollari, “Tomonlar”ni Oʻzbekiston Respublikasining amaldagi
        qonunchiligiga muvofiq javobgarlikka tortilishiga sabab boʻladi.
      </P>
      <P>
        6.2.“Tomonlar” “Shartnoma” imzolanib kuchga kirganidan soʻng oʻz majburiyatlarini
        bajarmasalar yoki lozim darajada bajarmasalar 15% miqdorida jarima toʻlaydilar.
      </P>
      <P>
        6.3.Oʻzaro kelishmovchiliklar yuzaga kelgan taqdirda barcha masalalar ikki tomonlama
        muzokaralar yoʻli bilan hal qilinadi, kelishish imkoni boʻlmaganda esa nizo qonunda
        belgilangan tartibda Andijon shahar fuqarolik sudida hal qilinadi.
      </P>
    </Band>

    <Band title="7. “SHARTNOMA”NING AMAL QILISHI">
      <P>
        7.1.Ushbu “Shartnoma” {data.contract_start_date} sanasida tuzildi hamda{' '}
        {data.contract_expiry_date} sanasigacha amal qiladi. “Shartnoma” muddati tugashi bilan
        “Shartnoma” bekor boʻlgan hisoblanadi.
      </P>
      <P>
        7.2.Ushbu “Shartnoma” har bir tomonga bir nusxadan saqlash uchun bir xil yuridik kuchga ega
        boʻlgan 2 (ikki) nusxada tuzildi.
      </P>
      <P>
        7.3. Ushbu “Shartnoma” tomonlarning roziligini ifodalaydigan hamda uni identifikatsiya va
        autentifikatsiya qilish imkonini beradigan elektron tasdiqlash usullari (“SMS”, “Face-ID”
        va boshqalar) ham imzo sifatida tan olinadi va shartnoma tuzilgan hisoblanadi.
      </P>
    </Band>

    <Band title="8. “TOMONLAR”NING MANZILLARI VA IMZOLARI:">
      <SignatureTable
        columns={[
          {
            title: '“OʻQUV MARKAZI”',
            lines: [
              data.branch_legal_name,
              `“(${data.branch_short_name})” (${data.branch_name})`,
              `Yuridik manzil: ${data.branch_legal_address}`,
              `Filial manzili: ${data.branch_address},`,
              `Tel: ${data.branch_phone}`,
              `STIR:${data.branch_inn}; IFUT (OKED): ${data.branch_oked}`,
              `H/R: ${data.account_number}`,
              data.bank_name,
              `MFO: ${data.mfo}`,
            ],
          },
          {
            title: '“VAKIL”',
            lines: [
              U(data.representative_last_name),
              U(data.representative_first_father_name),
              `Yashash manzili: ${data.representative_residental_address}`,
              `Pasport/ID-karta: ${data.representative_passport_full}`,
              `Tel:${data.representative_phone}`,
              `JShShIR: ${data.representative_jshshr}`,
            ],
          },
        ]}
      />
    </Band>
  </div>
);

// ───────────────────────── 03. Tashkilot bilan, ikki tomonlama (legal_bilateral) ─────────────────────────

const LegalBilateralText = ({ data }: { data: ContractTemplateData }) => (
  <div className="cc-legal">
    <Heading number={data.contract_number} />
    <Meta city={data.city} date={data.contract_date} />

    <P>
      Ushbu Haq evaziga ta’lim xizmati ko‘rsatish to‘g‘risidagi (ikki tomonlama) shartnoma (keyingi
      o‘rinlarda ‒ “Shartnoma” deb yuritiladi) birinchi tomondan o‘z Nizomi asosida faoliyat
      yurituvchi <strong>{data.branch_legal_name}</strong> (keyingi o‘rinlarda – “O‘quv markazi” deb
      yuritiladi) nomidan ish yurituvchi Bosh direktor <strong>{U(data.director_name)}</strong>,
      ikkinchi tomondan o‘z {data.charter_info} asosida faoliyat yurituvchi “
      <strong>{data.company_name}</strong>” mas’uliyati cheklangan jamiyati nomidan ish yurituvchi
      rahbari <strong>{U(data.company_director_name)}</strong> (keyingi o‘rinlarda – “Buyurtmachi”
      deb yuritiladi) o‘rtasida (keyingi o‘rinlarda ‒ “Tomonlar” deb yuritiladi) ushbu “Shartnoma”
      quyidagi mazmunda tuzildi.
    </P>

    <Band title="1. “SHARTNOMA”NING PREDMETI">
      <P>
        1.1. “O‘quv markazi” “<strong>{data.course_name}</strong>” / “
        <strong>{data.course_name}</strong>” o‘quv kursi bo‘yicha “Buyurtmachi” tomonidan
        yo‘naltirilgan fuqaro (fuqarolar)ni (keyingi o‘rinlarda – “O‘quvchi” deb yuritiladi)
        o‘qitish, “Buyurtmachi” esa buning uchun kelishilgan narxlarda haq to‘lash majburiyatini
        oladi.
      </P>
      <P>1.2. “O‘quvchi”lar:</P>
      <StudentsTable students={data.students} />
      <P>jami qiymati so‘z bilan: {data.total_price_text} so‘m.</P>
    </Band>

    <Band title="2. “TOMONLAR”NING MAJBURIYATLARI">
      <P>2.1.“Buyurtmachi”ning huquqlari:</P>
      <P>
        2.1.1. “O‘quv markazi” o‘quv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha “O‘quvchi”ga ta’lim berilishini talab qilish;
      </P>
      <P>
        2.1.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda ta’lim
        berilishini talab qilish;
      </P>
      <P>
        2.1.3. “Shartnoma”da ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha o‘quv muddati so‘nggida
        yakuniy imtihonlardan ijobiy natijalar bilan o‘tgan taqdirda belgilangan tartibda
        “Qo‘shimcha ta’lim dasturini tamomlaganlik to‘g‘risidagi sertifikat” (keyingi o‘rinlarda ‒
        “Sertifikat” deb yuritiladi) olish.
      </P>
      <P>2.2. “Buyurtmachi”ning majburiyatlari:</P>
      <P>
        2.2.1. Ushbu “Shartnoma”da ko‘rsatilgan narxda “O‘quv markazi”ga oldindan 100 (bir yuz)
        foiz miqdorida haq to‘lash;
      </P>
      <P>
        2.2.2. Sanitariya-gigiyena talablariga hamda yong‘in xavfsizligi qoidalariga rioya
        qilinishini ta’minlash;
      </P>
      <P>
        2.2.3. O‘quv guruhi mashg‘ulotlarida muntazam ishtirok etilishini, dars mashg‘ulotlarida
        uzrli sabablar bilan qatnasha olmagan “O‘quvchi” haqida “O‘quv markazi”ni oldindan
        ogohlantirish;
      </P>
      <P>
        2.2.4. O‘quv guruhi mashg‘ulotlarida odob-axloq me’yorlariga hamda o‘quv guruhi
        rahbarining qonuniy talablariga rioya qilinishini ta’minlash.
      </P>
      <P>2.3. “O‘quv markazi”ning huquqlari:</P>
      <P>
        2.3.1. “Buyurtmachi”dan ushbu “Shartnoma”da ko‘rsatilgan narxda “O‘quv markazi”ga
        oldindan 100 (bir yuz) foiz miqdorida haq to‘lashni talab qilish hamda oldindan to‘lov
        amalga oshirilmagan taqdirda, “Buyurtmachi” tomonidan yo‘naltirilgan fuqaro (fuqarolar)ni
        o‘quv mashg‘ulotlariga kiritmaslik;
      </P>
      <P>
        2.3.2. “O‘quvchi” sababsiz o‘quv mashg‘ulotlariga kelmaganligi yoki boshqa aybi bilan
        qoldirilgan darslarni o‘tib bermaslik (bunda “Buyurtmachi” “O‘quvchi”si qoldirilgan o‘quv
        mashg‘ulotlarini mustaqil o‘zlashtiradi yoki taraflar kelishuviga koʻra qoʻshimcha haq
        evaziga oʻqitilishi mumkin);
      </P>
      <P>
        2.3.3. O‘quv guruhlari to‘lmagan taqdirda hamda uzrli sabablarga ko‘ra o‘quv mashg‘ulotlari
        va o‘quv davrini boshqa vaqtga bir tomonlama “Buyurtmachi”ning roziligisiz uni
        ogohlantirgan holda ko‘chirish;
      </P>
      <P>
        2.3.4. O‘quv guruhlarida o‘quvchilar soni 5 (besh) nafardan kam bo‘lsa o‘quv mashg‘ulotlari
        bo‘yicha ma’lumotlar to‘liq saqlangan holda o‘quv soatlarini bir tomonlama
        “Buyurtmachi”ning roziligisiz qisqartirish;
      </P>
      <P>
        2.3.5. “O‘quv markazi”da o‘quv xonalari band bo‘lgan taqdirda mashg‘ulotlar jadvalini bir
        tomonlama “Buyurtmachi”ning roziligisiz uni ogohlantirgan holda o‘zgartirish;
      </P>
      <P>
        2.3.6. “O‘quvchi” sanitariya-gigiyena talablariga hamda yong‘in xavfsizligi qoidalariga
        rioya qilmagan taqdirda o‘quv mashg‘ulotlaridan chetlatish va bu haqda “Buyurtmachi”ga
        xabar berish;
      </P>
      <P>
        2.3.7. “O‘quvchi” o‘quv guruhi mashg‘ulotlarida odob-axloq me’yorlariga hamda o‘quv
        guruhi rahbarining qonuniy talablariga rioya qilmagan taqdirda o‘quv mashg‘ulotlaridan
        chetlashtirish va bu haqda “Buyurtmachi”ga xabar berish.
      </P>
      <P>2.4. “O‘quv markazi”ning majburiyatlari:</P>
      <P>
        2.4.1. “O‘quv markazi” o‘quv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha ta’lim berish;
      </P>
      <P>
        2.4.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda ta’lim
        berish;
      </P>
      <P>
        2.4.3. “Shartnoma”da ko‘rsatilgan o‘quv kursi yoki fanlar bo‘yicha o‘quv muddati so‘nggida
        yakuniy imtihonlardan ijobiy natijalar bilan o‘tgan “O‘quvchi”larga belgilangan tartibda
        “Sertifikat” berish;
      </P>
      <P>
        2.4.4. Dars va mashg‘ulotlarda urushni, zo‘ravonlikni targ‘ib qilishdan foydalanishga,
        fuqarolarning konstitutsiyaviy huquqlari va erkinligi kamsitilishiga, mamlakatdagi
        xavfsizlik va ijtimoiy-siyosiy barqarorlikka, jamiyatning huquqiy va ma’naviy asoslari,
        fuqarolar osoyishtaligiga, millatlararo va dinlararo totuvlikka raxna solinishiga,
        O‘zbekiston Respublikasi to‘g‘risida noto‘g‘ri axborotlar tarqatilishiga hamda uning
        tarixiy, madaniy va ma’naviy qadriyatlari buzib ko‘rsatilishiga yo‘l qo‘ymaslik.
      </P>
    </Band>

    <Band title="3. O‘ZARO HISOB-KITOB TARTIBI">
      <P>
        3.1.“Buyurtmachi” tomonidan “Shartnoma” imzolanganidan so‘ng 10 kun muddat ichida
        oldindan biryo‘la {data.total_price} ({data.total_price_text}) so‘m miqdorida yoki har
        oyning 10-sanasiga qadar shu oy uchun oldindan {data.monthly_price}(
        {data.monthly_price_text}) so‘m miqdorida naqd pul, pul o‘tkazish yoki bank muassasalari
        orqali to‘lov amalga oshiriladi.
      </P>
      <P>
        3.2.“Buyurtmachi” “Shartnoma” imzolanib, to‘lovlar amalga oshirilgandan so‘ng o‘quv
        mashg‘ulotlari boshlanishiga 48 soat vaqt qolgandan so‘ng “Shartnoma”ni bekor qilish
        to‘g‘risida murojaat etgan taqdirda to‘lov summasining 50 (ellik) foizi kompensatsiya
        sifatida ushlab qolinadi hamda ushlanib qolgan qismi “Buyurtmachi”ga qaytarib berilmaydi.
      </P>
      <P>
        3.3.“O‘quv markazi” tomonidan to‘lov narxi yangi narxnoma (preyskurant) bo‘yicha o‘zgargan
        taqdirda oshirilishi mumkin.
      </P>
      <P>
        3.4.Bunda “Buyurtmachi” tomonidan oldindan qilingan to‘lovlar miqdori to‘lov muddati
        oxirigacha oshirilishiga va “Buyurtmachi”dan qo‘shimcha to‘lovlar undirilishiga yo‘l
        qo‘yilmaydi.
      </P>
    </Band>

    <Band title="4. FORS-MAJOR HOLATLARI">
      <P>
        4.1.“Tomonlar”ga bogʻliq boʻlmagan holda yengib boʻlmas kuch taʼsirida “Shartnoma”
        shartlarini bajarish imkoniyati boʻlmagan taqdirda (suv toshqini, yongʻin, yer qimirlashi
        va boshqa tabiiy ofatlar, epidemiya, epizootiya, karantin va boshqalar), shuningdek
        hukumat qarori bilan majburiyatlarni bajarishga taʼsir koʻrsatadigan maʼlum cheklovlar
        oʻrnatilgan taqdirda taraflar bir birini 10 (oʻn) kun muddat ichida bu toʻgʻrisida xabardor
        qilishi lozim.
        <br />
        Ushbu davr mobaynida “Shartnoma” boʻyicha majburiyatlar huquqiy oqibat keltirib chiqarmaydi.
      </P>
    </Band>

    <Band title="5. “SHARTNOMA”NI O‘ZGARTIRISH, QO‘SHIMCHALAR KIRITISH VA BEKOR QILISH TARTIBI">
      <P>
        5.1. Ushbu “Shartnoma” “Tomonlar”ning roziligi bilan yozma kelishuviga ko‘ra
        o‘zgartirilishi, qo‘shimchalar kiritilishi va istalgan vaqtda bekor qilinishi mumkin.
      </P>
      <P>
        5.2.Ushbu “Shartnoma” quyidagi holatlarda “O‘quv markazi” tomonidan “Buyurtmachi”ni 10
        (o‘n) kun oldin ogohlantirib bir tomonlama bekor qilinishi mumkin:
      </P>
      <P>
        5.2.1. “Buyurtmachi” tomonidan ushbu “Shartnoma” shartlari qoʻpol ravishda buzilib, oʻz
        majburiyatlarini bajarmasa, shuningdek shartnomada belgilangan toʻlovlarni oʻz vaqtida
        amalga oshirmagan taqdirda;
      </P>
      <P>
        5.2.2. “O‘quvchi” sanitariya-gigiyena talablariga, yong‘in xavfsizligi qoidalariga rioya
        qilmaganda, o‘quv guruhi mashg‘ulotlarida odob-axloq me’yorlariga, o‘quv guruhi
        rahbarining qonuniy talablariga rioya qilmaganda;
      </P>
      <P>
        5.2.3. “O‘quv markazi”ning tashabbusi bilan uning nizomiga (ustaviga) ko‘ra, “O‘quvchi”
        o‘qishdan chetlatilganda.
      </P>
      <P>5.3. Ta’lim muassasasi tugatilgan taqdirda “Shartnoma” o‘z-o‘zidan bekor bo‘lgan hisoblanadi.</P>
    </Band>

    <Band title="6. “TOMONLAR”NING JAVOBGARLIGI VA NIZOLARNI HAL QILISH TARTIBI">
      <P>
        6.1.Mazkur “Shartnoma”da ko‘zda tutilgan shartlar va majburiyatlarni bajarmaslik yoki
        lozim darajada bajarmaslik hollari, “Tomonlar”ni O‘zbekiston Respublikasining amaldagi
        qonunchiligiga muvofiq javobgarlikka tortilishiga sabab bo‘ladi.
      </P>
      <P>
        6.2.“Tomonlar” “Shartnoma” imzolanib kuchga kirganidan soʻng oʻz majburiyatlarini
        bajarmasalar yoki lozim darajada bajarmasalar 15% miqdorida jarima toʻlaydilar.
      </P>
      <P>
        6.3.O‘zaro kelishmovchiliklar yuzaga kelgan taqdirda barcha masalalar ikki tomonlama
        muzokaralar yo‘li bilan hal qilinadi, kelishish imkoni bo‘lmaganda esa nizo qonunda
        belgilangan tartibda {data.city} iqtisodiy sudida hal qilinadi.
      </P>
    </Band>

    <Band title="7. “SHARTNOMA”NING AMAL QILISHI">
      <P>
        7.1.Ushbu “Shartnoma” {data.contract_start_date} sanasida tuzildi hamda{' '}
        {data.contract_expiry_date} sanasigacha amal qiladi. “Shartnoma” muddati tugashi bilan
        “Shartnoma” bekor bo‘lgan hisoblanadi.
      </P>
      <P>
        7.2.Ushbu “Shartnoma” har bir tomonga bir nusxadan saqlash uchun bir xil yuridik kuchga ega
        bo‘lgan 2 (ikki) nusxada tuzildi.
      </P>
      <P>
        7.3. Ushbu “Shartnoma” tomonlarning roziligini ifodalaydigan hamda uni identifikatsiya va
        autentifikatsiya qilish imkonini beradigan elektron tasdiqlash usullari (“SMS”, “Face-ID”
        va boshqalar) ham imzo sifatida tan olinadi va shartnoma tuzilgan hisoblanadi.
      </P>
    </Band>

    <Band title="8. “TOMONLAR”NING MANZILLARI VA IMZOLARI:">
      <SignatureTable
        columns={[
          {
            title: '“O‘QUV MARKAZI”',
            lines: [
              data.branch_legal_name,
              `“(${data.branch_short_name})” o‘quv markazi (${data.branch_name})`,
              `Yuridik manzil: ${data.branch_legal_address}`,
              `Filial manzili: ${data.branch_address},`,
              `Tel: ${data.branch_phone}`,
              `STIR:${data.branch_inn}; IFUT (OKED): ${data.branch_oked}`,
              `H/R: ${data.account_number}`,
              data.bank_name,
              `MFO: ${data.mfo}`,
            ],
          },
          {
            title: '“BUYURTMACHI”',
            lines: [
              data.company_name,
              `Yuridik manzil:${data.company_legal_address}`,
              `Filial manzili:${data.company_branch_address}`,
              `Tel: ${data.company_phone}`,
              `STIR:${data.company_inn};IFUT(OKED): ${data.company_oked}`,
              `H/R: ${data.company_account_number}`,
              `${data.company_bank_name} ${data.company_bank_branch}`,
              `MFO: ${data.company_mfo}`,
            ],
          },
        ]}
      />
    </Band>
  </div>
);

// ───────────────────────── 04. Tashkilot + Vakil, uch tomonlama (legal_trilateral) ─────────────────────────

const LegalTrilateralText = ({ data }: { data: ContractTemplateData }) => (
  <div className="cc-legal">
    <Heading number={data.contract_number} />
    <Meta city={data.city} date={data.contract_date} />

    <P>
      Ushbu Haq evaziga taʼlim xizmati koʻrsatish toʻgʻrisidagi (uch tomonlama) shartnoma (keyingi
      oʻrinlarda ‒ “Shartnoma” deb yuritiladi) birinchi tomondan oʻz Nizomi asosida faoliyat
      yurituvchi <strong>{data.branch_legal_name}</strong> (keyingi oʻrinlarda – “Oʻquv markazi” deb
      yuritiladi) nomidan ish yurituvchi Bosh direktor <strong>{U(data.director_name)}</strong>,
      ikkinchi tomondan oʻz Nizomi asosida faoliyat yurituvchi “
      <strong>{data.company_name}</strong>” masʼuliyati cheklangan jamiyati nomidan ish yurituvchi
      rahbari <strong>{U(data.company_director_name)}</strong> (keyingi oʻrinlarda – “Buyurtmachi”
      deb yuritiladi), uchinchi tomondan {data.citizenship_text}{' '}
      <strong>{U(data.representative_full_name)}</strong> (pasport/ID-karta: seriyasi:{' '}
      {data.passport_series} raqami: <strong>{data.passport_number}</strong>; tugʻilgan sanasi:{' '}
      {data.representative_birth_date}; berilgan sanasi: {data.passport_given_date}; amal qilish
      muddati: {data.passport_expiry_date}; berilgan joyi: {data.passport}; keyingi oʻrinlarda –
      “Vakil” deb yuritiladi) oʻrtasida (keyingi oʻrinlarda ‒ “Tomonlar” deb yuritiladi) ushbu
      “Shartnoma” quyidagi mazmunda tuzildi.
    </P>

    <Band title="1. “ShARTNOMA”NING PREDMETI">
      <P>
        1.1. “Oʻquv markazi” “<strong>{data.course_name}</strong>” oʻquv kursi boʻyicha
        “Vakil”ning farzandi yoki farzandlarini (keyingi oʻrinlarda – “Oʻquvchi” deb yuritiladi)
        oʻqitish, “Buyurtmachi” esa buning uchun kelishilgan narxlarda haq toʻlash majburiyatini
        oladi.
      </P>
      <P>1.2. “Oʻquvchi”lar:</P>
      <StudentsTable students={data.students} />
      <P>jami qiymati so‘z bilan: {data.total_price_text} so‘m.</P>
    </Band>

    <Band title="2. “TOMONLAR”NING MAJBURIYaTLARI">
      <P>2.1. “Buyurtmachi” va “Vakil”ning huquqlari:</P>
      <P>
        2.1.1. “Oʻquv markazi” oʻquv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha “Oʻquvchi”ga taʼlim berilishini talab qilish;
      </P>
      <P>
        2.1.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim
        berilishini talab qilish;
      </P>
      <P>
        2.1.3. “Shartnoma”da koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha oʻquv muddati soʻnggida
        yakuniy imtihonlardan ijobiy natijalar bilan oʻtgan taqdirda belgilangan tartibda
        “Qoʻshimcha taʼlim dasturini tamomlaganlik toʻgʻrisidagi sertifikat” (keyingi oʻrinlarda ‒
        “Sertifikat” deb yuritiladi) olish.
      </P>
      <P>2.2. “Buyurtmachi” va “Vakil”ning majburiyatlari:</P>
      <P>
        2.2.1. Ushbu “Shartnoma”da koʻrsatilgan narxlarda “Oʻquv markazi”ga oldindan 100 (bir yuz)
        foiz miqdorida haq toʻlash;
      </P>
      <P>
        2.2.2. Sanitariya-gigiyena talablariga hamda yongʻin xavfsizligi qoidalariga rioya
        qilinishini taʼminlash;
      </P>
      <P>
        2.2.3. Oʻquv guruhi mashgʻulotlarida muntazam ishtirok etilishini, dars mashgʻulotlarida
        uzrli sabablar bilan qatnasha olmagan “O‘quvchi” haqida “Oʻquv markazi”ni oldindan
        ogohlantirish;
      </P>
      <P>
        2.2.4. Oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga hamda oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilinishini taʼminlash.
      </P>
      <P>2.3. “Oʻquv markazi”ning huquqlari:</P>
      <P>
        2.3.1. “Buyurtmachi” va “Vakil”dan ushbu “Shartnoma”da koʻrsatilgan narxda “Oʻquv
        markazi”ga oldindan 100 (bir yuz) foiz miqdorida haq toʻlashni talab qilish hamda oldindan
        toʻlov amalga oshirilmagan taqdirda, “Oʻquvchi”ni oʻquv mashgʻulotlariga kiritmaslik;
      </P>
      <P>
        2.3.2. “Oʻquvchi” sababsiz oʻquv mashgʻulotlariga kelmaganligi yoki boshqa aybi bilan
        qoldirilgan darslarni oʻtib bermaslik (bunda “Oʻquvchi” qoldirilgan oʻquv mashgʻulotlarini
        mustaqil oʻzlashtiradi yoki taraflar kelishuviga koʻra qoʻshimcha haq evaziga oʻqitilishi
        mumkin);
      </P>
      <P>
        2.3.3. Oʻquv guruhlari toʻlmagan taqdirda hamda uzrli sabablarga koʻra oʻquv mashgʻulotlari
        va oʻquv davrini boshqa vaqtga bir tomonlama “Buyurtmachi” va “Vakil”ning roziligisiz uni
        ogohlantirgan holda koʻchirish;
      </P>
      <P>
        2.3.4. Oʻquv guruhlarida oʻquvchilar soni 5 (besh) nafardan kam boʻlsa oʻquv mashgʻulotlari
        boʻyicha maʼlumotlar toʻliq saqlangan holda oʻquv soatlarini bir tomonlama “Buyurtmachi” va
        “Vakil”ning roziligisiz qisqartirish;
      </P>
      <P>
        2.3.5. “Oʻquv markazi”da oʻquv xonalari band boʻlgan taqdirda mashgʻulotlar jadvalini bir
        tomonlama “Buyurtmachi” va “Vakil”ning roziligisiz uni ogohlantirgan holda oʻzgartirish;
      </P>
      <P>
        2.3.6. “Oʻquvchi” sanitariya-gigiyena talablariga hamda yongʻin xavfsizligi qoidalariga
        rioya qilmagan taqdirda oʻquv mashgʻulotlaridan chetlatish va bu haqda “Buyurtmachi” yoki
        “Vakil”ga xabar berish;
      </P>
      <P>
        2.3.7. “Oʻquvchi” oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga hamda oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilmagan taqdirda oʻquv mashgʻulotlaridan
        chetlashtirish va bu haqda “Buyurtmachi” yoki “Vakil” xabar berish.
      </P>
      <P>2.4. “Oʻquv markazi”ning majburiyatlari:</P>
      <P>
        2.4.1. “Oʻquv markazi” oʻquv dasturiga muvofiq belgilangan muddatlarda “Shartnoma”da
        koʻrsatilgan fanlar boʻyicha taʼlim berish;
      </P>
      <P>
        2.4.2. Sanitariya-gigiyena talablariga javob beradigan xonalarda va sharoitda taʼlim
        berish;
      </P>
      <P>
        2.4.3. “Shartnoma”da koʻrsatilgan oʻquv kursi yoki fanlar boʻyicha oʻquv muddati soʻnggida
        yakuniy imtihonlardan ijobiy natijalar bilan oʻtgan “O‘quvchi”larga belgilangan tartibda
        “Sertifikat” berish;
      </P>
      <P>
        2.4.4. Dars va mashgʻulotlarda urushni, zoʻravonlikni targʻib qilishdan foydalanishga,
        fuqarolarning konstitutsiyaviy huquqlari va erkinligi kamsitilishiga, mamlakatdagi
        xavfsizlik va ijtimoiy-siyosiy barqarorlikka, jamiyatning huquqiy va maʼnaviy asoslari,
        fuqarolar osoyishtaligiga, millatlararo va dinlararo totuvlikka raxna solinishiga,
        Oʻzbekiston Respublikasi toʻgʻrisida notoʻgʻri axborotlar tarqatilishiga hamda uning
        tarixiy, madaniy va maʼnaviy qadriyatlari buzib koʻrsatilishiga yoʻl qoʻymaslik.
      </P>
    </Band>

    <Band title="3. OʻZARO HISOB-KITOB TARTIBI">
      <P>
        3.1.“Buyurtmachi” tomonidan “Shartnoma” imzolanganidan soʻng 10 kun muddat ichida
        oldindan biryoʻla {data.total_price} ({data.total_price_text}) soʻm miqdorida yoki har
        oyning 10-sanasiga qadar shu oy uchun oldindan {data.monthly_price}(
        {data.monthly_price_text}) soʻm miqdorida naqd pul, pul oʻtkazish yoki bank muassasalari
        orqali toʻlov amalga oshiriladi.
      </P>
      <P>
        3.2.“Buyurtmachi” yoki “Vakil” “Shartnoma” imzolanib, to‘lovlar amalga oshirilgandan so‘ng
        o‘quv mashg‘ulotlari boshlanishiga 48 soat vaqt qolgandan so‘ng “Shartnoma”ni bekor qilish
        to‘g‘risida murojaat etgan taqdirda to‘lov summasining 50 (ellik) foizi kompensatsiya
        sifatida ushlab qolinadi hamda ushlanib qolgan qismi “Buyurtmachi”ga qaytarib berilmaydi.
      </P>
      <P>
        3.3.“O‘quv markazi” tomonidan to‘lov narxi yangi narxnoma (preyskurant) bo‘yicha o‘zgargan
        taqdirda oshirilishi mumkin.
      </P>
      <P>
        3.4.Bunda “Buyurtmachi” tomonidan oldindan qilingan to‘lovlar miqdori to‘lov muddati
        oxirigacha oshirilishiga va “Buyurtmachi”dan qo‘shimcha to‘lovlar undirilishiga yo‘l
        qo‘yilmaydi.
      </P>
    </Band>

    <Band title="4. FORS-MAJOR HOLATLARI">
      <P>
        4.1.“Tomonlar”ga bogʻliq boʻlmagan holda yengib boʻlmas kuch taʼsirida “Shartnoma”
        shartlarini bajarish imkoniyati boʻlmagan taqdirda (suv toshqini, yongʻin, yer qimirlashi
        va boshqa tabiiy ofatlar, epidemiya, epizootiya, karantin va boshqalar), shuningdek
        hukumat qarori bilan majburiyatlarni bajarishga taʼsir koʻrsatadigan maʼlum cheklovlar
        oʻrnatilgan taqdirda taraflar bir birini 10 (oʻn) kun muddat ichida bu toʻgʻrisida xabardor
        qilishi lozim.
        <br />
        Ushbu davr mobaynida “Shartnoma” boʻyicha majburiyatlar huquqiy oqibat keltirib chiqarmaydi.
      </P>
    </Band>

    <Band title="5. “SHARTNOMA”NI OʻZGARTIRISH, UNGA QOʻSHIMCHALAR KIRITISH VA UNI BEKOR QILISH TARTIBI">
      <P>
        5.1. Ushbu “Shartnoma” “Tomonlar”ning roziligi bilan yozma kelishuviga koʻra
        oʻzgartirilishi, qoʻshimchalar kiritilishi va istalgan vaqtda bekor qilinishi mumkin.
      </P>
      <P>
        5.2. Ushbu “Shartnoma” quyidagi holatlarda “Oʻquv markazi” tomonidan “Buyurtmachi” yoki
        “Vakil”ni 10 (oʻn) kun oldin ogohlantirib bir tomonlama bekor qilinishi mumkin:
      </P>
      <P>
        5.2.1. “Buyurtmachi” yoki “Vakil” tomonidan ushbu “Shartnoma” shartlari qoʻpol ravishda
        buzilib, oʻz majburiyatlarini bajarmasa, shuningdek shartnomada belgilangan toʻlovlarni oʻz
        vaqtida amalga oshirmagan taqdirda;
      </P>
      <P>
        5.2.2. “Oʻquvchi” sanitariya-gigiyena talablariga, yongʻin xavfsizligi qoidalariga rioya
        qilmaganda, oʻquv guruhi mashgʻulotlarida odob-axloq meʼyorlariga, oʻquv guruhi
        rahbarining qonuniy talablariga rioya qilmaganda;
      </P>
      <P>
        5.2.3. “Oʻquv markazi”ning tashabbusi bilan uning ustaviga (nizomiga) koʻra, “Oʻquvchi”
        oʻqishdan chetlatilganda.
      </P>
      <P>5.3.Taʼlim muassasasi tugatilgan taqdirda “Shartnoma” oʻz-oʻzidan bekor boʻlgan hisoblanadi.</P>
    </Band>

    <Band title="6. “TOMONLAR”NING JAVOBGARLIGI VA NIZOLARNI HAL QILISh TARTIBI">
      <P>
        6.1.Mazkur “Shartnoma”da ko‘zda tutilgan shartlar va majburiyatlarni bajarmaslik yoki
        lozim darajada bajarmaslik hollari, “Tomonlar”ni O‘zbekiston Respublikasining amaldagi
        qonunchiligiga muvofiq javobgarlikka tortilishiga sabab bo‘ladi.
      </P>
      <P>
        6.2.“Tomonlar” “Shartnoma” imzolanib kuchga kirganidan soʻng oʻz majburiyatlarini
        bajarmasalar yoki lozim darajada bajarmasalar 15% miqdorida jarima toʻlaydilar.
      </P>
      <P>
        6.3.O‘zaro kelishmovchiliklar yuzaga kelgan taqdirda barcha masalalar ikki tomonlama
        muzokaralar yo‘li bilan hal qilinadi, kelishish imkoni bo‘lmaganda esa nizo qonunda
        belgilangan tartibda Andijon shahar iqtisodiy sudida hal qilinadi.
      </P>
    </Band>

    <Band title="7. “SHARTNOMA”NING AMAL QILISHI">
      <P>
        7.1.Ushbu “Shartnoma” {data.contract_start_date} sanasida tuzildi hamda{' '}
        {data.contract_expiry_date} sanasigacha amal qiladi.
        <br />
        “Shartnoma” muddati tugashi bilan “Shartnoma” bekor boʻlgan hisoblanadi.
      </P>
      <P>
        7.2.Ushbu “Shartnoma” har bir tomonga bir nusxadan saqlash uchun bir xil yuridik kuchga ega
        boʻlgan 3 (uch) nusxada tuzildi.
      </P>
      <P>
        7.3. Ushbu “Shartnoma” tomonlarning roziligini ifodalaydigan hamda uni identifikatsiya va
        autentifikatsiya qilish imkonini beradigan elektron tasdiqlash usullari (“SMS”, “Face-ID”
        va boshqalar) ham imzo sifatida tan olinadi va shartnoma tuzilgan hisoblanadi.
      </P>
    </Band>

    <Band title="8. “TOMONLAR”NING MANZILLARI VA IMZOLARI:">
      <SignatureTable
        columns={[
          {
            title: '“O‘QUV MARKAZI”',
            lines: [
              data.branch_legal_name,
              `“${data.branch_short_name}” (${data.branch_name})`,
              `Yuridik manzil: ${data.branch_legal_address}`,
              `Filial manzili: ${data.branch_address}`,
              `Tel: ${data.branch_phone}`,
              `STIR: ${data.branch_inn}; IFUT (OKED): ${data.branch_oked}`,
              `H/R: ${data.account_number}`,
              data.bank_name,
              `MFO: ${data.mfo}`,
              `Bosh direktor: ${U(data.director_short_name)}`,
            ],
          },
          {
            title: '“BUYURTMACHI”',
            lines: [
              data.company_name,
              `Yuridik manzil: ${data.company_legal_address}`,
              `Filial manzili: ${data.company_branch_address}`,
              `Tel: ${data.company_phone}`,
              `STIR: ${data.company_inn}; IFUT (OKED): ${data.company_oked}`,
              `H/R: ${data.company_account_number}`,
              `${data.company_bank_name} ${data.company_bank_branch}`,
              `MFO: ${data.company_mfo}`,
              `Rahbar: ${U(data.company_director_short_name)}`,
            ],
          },
          {
            title: '“VAKIL”',
            lines: [
              U(data.representative_last_name),
              U(data.representative_first_father_name),
              `Yashash manzili: ${data.representative_residental_address}`,
              `Pasport/ID-karta: ${data.representative_passport_full}`,
              `Tel:${data.representative_phone}`,
              `JShShIR: ${data.representative_jshshr}`,
              `Vakil: ${U(data.representative_short_name)}`,
            ],
          },
        ]}
      />
    </Band>
  </div>
);

export const ContractLegalText = ({
  contractType,
  data,
}: {
  contractType: ContractType;
  data: ContractTemplateData;
}) => {
  switch (contractType) {
    case 'minor':
      return <MinorText data={data} />;
    case 'legal_bilateral':
      return <LegalBilateralText data={data} />;
    case 'legal_trilateral':
      return <LegalTrilateralText data={data} />;
    default:
      return <AdultText data={data} />;
  }
};
