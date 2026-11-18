import type { ReactNode } from 'react';
import {
  BLANK,
  CLAUSES,
  DOCUMENT_CSS,
  SECTION_TITLES,
  compareKeys,
  formatPreschoolMoney,
  preschoolMoneyWords,
  type PreschoolDocData,
} from './preschoolContractData';

/* Maktabga tayyorlov shartnomasi hujjati (ekranda ham, chop etishda ham bir xil). Ma'lumot va matn bandlari —
 * `preschoolContractData.ts`da. */

const B = ({ children }: { children: ReactNode }) => <strong>{children}</strong>;

export const PreschoolContractDocument = ({ data }: { data: PreschoolDocData }) => {
  const { org, child, reps } = data;

  const price =
    data.monthlyPrice != null ? (
      <B>
        {formatPreschoolMoney(data.monthlyPrice)} ({preschoolMoneyWords(data.monthlyPrice)}) soʻm
      </B>
    ) : (
      <B>
        {BLANK} ({BLANK}) soʻm
      </B>
    );

  // 3.1 (oylik to'lov summasi) va 7.1 (nomuayyan muddat) — ma'lumotga bog'liq, qolgan bandlar `CLAUSES`dan.
  const dynamic: Record<string, ReactNode> = {
    '3.1': <>3.1. “Shartnoma” boʻyicha taʼlim xizmati uchun oylik toʻlov miqdori {price}ni tashkil etadi.</>,
    '7.1': (
      <>
        7.1. Ushbu “Shartnoma” <B>{data.date}</B> sanasida tuzildi hamda tomonlardan biri uni ushbu “Shartnoma”da
        belgilangan tartibda bekor qilmaguncha muddatsiz amal qiladi.
      </>
    ),
  };

  const keys = Array.from(new Set([...Object.keys(CLAUSES), ...Object.keys(dynamic)])).sort(compareKeys);
  const sections = Object.keys(SECTION_TITLES);

  const repsLine = reps.map((r, i) => (
    <span key={i}>
      {i > 0 ? ', ' : ''}
      {r.typeLabel} <B>{r.fullName}</B> (Pasport (ID-karta): seriyasi: {r.passportSeries}; raqami: {r.passportNumber};
      tugʻilgan sanasi: {r.birthDate}; berilgan sanasi: {r.givenDate}; berilgan joyi: {r.givenBy}; yashash manzili:{' '}
      {r.address})
    </span>
  ));

  const sign = (stamp: boolean) => (
    <>
      <div className="pcx-gap" />
      <div className="pcx-line">Imzo:_________________{stamp ? ' M.Oʻ.' : ''}</div>
      <div className="pcx-gap" />
      <div className="pcx-line">
        <B>{data.date}</B>
      </div>
    </>
  );

  return (
    <div className="pcx">
      <style>{DOCUMENT_CSS}</style>

      <div className="pcx-title">Taʼlim olish toʻgʻrisida</div>
      <div className="pcx-title">SHARTNOMA №{data.number}</div>
      <div className="pcx-meta">
        <span>{data.city}</span>
        <span>{data.date}</span>
      </div>

      <p className="pcx-p">
        Birinchi tomondan oʻz Nizomi asosida faoliyat yurituvchi <B>{org.name}</B> (keyingi oʻrinlarda – “Maktab” deb
        yuritiladi) nomidan ish yurituvchi rahbari <B>{org.director.toUpperCase()}</B> va ikkinchi tomondan{' '}
        {child.citizenship}: <B>{child.fullName}</B>ning (Tugʻilganlik haqida guvohnoma: seriyasi:{' '}
        <B>{child.certSeries}</B>; raqami: <B>{child.certNumber}</B>; tugʻilgan sanasi: <B>{child.birthDate}</B>;
        tugʻilgan joyi: <B>{child.birthPlace}</B>), {repsLine.length > 0 ? repsLine : BLANK} (keyingi oʻrinlarda – “Vakil”
        deb yuritiladi) ushbu “Shartnoma”ni quyidagi mazmunda tuzdik.
      </p>

      {sections.map((n) => (
        <section key={n}>
          <div className="pcx-h">{SECTION_TITLES[n]}</div>
          {keys
            .filter((k) => k.split('.')[0] === n)
            .map((k) => {
              // 2.1 – 2.4: kichik sarlavhalar (qalin), qolganlari — oddiy band.
              const heading = /^2\.\d+$/.test(k);
              return (
                <p key={k} className={heading ? 'pcx-p pcx-bold' : 'pcx-p'}>
                  {dynamic[k] ?? `${k}. ${CLAUSES[k]}`}
                </p>
              );
            })}
        </section>
      ))}

      <div className="pcx-h">9. TOMONLARNING REKVIZITLARI VA IMZOLARI:</div>
      <table className="pcx-req">
        <tbody>
          <tr>
            <td>
              <div className="pcx-line">
                <B>“Maktab”</B>
              </div>
              <div className="pcx-line">
                <B>{org.branchName}</B>
              </div>
              <div className="pcx-line">
                <B>Manzil</B>: {org.branchAddress}
              </div>
              <div className="pcx-line">
                <B>INN</B>: {org.inn}
              </div>
              <div className="pcx-line">
                <B>X/R</B>: {org.account}
              </div>
              {org.bank && <div className="pcx-line">{org.bank}</div>}
              <div className="pcx-line">
                <B>MFO</B>: {org.mfo}
              </div>
              <div className="pcx-line">
                <B>Telefon</B>: {org.phone}
              </div>
              {sign(true)}
            </td>
            <td>
              <div className="pcx-line">
                <B>“Vakil”</B>
              </div>
              {(reps.length > 0 ? reps : [null]).map((r, i) => (
                <div key={i}>
                  {i > 0 && <div className="pcx-gap" />}
                  <div className="pcx-line">
                    <B>{r ? r.fullName : BLANK}</B>
                  </div>
                  <div className="pcx-gap" />
                  <div className="pcx-line">
                    <B>Manzil</B>: {r ? r.address : BLANK}
                  </div>
                  <div className="pcx-gap" />
                  <div className="pcx-line">
                    <B>Telefon</B>: {r ? r.phone : BLANK}
                  </div>
                </div>
              ))}
              {sign(false)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
