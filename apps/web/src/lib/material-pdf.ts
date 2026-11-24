import type { PDFDocumentProxy } from 'pdfjs-dist';

export async function withMaterialPdf<T>(bytes: Buffer, read: (pdf: PDFDocumentProxy) => T | Promise<T>): Promise<T> {
  const { getDocument } = require('pdfjs-dist/legacy/build/pdf.mjs') as typeof import('pdfjs-dist');
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false });
  try {
    return await read(await task.promise);
  } finally {
    await task.destroy();
  }
}

export async function materialPdfText(bytes: Buffer, includePage: (pageNumber: number) => boolean) {
  return withMaterialPdf(bytes, async pdf => {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (!includePage(pageNumber)) continue;
      const page = await pdf.getPage(pageNumber);
      const { items } = await page.getTextContent();
      let text = '';
      let lastY: number | undefined;
      for (const item of items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (lastY !== undefined && lastY !== y) text += '\n';
        text += item.str;
        if (item.hasEOL) text += '\n';
        lastY = item.hasEOL ? undefined : y;
      }
      pages.push(text);
      page.cleanup();
    }
    return pages.join('\n');
  });
}
