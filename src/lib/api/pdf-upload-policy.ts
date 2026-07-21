export const MAX_PDF_UPLOAD_MIB = 3;
export const MAX_PDF_UPLOAD_BYTES = MAX_PDF_UPLOAD_MIB * 1024 * 1024;

export function getPdfUploadSizeError(size: number) {
  return size > MAX_PDF_UPLOAD_BYTES
    ? `Choose a PDF that is ${MAX_PDF_UPLOAD_MIB} MiB or smaller.`
    : null;
}
