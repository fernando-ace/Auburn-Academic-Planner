import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(pdfData: Uint8Array) {
  const pdf = await getDocumentProxy(new Uint8Array(pdfData));

  try {
    const result = await extractText(pdf, { mergePages: true });
    return result.text;
  } finally {
    await pdf.destroy();
  }
}

export function hasPdfHeader(pdfData: Uint8Array) {
  if (pdfData.length < 4) {
    return false;
  }

  return (
    pdfData[0] === 0x25 &&
    pdfData[1] === 0x50 &&
    pdfData[2] === 0x44 &&
    pdfData[3] === 0x46
  );
}
