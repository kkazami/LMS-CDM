const officePreviewTypes = new Set(['docx', 'pptx', 'xlsx']);

export function materialPreviewUrl(attachmentId: string) {
  return `/api/materials/preview?attachmentId=${encodeURIComponent(attachmentId)}`;
}

export function supportsOfficePreview(extension: string | undefined): extension is 'docx' | 'pptx' | 'xlsx' {
  return extension !== undefined && officePreviewTypes.has(extension);
}
