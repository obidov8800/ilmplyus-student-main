import { PreschoolContractDocument } from './preschoolContractDocument';
import { PRINT_PAGE_CSS, buildPreschoolDocData } from './preschoolContractData';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * PDF / chop etish — brauzerning chop etish oynasi ochiladi («PDF sifatida saqlash» mumkin). Boshqa shartnoma
 * turlaridagi (`printFromDocxTemplate`) usul bilan bir xil: alohida oyna, `@page` chegaralari, matn haqiqiy
 * (tanlanadigan) matn. `extraHtml` — hujjat oxiriga qo'shiladigan blok (masalan tasdiqlash kartalari).
 */
export async function printPreschoolContract(
  contract: any,
  options: { mode?: 'pdf' | 'print'; extraHtml?: string } = {},
): Promise<void> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const data = buildPreschoolDocData(contract);
  const html = renderToStaticMarkup(<PreschoolContractDocument data={data} />);

  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Pop-up bloklangan. Brauzer sozlamalarini tekshiring.');

  const title = `Shartnoma ${data.number}`.replace(/[<>&"]/g, '');
  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${PRINT_PAGE_CSS}</style>
  </head>
  <body>${html}${options.extraHtml ?? ''}</body>
</html>`);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
        if (options.mode === 'print') setTimeout(() => printWindow.close(), 1000);
      });
    });
  };

  if (printWindow.document.readyState === 'complete') triggerPrint();
  else printWindow.addEventListener('load', triggerPrint, { once: true });
}
